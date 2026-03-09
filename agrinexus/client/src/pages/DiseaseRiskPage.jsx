import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { StatCard } from "../components/StatCard";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function DiseaseRiskPage() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    cropStage: "fruiting",
    temperature: 30,
    humidity: 82,
    leafWetnessPct: 65,
    symptomSignal: 0.35
  });

  const mutate = useModuleAction(modulesApi.diseasePredict);
  const prediction = mutate.data?.prediction;

  return (
    <>
      <AppCard title="Disease Risk Forecast">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              temperature: Number(form.temperature),
              humidity: Number(form.humidity),
              leafWetnessPct: Number(form.leafWetnessPct),
              symptomSignal: Number(form.symptomSignal)
            });
          }}
          className="grid gap-3 md:grid-cols-6"
        >
          {Object.entries(form).map(([key, value]) => (
            <FormField key={key} label={key}>
              <TextInput value={value} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
            </FormField>
          ))}
          <div className="md:col-span-4">
            <ActionButton type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "Forecasting..." : "Run Disease Forecast"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {prediction ? (
        <AppCard title="Risk Output">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Likely Disease" value={prediction.disease} />
            <StatCard label="Probability" value={prediction.riskProbability} />
            <StatCard label="Risk Level" value={prediction.riskLevel} />
          </div>
          <p className="mt-3 text-sm text-slate-400">{prediction.explanation}</p>
        </AppCard>
      ) : null}
    </>
  );
}
