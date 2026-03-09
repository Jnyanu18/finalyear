"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceArea } from "recharts";
import { BarChart3, CalendarDays, Camera, LineChart, Printer, SlidersHorizontal, Sparkles, UploadCloud } from "lucide-react";

import { AgriVisionHeader } from "@/components/agrivision/header";
import { BottomDock, type DockView } from "@/components/agrivision/bottom-dock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

import { DetectionTab } from "@/components/agrivision/detection-tab";
import { HarvestForecastTab } from "@/components/agrivision/harvest-forecast-tab";
import { YieldForecastTab } from "@/components/agrivision/yield-forecast-tab";
import { MarketTab } from "@/components/agrivision/market-tab";
import { ChatTab } from "@/components/agrivision/chat-tab";

import type {
  AppControls,
  ChatMessage,
  DetectionResult,
  ForecastResult,
  PlantAnalysisResult,
  YieldForecastOutput,
} from "@/lib/types";
import type { MarketPriceForecastingOutput } from "@/ai/flows/market-price-forecasting";
import { calculateYieldForecast as calculateMockHarvestForecast } from "@/lib/mock-data";
import { dataURLtoFile, formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { runPlantAnalysis, runYieldForecast } from "@/lib/api";
import { ReportPage } from "@/components/agrivision/report-page";
import { QuickActions, type QuickAction } from "@/components/agrivision/quick-actions";

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function daysUntil(dateIso: string) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(dateIso).getTime();
  return Math.max(0, Math.round((target - startOfToday) / (1000 * 60 * 60 * 24)));
}

