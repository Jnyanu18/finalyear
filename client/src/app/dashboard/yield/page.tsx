"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, CalendarDays, Sprout, ArrowRight, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { predictYield } from "@/lib/api";
import { deriveWeatherScore, readMonitorSnapshot } from "@/lib/monitor-context";
import { saveModuleSnapshot } from "@/lib/module-context";

export default function YieldForecastPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        return {
            cropType: monitor?.cropType || "Tomato",
            fruitsPerPlant: monitor?.fruitCount || 25,
            acres: 1,
            plantsPerAcre: 4500,
            avgFruitWeightKg: 0.09,
            postHarvestLossPct: 7,
            cropStage: monitor?.growthStage || "ripening",
            weatherScore: deriveWeatherScore(monitor?.healthStatus || "healthy"),
        };
    });

    const getRisk = async () => {
        setLoading(true);
        setError(null);
        const res = await predictYield(form);
        if (res.success && res.data) {
            setResult(res.data);
            saveModuleSnapshot("yield", res.data, form);
        } else {
            setError(res.error || "Failed to fetch yield prediction.");
        }
        setLoading(false);
    };

    useEffect(() => { getRisk(); }, []);

    const chartData = result ? [
        { day: "Today", yield: result.predictedYieldToday, expected: result.predictedYieldToday * 0.85 },
        { day: "Day 3", yield: result.predictedYield3Days, expected: result.predictedYield3Days * 0.85 },
        { day: "Day 7", yield: result.predictedYield7Days, expected: result.predictedYield7Days * 0.82 },
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Yield Forecast</h1>
                    <p className="text-muted-foreground mt-2">AI-driven predictions for your crop's readiness and harvest volume.</p>
                </div>
                <Button onClick={getRisk} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>

            {/* Inputs */}
            <Card className="bg-[#1A1D1D] border-white/5">
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Crop Type</label>
                        <Input value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Fruits / Plant</label>
                        <Input type="number" value={form.fruitsPerPlant} onChange={e => setForm(f => ({ ...f, fruitsPerPlant: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Acres</label>
                        <Input type="number" step="0.1" value={form.acres} onChange={e => setForm(f => ({ ...f, acres: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Plants / Acre</label>
                        <Input type="number" value={form.plantsPerAcre} onChange={e => setForm(f => ({ ...f, plantsPerAcre: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Avg Weight (kg)</label>
                        <Input type="number" step="0.01" value={form.avgFruitWeightKg} onChange={e => setForm(f => ({ ...f, avgFruitWeightKg: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Post-Harvest Loss (%)</label>
                        <Input type="number" step="0.1" value={form.postHarvestLossPct} onChange={e => setForm(f => ({ ...f, postHarvestLossPct: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Crop Stage</label>
                        <Input value={form.cropStage} onChange={e => setForm(f => ({ ...f, cropStage: e.target.value }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-[#1A1D1D] border-white/10">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl text-primary"><Sprout className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Est. Yield Today</p>
                            <h3 className="text-2xl font-bold text-foreground">{result ? `${result.predictedYieldToday} kg` : "-"}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1A1D1D] border-white/10">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500"><TrendingUp className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Peak Yield (Day +7)</p>
                            <h3 className="text-2xl font-bold text-foreground">{result ? `${result.predictedYield7Days} kg` : "-"}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1A1D1D] border-white/10">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500"><CalendarDays className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Forecast Confidence</p>
                            <h3 className="text-2xl font-bold text-foreground">{result ? `${(result.confidence * 100).toFixed(0)}%` : "-"}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart */}
            <Card className="bg-[#0E1111] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                <CardContent className="p-8 relative z-10">
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">7-Day Prediction Curve</h2>
                            <p className="text-sm text-muted-foreground mt-1">AI forecasted yield for {form.cropType}.</p>
                        </div>
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/30">
                            {result ? `${(result.confidence * 100).toFixed(0)}% confidence` : "Awaiting data"}
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-muted-foreground text-sm">Running AI forecast...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6B7280" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D2D" vertical={false} />
                                    <XAxis dataKey="day" stroke="#6B7280" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#6B7280" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} unit=" kg" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1A1D1D', borderColor: '#2A2D2D', borderRadius: '8px', color: '#fff' }} />
                                    <Area type="monotone" dataKey="expected" stroke="#6B7280" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" name="Standard Growth" />
                                    <Area type="monotone" dataKey="yield" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" name="AI Forecast" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No data yet.</div>
                        )}
                    </div>

                    {result && (
                        <div className="mt-8 bg-[#1A1D1D] p-5 rounded-xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">Actionable Insight</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Day 7 yield of <strong className="text-primary">{result.predictedYield7Days} kg</strong> is the peak harvest opportunity.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Estimation basis: {form.acres} acres × {form.plantsPerAcre} plants/acre × {form.fruitsPerPlant} fruits/plant × {form.avgFruitWeightKg} kg,
                                        with {form.postHarvestLossPct}% post-harvest loss.
                                    </p>
                                </div>
                            </div>
                            <a href="/dashboard/harvest" className="flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors">
                                Plan Harvest <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
