"use client";

import { useEffect, useRef, useState } from "react";
import { CloudRain, Droplets, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recommendIrrigation } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type IrrigationForm = {
  cropType: string;
  soilMoisture: number;
  rainForecastMm: number;
  rainProbability: number;
  cropStage: string;
};

function buildIrrigationForm(defaults: ConnectedFarmDefaults): IrrigationForm {
  return {
    cropType: defaults.cropType || "Tomato",
    soilMoisture: Number((defaults.soilMoisture || 58).toFixed(1)),
    rainForecastMm: Number((defaults.rainForecastMm || 0).toFixed(1)),
    rainProbability: Number((defaults.rainProbability || 0.2).toFixed(2)),
    cropStage: defaults.growthStage || "flowering"
  };
}

export default function IrrigationPage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<IrrigationForm>({
    cropType: "Tomato",
    soilMoisture: 58,
    rainForecastMm: 0,
    rainProbability: 0.2,
    cropStage: "flowering"
  });

  const run = async (override?: IrrigationForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      fieldContext: liveFieldContext
    };

    const res = await recommendIrrigation(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("irrigation", res.data, payload);
    } else {
      setError(res.error || "Failed to run irrigation planning.");
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

    const nextForm = buildIrrigationForm(liveDefaults);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext]);

  const moistureColor =
    form.soilMoisture < 40 ? "bg-red-400" : form.soilMoisture < 60 ? "bg-primary" : "bg-blue-400";
  const recommendationColor: Record<string, string> = {
    "Irrigate today": "text-red-400",
    "Light irrigation": "text-orange-400",
    "Delay irrigation": "text-blue-400",
    "Skip irrigation": "text-primary"
  };

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Irrigation Planner</h1>
          <p className="mt-2 text-muted-foreground">The planner is now fed by live soil moisture, rain probability, and crop stage from the active field context.</p>
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
          Rain probability: {Math.round(form.rainProbability * 100)}%
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Type</label>
            <Input value={form.cropType} onChange={(event) => setForm((current) => ({ ...current, cropType: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Soil Moisture (%)</label>
            <Input type="number" value={form.soilMoisture} onChange={(event) => setForm((current) => ({ ...current, soilMoisture: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Rain Forecast (mm)</label>
            <Input type="number" value={form.rainForecastMm} onChange={(event) => setForm((current) => ({ ...current, rainForecastMm: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Stage</label>
            <Input value={form.cropStage} onChange={(event) => setForm((current) => ({ ...current, cropStage: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/5 bg-[#0E1111]">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Soil Moisture</h3>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-white/5">
              <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${moistureColor}`} style={{ width: `${Math.min(100, Math.max(0, form.soilMoisture))}%` }} />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-xs text-muted-foreground">Dry (0%)</span>
              <span className={`text-sm font-bold ${form.soilMoisture < 40 ? "text-red-400" : "text-primary"}`}>{form.soilMoisture}%</span>
              <span className="text-xs text-muted-foreground">Saturated (100%)</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {form.soilMoisture < 40
                ? "Below healthy range for the active crop stage."
                : form.soilMoisture > 70
                  ? "Adequate moisture level. Hold irrigation unless rainfall misses."
                  : "Moisture is inside the working band for most field operations."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0E1111]">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-foreground">Rain Feed</h3>
            </div>
            <div className="py-4 text-center">
              <CloudRain className={`mx-auto mb-3 h-12 w-12 ${form.rainForecastMm > 5 ? "text-blue-400" : "text-muted-foreground"}`} />
              <p className="text-4xl font-bold text-foreground">
                {form.rainForecastMm}
                <span className="ml-1 text-lg text-muted-foreground">mm</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{Math.round(form.rainProbability * 100)}% expected in the next cycle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-[#0E1111]">
        <CardContent className="p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">AI Recommendation</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Analyzing conditions...
            </div>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : result ? (
            <div className="space-y-3">
              <h3 className={`text-2xl font-bold ${recommendationColor[result.recommendation] || "text-primary"}`}>{result.recommendation}</h3>
              <p className="text-muted-foreground">{result.reason}</p>
              <div className="grid gap-4 pt-2 md:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-[#1A1D1D] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Next review</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{result.nextReviewHours} h</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#1A1D1D] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Water plan</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{result.litersPerAcre || 0} L/acre</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Waiting for connected field data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
