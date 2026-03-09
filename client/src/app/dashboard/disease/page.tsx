"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Bug, Droplets, Thermometer, ShieldCheck, RefreshCw } from "lucide-react";
import { predictDisease } from "@/lib/api";
import { deriveHumidity, deriveTemperature, readMonitorSnapshot } from "@/lib/monitor-context";
import { saveModuleSnapshot } from "@/lib/module-context";

const riskColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    High: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
    Medium: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    Low: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", badge: "bg-primary/20 text-primary border-primary/30" },
};

export default function DiseaseRiskPage() {
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
            cropStage: monitor?.growthStage || "flowering",
        };
    });

    const run = async () => {
        setLoading(true);
        setError(null);
        const res = await predictDisease(form);
        if (res.success) {
            setResult(res.data);
            saveModuleSnapshot("disease", res.data, form);
        }
        else setError(res.error || "Failed to run disease assessment.");
        setLoading(false);
    };

    useEffect(() => { run(); }, []);

    const colors = result ? (riskColors[result.riskLevel] || riskColors["Low"]) : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Disease Risk Assessment</h1>
                    <p className="text-muted-foreground mt-2">Real-time AI analysis of crop health based on weather data and imagery.</p>
                </div>
                <Button onClick={run} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>

            {/* Input form */}
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
                        <label className="text-xs text-muted-foreground mb-1 block">Crop Stage</label>
                        <Input value={form.cropStage} onChange={e => setForm(f => ({ ...f, cropStage: e.target.value }))}
                            className="bg-[#0E1111] border-white/10 text-foreground h-9 text-sm" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Risk Summary */}
                <Card className={`bg-[#0E1111] border-white/5 relative overflow-hidden md:col-span-2 flex flex-col justify-center ${result ? colors?.bg : ""}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <CardContent className="p-8 relative z-10 flex flex-col md:flex-row gap-8 items-center h-full">
                        {loading ? (
                            <div className="flex items-center gap-4 w-full justify-center">
                                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-muted-foreground">Analyzing risk...</p>
                            </div>
                        ) : error ? (
                            <p className="text-red-400">{error}</p>
                        ) : result ? (
                            <>
                                <div className={`h-32 w-32 rounded-full ${colors?.bg} border-4 ${colors?.border} flex items-center justify-center shrink-0`}>
                                    {result.riskLevel === "Low" ? (
                                        <ShieldCheck className={`h-16 w-16 ${colors?.text}`} />
                                    ) : (
                                        <Bug className={`h-16 w-16 ${colors?.text}`} />
                                    )}
                                </div>
                                <div>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold tracking-widest border mb-4 ${colors?.badge}`}>
                                        {result.riskLevel === "Low" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                        {result.riskLevel.toUpperCase()} RISK
                                    </div>
                                    <h2 className="text-4xl font-bold text-foreground mb-2">{result.disease}</h2>
                                    <p className="text-lg text-muted-foreground">
                                        Probability: <span className={`font-bold ${colors?.text}`}>{(result.riskProbability * 100).toFixed(0)}%</span>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground">Run assessment to see results.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Risk Triggers */}
                <Card className="bg-[#1A1D1D] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-foreground mb-4">Risk Triggers</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-[#0A0C0C] p-3 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Thermometer className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Temperature</span>
                                </div>
                                <span className={`font-semibold ${form.temperature > 30 ? "text-orange-400" : "text-primary"}`}>{form.temperature}°C</span>
                            </div>
                            <div className="flex items-center justify-between bg-[#0A0C0C] p-3 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Droplets className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Humidity</span>
                                </div>
                                <span className={`font-semibold ${form.humidity > 75 ? "text-red-400" : "text-primary"}`}>{form.humidity}%</span>
                            </div>
                            <div className="flex items-center justify-between bg-[#0A0C0C] p-3 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Bug className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Crop Stage</span>
                                </div>
                                <span className="font-semibold text-foreground text-sm capitalize">{form.cropStage}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendations */}
            <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Immediate Recommendations</h3>
            {result ? (
                <div className={`rounded-xl border p-6 ${colors?.bg} ${colors?.border}`}>
                    {result.riskLevel === "High" && (
                        <ul className="space-y-2 text-sm text-foreground/80">
                            <li>• Apply copper-based fungicide spray within the next 24 hours.</li>
                            <li>• Increase ventilation around crop rows to reduce humidity.</li>
                            <li>• Monitor closely for visible lesions on leaves and stems.</li>
                        </ul>
                    )}
                    {result.riskLevel === "Medium" && (
                        <ul className="space-y-2 text-sm text-foreground/80">
                            <li>• Schedule preventive fungicide treatment within 3 days.</li>
                            <li>• Avoid overhead irrigation which increases leaf wetness.</li>
                            <li>• Check for early signs of disease every 48 hours.</li>
                        </ul>
                    )}
                    {result.riskLevel === "Low" && (
                        <p className="text-sm text-foreground/80">No immediate threats detected. Continue standard monitoring and maintain current conditions.</p>
                    )}
                </div>
            ) : (
                <div className="bg-[#1A1D1D] rounded-xl border border-white/5 p-8 text-center">
                    <p className="text-muted-foreground">No recent risk anomalies detected. Continue standard monitoring.</p>
                </div>
            )}
        </div>
    );
}
