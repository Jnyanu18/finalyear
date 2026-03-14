import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts";
import { AlertTriangle, Bug, Droplets, Leaf, LoaderCircle, Radar, Sparkles } from "lucide-react";
import { AgroSenseToolbar } from "@/components/agrosense/AgroSenseToolbar";
import { AlertBanner } from "@/components/agrosense/AlertBanner";
import { FieldMap } from "@/components/agrosense/FieldMap";
import { ForecastChart } from "@/components/agrosense/ForecastChart";
import { ModelStatusPanel } from "@/components/agrosense/ModelStatusPanel";
import { SensorCard } from "@/components/agrosense/SensorCard";
import { ZoneDrawer } from "@/components/agrosense/ZoneDrawer";
import { agrosenseApi, toAbsoluteAssetUrl } from "@/api/agrosense";
import { getHighestSeverityAlert, useAcknowledgeAlert, useAgroSenseAlerts, useAgroSenseFieldBundle, useAgroSenseFields, useAgroSenseModels, useTriggerFieldAnalysis } from "@/hooks/useAgroSense";
import { useRealtimeSensors } from "@/hooks/useRealtimeSensors";
import { formatRelativeTime, formatShortDate, formatShortDateTime } from "@/lib/live-data";
import { useAgroSenseStore } from "@/store/agrosenseStore";
import type { FieldIndicesResponse, FieldMapResponse, ForecastResponse, InsightsResponse, RiskResponse, SensorHistoryResponse, SensorReadingsResponse } from "@/types/agrosense";

function average<T>(items: T[], select: (item: T) => number) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + select(item), 0) / items.length;
}

