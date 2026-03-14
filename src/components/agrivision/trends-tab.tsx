"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Brain, AlertCircle, Activity } from "lucide-react";
import {
    ComposedChart,
    Line,
    Area,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type ModelType = "LSTM" | "CNN";

interface TrendPoint {
    day: string;
    ndvi: number | null;
    projected: number | null;
    projLow: number | null;
    projHigh: number | null;
    anomaly?: number;
}

const LSTM_ANOMALY_DAYS = [8, 9, 22, 23, 24];
const CNN_ANOMALY_DAYS = [7, 8, 22, 23, 25];

// Simulate 30-day NDVI history + 7-day projection
function generateTrendData(model: ModelType): TrendPoint[] {
    const history: TrendPoint[] = [];
    let ndvi = 0.72;
    const anomalyDays = model === "LSTM" ? LSTM_ANOMALY_DAYS : CNN_ANOMALY_DAYS;

    for (let i = 0; i < 30; i++) {
        // Late stress region (days 7–11) – disease onset
        if (i >= 7 && i <= 11) ndvi = Math.max(0.2, ndvi - 0.048);
        // Recovery attempt
        else if (i >= 12 && i <= 16) ndvi = Math.min(0.72, ndvi + 0.015);
        // Second decline (days 20–27)
        else if (i >= 20 && i <= 27) ndvi = Math.max(0.22, ndvi - 0.038 + (Math.random() - 0.5) * 0.01);
        else ndvi = Math.max(0.2, Math.min(0.78, ndvi + (Math.random() - 0.48) * 0.018));

        const isAnomaly = anomalyDays.includes(i);

        history.push({
            day: `D${i + 1}`,
            ndvi: +ndvi.toFixed(3),
            projected: null,
            projLow: null,
            projHigh: null,
            anomaly: isAnomaly ? +ndvi.toFixed(3) : undefined,
        });
    }

    // 7-day projection
    let projVal = ndvi;
    for (let i = 0; i < 7; i++) {
        const trend = model === "LSTM" ? -0.008 : -0.011; // CNN more pessimistic
        projVal = Math.max(0.15, projVal + trend + (Math.random() - 0.5) * 0.01);
        const uncertainty = 0.03 + i * 0.008;
        history.push({
            day: `P${i + 1}`,
            ndvi: null,
            projected: +projVal.toFixed(3),
            projLow: +Math.max(0.1, projVal - uncertainty).toFixed(3),
            projHigh: +Math.min(0.85, projVal + uncertainty).toFixed(3),
        });
    }

    return history;
}

const MODEL_DESCRIPTIONS: Record<ModelType, string> = {
    LSTM: "Long Short-Term Memory network — tracks sequential patterns across time steps, optimal for detecting gradual stress trends over multiple days.",
    CNN: "Convolutional Neural Network — detects spatial spectral patterns, optimal for identifying disease hotspot textures and abrupt changes.",
};

const MODEL_CONFIG: Record<ModelType, { confidence: number; detectedPattern: string; color: string }> = {
    LSTM: { confidence: 87, detectedPattern: "Progressive vegetation stress — late blight likely", color: "#8b5cf6" },
    CNN: { confidence: 82, detectedPattern: "Spatial disease cluster detected — East field zones", color: "#3b82f6" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnomalyDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.anomaly == null) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={1.5} opacity={0.9} />
            <circle cx={cx} cy={cy} r={10} fill="none" stroke="#f97316" strokeWidth={1} opacity={0.4} />
        </g>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-background/90 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
            <div className="font-semibold mb-1">{label.startsWith("P") ? `Projected ${label}` : `Day ${label}`}</div>
            {payload.map((p: any) => p.value != null && (
                <div key={p.name} style={{ color: p.color }} className="flex gap-2 justify-between">
                    <span>{p.name}</span>
                    <span className="font-mono font-medium">{p.value.toFixed(3)}</span>
                </div>
            ))}
            {payload[0]?.payload?.anomaly != null && (
                <div className="mt-1 text-orange-400 font-medium">⚠ Anomaly detected</div>
            )}
        </div>
    );
};

