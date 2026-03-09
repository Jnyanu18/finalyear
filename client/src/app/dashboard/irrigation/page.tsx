"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplets, CloudRain, RefreshCw, Zap } from "lucide-react";
import { recommendIrrigation } from "@/lib/api";
import { readMonitorSnapshot } from "@/lib/monitor-context";
import { saveModuleSnapshot } from "@/lib/module-context";

export default function IrrigationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const monitor = readMonitorSnapshot();
    return {
      soilMoisture: "",
      rainForecastMm: 0,
      cropStage: monitor?.growthStage || "flowering",
    };
  });

  const soilMoistureValue = Number(form.soilMoisture);
  const hasSoilMoisture = form.soilMoisture !== "" && Number.isFinite(soilMoistureValue);

  const run = async () => {
    if (!hasSoilMoisture) {
      setError("Enter measured soil moisture to run irrigation planning.");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await recommendIrrigation({
      soilMoisture: soilMoistureValue,
      rainForecastMm: Number(form.rainForecastMm),
      cropStage: form.cropStage,
    });
    if (res.success) {
      setResult(res.data);
      saveModuleSnapshot("irrigation", res.data, {
        soilMoisture: soilMoistureValue,
        rainForecastMm: Number(form.rainForecastMm),
        cropStage: form.cropStage,
      });
    }
    else setError(res.error || "Failed.");
    setLoading(false);
  };

  useEffect(() => {
    setResult(null);
  }, [form.soilMoisture, form.rainForecastMm, form.cropStage]);

  const recColors: Record<string, string> = {
    "Irrigate today": "text-red-400",
    "Light irrigation": "text-orange-400",
    "Delay irrigation": "text-blue-400",
    "Skip irrigation": "text-primary",
  };
  const recColor = result ? recColors[result.recommendation] || "text-primary" : "text-muted-foreground";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Irrigation Planner</h1>
          <p className="text-muted-foreground mt-2">AI recommendation based on measured soil moisture and rain forecasts.</p>
        </div>
        <Button onClick={run} disabled={loading || !hasSoilMoisture} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="bg-[#1A1D1D] border-white/5">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Soil Moisture (%) - Manual Entry</label>
            <Input
              type="number"
              value={form.soilMoisture}
              onChange={(e) => setForm((f) => ({ ...f, soilMoisture: e.target.value }))}
              placeholder="Enter sensor reading (e.g. 52)"
              className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Use actual field sensor value; this is not auto-filled.</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rain Forecast (mm)</label>
            <Input
              type="number"
              value={form.rainForecastMm}
              onChange={(e) => setForm((f) => ({ ...f, rainForecastMm: Number(e.target.value) }))}
              className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Crop Stage</label>
            <Input
              value={form.cropStage}
              onChange={(e) => setForm((f) => ({ ...f, cropStage: e.target.value }))}
              className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#0E1111] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Droplets className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Soil Moisture</h3>
            </div>
            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
                  !hasSoilMoisture ? "bg-white/20" : soilMoistureValue < 40 ? "bg-red-400" : soilMoistureValue < 60 ? "bg-primary" : "bg-blue-400"
                }`}
                style={{ width: `${Math.min(100, hasSoilMoisture ? soilMoistureValue : 0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground">Dry (0%)</span>
              <span className={`text-sm font-bold ${!hasSoilMoisture ? "text-muted-foreground" : soilMoistureValue < 40 ? "text-red-400" : "text-primary"}`}>
                {hasSoilMoisture ? `${soilMoistureValue}%` : "--"}
              </span>
              <span className="text-xs text-muted-foreground">Saturated (100%)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {!hasSoilMoisture
                ? "Enter soil moisture reading to evaluate irrigation."
                : soilMoistureValue < 40
                  ? "Below healthy range - crops are stressed"
                  : soilMoistureValue > 70
                    ? "Adequate - no irrigation needed"
                    : "Good moisture level"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0E1111] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <CloudRain className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-foreground">Rain Forecast</h3>
            </div>
            <div className="text-center py-4">
              <CloudRain className={`h-12 w-12 mx-auto mb-3 ${form.rainForecastMm > 5 ? "text-blue-400" : "text-muted-foreground"}`} />
              <p className="text-4xl font-bold text-foreground">
                {form.rainForecastMm}
                <span className="text-lg text-muted-foreground ml-1">mm</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">expected in next 24 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0E1111] border-white/5">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">AI Recommendation</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Analyzing conditions...
            </div>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : result ? (
            <div className="space-y-3">
              <h3 className={`text-2xl font-bold ${recColor}`}>{result.recommendation}</h3>
              <p className="text-muted-foreground">{result.reason}</p>
              <p className="text-sm text-muted-foreground">
                Next review recommended in: <span className="text-foreground font-medium">{result.nextReviewHours} hours</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Enter moisture value and click Refresh.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
