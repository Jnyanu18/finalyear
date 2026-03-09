"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, TrendingUp, TrendingDown, Send, RefreshCw } from "lucide-react";
import { readMonitorSnapshot } from "@/lib/monitor-context";
import { API_V1_BASE } from "@/lib/api-base";

async function submitOutcome(data: any) {
    try {
        const res = await fetch(`${API_V1_BASE}/outcome/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        const body = await res.json();
        return { success: res.ok, data: body?.data, error: body?.error };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export default function OutcomesPage() {
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        const estimatedYield = Math.max(5, Number(((monitor?.fruitCount || 500) * 0.09).toFixed(1)));
        return {
            crop: monitor?.cropType || "Tomato",
            predictedYield: estimatedYield,
            actualYield: 0,
            predictedPrice: 22,
            actualPrice: 0,
            harvestDate: new Date().toISOString().split('T')[0],
        };
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        setLoading(true); setError(null); setResult(null);
        const res = await submitOutcome({
            ...form,
            predictedYield: Number(form.predictedYield),
            actualYield: Number(form.actualYield),
            predictedPrice: Number(form.predictedPrice),
            actualPrice: Number(form.actualPrice),
        });
        if (res.success) setResult(res.data);
        else setError(res.error || "Submission failed.");
        setLoading(false);
    };

    const accuracy = result?.outcome
        ? Math.round(100 - Math.abs((result.outcome.actualYield - result.outcome.predictedYield) / result.outcome.predictedYield * 100))
        : null;

    const yieldDiff = result?.outcome ? result.outcome.actualYield - result.outcome.predictedYield : 0;
    const priceDiff = result?.outcome ? result.outcome.actualPrice - result.outcome.predictedPrice : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Outcome Learning</h1>
                <p className="text-muted-foreground mt-2">
                    Submit your actual harvest results to improve future AI predictions.
                </p>
            </div>

            {/* Input Form */}
            <Card className="bg-[#1A1D1D] border-white/5">
                <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-5">Enter Actual Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Crop Type</label>
                            <Input value={form.crop} onChange={e => setF('crop', e.target.value)}
                                className="bg-[#0E1111] border-white/10 text-foreground h-10" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Harvest Date</label>
                            <Input type="date" value={form.harvestDate} onChange={e => setF('harvestDate', e.target.value)}
                                className="bg-[#0E1111] border-white/10 text-foreground h-10" />
                        </div>

                        {/* Yield */}
                        <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-muted-foreground mb-3 border-b border-white/5 pb-2">Yield Comparison</p>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Predicted Yield (kg)</label>
                            <Input type="number" value={form.predictedYield} onChange={e => setF('predictedYield', e.target.value)}
                                className="bg-[#0E1111] border-white/10 text-foreground h-10" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Actual Yield (kg)</label>
                            <Input type="number" value={form.actualYield} onChange={e => setF('actualYield', e.target.value)}
                                placeholder="Enter actual kg harvested"
                                className="bg-[#0E1111] border-white/10 text-foreground h-10 border-primary/30" />
                        </div>

                        {/* Price */}
                        <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-muted-foreground mb-3 border-b border-white/5 pb-2">Price Comparison</p>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Predicted Price (₹/kg)</label>
                            <Input type="number" value={form.predictedPrice} onChange={e => setF('predictedPrice', e.target.value)}
                                className="bg-[#0E1111] border-white/10 text-foreground h-10" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Actual Selling Price (₹/kg)</label>
                            <Input type="number" value={form.actualPrice} onChange={e => setF('actualPrice', e.target.value)}
                                placeholder="Enter actual price received"
                                className="bg-[#0E1111] border-white/10 text-foreground h-10 border-primary/30" />
                        </div>
                    </div>

                    <Button onClick={submit} disabled={loading || !form.actualYield || !form.actualPrice}
                        className="w-full mt-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {loading ? 'Submitting...' : 'Submit & Update AI'}
                    </Button>

                    {error && <div className="mt-4 text-sm text-red-400 bg-red-500/10 rounded-xl p-4">{error}</div>}
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    {/* Accuracy Banner */}
                    <Card className={`border ${accuracy && accuracy >= 80 ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0 ${accuracy && accuracy >= 80 ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                                <CheckCircle2 className={`h-8 w-8 ${accuracy && accuracy >= 80 ? 'text-green-400' : 'text-orange-400'}`} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                                <p className={`text-4xl font-black ${accuracy && accuracy >= 80 ? 'text-green-400' : 'text-orange-400'}`}>{accuracy}%</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {accuracy && accuracy >= 90 ? 'Excellent! AI model is very accurate.' :
                                        accuracy && accuracy >= 75 ? 'Good accuracy. Keep recording outcomes.' :
                                            'Lower accuracy. More data will improve predictions.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Yield vs Price Comparison */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="bg-[#0E1111] border-white/5">
                            <CardContent className="p-5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Yield Analysis</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">Predicted</span>
                                        <span className="font-semibold text-foreground">{result.outcome.predictedYield} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">Actual</span>
                                        <span className="font-bold text-foreground text-lg">{result.outcome.actualYield} kg</span>
                                    </div>
                                    <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                                        <span className="text-muted-foreground text-sm">Difference</span>
                                        <span className={`font-bold flex items-center gap-1 ${yieldDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {yieldDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            {yieldDiff >= 0 ? '+' : ''}{yieldDiff.toFixed(1)} kg
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0E1111] border-white/5">
                            <CardContent className="p-5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Price Analysis</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">Predicted</span>
                                        <span className="font-semibold text-foreground">₹{result.outcome.predictedPrice}/kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">Actual</span>
                                        <span className="font-bold text-foreground text-lg">₹{result.outcome.actualPrice}/kg</span>
                                    </div>
                                    <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                                        <span className="text-muted-foreground text-sm">Difference</span>
                                        <span className={`font-bold flex items-center gap-1 ${priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {priceDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            {priceDiff >= 0 ? '+' : ''}₹{priceDiff.toFixed(1)}/kg
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Farm Intelligence */}
                    {result.intelligence && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-5">
                                <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-3">Farm Intelligence Updated</p>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-black text-foreground">{result.intelligence.totalOutcomes}</p>
                                        <p className="text-xs text-muted-foreground">Total Outcomes</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-primary">
                                            {result.intelligence.avgYieldAccuracy != null ? `${(result.intelligence.avgYieldAccuracy * 100).toFixed(0)}%` : '—'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-foreground">
                                            {result.intelligence.avgActualPrice != null ? `₹${result.intelligence.avgActualPrice.toFixed(0)}` : '—'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Avg Price</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
