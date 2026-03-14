import { useMemo } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression, Layer } from "leaflet";
import type { GeoJsonFeatureCollection, SensorNode, ZoneRiskBreakdown } from "@/types/agrosense";
import "leaflet/dist/leaflet.css";

interface FieldMapProps {
  geojson: GeoJsonFeatureCollection;
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  sensorNodes?: SensorNode[];
  zoneRisk?: ZoneRiskBreakdown[];
  selectedSensorId?: string;
  onSelectSensor?: (nodeId: string) => void;
  className?: string;
}

function zoneColor(ndvi: number) {
  if (ndvi >= 0.76) return "#3ddc6e";
  if (ndvi >= 0.66) return "#a5d83d";
  if (ndvi >= 0.56) return "#f7d454";
  if (ndvi >= 0.46) return "#f48c3d";
  return "#ef4444";
}

export function FieldMap({
  geojson,
  selectedZoneId,
  onSelectZone,
  sensorNodes = [],
  zoneRisk = [],
  selectedSensorId,
  onSelectSensor,
  className = "h-[420px]"
}: FieldMapProps) {
  const center = useMemo<LatLngExpression>(() => {
    const firstFeature = geojson.features[0];
    if (firstFeature?.center) {
      return [firstFeature.center.lat, firstFeature.center.lng];
    }
    return [12.31, 76.65];
  }, [geojson]);

  const zoneRiskMap = useMemo(
    () => new Map(zoneRisk.map((zone) => [zone.zoneId, zone])),
    [zoneRisk]
  );

  return (
    <div className={`overflow-hidden rounded-3xl border border-white/10 bg-[#08110b] ${className}`}>
      <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          data={geojson as never}
          style={(feature) => {
            const ndvi = Number(feature?.properties?.ndvi || 0);
            const zoneId = String(feature?.properties?.zoneId || "");
            const isSelected = zoneId === selectedZoneId;
            return {
              color: isSelected ? "#ffffff" : zoneColor(ndvi),
              weight: isSelected ? 3 : 2,
              fillColor: zoneColor(ndvi),
              fillOpacity: isSelected ? 0.6 : 0.45
            };
          }}
          onEachFeature={(feature, layer: Layer) => {
            const zoneId = String(feature.properties?.zoneId || "");
            const risk = zoneRiskMap.get(zoneId);
            const tooltip = `${feature.properties?.zoneLabel} • NDVI ${Number(feature.properties?.ndvi || 0).toFixed(2)} • ${feature.properties?.status}${risk ? ` • ${Math.round(Math.max(...risk.pestRisks.map((entry) => entry.probability)) * 100)}% pest risk` : ""}`;
            if ("bindTooltip" in layer) {
              (layer as Layer & { bindTooltip: (value: string) => void }).bindTooltip(tooltip);
            }
            layer.on({
              click: () => onSelectZone?.(zoneId)
            });
          }}
        />
        {sensorNodes.map((node) => (
          <CircleMarker
            key={node.nodeId}
            center={[node.location.lat, node.location.lng]}
            radius={node.nodeId === selectedSensorId ? 11 : 8}
            eventHandlers={{
              click: () => onSelectSensor?.(node.nodeId)
            }}
            pathOptions={{
              color:
                node.nodeId === selectedSensorId
                  ? "#ffffff"
                  : node.status === "watch"
                    ? "#f59e0b"
                    : "#3ddc6e",
              fillColor: node.status === "watch" ? "#f59e0b" : "#3ddc6e",
              fillOpacity: 0.85
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