export function TrendsTab() {
    const [model, setModel] = useState<ModelType>("LSTM");
    const data = useMemo(() => generateTrendData(model), [model]);
    const cfg = MODEL_CONFIG[model];

    const ndviValues = data.filter(d => d.ndvi != null).map(d => d.ndvi as number);
    const latestNdvi = ndviValues[ndviValues.length - 1] ?? 0;
    const firstNdvi = ndviValues[0] ?? 0;
    const trend = latestNdvi - firstNdvi;
    const anomalyCount = data.filter(d => d.anomaly != null).length;

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-300">
            {/* Model Selector */}
            <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <CardTitle className="font-headline text-lg">AI Model</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">{MODEL_DESCRIPTIONS[model]}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                        {(["LSTM", "CNN"] as ModelType[]).map(m => (
                            <Button
                                key={m}
                                variant={model === m ? "default" : "outline"}
                                size="sm"
                                className="rounded-full gap-2"
                                onClick={() => setModel(m)}
                            >
                                <Activity className="h-4 w-4" />
                                {m} Model
                            </Button>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Confidence</span>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-500"
                                        style={{ width: `${cfg.confidence}%` }}
                                    />
                                </div>
                                <span className="text-sm font-semibold tabular-nums">{cfg.confidence}%</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                    <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Current NDVI</div>
                        <div className={cn("font-headline text-3xl font-bold mt-1", latestNdvi < 0.4 ? "text-red-500" : latestNdvi < 0.6 ? "text-yellow-500" : "text-emerald-500")}>
                            {latestNdvi.toFixed(3)}
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs mt-1", trend < 0 ? "text-red-500" : "text-emerald-500")}>
                            {trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {trend < 0 ? "" : "+"}{trend.toFixed(3)} vs day 1
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                    <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Anomalies Detected</div>
                        <div className={cn("font-headline text-3xl font-bold mt-1", anomalyCount > 0 ? "text-orange-500" : "text-emerald-500")}>
                            {anomalyCount}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-1 text-orange-400">
                            {anomalyCount > 0 && <><AlertCircle className="h-3 w-3" /> stress events</>}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                    <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Detected Pattern</div>
                        <div className="text-sm font-semibold mt-1.5 leading-tight">{cfg.detectedPattern}</div>
                        <Badge variant="secondary" className="mt-2 text-[10px]">{model} model</Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Main Trend Chart */}
            <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="font-headline text-lg">30-Day NDVI Trend + 7-Day Projection</CardTitle>
                    <CardDescription className="text-xs">
                        Historical spectral analysis with {model} model anomaly detection.
                        Orange dots = detected anomalies. Shaded area = projection confidence band.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={data} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 9 }}
                                tickLine={false}
                                axisLine={false}
                                interval={4}
                            />
                            <YAxis
                                domain={[0.1, 0.85]}
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                width={36}
                                tickFormatter={v => v.toFixed(2)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />

                            {/* Healthy threshold reference line */}
                            <ReferenceLine y={0.6} stroke="#10b981" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: "Healthy ≥0.60", position: "insideTopRight", fontSize: 9, fill: "#10b981" }} />
                            <ReferenceLine y={0.4} stroke="#f97316" strokeDasharray="5 3" strokeOpacity={0.4} label={{ value: "Stressed <0.40", position: "insideTopRight", fontSize: 9, fill: "#f97316" }} />

                            {/* Projection band */}
                            <Area
                                name="Projection band"
                                type="monotone"
                                dataKey="projHigh"
                                stroke="transparent"
                                fill={cfg.color}
                                fillOpacity={0.08}
                                legendType="none"
                            />
                            <Area
                                name="Projection (low)"
                                type="monotone"
                                dataKey="projLow"
                                stroke="transparent"
                                fill="white"
                                fillOpacity={0.01}
                                legendType="none"
                            />

                            {/* Historical NDVI */}
                            <Line
                                name="NDVI (historical)"
                                type="monotone"
                                dataKey="ndvi"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2.5}
                                dot={false}
                                connectNulls={false}
                            />

                            {/* Projected NDVI */}
                            <Line
                                name="NDVI (projected)"
                                type="monotone"
                                dataKey="projected"
                                stroke={cfg.color}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                connectNulls={false}
                            />

                            {/* Anomaly scatter */}
                            <Scatter name="Anomaly" dataKey="anomaly" shape={<AnomalyDot />} fill="#f97316" legendType="circle" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Model Info */}
            <Card className="border-white/5 bg-card/60 backdrop-blur-md">
                <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Model Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-4 text-xs text-center">
                        {(model === "LSTM" ? [
                            { label: "Architecture", value: "2-layer LSTM" },
                            { label: "Sequence length", value: "14 days" },
                            { label: "Input features", value: "NDVI, Temp, RH, LW" },
                            { label: "Training data", value: "3 seasons" },
                        ] : [
                            { label: "Architecture", value: "ResNet-18 CNN" },
                            { label: "Kernel size", value: "3×3 (spectral)" },
                            { label: "Input features", value: "4-band imagery" },
                            { label: "Training data", value: "12,000 patches" },
                        ]).map(item => (
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
