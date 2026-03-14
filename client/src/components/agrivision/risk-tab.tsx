"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Bug, AlertTriangle, CheckCircle, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface ZoneRisk {
    id: string;
    location: string;
    risk: RiskLevel;
    threat: string;
    ndvi: number;
    action: string;
}

interface Factor {
    name: string;
    value: string;
    impact: "low" | "medium" | "high";
    description: string;
}

const RISK_ZONES: ZoneRisk[] = [
    { id: "B5", location: "East", risk: "Critical", threat: "Late Blight (Phytophthora)", ndvi: 0.37, action: "Apply fungicide immediately; isolate zone" },
    { id: "C5", location: "East", risk: "Critical", threat: "Late Blight (Phytophthora)", ndvi: 0.30, action: "Emergency fungicide spray; check soil drainage" },
    { id: "D4", location: "South", risk: "High", threat: "Aphid infestation", ndvi: 0.38, action: "Neem-based pesticide within 48 hours" },
    { id: "D5", location: "South-East", risk: "High", threat: "Aphid + Whitefly", ndvi: 0.25, action: "Broad-spectrum IPM intervention" },
    { id: "A5", location: "North-East", risk: "High", threat: "Early Blight (Alternaria)", ndvi: 0.42, action: "Copper-based fungicide; improve ventilation" },
    { id: "C4", location: "Center-E", risk: "Medium", threat: "Nutrient deficiency (N)", ndvi: 0.45, action: "Foliar nitrogen application; soil test" },
    { id: "D3", location: "South", risk: "Medium", threat: "Mite pressure", ndvi: 0.49, action: "Miticide spray; monitor weekly" },
    { id: "A4", location: "North", risk: "Medium", threat: "Boron deficiency", ndvi: 0.60, action: "Micronutrient foliar spray" },
    { id: "B4", location: "Center-E", risk: "Low", threat: "Minor stress", ndvi: 0.55, action: "Continue monitoring" },
    { id: "D2", location: "South", risk: "Low", threat: "Shade stress", ndvi: 0.58, action: "No immediate action" },
    { id: "A3", location: "North", risk: "Low", threat: "None detected", ndvi: 0.68, action: "Routine monitoring" },
    { id: "B3", location: "Center", risk: "Low", threat: "None detected", ndvi: 0.77, action: "Routine monitoring" },
];

const FACTORS: Factor[] = [
    { name: "Leaf Wetness", value: "0.62 (High)", impact: "high", description: "Extended leaf wetness promotes fungal spore germination and spread. Values >0.5 for >4 hrs indicate high disease risk." },
    { name: "Air Temperature", value: "28°C", impact: "medium", description: "Temperature in 20–30°C range is optimal for Phytophthora and Alternaria development." },
    { name: "Relative Humidity", value: "67%", impact: "medium", description: "Humidity above 65% sustained overnight creates favorable conditions for late blight." },
    { name: "NDVI Decline Rate", value: "−0.08/week (East zones)", impact: "high", description: "Rapid NDVI drop signals active tissue damage — correlates with fungal or pest outbreak." },
    { name: "Soil Moisture", value: "52% (Adequate)", impact: "low", description: "Soil moisture within normal range. Waterlogging could worsen Phytophthora risk." },
    { name: "Crop Growth Stage", value: "Fruiting", impact: "medium", description: "Fruiting stage plants are more susceptible to pest pressure and late season diseases." },
];

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
    Low: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle },
    Medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertTriangle },
    High: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: ShieldAlert },
    Critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: Bug },
};

function RiskBadge({ level }: { level: RiskLevel }) {
    const cfg = RISK_CONFIG[level];
    const Icon = cfg.icon;
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border", cfg.color, cfg.bg, cfg.border)}>
            <Icon className="h-3 w-3" />
            {level}
        </span>
    );
}

