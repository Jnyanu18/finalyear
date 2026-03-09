import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";
import { StatCard } from "../components/StatCard";

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CropMonitorPage() {
  const [file, setFile] = useState(null);
  const [cropTypeHint, setCropTypeHint] = useState("Tomato");
  const [estimatedFruitCount, setEstimatedFruitCount] = useState(20);

  const analyze = useModuleAction(modulesApi.analyzePlant);

  const onAnalyze = async (e) => {
    e.preventDefault();
    const payload = { cropTypeHint, estimatedFruitCount: Number(estimatedFruitCount) };
    if (file) {
      payload.imageData = await toDataUrl(file);
      payload.mimeType = file.type || "image/jpeg";
    }
    analyze.mutate(payload);
  };

  const result = analyze.data?.analysis;

  return (
    <>
      <AppCard title="Crop Monitor" subtitle="Upload crop image and run Gemini-powered plant analysis">
        <form onSubmit={onAnalyze} className="grid gap-3 md:grid-cols-4">
          <FormField label="Crop type hint">
            <TextInput value={cropTypeHint} onChange={(e) => setCropTypeHint(e.target.value)} />
          </FormField>
          <FormField label="Estimated fruit count">
            <TextInput
              type="number"
              min={0}
              value={estimatedFruitCount}
              onChange={(e) => setEstimatedFruitCount(e.target.value)}
            />
          </FormField>
          <FormField label="Crop image (optional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-200"
            />
          </FormField>
          <div className="flex items-end">
            <ActionButton type="submit" className="w-full" disabled={analyze.isPending}>
              {analyze.isPending ? "Analyzing..." : "Analyze Plant"}
            </ActionButton>
          </div>
        </form>
        {analyze.error ? <p className="mt-3 text-sm text-red-400">{analyze.error.message}</p> : null}
      </AppCard>

      {result ? (
        <AppCard title="Analysis Output">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Crop Type" value={result.cropType} />
            <StatCard label="Growth Stage" value={result.growthStage || "-"} />
            <StatCard label="Fruit Count" value={result.fruitCount || 0} />
            <StatCard label="Health" value={result.healthStatus || "-"} />
          </div>
          <p className="mt-3 text-sm text-slate-300">{result.summary}</p>
          <pre className="mt-3 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            {JSON.stringify(result.stages || [], null, 2)}
          </pre>
        </AppCard>
      ) : null}
    </>
  );
}
