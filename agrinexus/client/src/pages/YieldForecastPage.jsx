import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";
import { StatCard } from "../components/StatCard";

export default function YieldForecastPage() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    cropStage: "fruiting",
    acres: 1,
    plantsPerAcre: 6000,
    fruitsPerPlant: 18,
    avgFruitWeightKg: 0.09,
    fieldLossPct: 4,
    harvestLossPct: 7,
    transportLossPct: 3,
    historicalYieldFactor: 1,
    weatherScore: 0.82
  });

  const mutate = useModuleAction(modulesApi.yieldPredict);
  const prediction = mutate.data?.prediction;
  const chartData = prediction
    ? [
        { label: "Today", value: prediction.predictedYieldToday },
        { label: "3 Days", value: prediction.predictedYield3Days },
        { label: "7 Days", value: prediction.predictedYield7Days }
      ]
    : [];

  return (
    <>
      <AppCard title="Yield Forecast Engine">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              acres: Number(form.acres),
              plantsPerAcre: Number(form.plantsPerAcre),
              fruitsPerPlant: Number(form.fruitsPerPlant),
              avgFruitWeightKg: Number(form.avgFruitWeightKg),
              fieldLossPct: Number(form.fieldLossPct),
              harvestLossPct: Number(form.harvestLossPct),
              transportLossPct: Number(form.transportLossPct),
              historicalYieldFactor: Number(form.historicalYieldFactor),
              weatherScore: Number(form.weatherScore)
            });
          }}
          className="grid gap-3 md:grid-cols-3"
        >
          {Object.entries(form).map(([key, value]) => (
            <FormField key={key} label={key}>
              <TextInput value={value} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
            </FormField>
          ))}
          <div className="md:col-span-3">
            <ActionButton type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "Predicting..." : "Run Yield Prediction"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {prediction ? (
        <>
          <AppCard title="Prediction Output">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Today" value={`${prediction.predictedYieldToday} kg`} />
              <StatCard label="3 Days" value={`${prediction.predictedYield3Days} kg`} />
              <StatCard label="7 Days" value={`${prediction.predictedYield7Days} kg`} />
              <StatCard label="Confidence" value={prediction.confidence} />
            </div>
            <p className="mt-3 text-sm text-slate-400">{prediction.explanation}</p>
          </AppCard>

          <AppCard title="Yield Curve">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area dataKey="value" stroke="#22c55e" fill="#22c55e33" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </>
      ) : null}
    </>
  );
}
