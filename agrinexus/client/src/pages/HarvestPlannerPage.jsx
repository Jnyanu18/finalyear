import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { StatCard } from "../components/StatCard";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function HarvestPlannerPage() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    acres: 1,
    plantsPerAcre: 6000,
    fruitsPerPlant: 18,
    ripeRatio: 0.4,
    avgFruitWeightKg: 0.09
  });

  const mutate = useModuleAction(modulesApi.harvestPlan);
  const plan = mutate.data?.plan;

  return (
    <>
      <AppCard title="Harvest Planning">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              cropType: form.cropType,
              acres: Number(form.acres),
              plantsPerAcre: Number(form.plantsPerAcre),
              fruitsPerPlant: Number(form.fruitsPerPlant),
              ripeRatio: Number(form.ripeRatio),
              avgFruitWeightKg: Number(form.avgFruitWeightKg)
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
              {mutate.isPending ? "Planning..." : "Generate Harvest Plan"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {plan ? (
        <>
          <AppCard title="Harvest Readiness">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Ready Today" value={`${plan.readyToday} kg`} />
              <StatCard label="Ready in 3 Days" value={`${plan.ready3Days} kg`} />
              <StatCard label="Window" value={plan.recommendedHarvestWindow} />
            </div>
          </AppCard>
          <AppCard title="Readiness Chart">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Today", value: plan.readyToday },
                    { name: "3 Days", value: plan.ready3Days }
                  ]}
                >
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </>
      ) : null}
    </>
  );
}
