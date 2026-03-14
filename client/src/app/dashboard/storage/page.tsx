"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Droplets, RefreshCw, Thermometer, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storageAdvice } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type StorageForm = {
  cropType: string;
  temperature: number;
  humidity: number;
  ventilationScore: number;
};

function deriveVentilationScore(defaults: ConnectedFarmDefaults) {
  const windDriven = defaults.windSpeed / 14;
  const canopyAdjustment = defaults.canopyDensity === "high" ? -0.08 : defaults.canopyDensity === "low" ? 0.05 : 0;
  return Number(Math.min(1, Math.max(0.35, windDriven + 0.4 + canopyAdjustment)).toFixed(2));
}

function buildStorageForm(defaults: ConnectedFarmDefaults): StorageForm {
  return {
    cropType: defaults.cropType || "Tomato",
    temperature: Number((defaults.airTemperature || 26).toFixed(1)),
    humidity: Number((defaults.humidity || 68).toFixed(1)),
    ventilationScore: deriveVentilationScore(defaults)
  };
}

export default function StoragePage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<StorageForm>({
    cropType: "Tomato",
    temperature: 26,
    humidity: 68,
    ventilationScore: 0.7
  });

  const run = async (override?: StorageForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      fieldContext: liveFieldContext
    };

    const res = await storageAdvice(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("storage", res.data, payload);
    } else {
      setError(res.error || "Failed to fetch storage advice.");
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

    const nextForm = buildStorageForm(liveDefaults);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext]);

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Storage Advisor</h1>
          <p className="mt-2 text-muted-foreground">Storage recommendations now start from the live field air conditions and canopy-linked ventilation estimate.</p>
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
          Ventilation score: {form.ventilationScore.toFixed(2)}
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
            <label className="mb-1 block text-xs text-muted-foreground">Ventilation Score</label>
            <Input type="number" step="0.01" value={form.ventilationScore} onChange={(event) => setForm((current) => ({ ...current, ventilationScore: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-white/5 bg-[#0E1111]">
          <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <Thermometer className={`mb-3 h-10 w-10 ${form.temperature > 30 ? "text-red-400" : "text-primary"}`} />
            <p className="text-3xl font-bold text-foreground">{form.temperature}C</p>
            <p className="mt-1 text-sm text-muted-foreground">Storage Temperature</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0E1111]">
          <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <Droplets className={`mb-3 h-10 w-10 ${form.humidity > 75 ? "text-red-400" : "text-blue-400"}`} />
            <p className="text-3xl font-bold text-foreground">{form.humidity}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Relative Humidity</p>
          </CardContent>
        </Card>
        <Card className={`border ${result && result.safeStorageDays <= 2 ? "border-red-500/20 bg-red-500/10" : "border-primary/20 bg-primary/5"}`}>
          <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <Clock className={`mb-3 h-10 w-10 ${result && result.safeStorageDays <= 2 ? "text-red-400" : "text-primary"}`} />
            <p className="text-3xl font-bold text-foreground">{loading ? "..." : result ? `${result.safeStorageDays} days` : "-"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Safe Storage Duration</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-[#0E1111]">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Warehouse className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">AI Recommendation</h2>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Analyzing conditions...
                </div>
              ) : error ? (
                <p className="text-red-400">{error}</p>
              ) : result ? (
                <>
                  <p className="text-lg text-foreground">{result.recommendation}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This shelf-life estimate is tied to the live temperature and humidity stream rather than a synthetic health status.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Waiting for connected field data.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