export function Dashboard() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [view, setView] = useState<DockView>("home");
  const [isInputsOpen, setIsInputsOpen] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isYieldForecastLoading, setIsYieldForecastLoading] = useState(false);

  const [image, setImage] = useState<{ url: string | null; file: File | null; contentType: string | null }>({
    url: null,
    file: null,
    contentType: null,
  });

  const [controls, setControls] = useState<AppControls>({
    avgWeightG: 85,
    postHarvestLossPct: 7,
    numPlants: 10,
    forecastDays: 14,
    gddBaseC: 10,
    harvestCapacityKgDay: 20,
    useDetectionModel: true,
    useLiveWeather: false,
    includePriceForecast: true,
    district: "Coimbatore",
  });

  const [plantAnalysisResult, setPlantAnalysisResult] = useState<PlantAnalysisResult | null>(null);
  const [harvestForecastResult, setHarvestForecastResult] = useState<ForecastResult | null>(null);
  const [yieldForecastResult, setYieldForecastResult] = useState<YieldForecastOutput | null>(null);
  const [marketResult, setMarketResult] = useState<MarketPriceForecastingOutput | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUploadedImage = Boolean(image.url);
  const uploadButtonLabel = hasUploadedImage ? "Uploaded" : "Upload";
  const uploadImageButtonLabel = hasUploadedImage ? "Uploaded image" : "Upload image";

  const stageCount = useCallback(
    (stage: string) => {
      const entry = plantAnalysisResult?.stages.find((s: { stage: string; count: number }) => s.stage.toLowerCase() === stage.toLowerCase());
      return entry?.count ?? 0;
    },
    [plantAnalysisResult]
  );

  const preview = useMemo(() => {
    if (!plantAnalysisResult) return null;
    const mature = stageCount("mature");
    const yieldNowKg = (mature * controls.avgWeightG) / 1000 * controls.numPlants;
    const sellableKg = yieldNowKg * (1 - controls.postHarvestLossPct / 100);
    const profitAtBestPrice = marketResult?.bestPrice ? sellableKg * marketResult.bestPrice : null;
    return {
      mature,
      sellableKg,
      profitAtBestPrice,
    };
  }, [controls.avgWeightG, controls.numPlants, controls.postHarvestLossPct, marketResult?.bestPrice, plantAnalysisResult, stageCount]);

  const detectionForUi: DetectionResult | null = useMemo(() => {
    if (!plantAnalysisResult || !image.url) return null;
    return {
      plantId: Date.now(),
      plantType: plantAnalysisResult.plantType,
      detections: plantAnalysisResult.stages.reduce(
        (sum: number, stage: { stage: string; count: number }) => sum + (stage.stage.toLowerCase() !== "flower" ? stage.count : 0),
        0
      ),
      boxes: [],
      stageCounts: plantAnalysisResult.stages.reduce((acc: any, s: { stage: string; count: number }) => {
        (acc as any)[s.stage.toLowerCase()] = s.count;
        return acc;
      }, {} as any),
      stages: plantAnalysisResult.stages,
      growthStage: "Varies",
      avgBboxArea: 0,
      confidence: 0.9,
      imageUrl: image.url,
      summary: plantAnalysisResult.summary,
    };
  }, [plantAnalysisResult, image.url]);

  const handleImageUpload = (file: File) => {
    const newImageUrl = URL.createObjectURL(file);
    setImage({ url: newImageUrl, file, contentType: file.type });
    setPlantAnalysisResult(null);
    setHarvestForecastResult(null);
    setYieldForecastResult(null);
    setMarketResult(null);
  };

  const handleAnalyze = useCallback(async () => {
    if (!image.url) {
      toast({ variant: "destructive", title: "No image", description: "Upload a plant image to start." });
      return;
    }

    setIsAnalysisLoading(true);
    setPlantAnalysisResult(null);
    setHarvestForecastResult(null);
    setYieldForecastResult(null);

    try {
      const reader = new FileReader();
      const fileToRead =
        image.file || (await dataURLtoFile(image.url, "analysis-image.jpg", image.contentType ?? "image/jpeg"));
      reader.readAsDataURL(fileToRead);

      const analysis = await new Promise<PlantAnalysisResult>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const photoDataUri = reader.result as string;
            const response = await runPlantAnalysis({ photoDataUri, contentType: image.contentType! });
            if (!response.success || !response.data) {
              let errorMessage = response.error || "Analysis failed.";
              if (errorMessage.includes("API key not valid")) {
                errorMessage = "Your Gemini API key is not valid. Check your .env file.";
              }
              throw new Error(errorMessage);
            }
            resolve(response.data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read image file."));
      });

      setPlantAnalysisResult(analysis);

      const detectionResultForForecast: DetectionResult = {
        plantId: Date.now(),
        plantType: analysis.plantType,
        detections: analysis.stages.reduce(
          (sum: number, stage: { stage: string; count: number }) => sum + (stage.stage.toLowerCase() !== "flower" ? stage.count : 0),
          0
        ),
        boxes: [],
        stageCounts: analysis.stages.reduce((acc: any, s: { stage: string; count: number }) => {
          (acc as any)[s.stage.toLowerCase()] = s.count;
          return acc;
        }, {} as any),
        stages: analysis.stages,
        growthStage: "Varies",
        avgBboxArea: 0,
        confidence: 0.9,
        imageUrl: image.url!,
        summary: analysis.summary,
      };

      const forecast = calculateMockHarvestForecast(detectionResultForForecast, controls);
      setHarvestForecastResult(forecast);

      toast({ title: "Analysis ready", description: "Detection and harvest forecast updated." });
      setView("home");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Analysis failed", description: err?.message || "Please try again." });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [controls, image.contentType, image.file, image.url, toast]);

  const handleYieldForecast = useCallback(async () => {
    if (!plantAnalysisResult) {
      toast({ variant: "destructive", title: "Run detection first", description: "Analyze the image to enable yield forecast." });
      return;
    }

    setIsYieldForecastLoading(true);
    setYieldForecastResult(null);

    try {
      const response = await runYieldForecast({ analysis: plantAnalysisResult, controls });
      if (!response.success || !response.data) throw new Error(response.error || "Yield forecast failed.");
      setYieldForecastResult(response.data);
      toast({ title: "Yield forecast ready", description: "AI yield curve updated." });
      setView("plan");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Yield forecast failed", description: err?.message || "Please try again." });
    } finally {
      setIsYieldForecastLoading(false);
    }
  }, [controls, plantAnalysisResult, toast]);

  const totalSellableKg = harvestForecastResult?.sellable_kg ?? null;
  const harvestWindowText = harvestForecastResult?.harvestWindow
    ? `${harvestForecastResult.harvestWindow.start} – ${harvestForecastResult.harvestWindow.end}`
    : null;
  const bestPrice = marketResult?.bestPrice ?? null;
  const estimatedProfit = totalSellableKg !== null && bestPrice !== null ? totalSellableKg * bestPrice : null;

  const cropName = plantAnalysisResult?.plantType || "Tomato";
  const district = controls.district || "District";

  const forecastSeries = (harvestForecastResult?.daily || []).map((d: { date: string; ready_kg: number }) => ({
    date: d.date.slice(5),
    ready_kg: d.ready_kg,
  }));

  const optimalStart = harvestForecastResult?.harvestWindow?.start ?? null;
  const optimalEnd = harvestForecastResult?.harvestWindow?.end ?? null;

  const appState = useMemo(
    () => ({
      controls,
      detectionResult: detectionForUi,
      forecastResult: harvestForecastResult,
      marketResult,
    }),
    [controls, detectionForUi, harvestForecastResult, marketResult]
  );

  const primaryAction = useMemo(() => {
    if (!plantAnalysisResult) {
      return { label: "Upload & analyze", hint: "Start by analyzing a plant photo.", action: "analyze" as const };
    }
    if (!marketResult) {
      return { label: "Run market forecast", hint: "Get the best sell date and price.", action: "market" as const };
    }
    if (!yieldForecastResult) {
      return { label: "Run AI yield", hint: "Generate a lifecycle yield curve.", action: "yield" as const };
    }
    return { label: "Ask advisor", hint: "Get tailored recommendations.", action: "advisor" as const };
  }, [marketResult, plantAnalysisResult, yieldForecastResult]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "go-home",
        label: "Go to Home",
        description: "Decision summary and outcomes",
        icon: BarChart3,
        onSelect: () => setView("home"),
      },
      { id: "go-detect", label: "Go to Detect", description: "Upload and verify detection", icon: Camera, onSelect: () => setView("detect") },
      { id: "go-plan", label: "Go to Plan", description: "Harvest plan + AI yield curve", icon: CalendarDays, onSelect: () => setView("plan") },
      { id: "go-market", label: "Go to Market", description: "Forecast prices and profit", icon: LineChart, onSelect: () => setView("market") },
      { id: "go-advisor", label: "Go to Advisor", description: "Ask questions with context", icon: Sparkles, onSelect: () => setView("advisor") },
      {
        id: "open-inputs",
        label: "Open Inputs",
        description: "Adjust farm controls and presets",
        icon: SlidersHorizontal,
        onSelect: () => setIsInputsOpen(true),
      },
      {
        id: "upload",
        label: "Upload Image",
        description: "Choose a plant photo",
        icon: UploadCloud,
        onSelect: () => fileInputRef.current?.click(),
      },
      {
        id: "analyze",
        label: "Run Analysis",
        description: "Detect stages and build harvest forecast",
        icon: Sparkles,
        disabled: isAnalysisLoading || !image.url,
        onSelect: () => handleAnalyze(),
      },
      {
        id: "yield",
        label: "Run AI Yield Forecast",
        description: "Generate lifecycle yield curve",
        icon: CalendarDays,
        disabled: isYieldForecastLoading || !plantAnalysisResult,
        onSelect: () => handleYieldForecast(),
      },
      {
        id: "print",
        label: "Print / Download Report",
        description: "Use browser print to export PDF",
        icon: Printer,
        onSelect: () => window.print(),
      },
    ],
    [handleAnalyze, handleYieldForecast, image.url, isAnalysisLoading, isYieldForecastLoading, plantAnalysisResult]
  );

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{cropName}</span> · {district} ·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {plantAnalysisResult ? "Updated" : "Ready"}
          </span>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <Card className="relative overflow-hidden border-0 shadow-lg bg-card/40 backdrop-blur-xl group transition-all hover:shadow-primary/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px] transition-transform group-hover:scale-110" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[hsl(var(--chart-2))]/20 blur-[100px] transition-transform group-hover:scale-110" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-primary/80 mb-2">Next best action</div>
              <div className="font-headline text-3xl md:text-4xl font-bold tracking-tight">{primaryAction.label}</div>
              <div className="mt-2 text-md text-muted-foreground max-w-md">{primaryAction.hint}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                size="lg"
                className="h-12 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
                onClick={() => {
                  if (primaryAction.action === "market") return setView("market");
                  if (primaryAction.action === "yield") return handleYieldForecast();
                  if (primaryAction.action === "advisor") return setView("advisor");
                  return handleAnalyze();
                }}
                disabled={
                  (primaryAction.action === "analyze" && isAnalysisLoading) ||
                  (primaryAction.action === "yield" && (isYieldForecastLoading || !plantAnalysisResult))
                }
              >
                {primaryAction.action === "analyze" ? (isAnalysisLoading ? "Analyzing..." : "Analyze") : primaryAction.label}
              </Button>
              {primaryAction.action === "analyze" ? (
                <Button size="lg" variant="outline" className="h-12 px-6 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="mr-2 h-5 w-5" />
                  {uploadButtonLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/5 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
        <CardHeader className="border-b border-border/40 bg-accent/5 pb-4">
          <CardTitle className="font-headline text-xl">Expected harvest</CardTitle>
          <CardDescription>Sellable yield based on detection + your inputs.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {totalSellableKg === null ? (
            <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
              <div>
                <div className="font-headline text-3xl font-semibold tracking-tight text-primary/80">Upload → Analyze</div>
                <div className="mt-2 text-md text-muted-foreground leading-relaxed">
                  Start by uploading a clear plant photo. We'll count fruits and forecast yield.
                </div>
                {image.url ? (
                  <div className="mt-6 relative w-full max-w-sm aspect-video overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-inner">
                    <img src={image.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <div className="flex items-center gap-3">
                  <Button variant="secondary" className="h-10 rounded-full" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {uploadButtonLabel}
                  </Button>
                  <Button className="h-10 rounded-full shadow-sm" onClick={handleAnalyze} disabled={isAnalysisLoading || !image.url}>
                    {isAnalysisLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 py-1.5 px-3 rounded-full mt-2">
                  Tip: bright light, centered plant, minimal blur.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="font-headline text-5xl font-bold tracking-tight text-primary sm:text-7xl drop-shadow-sm">
                  {formatNumber(totalSellableKg, 2)} <span className="text-2xl sm:text-3xl text-primary/60">kg</span>
                </div>
                <div className="mt-3 text-md font-medium text-foreground bg-accent/10 inline-flex px-3 py-1 rounded-full border border-accent/20">
                  {harvestWindowText ? `Best window: ${harvestWindowText}` : "Best window will appear after analysis."}
                </div>
              </div>
              <div className="hidden sm:block">
                {image.url ? (
                  <div className="relative h-24 w-32 overflow-hidden rounded-2xl ring-2 ring-border shadow-md">
                    <img src={image.url} alt="Uploaded" className="w-full h-full object-cover" />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-white/5 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary/70" />
              Profit outlook
            </CardTitle>
            <CardDescription className="text-xs">Uses Market forecast when available.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-headline text-4xl font-bold tracking-tight text-foreground">
              {estimatedProfit === null ? "-" : `INR ${formatNumber(estimatedProfit, 0)}`}
            </div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">
              {bestPrice ? `Best price: INR ${formatNumber(bestPrice, 2)}/kg` : "Run Market forecast for pricing."}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary/70" />
              Harvest timing
            </CardTitle>
            <CardDescription className="text-xs">Actionable window you can plan for.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-headline text-4xl font-bold tracking-tight text-foreground">
              {harvestWindowText ?? "-"}
            </div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">
              {harvestForecastResult?.harvestWindow?.start
                ? `Starts in ${daysUntil(harvestForecastResult.harvestWindow.start)} days`
                : "Run analysis to compute optimal window."}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Yield readiness curve</CardTitle>
          <CardDescription>How much becomes harvest-ready over the next days.</CardDescription>
        </CardHeader>
        <CardContent>
          {forecastSeries.length === 0 ? (
            <Skeleton className="aspect-video w-full" />
          ) : (
            <ChartContainer
              className="aspect-[2/1] w-full"
              config={{
                ready_kg: { label: "Ready (kg)", color: "hsl(var(--chart-1))" },
              }}
            >
              <AreaChart data={forecastSeries} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {optimalStart && optimalEnd ? (
                  <ReferenceArea
                    x1={optimalStart.slice(5)}
                    x2={optimalEnd.slice(5)}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.08}
                    strokeOpacity={0}
                  />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="ready_kg"
                  stroke="var(--color-ready_kg)"
                  fill="var(--color-ready_kg)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">AI insight</CardTitle>
          <CardDescription>One recommendation at a time.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {harvestForecastResult?.harvestWindow?.start
              ? `For best profit, plan your harvest around ${harvestForecastResult.harvestWindow.start}.`
              : "Analyze to generate a timing recommendation."}
          </div>
          <Button variant="secondary" onClick={() => setView("advisor")}>
            Ask AI
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetect = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">{t("detection_stage")}</div>
          <div className="text-xs text-muted-foreground">Upload → Analyze → Verify evidence.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" />
                {uploadImageButtonLabel}
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalysisLoading}>
                {isAnalysisLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: keep the plant centered and well-lit for better counts.
            </div>
          </div>
        </CardContent>
      </Card>

      <DetectionTab result={detectionForUi} isLoading={isAnalysisLoading} imageUrl={image.url} />
    </div>
  );

  const renderPlan = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">Plan</div>
          <div className="text-xs text-muted-foreground">Harvest schedule + AI yield curve.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleYieldForecast} disabled={isYieldForecastLoading || !plantAnalysisResult}>
            {isYieldForecastLoading ? "Forecasting..." : "Run AI yield"}
          </Button>
          <ControlsSheet
            controls={controls}
            setControls={setControls}
            onQuickAnalyze={handleAnalyze}
            isLoading={isAnalysisLoading}
            preview={preview}
            open={isInputsOpen}
            onOpenChange={setIsInputsOpen}
          />
        </div>
      </div>

      <HarvestForecastTab result={harvestForecastResult} isLoading={isAnalysisLoading} />
      <YieldForecastTab result={yieldForecastResult} isLoading={isYieldForecastLoading} />
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">{t("price_profit")}</div>
          <div className="text-xs text-muted-foreground">Forecast prices and pick the best sell date.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <MarketTab
        sellableKg={harvestForecastResult?.sellable_kg || 0}
        district={controls.district}
        onMarketResultChange={setMarketResult}
      />
    </div>
  );

  const renderAdvisor = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">Crop Advisor</div>
          <div className="text-xs text-muted-foreground">Ask questions with context from your latest results.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>
      <ChatTab appState={appState} chatHistory={chatHistory} setChatHistory={setChatHistory} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AgriVisionHeader />
      <QuickActions actions={quickActions} />
      {/* Hidden global file input so "Upload" works from any view (and via Ctrl/Cmd+K). */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
        }}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28">
        {view === "home" ? renderHome() : null}
        {view === "detect" ? renderDetect() : null}
        {view === "plan" ? renderPlan() : null}
        {view === "market" ? renderMarket() : null}
        {view === "advisor" ? renderAdvisor() : null}

        <ReportPage
          imageUrl={image.url}
          detectionResult={detectionForUi}
          forecastResult={harvestForecastResult}
          marketResult={marketResult}
          controls={controls}
        />
      </main>

      <BottomDock
        value={view}
        onValueChange={next => {
          setView(next);
        }}
      />
    </div>
  );
}

function ControlsSheet({
  controls,
  setControls,
  onQuickAnalyze,
  isLoading,
  preview,
  open,
  onOpenChange,
}: {
  controls: AppControls;
  setControls: React.Dispatch<React.SetStateAction<AppControls>>;
  onQuickAnalyze: () => void;
  isLoading: boolean;
  preview: { mature: number; sellableKg: number; profitAtBestPrice: number | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = <K extends keyof AppControls>(key: K, value: AppControls[K]) => {
    setControls((prev: AppControls) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: Partial<AppControls>) => {
    setControls((prev: AppControls) => ({ ...prev, ...preset }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open inputs">
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-headline">Inputs</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {preview ? (
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Live preview</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Mature fruits</div>
                    <div className="mt-1 font-headline text-lg font-semibold tabular-nums">{preview.mature}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sellable now</div>
                    <div className="mt-1 font-headline text-lg font-semibold tabular-nums">
                      {formatNumber(preview.sellableKg, 2)} kg
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {preview.profitAtBestPrice === null
                    ? "Run Market once to preview profit."
                    : `Profit at best price: INR ${formatNumber(preview.profitAtBestPrice, 0)}`}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Presets</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset({ numPlants: 5, harvestCapacityKgDay: 6, postHarvestLossPct: 5 })}
                className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Home garden
              </button>
              <button
                type="button"
                onClick={() => applyPreset({ numPlants: 40, harvestCapacityKgDay: 25, postHarvestLossPct: 7 })}
                className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Small farm
              </button>
              <button
                type="button"
                onClick={() => applyPreset({ numPlants: 250, harvestCapacityKgDay: 120, postHarvestLossPct: 10 })}
                className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() =>
                  setControls({
                    avgWeightG: 85,
                    postHarvestLossPct: 7,
                    numPlants: 10,
                    forecastDays: 14,
                    gddBaseC: 10,
                    harvestCapacityKgDay: 20,
                    useDetectionModel: true,
                    useLiveWeather: false,
                    includePriceForecast: true,
                    district: "Coimbatore",
                  })
                }
                className="rounded-full bg-background px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:text-foreground"
              >
                Reset
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="avgWeightG">Avg fruit weight</Label>
              <span className="text-sm text-muted-foreground">{controls.avgWeightG} g</span>
            </div>
            <Slider
              id="avgWeightG"
              min={10}
              max={400}
              step={1}
              value={[controls.avgWeightG]}
              onValueChange={v => update("avgWeightG", v[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="postHarvestLossPct">Post-harvest loss</Label>
              <span className="text-sm text-muted-foreground">{controls.postHarvestLossPct}%</span>
            </div>
            <Slider
              id="postHarvestLossPct"
              min={0}
              max={30}
              step={1}
              value={[controls.postHarvestLossPct]}
              onValueChange={v => update("postHarvestLossPct", v[0])}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numPlants">Plants</Label>
              <Input
                id="numPlants"
                type="number"
                value={controls.numPlants}
                onChange={e => update("numPlants", clampNumber(e.target.valueAsNumber || 0, 1, 5000))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forecastDays">Forecast days</Label>
              <Input
                id="forecastDays"
                type="number"
                value={controls.forecastDays}
                onChange={e => update("forecastDays", clampNumber(e.target.valueAsNumber || 0, 7, 90))}
                min={7}
                max={90}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="harvestCapacityKgDay">Harvest capacity</Label>
              <Input
                id="harvestCapacityKgDay"
                type="number"
                value={controls.harvestCapacityKgDay}
                onChange={e => update("harvestCapacityKgDay", clampNumber(e.target.valueAsNumber || 0, 1, 1000))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" value={controls.district} onChange={e => update("district", e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={onQuickAnalyze} disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Re-run analysis"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
