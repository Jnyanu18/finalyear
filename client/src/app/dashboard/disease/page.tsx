"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bug, Droplets, RefreshCw, ShieldCheck, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { predictDisease } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type DiseaseForm = {
  cropType: string;
  temperature: number;
  humidity: number;
  cropStage: string;
};

const riskColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  High: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400 border-red-500/30"
  },
  Medium: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30"
  },
  Low: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    badge: "bg-primary/20 text-primary border-primary/30"
  }
};

function buildDiseaseForm(defaults: ConnectedFarmDefaults): DiseaseForm {
  return {
    cropType: defaults.cropType || "Tomato",
    temperature: Number((defaults.airTemperature || 26).toFixed(1)),
    humidity: Number((defaults.humidity || 68).toFixed(1)),
    cropStage: defaults.growthStage || "flowering"
  };
}

export default function DiseaseRiskPage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DiseaseForm>({
    cropType: "Tomato",
    temperature: 26,
    humidity: 68,
    cropStage: "flowering"
  });

  const run = async (override?: DiseaseForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      fieldContext: liveFieldContext
    };

    const res = await predictDisease(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("disease", res.data, payload);
    } else {
      setError(res.error || "Failed to run disease assessment.");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const fieldKey = selectedFieldId || "__default__";
    if (hydratedFieldKey.current === fieldKey) {
      return;
    }

    const nextForm = buildDiseaseForm(liveDefaults);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext]);

  const colors = result ? riskColors[result.riskLevel] || riskColors.Low : null;
  const channels = result?.channels || {};

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Disease Risk Assessment</h1>
          <p className="mt-2 text-muted-foreground">Temperature, humidity, and crop stage are now pulled from the connected field context instead of guessed health buckets.</p>
        </div>
        <Button onClick={() => void run()} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Field: {selectedField?.name || "Default field"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Live update: {liveDefaults.updatedAt ? formatRelativeTime(liveDefaults.updatedAt) : "waiting for stream"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Leaf wetness: {liveDefaults.leafWetness.toFixed(2)} idx
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Type</label>
            <Input value={form.cropType} onChange={(event) => setForm((current) => ({ ...current, cropType: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Temperature (C)</label>
            <Input type="number" value={form.temperature} onChange={(event) => setForm((current) => ({ ...current, temperature: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Humidity (%)</label>
            <Input type="number" value={form.humidity} onChange={(event) => setForm((current) => ({ ...current, humidity: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Stage</label>
            <Input value={form.cropStage} onChange={(event) => setForm((current) => ({ ...current, cropStage: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={`relative overflow-hidden border-white/5 md:col-span-2 ${result ? colors?.bg : "bg-[#0E1111]"}`}>
          <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <CardContent className="relative z-10 flex h-full flex-col items-center gap-8 p-8 md:flex-row">
            {loading ? (
              <div className="flex w-full items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Analyzing risk...</p>
              </div>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : result ? (
              <>
                <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 ${colors?.bg} ${colors?.border}`}>
                  {result.riskLevel === "Low" ? <ShieldCheck className={`h-16 w-16 ${colors?.text}`} /> : <Bug className={`h-16 w-16 ${colors?.text}`} />}
                </div>
                <div>
                  <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold tracking-widest ${colors?.badge}`}>
                    {result.riskLevel === "Low" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {result.riskLevel.toUpperCase()} RISK
                  </div>
                  <h2 className="mb-2 text-4xl font-bold text-foreground">{result.disease}</h2>
                  <p className="text-lg text-muted-foreground">
                    Probability: <span className={`font-bold ${colors?.text}`}>{(result.riskProbability * 100).toFixed(0)}%</span>
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">{result.explanation}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Run assessment to see results.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#1A1D1D]">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">Risk Triggers</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0A0C0C] p-3">
                <div className="flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Temperature</span>
                </div>
                <span className={`font-semibold ${form.temperature > 30 ? "text-orange-400" : "text-primary"}`}>{form.temperature}C</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0A0C0C] p-3">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Humidity</span>
                </div>
                <span className={`font-semibold ${form.humidity > 75 ? "text-red-400" : "text-primary"}`}>{form.humidity}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0A0C0C] p-3">
                <div className="flex items-center gap-3">
                  <Bug className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Crop Stage</span>
                </div>
                <span className="text-sm font-semibold capitalize text-foreground">{form.cropStage}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="mb-4 mt-8 text-xl font-semibold text-foreground">Immediate Recommendations</h3>
      {result ? (
        <div className={`rounded-xl border p-6 ${colors?.bg} ${colors?.border}`}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Humidity factor</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{Math.round((channels.humidityFactor || 0) * 100)}%</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Temperature fit</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{Math.round((channels.temperatureFactor || 0) * 100)}%</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Stage susceptibility</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{Math.round((channels.cropStageFactor || 0) * 100)}%</p>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm text-foreground/80">
            {result.riskLevel === "High" ? (
              <>
                <p>Scout the humid zones first and isolate symptomatic plants before the next irrigation cycle.</p>
                <p>Reduce overnight canopy wetness and prepare a targeted protection block for the active stage.</p>
                <p>Re-check this module after the next sensor refresh to confirm the risk is falling.</p>
              </>
            ) : result.riskLevel === "Medium" ? (
              <>
                <p>Keep preventive treatment ready and avoid actions that increase leaf wetness during this stage.</p>
                <p>Inspect the canopy every 24 to 48 hours, focusing on the most humid zones.</p>
              </>
            ) : (
              <p>No immediate anomaly is dominating the field. Continue standard scouting with the current live thresholds.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-[#1A1D1D] p-8 text-center">
          <p className="text-muted-foreground">No recent risk anomalies detected. Continue standard monitoring.</p>
        </div>
      )}
    </div>
  );
}
