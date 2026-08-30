export type Position = [number, number];
export type PolygonCoords = Position[][];
export type MultiPolygonCoords = Position[][][];

export type WardGeometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };

export interface WardFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: WardGeometry;
}

export interface WardFeatureCollection {
  type: "FeatureCollection";
  features: WardFeature[];
}

/** A ward after validation and normalisation of the uploaded GeoJSON. */
export interface Ward {
  /** Stable id derived from the ward number or the feature index. */
  id: string;
  /** Ward number exactly as provided in the source file, if present. */
  wardNumber: string | null;
  /** Ward name exactly as provided in the source file, if present. */
  name: string | null;
  /** Zone / sub-district name if provided in the source file. */
  zone: string | null;
  /** [lon, lat] area-weighted centroid, derived from the supplied geometry. */
  centroid: Position;
  /** Spherical area in km², derived from the supplied geometry. */
  areaKm2: number;
  geometry: WardGeometry;
  /** All original properties, kept so nothing from the source file is lost. */
  properties: Record<string, unknown>;
}

export interface WardDataset {
  /** File name of the uploaded dataset. */
  fileName: string;
  /** Provenance string entered by the operator (e.g. "JMC ward map 2023"). */
  sourceLabel: string;
  /** ISO timestamp of when the dataset was imported into this browser. */
  importedAt: string;
  wards: Ward[];
  /** True when the dataset ships with the app rather than being operator-imported. */
  builtIn?: boolean;
}

export interface WardValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  wards: Ward[];
}
