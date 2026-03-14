"use client";

import { useEffect, useRef, useState } from "react";
import { Award, MapPin, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bestMarketRoute } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { readModuleSnapshot, saveModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type MarketForm = {
  crop: string;
  quantity: number;
  farmerLocation: string;
  referencePricePerKg: number;
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

function buildMarketForm(defaults: ConnectedFarmDefaults, predictedYieldToday?: number): MarketForm {
  return {
    crop: defaults.cropType || "Tomato",
    quantity: estimateQuantityKg(defaults, predictedYieldToday),
    farmerLocation: defaults.marketLocation || "Bengaluru",
    referencePricePerKg: Number((defaults.marketPricePerKg || 20).toFixed(2))
  };
}

export default function MarketPage() {
  const { liveDefaults, liveFieldContext, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const yieldSnapshot = readModuleSnapshot<{ predictedYieldToday?: number }>("yield");
  const hydratedFieldKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MarketForm>({
    crop: "Tomato",
    quantity: 20,
    farmerLocation: "Bengaluru",
    referencePricePerKg: 20
  });

  const run = async (override?: MarketForm) => {
    const activeForm = override ?? form;
    setLoading(true);
    setError(null);

    const payload = {
      ...activeForm,
      marketRatesCapturedAt: liveDefaults.updatedAt || undefined,
      fieldContext: liveFieldContext
    };

    const res = await bestMarketRoute(payload);
    if (res.success && res.data) {
      setResult(res.data);
      saveModuleSnapshot("market", res.data, payload);
    } else {
      setError(res.error || "Failed to find the best market.");
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

    const nextForm = buildMarketForm(liveDefaults, yieldSnapshot?.data?.predictedYieldToday);
    hydratedFieldKey.current = fieldKey;
    setForm(nextForm);
    void run(nextForm);
  }, [isLoading, liveDefaults, selectedFieldId, liveFieldContext, yieldSnapshot?.data?.predictedYieldToday]);

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Market Routing</h1>
        <p className="mt-2 text-muted-foreground">The market recommendation now links crop, estimated sale quantity, and live price context from the active field.</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Field: {selectedField?.name || "Default field"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Live update: {liveDefaults.updatedAt ? formatRelativeTime(liveDefaults.updatedAt) : "waiting for stream"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Price anchor: INR {form.referencePricePerKg}/kg
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Crop Type</label>
            <Input value={form.crop} onChange={(event) => setForm((current) => ({ ...current, crop: event.target.value }))} className="h-10 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Quantity (kg)</label>
            <Input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} className="h-10 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Market Hub</label>
            <Input value={form.farmerLocation} onChange={(event) => setForm((current) => ({ ...current, farmerLocation: event.target.value }))} className="h-10 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Reference Price (INR/kg)</label>
            <Input type="number" step="0.01" value={form.referencePricePerKg} onChange={(event) => setForm((current) => ({ ...current, referencePricePerKg: Number(event.target.value) }))} className="h-10 border-white/10 bg-[#0E1111] text-sm text-foreground" />
          </div>
          <Button onClick={() => void run()} disabled={loading} className="h-10 shrink-0 gap-2 bg-primary px-6 hover:bg-primary/90">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Find Best Market
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Analyzing mandi prices...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">{error}</div>
      ) : result ? (
        <>
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="p-8">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-primary">Best Selling Point</p>
                  <h2 className="text-3xl font-bold text-foreground">{result.bestMarket}</h2>
                  <div className="mt-3 flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Price</p>
                      <p className="text-xl font-bold text-primary">INR {result.expectedPrice}/kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transport Cost</p>
                      <p className="text-xl font-bold text-foreground">INR {result.transportCost}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Profit</p>
                      <p className="text-xl font-bold text-green-400">INR {result.netProfit}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold text-foreground">All Markets</h3>
          <div className="grid gap-3">
            {result.options?.map((option: any, index: number) => (
              <Card key={option.market} className={`border ${index === 0 ? "border-primary/20 bg-primary/5" : "border-white/5 bg-[#1A1D1D]"}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {index === 0 ? <div className="h-2 w-2 rounded-full bg-primary" /> : null}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{option.market}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{option.distanceKm} km</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-semibold text-foreground">INR {option.expectedPrice}/kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Transport</p>
                      <p className="font-semibold text-foreground">INR {option.transportCost}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Net Profit</p>
                      <p className={`font-bold ${index === 0 ? "text-primary" : "text-foreground"}`}>INR {option.netProfit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-muted-foreground">Waiting for connected market data.</div>
      )}
    </div>
  );
}
