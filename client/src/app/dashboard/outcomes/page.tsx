"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Send, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitOutcome } from "@/lib/api";
import { formatRelativeTime } from "@/lib/live-data";
import { readModuleSnapshot } from "@/lib/module-context";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";

type OutcomeForm = {
  crop: string;
  predictedYield: number;
  actualYield: number;
  predictedPrice: number;
  actualPrice: number;
  harvestDate: string;
};

function estimatePredictedYield(defaults: ConnectedFarmDefaults, predictedYieldToday?: number) {
  if (Number.isFinite(predictedYieldToday) && Number(predictedYieldToday) > 0) {
    return Number(predictedYieldToday);
  }

  const estimate =
    Number(defaults.fruitCount || 0) *
    Number(defaults.avgUnitWeightKg || 0.09) *
    Number(defaults.acres || 1) *
    Number(defaults.plantsPerAcre || 4500) *
    0.88;

  return Math.max(5, Number(estimate.toFixed(1)) || 5);
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildOutcomeForm(
  defaults: ConnectedFarmDefaults,
  predictedYieldToday?: number,
  predictedPrice?: number
): OutcomeForm {
  return {
    crop: defaults.cropType || "Tomato",
    predictedYield: estimatePredictedYield(defaults, predictedYieldToday),
    actualYield: 0,
    predictedPrice: Number((predictedPrice || defaults.marketPricePerKg || 20).toFixed(2)),
    actualPrice: 0,
    harvestDate: toDateInputValue(defaults.updatedAt)
  };
}

export default function OutcomesPage() {
  const { liveDefaults, selectedField, selectedFieldId, isLoading } = useConnectedFarmContext();
  const yieldSnapshot = readModuleSnapshot<{ predictedYieldToday?: number }>("yield");
  const marketSnapshot = readModuleSnapshot<{ expectedPrice?: number }>("market");
  const hydratedFieldKey = useRef<string | null>(null);
  const [form, setForm] = useState<OutcomeForm>({
    crop: "Tomato",
    predictedYield: 5,
    actualYield: 0,
    predictedPrice: 20,
    actualPrice: 0,
    harvestDate: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const fieldKey = selectedFieldId || "__default__";
    if (hydratedFieldKey.current === fieldKey) {
      return;
    }

    hydratedFieldKey.current = fieldKey;
    setForm(buildOutcomeForm(liveDefaults, yieldSnapshot?.data?.predictedYieldToday, marketSnapshot?.data?.expectedPrice));
  }, [isLoading, liveDefaults, selectedFieldId, yieldSnapshot?.data?.predictedYieldToday, marketSnapshot?.data?.expectedPrice]);

  const setField = (key: keyof OutcomeForm, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await submitOutcome({
      ...form,
      predictedYield: Number(form.predictedYield),
      actualYield: Number(form.actualYield),
      predictedPrice: Number(form.predictedPrice),
      actualPrice: Number(form.actualPrice)
    });

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "Submission failed.");
    }

    setLoading(false);
  };

  const accuracy = result?.outcome
    ? Math.round(100 - Math.abs(((result.outcome.actualYield - result.outcome.predictedYield) / result.outcome.predictedYield) * 100))
    : null;
  const yieldDiff = result?.outcome ? result.outcome.actualYield - result.outcome.predictedYield : 0;
  const priceDiff = result?.outcome ? result.outcome.actualPrice - result.outcome.predictedPrice : 0;

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Outcome Learning</h1>
        <p className="mt-2 text-muted-foreground">Predicted yield and price now inherit the latest connected field context instead of starting from arbitrary local values.</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Field: {selectedField?.name || "Default field"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Live update: {liveDefaults.updatedAt ? formatRelativeTime(liveDefaults.updatedAt) : "waiting for stream"}
        </span>
      </div>

      <Card className="border-white/5 bg-[#1A1D1D]">
        <CardContent className="p-6">
          <h2 className="mb-5 text-lg font-semibold text-foreground">Enter Actual Results</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Crop Type</label>
              <Input value={form.crop} onChange={(event) => setField("crop", event.target.value)} className="h-10 border-white/10 bg-[#0E1111] text-foreground" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Harvest Date</label>
              <Input type="date" value={form.harvestDate} onChange={(event) => setField("harvestDate", event.target.value)} className="h-10 border-white/10 bg-[#0E1111] text-foreground" />
            </div>

            <div className="md:col-span-2">
              <p className="mb-3 border-b border-white/5 pb-2 text-sm font-semibold text-muted-foreground">Yield Comparison</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Predicted Yield (kg)</label>
              <Input type="number" value={form.predictedYield} onChange={(event) => setField("predictedYield", event.target.value)} className="h-10 border-white/10 bg-[#0E1111] text-foreground" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Actual Yield (kg)</label>
              <Input type="number" value={form.actualYield} onChange={(event) => setField("actualYield", event.target.value)} placeholder="Enter actual kg harvested" className="h-10 border-white/10 border-primary/30 bg-[#0E1111] text-foreground" />
            </div>

            <div className="md:col-span-2">
              <p className="mb-3 border-b border-white/5 pb-2 text-sm font-semibold text-muted-foreground">Price Comparison</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Predicted Price (INR/kg)</label>
              <Input type="number" value={form.predictedPrice} onChange={(event) => setField("predictedPrice", event.target.value)} className="h-10 border-white/10 bg-[#0E1111] text-foreground" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Actual Selling Price (INR/kg)</label>
              <Input type="number" value={form.actualPrice} onChange={(event) => setField("actualPrice", event.target.value)} placeholder="Enter actual price received" className="h-10 border-white/10 border-primary/30 bg-[#0E1111] text-foreground" />
            </div>
          </div>

          <Button onClick={submit} disabled={loading || !form.actualYield || !form.actualPrice} className="mt-6 h-11 w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Submitting..." : "Submit & Update AI"}
          </Button>

          {error ? <div className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-400">{error}</div> : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Card className={`border ${accuracy && accuracy >= 80 ? "border-green-500/30 bg-green-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
            <CardContent className="flex items-center gap-5 p-6">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${accuracy && accuracy >= 80 ? "bg-green-500/20" : "bg-orange-500/20"}`}>
                <CheckCircle2 className={`h-8 w-8 ${accuracy && accuracy >= 80 ? "text-green-400" : "text-orange-400"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                <p className={`text-4xl font-black ${accuracy && accuracy >= 80 ? "text-green-400" : "text-orange-400"}`}>{accuracy}%</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {accuracy && accuracy >= 90 ? "Excellent. The model tracked the field outcome closely." : accuracy && accuracy >= 75 ? "Good accuracy. Keep feeding final outcomes back into the system." : "Accuracy is still improving. More connected outcomes will make the models sharper."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/5 bg-[#0E1111]">
              <CardContent className="p-5">
                <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">Yield Analysis</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Predicted</span>
                    <span className="font-semibold text-foreground">{result.outcome.predictedYield} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Actual</span>
                    <span className="text-lg font-bold text-foreground">{result.outcome.actualYield} kg</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-sm text-muted-foreground">Difference</span>
                    <span className={`flex items-center gap-1 font-bold ${yieldDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {yieldDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {yieldDiff >= 0 ? "+" : ""}
                      {yieldDiff.toFixed(1)} kg
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#0E1111]">
              <CardContent className="p-5">
                <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">Price Analysis</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Predicted</span>
                    <span className="font-semibold text-foreground">INR {result.outcome.predictedPrice}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Actual</span>
                    <span className="text-lg font-bold text-foreground">INR {result.outcome.actualPrice}/kg</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-sm text-muted-foreground">Difference</span>
                    <span className={`flex items-center gap-1 font-bold ${priceDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {priceDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {priceDiff >= 0 ? "+" : ""}
                      INR {priceDiff.toFixed(1)}/kg
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {result.intelligence ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Farm Intelligence Updated</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black text-foreground">{result.intelligence.totalOutcomes}</p>
                    <p className="text-xs text-muted-foreground">Total Outcomes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-primary">
                      {result.intelligence.avgYieldAccuracy != null ? `${(result.intelligence.avgYieldAccuracy * 100).toFixed(0)}%` : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">
                      {result.intelligence.avgActualPrice != null ? `INR ${result.intelligence.avgActualPrice.toFixed(0)}` : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Price</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
