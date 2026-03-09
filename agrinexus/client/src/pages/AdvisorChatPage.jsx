import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, TextInput } from "../components/FormField";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function AdvisorChatPage() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const mutate = useModuleAction(modulesApi.advisorChat);

  const ask = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setQuery("");
    mutate.mutate(
      { query: q },
      {
        onSuccess: (data) => {
          setHistory((h) => [...h, { role: "assistant", text: data.reply }]);
        }
      }
    );
  };

  return (
    <AppCard title="AI Advisor Chat" subtitle="Ask practical farm questions based on your latest predictions.">
      <div className="h-[420px] space-y-3 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3">
        {history.length === 0 ? <p className="text-sm text-slate-500">Try: Should I harvest tomorrow?</p> : null}
        {history.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-brand-600/30" : "bg-slate-800"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={ask} className="mt-3 flex gap-2">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask advisor..." />
        <ActionButton type="submit" disabled={mutate.isPending}>
          Send
        </ActionButton>
      </form>
      {mutate.error ? <p className="mt-2 text-sm text-red-400">{mutate.error.message}</p> : null}
    </AppCard>
  );
}
