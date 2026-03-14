"use client";

import { useState, useEffect } from "react";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Wind, Leaf, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SensorReading {
    time: string;
    value: number;
}

interface SensorConfig {
    key: string;
    label: string;
    unit: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    min: number;
    max: number;
    safeMin: number;
    safeMax: number;
    color: string;
    description: string;
}

const SENSOR_CONFIGS: SensorConfig[] = [
    {
        key: "soilMoisture",
        label: "Soil Moisture",
        unit: "%",
        icon: Droplets,
        min: 0,
        max: 100,
        safeMin: 30,
        safeMax: 75,
        color: "#3b82f6",
        description: "Volumetric water content in root zone",
    },
    {
        key: "airTemp",
        label: "Air Temperature",
        unit: "°C",
        icon: Thermometer,
        min: -5,
        max: 50,
        safeMin: 15,
        safeMax: 35,
        color: "#f97316",
        description: "Ambient air temperature at 2 m height",
    },
    {
        key: "humidity",
        label: "Relative Humidity",
        unit: "%",
        icon: Wind,
        min: 0,
        max: 100,
        safeMin: 40,
        safeMax: 80,
        color: "#8b5cf6",
        description: "Atmospheric moisture relative to saturation",
    },
    {
        key: "leafWetness",
        label: "Leaf Wetness",
        unit: "LWI",
        icon: Leaf,
        min: 0,
        max: 1,
        safeMin: 0,
        safeMax: 0.5,
        color: "#10b981",
        description: "Leaf wetness index (0–1); >0.5 = foliar disease risk",
    },
];

// Simulate 7-day readings
function generateHistory(baseValue: number, variance: number, points: number = 7): SensorReading[] {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return Array.from({ length: points }, (_, i) => ({
        time: days[i % days.length],
        value: Math.max(0, +(baseValue + (Math.random() - 0.5) * variance * 2).toFixed(2)),
    }));
}

const DEFAULT_READINGS: Record<string, number> = {
    soilMoisture: 52,
    airTemp: 28,
    humidity: 67,
    leafWetness: 0.62,
};

export function SensorTab() {
    const [currentValues, setCurrentValues] = useState(DEFAULT_READINGS);
    const [histories, setHistories] = useState<Record<string, SensorReading[]>>({});
    const [lastUpdated, setLastUpdated] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const generateAll = (base: Record<string, number>) => ({
        soilMoisture: generateHistory(base.soilMoisture, 8),
        airTemp: generateHistory(base.airTemp, 4),
        humidity: generateHistory(base.humidity, 10),
        leafWetness: generateHistory(base.leafWetness, 0.15),
    });

    useEffect(() => {
        setHistories(generateAll(DEFAULT_READINGS));
        setLastUpdated(new Date().toLocaleTimeString());
    }, []);

    const refresh = async () => {
        setIsRefreshing(true);
        await new Promise(r => setTimeout(r, 800));
        const newValues = {
            soilMoisture: +(48 + Math.random() * 12).toFixed(1),
            airTemp: +(25 + Math.random() * 8).toFixed(1),
            humidity: +(58 + Math.random() * 18).toFixed(1),
            leafWetness: +(0.3 + Math.random() * 0.5).toFixed(2),
        };
        setCurrentValues(newValues);
        setHistories(generateAll(newValues));
        setLastUpdated(new Date().toLocaleTimeString());
        setIsRefreshing(false);
    };

    const isOutOfRange = (config: SensorConfig, value: number) =>
        value < config.safeMin || value > config.safeMax;

    const alertCount = SENSOR_CONFIGS.filter(c => isOutOfRange(c, currentValues[c.key])).length;

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-300">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="font-headline text-lg font-semibold">Environmental Sensors</div>
                    <div className="text-xs text-muted-foreground">
                        Last updated: {lastUpdated} · {alertCount > 0 ? (
                            <span className="text-red-500 font-medium">{alertCount} alert{alertCount > 1 ? "s" : ""}</span>
                        ) : (
                            <span className="text-emerald-500 font-medium">All nominal</span>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={refresh} disabled={isRefreshing}>
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            {/* Sensor Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                {SENSOR_CONFIGS.map(config => {
                    const value = currentValues[config.key];
                    const history = histories[config.key] ?? [];
                    const alert = isOutOfRange(config, value);
                    const Icon = config.icon;
                    const pct = Math.round(((value - config.min) / (config.max - config.min)) * 100);

                    return (
                        <Card
                            key={config.key}
                            className={cn(
                                "border overflow-hidden transition-all duration-300",
                                alert
                                    ? "border-red-500/30 bg-red-500/5"
                                    : "border-white/5 bg-card/60 backdrop-blur-md"
                            )}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                                            style={{ backgroundColor: `${config.color}20` }}
                                        >
                                            <Icon className="h-4 w-4" style={{ color: config.color }} />
                                        </div>
                                        <CardTitle className="font-headline text-sm">{config.label}</CardTitle>
                                    </div>
                                    {alert ? (
                                        <Badge variant="destructive" className="gap-1 text-xs">
                                            <AlertTriangle className="h-3 w-3" />
                                            Alert
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1 text-xs text-emerald-600 bg-emerald-500/10">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Normal
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-xs mt-1">{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span
                                            className="font-headline text-4xl font-bold tabular-nums"
                                            style={{ color: alert ? "#ef4444" : config.color }}
                                        >
                                            {config.unit === "LWI" ? value.toFixed(2) : value}
                                        </span>
                                        <span className="ml-1.5 text-base text-muted-foreground">{config.unit}</span>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <div>Safe: {config.safeMin}–{config.safeMax} {config.unit}</div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, pct))}%`,
                                            backgroundColor: alert ? "#ef4444" : config.color,
                                        }}
                                    />
                                </div>

                                {/* Sparkline (7-day trend) */}
                                <div className="mt-1">
                                    <div className="text-[10px] text-muted-foreground mb-1">7-day trend</div>
                                    <ResponsiveContainer width="100%" height={48}>
                                        <LineChart data={history}>
                                            <Tooltip
                                                contentStyle={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                                                formatter={(v: number) => [`${config.unit === "LWI" ? v.toFixed(2) : v} ${config.unit}`, config.label]}
                                                labelFormatter={(l) => l}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke={alert ? "#ef4444" : config.color}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Sensor Network Info */}
            <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Sensor Network</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-4 text-xs text-center">
                        {[
                            { label: "Nodes active", value: "12 / 12" },
                            { label: "Battery avg", value: "84%" },
                            { label: "Signal strength", value: "Excellent" },
                            { label: "Data frequency", value: "15 min" },
                        ].map(item => (
                            <div key={item.label} className="rounded-lg bg-muted/50 px-3 py-2">
                                <div className="text-muted-foreground">{item.label}</div>
                                <div className="font-semibold text-foreground mt-0.5">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
