"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Sprout, Bug, Droplets, Package, BarChart2, TrendingUp, Warehouse, RefreshCw } from "lucide-react";
import { fetchReport } from "@/lib/api";

function safeDate(doc: any) {
    if (!doc?.createdAt) return "Not yet generated";
    return new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        const res = await fetchReport();
        if (res.success) setReport(res.data); else setError(res.error || "Failed to load report.");
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const sections = report ? [
        {
            title: "Crop Analysis Report",
            icon: Sprout,
            color: "text-primary",
            bg: "bg-primary/10",
            date: safeDate(report.crop),
            summary: report.crop ? `${report.crop.cropType} — ${report.crop.healthStatus || "Analyzed"}` : null,
        },
        {
            title: "Yield Prediction Report",
            icon: TrendingUp,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            date: safeDate(report.yieldPrediction),
            summary: report.yieldPrediction ? `Today: ${report.yieldPrediction.predictedYieldToday} kg  •  7-day: ${report.yieldPrediction.predictedYield7Days} kg  •  Confidence: ${(report.yieldPrediction.confidence * 100).toFixed(0)}%` : null,
        },
        {
            title: "Disease Risk Report",
            icon: Bug,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            date: safeDate(report.disease),
            summary: report.disease ? `${report.disease.disease} — ${report.disease.riskLevel} risk (${(report.disease.riskProbability * 100).toFixed(0)}%)` : null,
        },
        {
            title: "Irrigation Recommendation",
            icon: Droplets,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            date: safeDate(report.irrigation),
            summary: report.irrigation ? `${report.irrigation.recommendation} — ${report.irrigation.reason}` : null,
        },
        {
            title: "Harvest Plan",
            icon: Package,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            date: safeDate(report.harvest),
            summary: report.harvest ? `Ready today: ${report.harvest.readyToday} kg  •  Window: ${report.harvest.recommendedHarvestWindow}` : null,
        },
        {
            title: "Storage Advice",
            icon: Warehouse,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            date: safeDate(report.storage),
            summary: report.storage ? `Safe storage: ${report.storage.safeStorageDays} days for ${report.storage.cropType}` : null,
        },
        {
            title: "Market Route Analysis",
            icon: BarChart2,
            color: "text-green-400",
            bg: "bg-green-500/10",
            date: safeDate(report.market),
            summary: report.market ? `Best market: ${report.market.bestMarket}  •  Net profit: ₹${report.market.netProfit}` : null,
        },
        {
            title: "Profit Simulation",
            icon: TrendingUp,
            color: "text-pink-400",
            bg: "bg-pink-500/10",
            date: safeDate(report.profit),
            summary: report.profit ? `Recommended: ${report.profit.recommendedOption}  •  Today: ₹${report.profit.scenarioToday}` : null,
        },
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Farm Reports</h1>
                    <p className="text-muted-foreground mt-2">Summary of your latest AI-generated analyses and recommendations.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={load} disabled={loading} variant="outline" className="gap-2 border-white/10 bg-transparent hover:bg-white/5">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                        <FileText className="h-4 w-4" /> Generate Report
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground">Loading latest reports...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">{error}</div>
            ) : sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-[#0E1111] rounded-xl border border-white/5">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground text-center">No reports generated yet. Run analyses on Crop Monitor, Yield Forecast, or Disease Risk to generate your first report.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sections.map((s, i) => (
                        <Card key={i} className="bg-[#0A0C0C] border-white/5 hover:border-white/20 transition-all group overflow-hidden relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 group-hover:bg-primary transition-colors"></div>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`${s.bg} p-3 rounded-xl shrink-0`}>
                                            <s.icon className={`h-6 w-6 ${s.color}`} />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold text-foreground group-hover:text-primary transition-colors`}>{s.title}</h3>
                                            {s.summary ? (
                                                <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground/50 italic mt-1">Not yet generated</p>
                                            )}
                                            <span className="text-xs text-muted-foreground/50 mt-2 block">{s.date}</span>
                                        </div>
                                    </div>
                                    <Button variant="outline" disabled={!s.summary} className="gap-2 bg-transparent border-white/10 hover:bg-white/5 shrink-0 self-start md:self-center">
                                        <Download className="h-4 w-4" /> Export
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
