import { useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { StatCard } from "../components/StatCard";
import { useModuleAction } from "../hooks/useModuleAction";
import { modulesApi } from "../services/moduleApi";

export default function MarketRoutingPage() {
  const [form, setForm] = useState({
    crop: "Tomato",
    quantity: 120,
    farmerLocation: "Mandya"
  });
  const mutate = useModuleAction(modulesApi.marketBest);
  const market = mutate.data?.market;

  return (
    <>
      <AppCard title="Market Routing Engine">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({ ...form, quantity: Number(form.quantity) });
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
              {mutate.isPending ? "Routing..." : "Find Best Market"}
            </ActionButton>
          </div>
        </form>
      </AppCard>

      {market ? (
        <>
          <AppCard title="Best Market Output">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Best Market" value={market.bestMarket} />
              <StatCard label="Expected Price" value={market.expectedPrice} />
              <StatCard label="Transport Cost" value={market.transportCost} />
              <StatCard label="Net Profit" value={market.netProfit} />
            </div>
          </AppCard>

          <AppCard title="All Market Options">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-2">Market</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Distance</th>
                    <th className="py-2">Transport</th>
                    <th className="py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(market.options || []).map((row) => (
                    <tr key={row.market} className="border-b border-slate-900">
                      <td className="py-2">{row.market}</td>
                      <td className="py-2">{row.expectedPrice}</td>
                      <td className="py-2">{row.distanceKm} km</td>
                      <td className="py-2">{row.transportCost}</td>
                      <td className="py-2">{row.netProfit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AppCard>
        </>
      ) : null}
    </>
  );
}
