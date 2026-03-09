import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { StatCard } from "../components/StatCard";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function ProfitSimulatorPage() {
  const [form, setForm] = useState({
    crop: "Tomato",
    quantity: 120,
    priceToday: 21,
    price3Days: 24,
    price5Days: 23,
    holdingCost: 120,
    fieldLossPct: 4,
    harvestLossPct: 7,
    transportLossPct: 3
  });
  const mutate = useModuleAction(modulesApi.profitSimulate);
  const simulation = mutate.data?.simulation;
  const data = simulation
    ? [
        { name: "Today", value: simulation.scenarioToday },
        { name: "3 Days", value: simulation.scenario3Days },
        { name: "5 Days", value: simulation.scenario5Days }
      ]
    : [];

  return (
    <>
      <AppCard title="Profit Simulation">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              quantity: Number(form.quantity),
              priceToday: Number(form.priceToday),
              price3Days: Number(form.price3Days),
              price5Days: Number(form.price5Days),
              holdingCost: Number(form.holdingCost),
              fieldLossPct: Number(form.fieldLossPct),
              harvestLossPct: Number(form.harvestLossPct),
              transportLossPct: Number(form.transportLossPct)
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
              {mutate.isPending ? "Simulating..." : "Run Profit Simulation"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {simulation ? (
        <>
          <AppCard title="Simulation Output">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Today" value={simulation.scenarioToday} />
              <StatCard label="In 3 Days" value={simulation.scenario3Days} />
              <StatCard label="In 5 Days" value={simulation.scenario5Days} />
              <StatCard label="Recommended" value={simulation.recommendedOption} />
            </div>
          </AppCard>
          <AppCard title="Scenario Chart">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4ade80" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </>
      ) : null}
    </>
  );
}
