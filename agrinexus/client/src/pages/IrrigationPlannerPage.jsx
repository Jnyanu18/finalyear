import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function IrrigationPlannerPage() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    acres: 1,
    soilMoisture: 38,
    rainForecastMm: 4,
    et0Mm: 5,
    rootZoneDepthM: 0.35,
    soilWaterHoldingMmPerM: 120,
    irrigationEfficiencyPct: 82,
    cropStage: "flowering"
  });

  const mutate = useModuleAction(modulesApi.irrigationRecommend);
  const result = mutate.data?.recommendation;

  return (
    <>
      <AppCard title="Irrigation Intelligence">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              acres: Number(form.acres),
              soilMoisture: Number(form.soilMoisture),
              rainForecastMm: Number(form.rainForecastMm),
              et0Mm: Number(form.et0Mm),
              rootZoneDepthM: Number(form.rootZoneDepthM),
              soilWaterHoldingMmPerM: Number(form.soilWaterHoldingMmPerM),
              irrigationEfficiencyPct: Number(form.irrigationEfficiencyPct)
            });
          }}
          className="grid gap-3 md:grid-cols-4"
        >
          {Object.entries(form).map(([key, value]) => (
            <FormField key={key} label={key}>
              <TextInput value={value} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
            </FormField>
          ))}
          <div className="md:col-span-3">
            <ActionButton type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "Evaluating..." : "Get Irrigation Advice"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {result ? (
        <AppCard title="Recommendation">
          <p className="text-xl font-semibold text-brand-300">{result.recommendation}</p>
          <p className="mt-2 text-slate-300">{result.reason}</p>
          <p className="mt-2 text-sm text-slate-300">Water target: {result.litersPerAcre || 0} L/acre</p>
          <p className="mt-1 text-sm text-slate-400">Review again in {result.nextReviewHours} hours.</p>
        </AppCard>
      ) : null}
    </>
  );
}
