
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { YieldForecastOutput } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { formatNumber } from "@/lib/utils";
import { ChevronDown, Info, Package, TrendingUp, Wheat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface YieldForecastTabProps {
    result: YieldForecastOutput | null;
    isLoading: boolean;
}

export function YieldForecastTab({ result, isLoading }: YieldForecastTabProps) {
    const { t } = useTranslation();
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);

    if (isLoading) {
        return <YieldForecastSkeleton />;
    }

    if (!result) {
        return (
            <Card>
                <CardContent className="flex h-[50vh] flex-col items-center justify-center gap-4 p-12 text-center">
                    <Wheat className="h-16 w-16 text-muted-foreground" />
                    <h3 className="font-headline text-xl font-semibold">{t('no_yield_data_title')}</h3>
                    <p className="text-muted-foreground">{t('no_yield_data_desc')}</p>
                </CardContent>
            </Card>
        );
    }
    
    const { totalExpectedYieldKg, yieldCurve, confidence, notes, reasoning } = result;

    const chartConfig = {
        yieldKg: {
            label: t('yield_kg'),
            color: 'hsl(var(--primary))',
        },
    };

    const formattedYieldCurve = yieldCurve.map(d => ({
        ...d,
        date: parseISO(d.date).getTime(),
    }));

    return (
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="font-headline text-base">{t('total_exp_yield')}</CardTitle>
                        <Package className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-headline text-3xl font-semibold tabular-nums">{formatNumber(totalExpectedYieldKg)} kg</div>
                        <p className="text-xs text-muted-foreground">{t('total_exp_yield_desc')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="font-headline text-base">{t('forecast_confidence')}</CardTitle>
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-headline text-3xl font-semibold tabular-nums">{(confidence * 100).toFixed(0)}%</div>
                        <p className="text-xs text-muted-foreground">{t('forecast_confidence_desc')}</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{t('yield_curve_forecast')}</CardTitle>
                        <CardDescription>{notes}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                            <AreaChart data={formattedYieldCurve} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                    type="number"
                                    scale="time"
                                    domain={['dataMin', 'dataMax']}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis unit="kg" tickLine={false} axisLine={false} width={36} />
                                <ChartTooltip 
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name, props) => (
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(props.payload.date), 'MMM dd, yyyy')}</span>
                                                    <span className="font-bold">{`${formatNumber(value as number)} kg`}</span>
                                                </div>
                                            )}
                                            labelFormatter={() => ''}
                                        />
                                    }
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="yieldKg" 
                                    stroke="hsl(var(--primary))" 
                                    fill="hsl(var(--primary))" 
                                    fillOpacity={0.3} 
                                    name={t('yield_kg')}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            {t('ai_reasoning_title')}
                        </CardTitle>
                        <CardDescription>{t('ai_reasoning_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <Collapsible open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">How AI calculated this</div>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                        {isReasoningOpen ? "Hide" : "Show"}
                                        <ChevronDown className={isReasoningOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground ring-1 ring-border/60">
                                <p className="whitespace-pre-wrap leading-relaxed">{reasoning}</p>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


function YieldForecastSkeleton() {
    return (
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-3/5" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-2/5 mb-2" />
                            <Skeleton className="h-3 w-4/5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
