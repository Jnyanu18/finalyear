"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Warehouse, Thermometer, Droplets, RefreshCw, Clock } from "lucide-react";
import { storageAdvice } from "@/lib/api";
import { deriveHumidity, deriveTemperature, readMonitorSnapshot } from "@/lib/monitor-context";

export default function StoragePage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(() => {
        const monitor = readMonitorSnapshot();
        const healthStatus = monitor?.healthStatus || "moderate";
        return {
            cropType: monitor?.cropType || "Tomato",
            temperature: deriveTemperature(healthStatus),
            humidity: deriveHumidity(healthStatus),
            ventilationScore: 0.7,
        };
    });

    const run = async () => {
        setLoading(true); setError(null);
        const res = await storageAdvice(form);
        if (res.success) setResult(res.data); else setError(res.error || "Failed.");
        setLoading(false);
    };
    useEffect(() => { run(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Storage Advisor</h1>
                    <p className="text-muted-foreground mt-2">Know exactly how long your crop will stay fresh in current conditions.</p>
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
                        <label className="text-xs text-muted-foreground mb-1 block">Temperature (°C)</label>
                        <Input type="number" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Humidity (%)</label>
                        <Input type="number" value={form.humidity} onChange={e => setForm(f => ({ ...f, humidity: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Ventilation Score (0–1)</label>
                        <Input type="number" step="0.1" value={form.ventilationScore} onChange={e => setForm(f => ({ ...f, ventilationScore: Number(e.target.value) }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-[#0E1111] border-white/5">
                    <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-40">
                        <Thermometer className={`h-10 w-10 mb-3 ${form.temperature > 30 ? "text-red-400" : "text-primary"}`} />
                        <p className="text-3xl font-bold text-foreground">{form.temperature}°C</p>
                        <p className="text-sm text-muted-foreground mt-1">Storage Temperature</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#0E1111] border-white/5">
                    <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-40">
                        <Droplets className={`h-10 w-10 mb-3 ${form.humidity > 75 ? "text-red-400" : "text-blue-400"}`} />
                        <p className="text-3xl font-bold text-foreground">{form.humidity}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Relative Humidity</p>
                    </CardContent>
                </Card>
                <Card className={`border ${result && result.safeStorageDays <= 2 ? "bg-red-500/10 border-red-500/20" : "bg-primary/5 border-primary/20"}`}>
                    <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-40">
                        <Clock className={`h-10 w-10 mb-3 ${result && result.safeStorageDays <= 2 ? "text-red-400" : "text-primary"}`} />
                        <p className="text-3xl font-bold text-foreground">{loading ? "..." : result ? `${result.safeStorageDays} days` : "-"}</p>
                        <p className="text-sm text-muted-foreground mt-1">Safe Storage Duration</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-[#0E1111] border-white/5">
                <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Warehouse className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">AI Recommendation</h2>
                            {loading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Analyzing conditions...
                                </div>
                            ) : error ? (
                                <p className="text-red-400">{error}</p>
                            ) : result ? (
                                <p className="text-foreground text-lg">{result.recommendation}</p>
                            ) : (
                                <p className="text-muted-foreground">Enter storage conditions to get advice.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
