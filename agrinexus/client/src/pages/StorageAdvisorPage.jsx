import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { StatCard } from "../components/StatCard";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function StorageAdvisorPage() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    temperature: 24,
    humidity: 76,
    ventilationScore: 0.75
  });

  const mutate = useModuleAction(modulesApi.storageAdvice);
  const advice = mutate.data?.advice;

  return (
    <>
      <AppCard title="Storage Decision Engine">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              temperature: Number(form.temperature),
              humidity: Number(form.humidity),
              ventilationScore: Number(form.ventilationScore)
            });
          }}
          className="grid gap-3 md:grid-cols-4"
        >
          {Object.entries(form).map(([key, value]) => (
            <FormField key={key} label={key}>
              <TextInput value={value} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
            </FormField>
          ))}
          <div className="md:col-span-4">
            <ActionButton type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "Evaluating..." : "Get Storage Advice"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {advice ? (
        <AppCard title="Storage Output">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Safe Storage Days" value={advice.safeStorageDays} />
            <StatCard label="Crop" value={advice.cropType} />
          </div>
          <p className="mt-3 text-slate-300">{advice.recommendation}</p>
        </AppCard>
      ) : null}
    </>
  );
}
