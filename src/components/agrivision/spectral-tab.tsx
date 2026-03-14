"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type SpectralIndex = "NDVI" | "NDRE" | "EVI" | "SAVI";

interface ZoneData {
    id: string;
    row: number;
    col: number;
    ndvi: number;
    ndre: number;
    evi: number;
    savi: number;
    label: string;
}

const INDEX_DESCRIPTIONS: Record<SpectralIndex, string> = {
    NDVI: "Normalized Difference Vegetation Index — general vegetation greenness and density (>0.6 = healthy)",
    NDRE: "Normalized Difference Red Edge — chlorophyll content and early stress detection (>0.4 = healthy)",
    EVI: "Enhanced Vegetation Index — canopy structure with ATM correction (>0.5 = healthy)",
    SAVI: "Soil Adjusted Vegetation Index — vegetation with soil brightness correction (>0.45 = healthy)",
};

const HEALTH_THRESHOLDS: Record<SpectralIndex, { good: number; warn: number }> = {
    NDVI: { good: 0.6, warn: 0.4 },
    NDRE: { good: 0.4, warn: 0.25 },
    EVI: { good: 0.5, warn: 0.3 },
    SAVI: { good: 0.45, warn: 0.28 },
};

// 6×5 field zones with realistic mock values
const ZONES: ZoneData[] = [
    { id: "A1", row: 0, col: 0, ndvi: 0.75, ndre: 0.52, evi: 0.64, savi: 0.60, label: "North-West" },
    { id: "A2", row: 0, col: 1, ndvi: 0.71, ndre: 0.48, evi: 0.59, savi: 0.56, label: "North" },
    { id: "A3", row: 0, col: 2, ndvi: 0.68, ndre: 0.45, evi: 0.55, savi: 0.53, label: "North" },
    { id: "A4", row: 0, col: 3, ndvi: 0.60, ndre: 0.39, evi: 0.48, savi: 0.44, label: "North" },
    { id: "A5", row: 0, col: 4, ndvi: 0.42, ndre: 0.27, evi: 0.33, savi: 0.30, label: "North-East" },
    { id: "B1", row: 1, col: 0, ndvi: 0.78, ndre: 0.55, evi: 0.66, savi: 0.62, label: "West" },
    { id: "B2", row: 1, col: 1, ndvi: 0.80, ndre: 0.58, evi: 0.68, savi: 0.65, label: "Center-W" },
    { id: "B3", row: 1, col: 2, ndvi: 0.77, ndre: 0.54, evi: 0.65, savi: 0.61, label: "Center" },
    { id: "B4", row: 1, col: 3, ndvi: 0.55, ndre: 0.34, evi: 0.42, savi: 0.38, label: "Center-E" },
    { id: "B5", row: 1, col: 4, ndvi: 0.37, ndre: 0.22, evi: 0.28, savi: 0.25, label: "East" },
    { id: "C1", row: 2, col: 0, ndvi: 0.73, ndre: 0.50, evi: 0.61, savi: 0.57, label: "West" },
    { id: "C2", row: 2, col: 1, ndvi: 0.76, ndre: 0.53, evi: 0.64, savi: 0.60, label: "Center-W" },
    { id: "C3", row: 2, col: 2, ndvi: 0.64, ndre: 0.41, evi: 0.51, savi: 0.47, label: "Center" },
    { id: "C4", row: 2, col: 3, ndvi: 0.45, ndre: 0.28, evi: 0.33, savi: 0.30, label: "Center-E" },
    { id: "C5", row: 2, col: 4, ndvi: 0.30, ndre: 0.18, evi: 0.22, savi: 0.19, label: "East" },
    { id: "D1", row: 3, col: 0, ndvi: 0.66, ndre: 0.44, evi: 0.54, savi: 0.50, label: "South-W" },
    { id: "D2", row: 3, col: 1, ndvi: 0.58, ndre: 0.36, evi: 0.45, savi: 0.41, label: "South" },
    { id: "D3", row: 3, col: 2, ndvi: 0.49, ndre: 0.30, evi: 0.38, savi: 0.34, label: "South" },
    { id: "D4", row: 3, col: 3, ndvi: 0.38, ndre: 0.22, evi: 0.28, savi: 0.24, label: "South" },
    { id: "D5", row: 3, col: 4, ndvi: 0.25, ndre: 0.14, evi: 0.18, savi: 0.15, label: "South-East" },
];

function getIndexValue(zone: ZoneData, index: SpectralIndex): number {
    return zone[index.toLowerCase() as keyof ZoneData] as number;
}

function getZoneColor(value: number, index: SpectralIndex): string {
    const { good, warn } = HEALTH_THRESHOLDS[index];
    if (value >= good) return "bg-emerald-500";
    if (value >= warn) return "bg-yellow-400";
    return "bg-red-500";
}

function getZoneOpacity(value: number, index: SpectralIndex): string {
    const { good } = HEALTH_THRESHOLDS[index];
    const ratio = Math.min(value / good, 1);
    if (ratio > 0.85) return "opacity-100";
    if (ratio > 0.65) return "opacity-80";
    if (ratio > 0.45) return "opacity-60";
    return "opacity-40";
}

