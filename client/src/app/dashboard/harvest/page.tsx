"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users, Package, RefreshCw } from "lucide-react";
import { planHarvest } from "@/lib/api";
import { deriveRipeRatio, readMonitorSnapshot } from "@/lib/monitor-context";

export default function HarvestPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        return {
            fruitCount: monitor?.fruitCount || 200,
            ripeRatio: deriveRipeRatio(monitor) ?? 0.45,
            avgFruitWeightKg: 0.09,
        };
    });

    const run = async () => {
        setLoading(true); setError(null);
        const res = await planHarvest(form);
        if (res.success) setResult(res.data); else setError(res.error || "Failed.");
        setLoading(false);
    };
    useEffect(() => { run(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Harvest Planner</h1>
                    <p className="text-muted-foreground mt-2">AI-guided harvest window and logistics planning.</p>
                </div>
                <Button onClick={run} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>

            {/* Inputs */}
            <Card className="bg-[#1A1D1D] border-white/5">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Total Fruit Count</label>
                        <Input type="number" value={form.fruitCount} onChange={e => setForm(f => ({ ...f, fruitCount: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Ripe Ratio (0–1)</label>
                        <Input type="number" step="0.05" value={form.ripeRatio} onChange={e => setForm(f => ({ ...f, ripeRatio: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Avg Fruit Weight (kg)</label>
                        <Input type="number" step="0.01" value={form.avgFruitWeightKg} onChange={e => setForm(f => ({ ...f, avgFruitWeightKg: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground">Planning harvest...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">{error}</div>
            ) : result ? (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-[#1A1D1D] border-white/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-xl text-primary"><Calendar className="h-6 w-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ready Today</p>
                                    <h3 className="text-2xl font-bold text-foreground">{result.readyToday} kg</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1A1D1D] border-white/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500"><Calendar className="h-6 w-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ready in 3 Days</p>
                                    <h3 className="text-2xl font-bold text-foreground">{result.ready3Days} kg</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1A1D1D] border-white/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500"><Calendar className="h-6 w-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Harvest Window</p>
                                    <h3 className="text-2xl font-bold text-foreground">{result.recommendedHarvestWindow}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-[#0E1111] border-white/5">
                        <CardContent className="p-8">
                            <h2 className="text-xl font-semibold text-foreground mb-6">Logistics Details</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Labor Recommendation</p>
                                        <p className="text-foreground mt-1">{result.harvestPlanDetails?.labourHint}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><Package className="h-6 w-6 text-blue-400" /></div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Estimated Crates</p>
                                        <p className="text-2xl font-bold text-foreground">{result.harvestPlanDetails?.crateEstimate}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="text-center py-20 text-muted-foreground">Enter crop data to generate a harvest plan.</div>
            )}
        </div>
    );
}
