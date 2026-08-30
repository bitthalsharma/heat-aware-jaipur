import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";

import boundary from "../data/jaipur-boundary.json";
import type { Ward } from "../types/wards";
import { boundsOf } from "../lib/wards";

const JAIPUR_CENTER: [number, number] = [26.9124, 75.7873];

function FitBounds({ wards }: { wards: Ward[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = boundsOf(wards);
    if (bounds) map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, wards]);
  return null;
}

export default function WardMap({
  wards,
  selectedId,
  onSelect,
}: {
  wards: Ward[];
  selectedId?: string | null;
  onSelect?: (ward: Ward) => void;
}) {
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const wardCollection = useMemo<FeatureCollection<Geometry>>(
    () => ({
      type: "FeatureCollection",
      features: wards.map((ward) => ({
        type: "Feature",
        properties: { id: ward.id, label: ward.name ?? ward.wardNumber ?? ward.id },
        geometry: ward.geometry as Geometry,
      })),
    }),
    [wards],
  );

  return (
    <MapContainer
      center={JAIPUR_CENTER}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="rounded-md"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={boundary as unknown as FeatureCollection<Geometry>}
        style={{ color: "#b45309", weight: 2, fillOpacity: 0.04, dashArray: "4 3" }}
      />
      {wards.length > 0 ? (
        <>
          <GeoJSON
            key={`${wards.length}-${wards[0]?.id ?? ""}-${selectedId ?? ""}`}
            data={wardCollection}
            style={(feature) => ({
              color: feature?.properties?.["id"] === selectedId ? "#7f1d1d" : "#0f172a",
              weight: feature?.properties?.["id"] === selectedId ? 3 : 1,
              fillColor: "#f97316",
              fillOpacity: feature?.properties?.["id"] === selectedId ? 0.35 : 0.15,
            })}
            onEachFeature={(feature, layer) => {
              const label = String(feature.properties?.["label"] ?? "Ward");
              layer.bindTooltip(label, { sticky: true });
              layer.on("click", () => {
                const ward = wards.find((w) => w.id === feature.properties?.["id"]);
                if (ward && onSelect) onSelect(ward);
              });
            }}
          />
          <FitBounds wards={wards} />
        </>
      ) : null}
    </MapContainer>
  );
}
