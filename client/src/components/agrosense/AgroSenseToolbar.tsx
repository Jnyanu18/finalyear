import { Download, Play, RefreshCw } from "lucide-react";
import type { FieldSummary } from "@/types/agrosense";

interface AgroSenseToolbarProps {
  fields: FieldSummary[];
  selectedFieldId: string;
  onSelectField: (fieldId: string) => void;
  onRunAnalysis: () => void;
  onExport: () => void;
  isRunning?: boolean;
}

export function AgroSenseToolbar({ fields, selectedFieldId, onSelectField, onRunAnalysis, onExport, isRunning = false }: AgroSenseToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0d1a10] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#6e8d75]">AgroSense AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Precision agriculture command layer</h1>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedFieldId}
          onChange={(event) => onSelectField(event.target.value)}
          className="min-w-[220px] rounded-2xl border border-white/10 bg-[#08110b] px-4 py-3 text-sm text-white outline-none"
        >
          {fields.map((field) => (
            <option key={field.id} value={field.id}>{field.name} • {field.cropType}</option>
          ))}
        </select>
        <button onClick={onExport} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10">
          <Download className="h-4 w-4" /> Export
        </button>
        <button onClick={onRunAnalysis} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3ddc6e] px-4 py-3 text-sm font-semibold text-[#08110b] transition hover:bg-[#2ec55f]">
          {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Analysis
        </button>
      </div>
    </div>
  );
}