export function RiskTab() {
    const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
    const [filterRisk, setFilterRisk] = useState<RiskLevel | "All">("All");

    const counts = RISK_ZONES.reduce((acc, z) => { acc[z.risk] = (acc[z.risk] || 0) + 1; return acc; }, {} as Record<string, number>);
    const criticalCount = (counts["Critical"] || 0) + (counts["High"] || 0);
    const overallRisk: RiskLevel = counts["Critical"] ? "Critical" : counts["High"] ? "High" : counts["Medium"] ? "Medium" : "Low";
    const overallCfg = RISK_CONFIG[overallRisk];
    const OverallIcon = overallCfg.icon;

    const filteredZones = filterRisk === "All" ? RISK_ZONES : RISK_ZONES.filter(z => z.risk === filterRisk);

    const impactColor = { low: "text-emerald-500", medium: "text-yellow-500", high: "text-red-500" };
    const impactBg = { low: "bg-emerald-500", medium: "bg-yellow-500", high: "bg-red-500" };

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-300">
            {/* Overall Risk Banner */}
            <Card className={cn("border overflow-hidden", overallCfg.border, overallCfg.bg)}>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", overallCfg.bg, "border", overallCfg.border)}>
                                <OverallIcon className={cn("h-7 w-7", overallCfg.color)} />
                            </div>
                            <div>
                                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall Field Risk</div>
                                <div className={cn("font-headline text-3xl font-bold", overallCfg.color)}>{overallRisk} Risk</div>
                                <div className="text-sm text-muted-foreground mt-0.5">
                                    {criticalCount} zone{criticalCount !== 1 ? "s" : ""} require{criticalCount === 1 ? "s" : ""} immediate attention
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                            {(["Critical", "High", "Medium", "Low"] as RiskLevel[]).map(lvl => (
                                <div key={lvl} className="text-xs">
                                    <div className={cn("font-headline text-2xl font-bold", RISK_CONFIG[lvl].color)}>{counts[lvl] || 0}</div>
                                    <div className="text-muted-foreground">{lvl}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Zone Risk Table */}
                <Card className="lg:col-span-2 border-white/5 bg-card/60 backdrop-blur-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-headline text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Zone Risk Assessment
                                </CardTitle>
                                <CardDescription className="text-xs">Fusion of spectral anomalies + environmental sensor data</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(["All", "Critical", "High", "Medium", "Low"] as const).map(f => (
                                    <Button
                                        key={f}
                                        variant={filterRisk === f ? "default" : "ghost"}
                                        size="sm"
                                        className="h-6 rounded-full px-2.5 text-xs"
                                        onClick={() => setFilterRisk(f)}
                                    >
                                        {f}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {filteredZones.map(zone => (
                                <div
                                    key={zone.id}
                                    className={cn(
                                        "rounded-xl border p-3 transition-all",
                                        zone.risk === "Critical" ? "border-red-500/20 bg-red-500/5" :
                                            zone.risk === "High" ? "border-orange-500/20 bg-orange-500/5" :
                                                zone.risk === "Medium" ? "border-yellow-500/10 bg-yellow-500/5" :
                                                    "border-white/5 bg-muted/20"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-8 text-sm font-bold font-headline shrink-0">{zone.id}</span>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{zone.threat}</div>
                                                <div className="text-xs text-muted-foreground">{zone.location} · NDVI {zone.ndvi.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <RiskBadge level={zone.risk} />
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground pl-10">
                                        📋 {zone.action}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Contributing Factors */}
                <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-base">Contributing Factors</CardTitle>
                        <CardDescription className="text-xs">Environmental and spectral conditions driving risk</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {FACTORS.map(factor => (
                            <div
                                key={factor.name}
                                className="rounded-lg border border-white/5 bg-muted/20 overflow-hidden cursor-pointer"
                                onClick={() => setExpandedFactor(expandedFactor === factor.name ? null : factor.name)}
                            >
                                <div className="flex items-center justify-between gap-2 p-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn("h-2 w-2 rounded-full shrink-0", impactBg[factor.impact])} />
                                        <span className="text-sm font-medium truncate">{factor.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn("text-xs font-medium", impactColor[factor.impact])}>{factor.value}</span>
                                        {expandedFactor === factor.name
                                            ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                            : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                </div>
                                {expandedFactor === factor.name && (
                                    <div className="border-t border-white/5 px-3 pb-3 pt-2 text-xs text-muted-foreground leading-relaxed">
                                        {factor.description}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
