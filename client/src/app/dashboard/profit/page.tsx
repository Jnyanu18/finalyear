"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simulateProfit } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { readModuleSnapshot, saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type ProfitForm = {
  cropType: string;
  quantity: number;
  priceToday: number;
  holdingCost: number;
  marketLocation: string;
};

function estimateQuantityKg(defaults: ConnectedFarmDefaults, predictedYieldToday?: number) {
  if (Number.isFinite(predictedYieldToday) && Number(predictedYieldToday) > 0) {
    return Math.max(1, Math.round(Number(predictedYieldToday)));
  }

  const fieldEstimate =
    Number(defaults.fruitCount || 0) *
    Number(defaults.avgUnitWeightKg || 0.09) *
    Number(defaults.acres || 1) *
    Number(defaults.plantsPerAcre || 4500) *
    0.88;

  return Math.max(20, Math.round(fieldEstimate || 20));
}

function buildProfitForm(defaults: ConnectedFarmDefaults, predictedYieldToday?: number): ProfitForm {
  return {
    cropType: defaults.cropType || "Tomato",
    quantity: estimateQuantityKg(defaults, predictedYieldToday),
    priceToday: Number((defaults.marketPricePerKg || 20).toFixed(2)),
    holdingCost: 120,
    marketLocation: defaults.marketLocation || "Bengaluru"
  };
}

export default function ProfitPage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const yieldSnapshot = readModuleSnapshot<{ predictedYieldToday?: number }>("yield");
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfitForm>({
    cropType: "Tomato",
    quantity: 20,
    priceToday: 20,
    holdingCost: 120,
    marketLocation: "Bengaluru"
  });

  const run = async (override?: ProfitForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      priceCapturedAt: liveDefaults.updatedAt || undefined,
      fieldContext: liveFieldContext
    };

    const res = await simulateProfit(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("profit", res.data, payload);
    } else {
      setError(res.error || "Failed to run profit simulation.");
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

    const nextForm = buildProfitForm(liveDefaults, yieldSnapshot?.data?.predictedYieldToday);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext, yieldSnapshot?.data?.predictedYieldToday]);

  const chartData = result
    ? [
        { name: "Now", value: result.scenarioToday },
        { name: "+3d", value: result.scenario3Days },
        { name: "+5d", value: result.scenario5Days }
      ]
    : [];
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((entry) => entry.value)) : 0;

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profit Simulator</h1>
          <p className="mt-2 text-muted-foreground">Profit scenarios now use the connected quantity estimate, market location, and live price timestamp.</p>
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
          Live market feed: {liveDefaults.updatedAt ? formatRelativeTime(liveDefaults.updatedAt) : "waiting for stream"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Anchor price: INR {form.priceToday}/kg
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Crop Type</label>
            <Input value={form.cropType} onChange={(event) => setForm((current) => ({ ...current, cropType: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Quantity (kg)</label>
            <Input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Price Now (INR/kg)</label>
            <Input type="number" value={form.priceToday} onChange={(event) => setForm((current) => ({ ...current, priceToday: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Holding Cost (INR/day)</label>
            <Input type="number" value={form.holdingCost} onChange={(event) => setForm((current) => ({ ...current, holdingCost: Number(event.target.value) }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Market Hub</label>
            <Input value={form.marketLocation} onChange={(event) => setForm((current) => ({ ...current, marketLocation: event.target.value }))} className="h-9 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Running profit simulation...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">{error}</div>
      ) : result ? (
        <>
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommended Strategy</p>
                <h2 className="text-2xl font-bold text-foreground">{result.recommendedOption}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assumptions: now INR {result.assumptions?.priceToday}/kg, +3d INR {result.assumptions?.price3Days?.toFixed(2)}/kg, holding cost INR {result.assumptions?.holdingCost}/day.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0E1111]">
            <CardContent className="p-8">
              <h2 className="mb-6 text-xl font-semibold text-foreground">Profit Comparison</h2>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D2D" vertical={false} />
                    <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#6B7280" tick={{ fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => `INR ${value}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1A1D1D", borderColor: "#2A2D2D", borderRadius: "8px", color: "#fff" }}
                      formatter={(value) => [`INR ${Number(value || 0)}`, "Net Profit"]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.value === maxValue ? "#10B981" : "#2A2D2D"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {chartData.map((entry) => (
                  <div key={entry.name} className={`rounded-xl border p-4 text-center ${entry.value === maxValue ? "border-primary/30 bg-primary/10" : "border-white/5 bg-[#1A1D1D]"}`}>
                    <p className="text-sm text-muted-foreground">{entry.name}</p>
                    <p className={`text-2xl font-bold ${entry.value === maxValue ? "text-primary" : "text-foreground"}`}>INR {entry.value.toFixed(0)}</p>
                    {entry.value === maxValue ? <TrendingUp className="mx-auto mt-1 h-4 w-4 text-primary" /> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="py-20 text-center text-muted-foreground">Waiting for connected market data.</div>
      )}
    </div>
  );
}
