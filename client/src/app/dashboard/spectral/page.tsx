"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Layers3, LoaderCircle, Radar } from "lucide-react";
import { AgroSenseToolbar } from "@/components/agrosense/AgroSenseToolbar";
import { FieldMap } from "@/components/agrosense/FieldMap";
import { agrosenseApi, toAbsoluteAssetUrl } from "@/api/agrosense";
import { useAgroSenseFieldBundle, useAgroSenseFields, useTriggerFieldAnalysis } from "@/hooks/useAgroSense";
import { formatShortDateTime } from "@/lib/live-data";
import { useAgroSenseStore } from "@/store/agrosenseStore";
import type { FieldIndicesResponse, FieldMapResponse, RiskResponse, ZoneIndex } from "@/types/agrosense";

function getZoneBandValue(zone: ZoneIndex, wavelengthNm: number) {
  if (wavelengthNm < 520) return zone.ironOxideIndex;
  if (wavelengthNm < 610) return zone.evi;
  if (wavelengthNm < 720) return zone.ndvi;
  if (wavelengthNm < 810) return zone.ndre;
  if (wavelengthNm < 900) return zone.savi;
  return zone.smi;
}

function zoneTone(value: number) {
  if (value >= 0.7) return "#3ddc6e";
  if (value >= 0.55) return "#a5d83d";
  if (value >= 0.4) return "#f7d454";
  return "#ef4444";
}

export default function SpectralPage() {
  const { data: fieldsData } = useAgroSenseFields();
  const { selectedFieldId, sensorRange, setSelectedFieldId } = useAgroSenseStore();
  const bundle = useAgroSenseFieldBundle(selectedFieldId, sensorRange);
  const triggerAnalysis = useTriggerFieldAnalysis(selectedFieldId);
  const [bandIndex, setBandIndex] = useState(0);
  const [showAnomaly, setShowAnomaly] = useState(true);

  const fields = useMemo(() => fieldsData?.fields ?? [], [fieldsData?.fields]);

  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId, setSelectedFieldId]);

  const mapData = bundle.map.data as FieldMapResponse | undefined;
  const indicesData = bundle.indices.data as FieldIndicesResponse | undefined;
  const riskData = bundle.risk.data as RiskResponse | undefined;
  const band = indicesData?.spectralBands[bandIndex];

  const zoneBandResponse = useMemo(() => {
    if (!indicesData || !riskData || !band) {
      return [];
    }

    return indicesData.zones
      .map((zone) => {
        const risk = riskData.zoneBreakdown.find((entry) => entry.zoneId === zone.zoneId);
        const response = Number(getZoneBandValue(zone, band.wavelengthNm).toFixed(3));
        const peakRisk = risk ? Math.max(...risk.pestRisks.map((entry) => entry.probability), 0) : 0;

        return {
          zoneId: zone.zoneId,
          zoneLabel: zone.zoneLabel,
          status: zone.status,
          response,
          peakRisk,
          fill: zoneTone(response)
        };
      })
      .sort((left, right) => (showAnomaly ? left.response - right.response : right.response - left.response));
  }, [band, indicesData, riskData, showAnomaly]);

  const handleExport = async () => {
    if (!selectedFieldId) {
      return;
    }

    const result = await agrosenseApi.generateReport(selectedFieldId);
    window.open(toAbsoluteAssetUrl(result.report.pdfUrl), "_blank", "noopener,noreferrer");
  };

  if (!mapData || !indicesData || !riskData || !band) {
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

      <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Spectral view</h2>
            <p className="text-sm text-[#8fb89a]">Every panel on this page now reads from the actual field spectral bands and zone indices.</p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm">
            <input type="checkbox" checked={showAnomaly} onChange={(event) => setShowAnomaly(event.target.checked)} />
            Show lowest-response zones first
          </label>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-[#8fb89a]">
            <span>Band selector</span>
            <span>{band.wavelengthNm} nm | mean {band.mean.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max((indicesData.spectralBands.length || 1) - 1, 0)}
            value={bandIndex}
            onChange={(event) => setBandIndex(Number(event.target.value))}
            className="mt-3 w-full accent-[#3ddc6e]"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Radar className="h-5 w-5 text-[#3ddc6e]" />
            <div>
              <div className="text-lg font-semibold">Spectral signature</div>
              <div className="text-sm text-[#8fb89a]">Field-level band response across the captured wavelength stack.</div>
            </div>
          </div>
          <div className="h-[420px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={indicesData.spectralBands}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="wavelengthNm" tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} unit="nm" />
                <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(value) => `${value} nm`} contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                <ReferenceLine x={band.wavelengthNm} stroke="#f7d454" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="min" stroke="#7dd3fc" dot={false} strokeWidth={1.8} />
                <Line type="monotone" dataKey="mean" stroke="#3ddc6e" dot={false} strokeWidth={2.5} />
                <Line type="monotone" dataKey="max" stroke="#f59e0b" dot={false} strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-[#7dd3fc]" />
            <div>
              <div className="text-lg font-semibold">Index map overlay</div>
              <div className="text-sm text-[#8fb89a]">Zone map linked to the same field bundle used by dashboard and alerts.</div>
            </div>
          </div>
          <FieldMap geojson={mapData.geojson} zoneRisk={riskData.zoneBreakdown} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <h2 className="text-xl font-semibold">Band histogram</h2>
          <p className="text-sm text-[#8fb89a]">Distribution for the selected wavelength captured at {formatShortDateTime(indicesData.updatedAt)}.</p>
          <div className="mt-4 h-[320px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={band.histogram}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                <Area type="monotone" dataKey="value" stroke="#3ddc6e" fill="#3ddc6e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <h2 className="text-xl font-semibold">Zone response for {band.wavelengthNm} nm</h2>
          <p className="text-sm text-[#8fb89a]">
            {showAnomaly ? "Lowest-response zones are surfaced first to focus field inspection." : "Highest-response zones are surfaced first."}
          </p>
          <div className="mt-4 h-[320px] rounded-3xl border border-white/10 bg-[#08110b] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneBandResponse}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="zoneLabel" tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                <Bar dataKey="response" radius={[8, 8, 0, 0]}>
                  {zoneBandResponse.map((entry) => (
                    <Cell key={entry.zoneId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {zoneBandResponse.slice(0, 4).map((zone) => (
              <div key={zone.zoneId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{zone.zoneLabel}</div>
                    <div className="text-xs text-[#8fb89a]">{zone.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold" style={{ color: zone.fill }}>{zone.response.toFixed(3)}</div>
                    <div className="text-xs text-[#8fb89a]">{Math.round(zone.peakRisk * 100)}% risk</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