function getHealthLabel(value: number, index: SpectralIndex): { label: string; variant: "default" | "secondary" | "destructive" } {
    const { good, warn } = HEALTH_THRESHOLDS[index];
    if (value >= good) return { label: "Healthy", variant: "default" };
    if (value >= warn) return { label: "Stressed", variant: "secondary" };
    return { label: "Critical", variant: "destructive" };
}

export function SpectralTab() {
    const [selectedIndex, setSelectedIndex] = useState<SpectralIndex>("NDVI");
    const [hoveredZone, setHoveredZone] = useState<ZoneData | null>(null);

    const indices: SpectralIndex[] = ["NDVI", "NDRE", "EVI", "SAVI"];

    const healthCounts = ZONES.reduce(
        (acc, zone) => {
            const val = getIndexValue(zone, selectedIndex);
            const { good, warn } = HEALTH_THRESHOLDS[selectedIndex];
            if (val >= good) acc.healthy++;
            else if (val >= warn) acc.stressed++;
            else acc.critical++;
            return acc;
        },
        { healthy: 0, stressed: 0, critical: 0 }
    );

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-300">
            {/* Index Selector */}
            <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle className="font-headline text-lg">Spectral Index</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">{INDEX_DESCRIPTIONS[selectedIndex]}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {indices.map(idx => (
                            <Button
                                key={idx}
                                variant={selectedIndex === idx ? "default" : "outline"}
                                size="sm"
                                className="rounded-full"
                                onClick={() => setSelectedIndex(idx)}
                            >
                                {idx}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Heatmap */}
                <Card className="lg:col-span-2 border-white/5 bg-card/60 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg">Field Health Map — {selectedIndex}</CardTitle>
                        <CardDescription>Hover over a zone to inspect its spectral value. Derived from multispectral band fusion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                            {ZONES.map(zone => {
                                const value = getIndexValue(zone, selectedIndex);
                                const colorClass = getZoneColor(value, selectedIndex);
                                const opacityClass = getZoneOpacity(value, selectedIndex);
                                const isHovered = hoveredZone?.id === zone.id;
                                return (
                                    <button
                                        key={zone.id}
                                        type="button"
                                        onMouseEnter={() => setHoveredZone(zone)}
                                        onMouseLeave={() => setHoveredZone(null)}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center aspect-square rounded-xl text-white text-xs font-bold transition-all duration-200 cursor-pointer ring-2",
                                            colorClass,
                                            opacityClass,
                                            isHovered ? "ring-white scale-105 shadow-lg z-10" : "ring-transparent"
                                        )}
                                    >
                                        <span className="text-[11px] font-semibold drop-shadow">{zone.id}</span>
                                        <span className="text-[10px] font-normal drop-shadow opacity-90">{value.toFixed(2)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                                <span>Healthy</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-sm bg-yellow-400" />
                                <span>Stressed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-sm bg-red-500 opacity-60" />
                                <span>Critical</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detail Panel */}
                <div className="space-y-4">
                    <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="font-headline text-base">Zone Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Healthy zones</span>
                                <Badge variant="default" className="bg-emerald-600 text-white">{healthCounts.healthy}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Stressed zones</span>
                                <Badge variant="secondary" className="bg-yellow-500 text-white">{healthCounts.stressed}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Critical zones</span>
                                <Badge variant="destructive">{healthCounts.critical}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {hoveredZone ? (
                        <Card className="border-primary/20 bg-primary/5 backdrop-blur-md transition-all">
                            <CardHeader className="pb-2">
                                <CardTitle className="font-headline text-base flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    Zone {hoveredZone.id}
                                </CardTitle>
                                <CardDescription className="text-xs">{hoveredZone.label} quadrant</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {(["NDVI", "NDRE", "EVI", "SAVI"] as SpectralIndex[]).map(idx => {
                                    const val = getIndexValue(hoveredZone, idx);
                                    const { label, variant } = getHealthLabel(val, idx);
                                    return (
                                        <div key={idx} className="flex items-center justify-between">
                                            <span className={cn("font-medium", idx === selectedIndex ? "text-primary" : "text-muted-foreground")}>{idx}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="tabular-nums font-semibold">{val.toFixed(3)}</span>
                                                <Badge variant={variant} className="text-[10px] h-4 px-1.5">{label}</Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-white/5 bg-card/40 backdrop-blur-md">
                            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                <Layers className="h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Hover a zone to see all spectral indices</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="font-headline text-base">Data Source</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-1.5">
                            <div className="flex justify-between"><span>Toolbox</span><span className="text-foreground font-medium">Hyperspectral Imaging Lib</span></div>
                            <div className="flex justify-between"><span>Bands</span><span className="text-foreground font-medium">Red, NIR, Red-Edge, SWIR</span></div>
                            <div className="flex justify-between"><span>Resolution</span><span className="text-foreground font-medium">10 m / pixel</span></div>
                            <div className="flex justify-between"><span>Last capture</span><span className="text-foreground font-medium">Today, 06:30 AM</span></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
