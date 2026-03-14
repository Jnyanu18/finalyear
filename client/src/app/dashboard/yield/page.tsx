"use client";

import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarDays, RefreshCw, Sprout, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { predictYield } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type YieldForm = {
  cropType: string;
  fruitsPerPlant: number;
  acres: number;
  plantsPerAcre: number;
  avgFruitWeightKg: number;
  postHarvestLossPct: number;
  cropStage: string;
  weatherScore: number;
};

function buildYieldForm(defaults: ConnectedFarmDefaults): YieldForm {
  return {
    cropType: defaults.cropType || "Tomato",
    fruitsPerPlant: Math.max(1, Math.round(defaults.fruitCount || 24)),
    acres: Math.max(0.1, Number(defaults.acres || 1)),
    plantsPerAcre: Math.max(1, Math.round(defaults.plantsPerAcre || 4500)),
    avgFruitWeightKg: Number(Math.max(0.01, defaults.avgUnitWeightKg || 0.09).toFixed(3)),
    postHarvestLossPct: 7,
    cropStage: defaults.growthStage || "fruit development",
    weatherScore: Number(Math.max(0.45, defaults.weatherScore || 0.82).toFixed(2))
  };
}

export default function YieldForecastPage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<YieldForm>({
    cropType: "Tomato",
    fruitsPerPlant: 24,
    acres: 1,
    plantsPerAcre: 4500,
    avgFruitWeightKg: 0.09,
    postHarvestLossPct: 7,
    cropStage: "fruit development",
    weatherScore: 0.82
  });

  const run = async (override?: YieldForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      fieldContext: liveFieldContext,
      weatherForecast: {
        temperature: liveFieldContext.weather.temperatureC,
        rainfall: liveFieldContext.weather.rainfallMm
      }
    };

    const res = await predictYield(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("yield", res.data, payload);
    } else {
      setError(res.error || "Failed to fetch yield prediction.");
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

    const nextForm = buildYieldForm(liveDefaults);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext]);

  const chartData = result
    ? [
        { label: "Current", yield: result.predictedYieldToday, expected: result.predictedYieldToday * 0.85 },
        { label: "+3d", yield: result.predictedYield3Days, expected: result.predictedYield3Days * 0.85 },
        { label: "+7d", yield: result.predictedYield7Days, expected: result.predictedYield7Days * 0.82 }
      ]
    : [];

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Yield Forecast</h1>
          <p className="mt-2 text-muted-foreground">This forecast is now linked to the selected field, live weather context, and the latest crop monitor result.</p>
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
          Weather score: {Math.round(form.weatherScore * 100)}%
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Type</label>
            <Input value={form.cropType} onChange={(event) => setForm((current) => ({ ...current, cropType: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fruits / Plant</label>
            <Input type="number" value={form.fruitsPerPlant} onChange={(event) => setForm((current) => ({ ...current, fruitsPerPlant: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Acres</label>
            <Input type="number" step="0.1" value={form.acres} onChange={(event) => setForm((current) => ({ ...current, acres: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Plants / Acre</label>
            <Input type="number" value={form.plantsPerAcre} onChange={(event) => setForm((current) => ({ ...current, plantsPerAcre: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Avg Unit Weight (kg)</label>
            <Input type="number" step="0.01" value={form.avgFruitWeightKg} onChange={(event) => setForm((current) => ({ ...current, avgFruitWeightKg: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Post-Harvest Loss (%)</label>
            <Input type="number" step="0.1" value={form.postHarvestLossPct} onChange={(event) => setForm((current) => ({ ...current, postHarvestLossPct: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Stage</label>
            <Input value={form.cropStage} onChange={(event) => setForm((current) => ({ ...current, cropStage: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Weather Score</label>
            <Input type="number" step="0.01" value={form.weatherScore} onChange={(event) => setForm((current) => ({ ...current, weatherScore: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-[#1A1D1D]">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><Sprout className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Est. Yield Now</p>
              <h3 className="text-2xl font-bold text-foreground">{result ? `${result.predictedYieldToday} kg` : "-"}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#1A1D1D]">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500"><TrendingUp className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Peak Yield (+7d)</p>
              <h3 className="text-2xl font-bold text-foreground">{result ? `${result.predictedYield7Days} kg` : "-"}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#1A1D1D]">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-xl bg-orange-500/10 p-3 text-orange-500"><CalendarDays className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Forecast Confidence</p>
              <h3 className="text-2xl font-bold text-foreground">{result ? `${(result.confidence * 100).toFixed(0)}%` : "-"}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-white/5 bg-[#0E1111]">
        <div className="pointer-events-none absolute right-0 top-0 -mr-40 -mt-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <CardContent className="relative z-10 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">7-Day Prediction Curve</h2>
              <p className="mt-1 text-sm text-muted-foreground">The curve is derived from the live field context for {form.cropType}.</p>
            </div>
            <div className="rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              {result ? `${(result.confidence * 100).toFixed(0)}% confidence` : "Awaiting data"}
            </div>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Running AI forecast...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-sm text-red-400">{error}</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B7280" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D2D" vertical={false} />
                  <XAxis dataKey="label" stroke="#6B7280" tick={{ fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#6B7280" tick={{ fill: "#6B7280" }} axisLine={false} tickLine={false} unit=" kg" />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D1D", borderColor: "#2A2D2D", borderRadius: "8px", color: "#fff" }} />
                  <Area type="monotone" dataKey="expected" stroke="#6B7280" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" name="Standard Growth" />
                  <Area type="monotone" dataKey="yield" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" name="AI Forecast" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data yet.</div>
            )}
          </div>

          {result ? (
            <div className="mt-8 flex items-center justify-between rounded-xl border border-white/5 bg-[#1A1D1D] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Actionable Insight</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    The +7 day window peaks at <strong className="text-primary">{result.predictedYield7Days} kg</strong> for the current field context.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Basis: {form.acres} acres x {form.plantsPerAcre} plants/acre x {form.fruitsPerPlant} fruits/plant x {form.avgFruitWeightKg} kg with {form.postHarvestLossPct}% post-harvest loss.
                  </p>
                </div>
              </div>
              <a href="/dashboard/harvest" className="flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80">
                Plan Harvest <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
