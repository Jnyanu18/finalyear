"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, LoaderCircle } from "lucide-react";
import { AgroSenseToolbar } from "@/components/agrosense/AgroSenseToolbar";
import { FieldMap } from "@/components/agrosense/FieldMap";
import { agrosenseApi } from "@/api/agrosense";
import { useAgroSenseFieldBundle, useAgroSenseFields, useTriggerFieldAnalysis } from "@/hooks/useAgroSense";
import { useConnectedFarmContext } from "@/hooks/useConnectedFarmContext";
import { useRealtimeSensors } from "@/hooks/useRealtimeSensors";
import { deriveSensorThresholds, formatShortDate, formatShortDateTime, formatShortTime } from "@/lib/live-data";
import { useAgroSenseStore } from "@/store/agrosenseStore";
import type { FieldMapResponse, SensorHistoryResponse, SensorReadingsResponse } from "@/types/agrosense";

function statusTone(status: "low" | "optimal" | "high") {
  if (status === "low") return "border-blue-400/30 bg-blue-500/10 text-blue-200";
  if (status === "high") return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-[#3ddc6e]/30 bg-[#102315] text-[#d8ffe4]";
}

export default function SensorsPage() {
  const { liveDefaults } = useConnectedFarmContext();
  const { data: fieldsData } = useAgroSenseFields();
  const { selectedFieldId, sensorRange, setSelectedFieldId, setSensorRange } = useAgroSenseStore();
  const bundle = useAgroSenseFieldBundle(selectedFieldId, sensorRange);
  const triggerAnalysis = useTriggerFieldAnalysis(selectedFieldId);
  const realtime = useRealtimeSensors(selectedFieldId);
  const [selectedSensorId, setSelectedSensorId] = useState("");

  const fields = useMemo(() => fieldsData?.fields ?? [], [fieldsData?.fields]);

  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId, setSelectedFieldId]);

  const selectedField = fields.find((field) => field.id === selectedFieldId) || null;
  const mapData = bundle.map.data as FieldMapResponse | undefined;
  const sensorsData = (realtime.sensors || bundle.sensors.data) as SensorReadingsResponse | undefined;
  const selectedSensor = sensorsData?.nodes.find((node) => node.nodeId === selectedSensorId) || sensorsData?.nodes[0] || null;

  useEffect(() => {
    if (!selectedSensorId && sensorsData?.nodes?.length) {
      setSelectedSensorId(sensorsData.nodes[0].nodeId);
      return;
    }

    if (selectedSensorId && !sensorsData?.nodes.find((node) => node.nodeId === selectedSensorId) && sensorsData?.nodes[0]) {
      setSelectedSensorId(sensorsData.nodes[0].nodeId);
    }
  }, [selectedSensorId, sensorsData?.nodes]);

  const sensorHistoryQuery = useQuery({
    queryKey: ["agrosense", selectedFieldId, "history", sensorRange, selectedSensorId || "unselected"],
    queryFn: () => agrosenseApi.getFieldSensorHistory(selectedFieldId, sensorRange, selectedSensorId),
    enabled: Boolean(selectedFieldId && selectedSensorId),
    refetchInterval: 30_000
  });

  const sensorHistory = sensorHistoryQuery.data as SensorHistoryResponse | undefined;
  const telemetrySeries = sensorHistory?.series || [];
  const thresholdCards = useMemo(
    () =>
      deriveSensorThresholds({
        cropType: selectedField?.cropType || liveDefaults.cropType,
        growthStage: liveDefaults.growthStage || "fruit development",
        current: selectedSensor?.readings || {
          soilMoisture: 0,
          airTemperature: 0,
          humidity: 0,
          leafWetness: 0,
          windSpeed: 0,
          solarRadiation: 0,
          soilPh: 0
        },
        selectedField
      }),
    [liveDefaults.cropType, liveDefaults.growthStage, selectedField, selectedSensor?.readings]
  );

  const exportCsv = () => {
    if (!telemetrySeries.length) {
      return;
    }

    const rows = [
      "timestamp,soilMoisture,airTemperature,humidity,leafWetness,windSpeed,solarRadiation,soilPh",
      ...telemetrySeries.map(
        (point) =>
          `${point.timestamp},${point.soilMoisture},${point.airTemperature},${point.humidity},${point.leafWetness},${point.windSpeed},${point.solarRadiation},${point.soilPh}`
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedFieldId}-${selectedSensor?.label || "sensor"}-${sensorRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatHistoryTick = (value: string) => (sensorRange === "24h" ? formatShortTime(value) : formatShortDate(value));

  if (!mapData || !sensorsData || sensorHistoryQuery.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-[#3ddc6e]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <AgroSenseToolbar
        fields={fields}
        selectedFieldId={selectedFieldId}
        onSelectField={setSelectedFieldId}
        onRunAnalysis={() => triggerAnalysis.mutate()}
        onExport={exportCsv}
        isRunning={triggerAnalysis.isPending}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sensor node map</h2>
              <p className="text-sm text-[#8fb89a]">Choose a node to inspect its live telemetry instead of the field average.</p>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm hover:bg-white/10">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <FieldMap geojson={mapData.geojson} sensorNodes={sensorsData.nodes} selectedSensorId={selectedSensorId} onSelectSensor={setSelectedSensorId} />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {sensorsData.nodes.map((node) => (
              <button
                key={node.nodeId}
                onClick={() => setSelectedSensorId(node.nodeId)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${selectedSensorId === node.nodeId ? "border-[#3ddc6e] bg-[#102315]" : "border-white/10 bg-white/5"}`}
              >
                <div className="font-medium">{node.label}</div>
                <div className="text-xs text-[#8fb89a]">{node.status} | seen {formatShortTime(node.lastSeen)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Operating bands</h2>
                <p className="text-sm text-[#8fb89a]">Recommended live sensor ranges for the current crop and growth stage.</p>
              </div>
              <div className="flex gap-2">
                {(["24h", "7d", "30d"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSensorRange(range)}
                    className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] ${sensorRange === range ? "bg-[#3ddc6e] text-[#08110b]" : "bg-white/5 text-[#8fb89a]"}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {thresholdCards.map((threshold) => (
                <div key={threshold.key} className={`rounded-2xl border p-4 ${statusTone(threshold.status)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{threshold.label}</div>
                      <div className="mt-1 text-xs opacity-80">{threshold.helpText}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {threshold.current}
                        <span className="ml-1 text-xs opacity-80">{threshold.unit}</span>
                      </div>
                      <div className="text-xs opacity-80">
                        band {threshold.min} to {threshold.max} {threshold.unit}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#3ddc6e]" style={{ width: `${threshold.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
        <h2 className="text-xl font-semibold">
          {sensorHistory?.scope === "node" ? sensorHistory.nodeLabel || selectedSensor?.label : "Field average"} telemetry
        </h2>
        <p className="text-sm text-[#8fb89a]">
          {sensorHistory?.scope === "node" ? "This chart is now tied to the selected sensor node." : "Field-wide averages over the selected time window."}
        </p>
        <div className="mt-4 h-[360px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetrySeries} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={formatHistoryTick} tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip labelFormatter={(value) => formatShortDateTime(String(value))} contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
              <Line type="monotone" dataKey="soilMoisture" stroke="#3ddc6e" dot={false} strokeWidth={2.2} />
              <Line type="monotone" dataKey="humidity" stroke="#7dd3fc" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="airTemperature" stroke="#f59e0b" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="leafWetness" stroke="#f472b6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="soilPh" stroke="#c084fc" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
