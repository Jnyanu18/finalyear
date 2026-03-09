"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, RefreshCw, Award } from "lucide-react";
import { bestMarketRoute } from "@/lib/api";
import { readMonitorSnapshot } from "@/lib/monitor-context";
import { saveModuleSnapshot } from "@/lib/module-context";

export default function MarketPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        return {
            crop: monitor?.cropType || "Tomato",
            quantity: Math.max(20, Math.round((monitor?.fruitCount || 100) * 0.1)),
        };
    });

    const run = async () => {
        setLoading(true); setError(null);
        const res = await bestMarketRoute(form);
        if (res.success) {
            setResult(res.data);
            saveModuleSnapshot("market", res.data, form);
        } else setError(res.error || "Failed.");
        setLoading(false);
    };
    useEffect(() => { run(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Market Routing</h1>
                <p className="text-muted-foreground mt-2">Find the highest-net-profit market for your harvest.</p>
            </div>

            <Card className="bg-[#1A1D1D] border-white/5">
                <CardContent className="p-6 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Crop Type</label>
                        <Input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-10 text-sm" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Quantity (kg)</label>
                        <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-10 text-sm" />
                    </div>
                    <Button onClick={run} disabled={loading} className="px-6 h-10 gap-2 bg-primary hover:bg-primary/90 shrink-0">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Find Best Market
                    </Button>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground">Analyzing mandi prices...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">{error}</div>
            ) : result ? (
                <>
                    {/* Best Market Banner */}
                    <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-8">
                            <div className="flex items-start gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                                    <Award className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-1">Best Selling Point</p>
                                    <h2 className="text-3xl font-bold text-foreground">{result.bestMarket}</h2>
                                    <div className="flex gap-6 mt-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Expected Price</p>
                                            <p className="text-xl font-bold text-primary">₹{result.expectedPrice}/kg</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Transport Cost</p>
                                            <p className="text-xl font-bold text-foreground">₹{result.transportCost}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Net Profit</p>
                                            <p className="text-xl font-bold text-green-400">₹{result.netProfit}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Options */}
                    <h3 className="text-lg font-semibold text-foreground">All Markets</h3>
                    <div className="grid gap-3">
                        {result.options?.map((opt: any, i: number) => (
                            <Card key={i} className={`border ${i === 0 ? "bg-primary/5 border-primary/20" : "bg-[#1A1D1D] border-white/5"}`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {i === 0 && <div className="h-2 w-2 bg-primary rounded-full"></div>}
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-foreground">{opt.market}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{opt.distanceKm} km</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Price</p>
                                            <p className="font-semibold text-foreground">₹{opt.expectedPrice}/kg</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Transport</p>
                                            <p className="font-semibold text-foreground">₹{opt.transportCost}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Net Profit</p>
                                            <p className={`font-bold ${i === 0 ? "text-primary" : "text-foreground"}`}>₹{opt.netProfit}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 text-muted-foreground">Enter crop details to find the best market.</div>
            )}
        </div>
    );
}
