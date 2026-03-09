import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";
import { StatCard } from "../components/StatCard";

export default function OutcomePage() {
  const [form, setForm] = useState({
    crop: "Tomato",
    predictedYield: 52,
    actualYield: 45,
    predictedPrice: 24,
    actualPrice: 22,
    harvestDate: new Date().toISOString().slice(0, 10)
  });

  const mutate = useModuleAction(modulesApi.submitOutcome);
  const outcome = mutate.data?.outcome;
  const intelligence = mutate.data?.intelligence;

  return (
    <>
      <AppCard title="Outcome Learning System" subtitle="Submit actual farm outcomes and train decision accuracy">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              ...form,
              predictedYield: Number(form.predictedYield),
              actualYield: Number(form.actualYield),
              predictedPrice: Number(form.predictedPrice),
              actualPrice: Number(form.actualPrice)
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
              {mutate.isPending ? "Submitting..." : "Submit Outcome"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {outcome ? (
        <AppCard title="Learning Output">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Yield Difference" value={outcome.yieldDifference} />
            <StatCard label="Price Difference" value={outcome.priceDifference} />
            <StatCard label="Prediction Accuracy" value={outcome.predictionAccuracy} />
            <StatCard label="Samples" value={intelligence?.sampleCount || 1} />
          </div>
        </AppCard>
      ) : null}
    </>
  );
}