export default function DashboardPage() {
  const { data: fieldsData, isLoading: isFieldsLoading } = useAgroSenseFields();
  const { data: alertsData } = useAgroSenseAlerts();
  const { data: modelsData } = useAgroSenseModels();
  const { selectedFieldId, sensorRange, setSelectedFieldId } = useAgroSenseStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const bundle = useAgroSenseFieldBundle(selectedFieldId, sensorRange);
  const acknowledgeAlert = useAcknowledgeAlert();
  const triggerAnalysis = useTriggerFieldAnalysis(selectedFieldId);
  const realtime = useRealtimeSensors(selectedFieldId);

  const fields = useMemo(() => fieldsData?.fields || [], [fieldsData?.fields]);

  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId, setSelectedFieldId]);

  const mapData = bundle.map.data as FieldMapResponse | undefined;
  const indicesData = bundle.indices.data as FieldIndicesResponse | undefined;
  const sensorsData = (realtime.sensors || bundle.sensors.data) as SensorReadingsResponse | undefined;
  const sensorHistory = bundle.sensorHistory.data as SensorHistoryResponse | undefined;
  const riskData = bundle.risk.data as RiskResponse | undefined;
  const forecastData = bundle.forecast.data as ForecastResponse | undefined;
  const insightsData = bundle.insights.data as InsightsResponse | undefined;

  const highestAlert = getHighestSeverityAlert([...(alertsData?.alerts || []), ...realtime.alerts]);
  const selectedField = fields.find((field) => field.id === selectedFieldId) || null;
  const selectedZone = indicesData?.zones.find((zone) => zone.zoneId === selectedZoneId) || null;
  const selectedZoneRisk = riskData?.zoneBreakdown.find((zone) => zone.zoneId === selectedZoneId) || null;

  const sensorAverages = useMemo(() => {
    const nodes = sensorsData?.nodes || [];
    return {
      soilMoisture: average(nodes, (node) => node.readings.soilMoisture),
      airTemperature: average(nodes, (node) => node.readings.airTemperature),
      humidity: average(nodes, (node) => node.readings.humidity),
      leafWetness: average(nodes, (node) => node.readings.leafWetness),
      windSpeed: average(nodes, (node) => node.readings.windSpeed),
      solarRadiation: average(nodes, (node) => node.readings.solarRadiation)
    };
  }, [sensorsData]);

  const dashboardCards = useMemo(
    () => [
      { label: "Avg NDVI", value: indicesData?.summary.avgNdvi.toFixed(2) || "0.00", icon: Leaf, tone: "#3ddc6e" },
      { label: "Soil Moisture", value: `${sensorAverages.soilMoisture.toFixed(1)}%`, icon: Droplets, tone: "#7dd3fc" },
      {
        label: "Active Stress Zones",
        value: riskData?.zoneBreakdown.filter((zone) => ["Stressed", "Critical"].includes(zone.status)).length.toString() || "0",
        icon: AlertTriangle,
        tone: "#f59e0b"
      },
      {
        label: "Peak Pest Risk",
        value: `${Math.round(Math.max(...(riskData?.topRisks.map((risk) => risk.probability) || [0])) * 100)}%`,
        icon: Bug,
        tone: "#ef4444"
      }
    ],
    [indicesData?.summary.avgNdvi, riskData?.topRisks, riskData?.zoneBreakdown, sensorAverages.soilMoisture]
  );

  const handleExport = async () => {
    if (!selectedFieldId) return;
    const result = await agrosenseApi.generateReport(selectedFieldId);
    window.open(toAbsoluteAssetUrl(result.report.pdfUrl), "_blank", "noopener,noreferrer");
  };

  if (isFieldsLoading || !selectedField || !mapData || !indicesData || !riskData || !forecastData || !insightsData || !sensorsData || !sensorHistory) {
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
        onExport={handleExport}
        isRunning={triggerAnalysis.isPending}
      />

      <AlertBanner alert={highestAlert} onAcknowledge={(alertId) => acknowledgeAlert.mutate(alertId)} />

      <div className="grid gap-4 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[#6e8d75]">{card.label}</div>
                <div className="mt-3 text-3xl font-semibold">{card.value}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3" style={{ color: card.tone }}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr,0.95fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Field heat map</h2>
                <p className="text-sm text-[#8fb89a]">Zone-level NDVI status with live IoT overlay.</p>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8fb89a]">{realtime.status}</div>
            </div>
            <FieldMap
              geojson={mapData.geojson}
              zoneRisk={riskData.zoneBreakdown}
              sensorNodes={sensorsData.nodes}
              selectedZoneId={selectedZoneId || undefined}
              onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Radar className="h-5 w-5 text-[#3ddc6e]" />
              <div>
                <h2 className="text-xl font-semibold">LSTM forecast</h2>
                <p className="text-sm text-[#8fb89a]">30-day history plus 7-day forecast window for NDVI, NDRE, and SAVI.</p>
              </div>
            </div>
            <ForecastChart data={forecastData.series} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Sensor panel</h2>
                <p className="text-sm text-[#8fb89a]">Field-wide averages refreshed from the websocket stream.</p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{sensorRange}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SensorCard label="Moisture" value={sensorAverages.soilMoisture} unit="%" progress={sensorAverages.soilMoisture} tone={sensorAverages.soilMoisture < 40 ? "red" : "green"} />
              <SensorCard label="Humidity" value={sensorAverages.humidity} unit="%" progress={sensorAverages.humidity} tone={sensorAverages.humidity > 80 ? "yellow" : "green"} />
              <SensorCard label="Air Temp" value={sensorAverages.airTemperature} unit="C" progress={Math.min(sensorAverages.airTemperature * 3, 100)} tone={sensorAverages.airTemperature > 30 ? "orange" : "green"} />
              <SensorCard label="Leaf Wetness" value={sensorAverages.leafWetness} unit="idx" progress={sensorAverages.leafWetness * 100} tone={sensorAverages.leafWetness > 0.7 ? "red" : "yellow"} />
              <SensorCard label="Wind Speed" value={sensorAverages.windSpeed} unit="km/h" progress={sensorAverages.windSpeed * 6} tone="green" />
              <SensorCard label="Solar Rad" value={sensorAverages.solarRadiation} unit="W/m2" progress={Math.min(sensorAverages.solarRadiation / 8, 100)} tone="yellow" />
            </div>
            <div className="mt-6 h-[190px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensorHistory.series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={(value) => formatShortDate(value)} tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(value) => formatShortDateTime(String(value))}
                      contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                    />
                    <Line type="monotone" dataKey="soilMoisture" stroke="#3ddc6e" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="humidity" stroke="#7dd3fc" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <h2 className="text-xl font-semibold">Pest risk list</h2>
            <div className="mt-4 space-y-3">
              {riskData.topRisks.slice(0, 6).map((risk) => (
                <div key={`${risk.zoneId}-${risk.pestType}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <div className="font-medium">{risk.pestType}</div>
                    <div className="text-xs text-[#8fb89a]">{risk.zoneLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{Math.round(risk.probability * 100)}%</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{risk.severity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#3ddc6e]" />
            <h2 className="text-xl font-semibold">AI recommendations</h2>
          </div>
          <div className="grid gap-3">
            {insightsData.insights.map((insight) => (
              <div key={insight.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{insight.urgency}</div>
                  <div className="text-xs text-[#8fb89a]">{(insight.modelConfidence * 100).toFixed(0)}% confidence</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#dbe9df]">{insight.recommendation}</p>
                <div className="mt-3 text-xs text-[#6e8d75]">{insight.modelSource} • {formatRelativeTime(insight.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <ModelStatusPanel models={modelsData?.models || []} />
          <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
            <h2 className="text-xl font-semibold">Risk concentration</h2>
            <div className="mt-4 h-[230px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData.topRisks.slice(0, 5)}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="pestType" tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                  <Bar dataKey="probability" fill="#3ddc6e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <ZoneDrawer open={Boolean(selectedZone)} onOpenChange={(open) => !open && setSelectedZoneId(null)} zone={selectedZone} risk={selectedZoneRisk} />
    </div>
  );
}

