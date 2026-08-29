import type {
  MultiPolygonCoords,
  PolygonCoords,
  Position,
  Ward,
  WardDataset,
  WardGeometry,
  WardValidationResult,
} from "../types/wards";

const EARTH_RADIUS_KM = 6371.0088;

const NUMBER_KEYS = ["ward_no", "wardno", "ward_num", "ward_number", "wardnumber", "no", "number"];
const NAME_KEYS = ["ward_name", "wardname", "name", "ward", "label", "title"];
const ZONE_KEYS = ["zone", "zone_name", "zonename", "sub_district", "subdistrict", "region"];

function pick(props: Record<string, unknown>, keys: string[]): string | null {
  const lowered = new Map(Object.keys(props).map((k) => [k.toLowerCase().trim(), k]));
  for (const key of keys) {
    const actual = lowered.get(key);
    if (actual === undefined) continue;
    const value = props[actual];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return null;
}

/** Spherical excess area of one linear ring, in km². Sign indicates winding. */
function ringAreaKm2(ring: Position[]): number {
  if (ring.length < 4) return 0;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lon1, lat1] = ring[i]!;
    const [lon2, lat2] = ring[i + 1]!;
    total +=
      ((lon2 - lon1) * Math.PI) / 180 *
      (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return (total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
}

function polygonAreaKm2(coords: PolygonCoords): number {
  if (coords.length === 0) return 0;
  const outer = Math.abs(ringAreaKm2(coords[0]!));
  const holes = coords.slice(1).reduce((sum, ring) => sum + Math.abs(ringAreaKm2(ring)), 0);
  return Math.max(outer - holes, 0);
}

export function geometryAreaKm2(geometry: WardGeometry): number {
  if (geometry.type === "Polygon") return polygonAreaKm2(geometry.coordinates);
  return (geometry.coordinates as MultiPolygonCoords).reduce(
    (sum, poly) => sum + polygonAreaKm2(poly),
    0,
  );
}

function ringCentroid(ring: Position[]): { centroid: Position; weight: number } {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[i + 1]!;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  if (twiceArea === 0) {
    const first = ring[0] ?? [0, 0];
    return { centroid: [first[0], first[1]], weight: 0 };
  }
  return { centroid: [x / (3 * twiceArea), y / (3 * twiceArea)], weight: Math.abs(twiceArea / 2) };
}

export function geometryCentroid(geometry: WardGeometry): Position {
  const outerRings: Position[][] =
    geometry.type === "Polygon"
      ? geometry.coordinates.slice(0, 1)
      : (geometry.coordinates as MultiPolygonCoords).map((poly) => poly[0]!).filter(Boolean);

  let wx = 0;
  let wy = 0;
  let total = 0;
  for (const ring of outerRings) {
    const { centroid, weight } = ringCentroid(ring);
    wx += centroid[0] * weight;
    wy += centroid[1] * weight;
    total += weight;
  }
  if (total === 0) {
    const fallback = outerRings[0]?.[0] ?? [0, 0];
    return [fallback[0], fallback[1]];
  }
  return [wx / total, wy / total];
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function normaliseRing(value: unknown): Position[] | null {
  if (!Array.isArray(value)) return null;
  const ring: Position[] = [];
  for (const point of value) {
    if (!isPosition(point)) return null;
    ring.push([point[0], point[1]]);
  }
  if (ring.length < 4) return null;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  return ring;
}

function normaliseGeometry(value: unknown): WardGeometry | null {
  if (typeof value !== "object" || value === null) return null;
  const geom = value as { type?: unknown; coordinates?: unknown };
  if (geom.type === "Polygon") {
    if (!Array.isArray(geom.coordinates)) return null;
    const rings = geom.coordinates.map(normaliseRing);
    if (rings.some((r) => r === null) || rings.length === 0) return null;
    return { type: "Polygon", coordinates: rings as PolygonCoords };
  }
  if (geom.type === "MultiPolygon") {
    if (!Array.isArray(geom.coordinates)) return null;
    const polys: PolygonCoords[] = [];
    for (const poly of geom.coordinates) {
      if (!Array.isArray(poly)) return null;
      const rings = poly.map(normaliseRing);
      if (rings.some((r) => r === null) || rings.length === 0) return null;
      polys.push(rings as PolygonCoords);
    }
    if (polys.length === 0) return null;
    return { type: "MultiPolygon", coordinates: polys };
  }
  return null;
}

/** Rough sanity envelope for the Jaipur region — flags obviously wrong CRS/extent. */
const JAIPUR_BBOX = { minLon: 74.8, maxLon: 76.8, minLat: 26.0, maxLat: 27.8 };

/**
 * Validates and normalises an uploaded GeoJSON file. No geometry is invented:
 * features that cannot be parsed are reported as errors instead of being repaired.
 */
export function validateWardGeoJSON(raw: unknown): WardValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wards: Ward[] = [];

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["File is not valid JSON object content."], warnings, wards };
  }
  const fc = raw as { type?: unknown; features?: unknown };
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return {
      ok: false,
      errors: ["Expected a GeoJSON FeatureCollection with a `features` array."],
      warnings,
      wards,
    };
  }
  if (fc.features.length === 0) {
    return { ok: false, errors: ["FeatureCollection contains no features."], warnings, wards };
  }

  let outsideBbox = 0;
  let missingNumber = 0;

  fc.features.forEach((feature, index) => {
    if (typeof feature !== "object" || feature === null) {
      errors.push(`Feature ${index + 1}: not an object.`);
      return;
    }
    const f = feature as { properties?: unknown; geometry?: unknown };
    const geometry = normaliseGeometry(f.geometry);
    if (!geometry) {
      errors.push(`Feature ${index + 1}: geometry must be a valid Polygon or MultiPolygon.`);
      return;
    }
    const properties =
      typeof f.properties === "object" && f.properties !== null
        ? (f.properties as Record<string, unknown>)
        : {};

    const wardNumber = pick(properties, NUMBER_KEYS);
    const name = pick(properties, NAME_KEYS);
    const zone = pick(properties, ZONE_KEYS);
    if (!wardNumber) missingNumber += 1;

    const centroid = geometryCentroid(geometry);
    if (
      centroid[0] < JAIPUR_BBOX.minLon ||
      centroid[0] > JAIPUR_BBOX.maxLon ||
      centroid[1] < JAIPUR_BBOX.minLat ||
      centroid[1] > JAIPUR_BBOX.maxLat
    ) {
      outsideBbox += 1;
    }

    wards.push({
      id: wardNumber ? `ward-${wardNumber}` : `feature-${index + 1}`,
      wardNumber,
      name,
      zone,
      centroid,
      areaKm2: geometryAreaKm2(geometry),
      geometry,
      properties,
    });
  });

  if (missingNumber > 0) {
    warnings.push(
      `${missingNumber} feature(s) have no recognisable ward number property; they are listed by feature index.`,
    );
  }
  if (outsideBbox > 0) {
    warnings.push(
      `${outsideBbox} feature(s) fall outside the Jaipur region envelope. Check that coordinates are WGS84 (EPSG:4326) longitude/latitude.`,
    );
  }
  const duplicates = wards
    .map((w) => w.id)
    .filter((id, i, arr) => arr.indexOf(id) !== i)
    .filter((id, i, arr) => arr.indexOf(id) === i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate ward identifiers found: ${duplicates.slice(0, 8).join(", ")}.`);
  }

  return { ok: errors.length === 0 && wards.length > 0, errors, warnings, wards };
}

const STORAGE_KEY = "helix.wardDataset.v1";

export function loadWardDataset(): WardDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WardDataset;
    if (!parsed || !Array.isArray(parsed.wards) || parsed.wards.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWardDataset(dataset: WardDataset): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
}

export function clearWardDataset(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function boundsOf(wards: Ward[]): [[number, number], [number, number]] | null {
  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;
  const visit = (ring: Position[]) => {
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  };
  for (const ward of wards) {
    if (ward.geometry.type === "Polygon") ward.geometry.coordinates.forEach(visit);
    else ward.geometry.coordinates.forEach((poly) => poly.forEach(visit));
  }
  if (!Number.isFinite(minLat)) return null;
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}
