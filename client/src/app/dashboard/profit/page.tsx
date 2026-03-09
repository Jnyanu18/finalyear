"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, RefreshCw, Star } from "lucide-react";
import { simulateProfit } from "@/lib/api";
import { readMonitorSnapshot } from "@/lib/monitor-context";

export default function ProfitPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        return {
            cropType: monitor?.cropType || "Tomato",
            quantity: Math.max(20, Math.round((monitor?.fruitCount || 100) * 0.1)),
            priceToday: 20,
            holdingCost: 120,
        };
    });

    const run = async () => {
        setLoading(true); setError(null);
        const res = await simulateProfit(form);
        if (res.success) setResult(res.data); else setError(res.error || "Failed.");
        setLoading(false);
    };
    useEffect(() => { run(); }, []);

    const chartData = result ? [
        { name: "Today", value: result.scenarioToday },
        { name: "3 Days", value: result.scenario3Days },
        { name: "5 Days", value: result.scenario5Days },
    ] : [];

    const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Profit Simulator</h1>
                    <p className="text-muted-foreground mt-2">Compare harvest timing scenarios to find your optimal selling window.</p>
                </div>
                <Button onClick={run} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>

            <Card className="bg-[#1A1D1D] border-white/5">
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Crop Type</label>
                        <Input value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Quantity (kg)</label>
                        <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Price Today (₹/kg)</label>
                        <Input type="number" value={form.priceToday} onChange={e => setForm(f => ({ ...f, priceToday: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Holding Cost (₹/day)</label>
                        <Input type="number" value={form.holdingCost} onChange={e => setForm(f => ({ ...f, holdingCost: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground">Running profit simulation...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">{error}</div>
            ) : result ? (
                <>
                    {/* Best Option Banner */}
                    <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                <Star className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Recommended Strategy</p>
                                <h2 className="text-2xl font-bold text-foreground">{result.recommendedOption}</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Assumptions: Price today ₹{result.assumptions?.priceToday}/kg · 3-day ₹{result.assumptions?.price3Days?.toFixed(2)}/kg · Holding cost ₹{result.assumptions?.holdingCost}/day
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chart */}
                    <Card className="bg-[#0E1111] border-white/5">
                        <CardContent className="p-8">
                            <h2 className="text-xl font-semibold text-foreground mb-6">Profit Comparison</h2>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2D2D" vertical={false} />
                                        <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#6B7280" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1A1D1D', borderColor: '#2A2D2D', borderRadius: '8px', color: '#fff' }}
                                            formatter={(v: any) => [`₹${v}`, "Net Profit"]} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.value === maxVal ? "#10B981" : "#2A2D2D"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {chartData.map((d, i) => (
                                    <div key={i} className={`text-center p-4 rounded-xl border ${d.value === maxVal ? "bg-primary/10 border-primary/30" : "bg-[#1A1D1D] border-white/5"}`}>
                                        <p className="text-sm text-muted-foreground">{d.name}</p>
                                        <p className={`text-2xl font-bold ${d.value === maxVal ? "text-primary" : "text-foreground"}`}>₹{d.value.toFixed(0)}</p>
                                        {d.value === maxVal && <TrendingUp className="h-4 w-4 text-primary mx-auto mt-1" />}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="text-center py-20 text-muted-foreground">Enter crop details to run a profit simulation.</div>
            )}
        </div>
    );
}
