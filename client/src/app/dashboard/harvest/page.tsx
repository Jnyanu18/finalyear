"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Calendar,
  Clock3,
  Package,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { useConnectedFarmContext, type ConnectedFarmDefaults } from "@/hooks/useConnectedFarmContext";
import { planHarvest } from "@/lib/api";
import { deriveRipeRatio, readMonitorSnapshot, type MonitorSnapshot } from "@/lib/monitor-context";

type HarvestForm = {
  cropType: string;
  fruitCount: number;
  ripeRatio: number;
  avgFruitWeightKg: number;
  farmerLocation: string;
  holdingCostPerDay: number;
  capturedAt?: string;
};

type HarvestScenarioSet = {
  pessimistic: number;
  expected: number;
  optimistic: number;
  percentiles: {
    P10: number;
    P50: number;
    P90: number;
  };
};

type TimelinePoint = {
  label: string;
  dayOffset: number;
  expectedKg: number;
  focus: string;
};

type DataQuality = {
  freshness: number;
  capturedAtProvided: boolean;
  staleInputs: string[];
  assumptionMode: boolean;
};

type HarvestPlanDetails = {
  labourHint: string;
  crateEstimate: number;
  palletEstimate: number;
  pickRateKgPerHour: number;
  estimatedHarvestHours: number;
  recommendedShift: string;
  routeStrategy: string;
  pickupCadence: string;
  sortingLoad: string;
  lossRisk: string;
  readinessScore: number;
  priority: string;
  ready7Days: number;
  crewCount: number;
  timeline: TimelinePoint[];
  actionChecklist: string[];
  insights: string[];
  marketSignals?: HarvestMarketSignals;
  dataQuality: DataQuality;
};

type HarvestMarketOption = {
  id: string;
  label: string;
  netValue: number;
  market: string;
  expectedPrice: number;
  quantityKg: number;
  timing: string;
};

type HarvestMarketSignals = {
  action: string;
  recommendation: string;
  rationale: string;
  bestMarketNow: string;
  bestMarket3Days: string;
  bestMarket5Days: string;
  currentPricePerKg: number;
  projectedPrice3Days: number;
  projectedPrice5Days: number;
  marketTrend: string;
  volatility: number;
  currentNetValue: number;
  projectedNet3Days: number;
  projectedNet5Days: number;
  gainVsToday: number;
  sellNowSharePct: number;
  holdingCostPerDay: number;
  quantityProfiles: {
    readyToday: number;
    ready3Days: number;
    ready5Days: number;
    ready7Days: number;
  };
  priceSource: string;
  capturedAt: string;
  sortingLoad: string;
  options: HarvestMarketOption[];
};

type HarvestPlanResult = {
  status: string;
  confidence: number;
  readyToday: number;
  ready3Days: number;
  ready7Days: number;
  recommendedHarvestWindow: string;
  modelVersion: string;
  readinessScore: number;
  priority: string;
  scenarios: HarvestScenarioSet;
  harvestPlanDetails: HarvestPlanDetails;
  marketSignals: HarvestMarketSignals;
  timeline: TimelinePoint[];
  actionChecklist: string[];
  insights: string[];
  source: "local" | "server";
  syncedAt: string;
};

type HarvestPlanApiResponse = Partial<
  Omit<HarvestPlanResult, "source" | "syncedAt" | "harvestPlanDetails" | "timeline" | "actionChecklist" | "insights">
> & {
  marketSignals?: Partial<HarvestMarketSignals> & {
    quantityProfiles?: Partial<HarvestMarketSignals["quantityProfiles"]>;
    options?: Array<Partial<HarvestMarketOption>>;
  };
  harvestPlanDetails?: Partial<HarvestPlanDetails> & {
    marketSignals?: Partial<HarvestMarketSignals> & {
      quantityProfiles?: Partial<HarvestMarketSignals["quantityProfiles"]>;
      options?: Array<Partial<HarvestMarketOption>>;
    };
    dataQuality?: Partial<DataQuality>;
    timeline?: TimelinePoint[];
    actionChecklist?: string[];
    insights?: string[];
  };
  timeline?: Array<Partial<TimelinePoint>>;
  actionChecklist?: string[];
  insights?: string[];
  scenarios?: Partial<HarvestScenarioSet> & {
    percentiles?: Partial<HarvestScenarioSet["percentiles"]>;
  };
};

type SyncState = "idle" | "syncing" | "synced" | "error";

const kilogramFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const instantMandis = [
  { market: "Mysuru", distanceKm: 45, basePrice: 24.5 },
  { market: "Bengaluru", distanceKm: 150, basePrice: 27.2 },
  { market: "Mandya", distanceKm: 30, basePrice: 23.4 },
  { market: "Coimbatore", distanceKm: 220, basePrice: 26.6 },
  { market: "Salem", distanceKm: 190, basePrice: 25.9 },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function getHoursSince(capturedAt?: string) {
  if (!capturedAt) return null;
  const capturedMs = new Date(capturedAt).getTime();
  if (!Number.isFinite(capturedMs)) return null;
  return Math.max(0, (Date.now() - capturedMs) / (1000 * 60 * 60));
}

function formatKg(value: number) {
  return `${kilogramFormatter.format(Math.max(0, value))} kg`;
}

function formatNumericInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCropMarketProfile(cropType: string) {
  const key = cropType.trim().toLowerCase();
  const marketPriceFactor =
    {
      tomato: 1,
      chilli: 1.35,
      chili: 1.35,
      rice: 0.95,
      wheat: 0.9,
      potato: 0.82,
      onion: 0.8,
      cotton: 1.1,
      maize: 0.88,
      brinjal: 1.05,
      cabbage: 0.92,
    }[key] || 1;
  const shelfLifeDays =
    {
      tomato: 4,
      chilli: 5,
      chili: 5,
      rice: 22,
      wheat: 26,
      potato: 30,
      onion: 20,
      cotton: 18,
      maize: 14,
      brinjal: 6,
      cabbage: 12,
    }[key] || 6;

  return { marketPriceFactor, shelfLifeDays };
}

function buildInstantMarketSignals({
  form,
  readyToday,
  ready3Days,
  ready7Days,
  lossRisk,
  recommendedHarvestWindow,
  sortingLoad,
}: {
  form: HarvestForm;
  readyToday: number;
  ready3Days: number;
  ready7Days: number;
  lossRisk: string;
  recommendedHarvestWindow: string;
  sortingLoad: string;
}): HarvestMarketSignals {
  const { marketPriceFactor, shelfLifeDays } = getCropMarketProfile(form.cropType);
  const locationPremiumMap: Record<string, number> = {
    bengaluru: 1.05,
    mysuru: 0.98,
    mandya: 0.95,
    coimbatore: 1.02,
    salem: 1.01,
  };
  const locationKey = form.farmerLocation.trim().toLowerCase();
  const currentPricePerKg = roundMetric(25 * marketPriceFactor * (locationPremiumMap[locationKey] || 1));
  const projectedPrice3Days = roundMetric(currentPricePerKg * (shelfLifeDays >= 5 ? 1.025 : 0.995));
  const projectedPrice5Days = roundMetric(currentPricePerKg * (shelfLifeDays >= 7 ? 1.04 : 0.99));
  const marketTrend =
    projectedPrice3Days > currentPricePerKg * 1.01
      ? "rising"
      : projectedPrice3Days < currentPricePerKg * 0.99
        ? "softening"
        : "stable";
  const volatility = roundMetric(clamp(0.06 + Math.abs(marketPriceFactor - 1) * 0.4 + (shelfLifeDays <= 5 ? 0.03 : 0), 0.06, 0.18));
  const ready5Days = roundMetric(ready3Days + (ready7Days - ready3Days) * 0.5);
  const avgBasePrice = instantMandis.reduce((sum, market) => sum + market.basePrice, 0) / instantMandis.length;

  const evaluateOptions = (quantityKg: number, referencePricePerKg: number) =>
    instantMandis
      .map((market) => {
        const expectedPrice = roundMetric(referencePricePerKg * (market.basePrice / avgBasePrice));
        const transportCost = Math.round(120 + market.distanceKm * 2.4 + quantityKg * 0.35);
        const netValue = roundMetric(expectedPrice * quantityKg - transportCost);
        return {
          market: market.market,
          expectedPrice,
          netValue,
        };
      })
      .sort((left, right) => right.netValue - left.netValue)[0];

  const bestNow = evaluateOptions(Math.max(1, readyToday), currentPricePerKg);
  const best3Days = evaluateOptions(Math.max(1, ready3Days), projectedPrice3Days);
  const best5Days = evaluateOptions(Math.max(1, ready5Days), projectedPrice5Days);
  const currentNetValue = bestNow.netValue;
  const projectedNet3Days = roundMetric(best3Days.netValue - form.holdingCostPerDay);
  const projectedNet5Days = roundMetric(best5Days.netValue - form.holdingCostPerDay * 2);
  const rankedOptions: HarvestMarketOption[] = [
    { id: "sell_now", label: "Sell now", netValue: currentNetValue, market: bestNow.market, expectedPrice: bestNow.expectedPrice, quantityKg: readyToday, timing: "today" },
    { id: "hold_3_days", label: "Hold 3 days", netValue: projectedNet3Days, market: best3Days.market, expectedPrice: best3Days.expectedPrice, quantityKg: ready3Days, timing: "3 days" },
    { id: "hold_5_days", label: "Hold 5 days", netValue: projectedNet5Days, market: best5Days.market, expectedPrice: best5Days.expectedPrice, quantityKg: ready5Days, timing: "5 days" },
  ].sort((left, right) => right.netValue - left.netValue);

  let action = "sell_now";
  let recommendation = "Sell now";
  let rationale = `Current market capture is strong enough to move within ${recommendedHarvestWindow}.`;

  if (rankedOptions[0].id === "hold_5_days" && shelfLifeDays >= 7 && lossRisk === "low") {
    action = "hold";
    recommendation = "Hold and sell later";
    rationale = "Price momentum and shelf life both support a longer wait window.";
  } else if (rankedOptions[0].id === "hold_3_days" && shelfLifeDays >= 5 && lossRisk !== "high") {
    action = "hold";
    recommendation = "Hold 3 days";
    rationale = "A short hold improves both ripe volume and expected price capture.";
  } else if (projectedNet3Days > currentNetValue && readyToday < ready3Days && lossRisk !== "high") {
    action = "stagger_dispatch";
    recommendation = "Stagger dispatch";
    rationale = "Ship the ready lots now and release the next wave into the stronger 72-hour price window.";
  }

  return {
    action,
    recommendation,
    rationale,
    bestMarketNow: bestNow.market,
    bestMarket3Days: best3Days.market,
    bestMarket5Days: best5Days.market,
    currentPricePerKg,
    projectedPrice3Days,
    projectedPrice5Days,
    marketTrend,
    volatility,
    currentNetValue,
    projectedNet3Days,
    projectedNet5Days,
    gainVsToday: roundMetric(Math.max(projectedNet3Days, projectedNet5Days) - currentNetValue),
    sellNowSharePct:
      action === "stagger_dispatch"
        ? clamp(Math.round((readyToday / Math.max(ready3Days, 1)) * 100), 25, 70)
        : action === "sell_now"
          ? 100
          : 0,
    holdingCostPerDay: form.holdingCostPerDay,
    quantityProfiles: {
      readyToday,
      ready3Days,
      ready5Days,
      ready7Days,
    },
    priceSource: "edge_preview",
    capturedAt: new Date().toISOString(),
    sortingLoad,
    options: rankedOptions,
  };
}

function createLiveMonitorSnapshot(defaults: ConnectedFarmDefaults): MonitorSnapshot | null {
  if (!defaults.cropType) {
    return null;
  }

  return {
    cropType: defaults.cropType,
    growthStage: defaults.growthStage || "fruit development",
    fruitCount: Math.max(0, Math.round(defaults.fruitCount || 0)),
    healthStatus: defaults.healthStatus || "moderate",
    healthScore: defaults.healthScore || 0,
    stages: [],
    summary: "",
    updatedAt: defaults.updatedAt || ""
  };
}

function createInitialForm(snapshot: MonitorSnapshot | null): HarvestForm {
  return {
    cropType: snapshot?.cropType || "Tomato",
    fruitCount: snapshot?.fruitCount || 200,
    ripeRatio: deriveRipeRatio(snapshot) ?? 0.45,
    avgFruitWeightKg: 0.09,
    farmerLocation: "Bengaluru",
    holdingCostPerDay: 120,
    capturedAt: snapshot?.updatedAt,
  };
}

function buildInstantPlan(form: HarvestForm, snapshot: MonitorSnapshot | null): HarvestPlanResult {
  const fruitCount = Math.max(0, form.fruitCount);
  const ripeRatio = clamp(form.ripeRatio, 0, 1);
  const avgFruitWeightKg = Math.max(0.01, form.avgFruitWeightKg);
  const snapshotFreshness = getHoursSince(form.capturedAt);
  const freshness = snapshotFreshness === null ? 0.58 : clamp(snapshotFreshness <= 24 ? 1 : 1 - (snapshotFreshness - 24) / 24, 0.35, 1);
  const readyToday = roundMetric(fruitCount * ripeRatio * avgFruitWeightKg);
  const ready3Days = roundMetric(fruitCount * clamp(ripeRatio + 0.18 + (1 - ripeRatio) * 0.1 + freshness * 0.04, ripeRatio, 1) * avgFruitWeightKg);
  const ready7Days = roundMetric(fruitCount * clamp(ripeRatio + 0.42, ripeRatio, 1) * avgFruitWeightKg);
  const readinessScore = Math.round(clamp(ripeRatio * 72 + freshness * 18 + Math.min(10, ready3Days * 0.45), 12, 98));

  let priority = "observe_and_prepare";
  let recommendedHarvestWindow = "4-6 days";
  let recommendedShift = "Prep storage and scouting";
  let pickupCadence = "Verify again in 48 hours";

  if (readinessScore >= 78) {
    priority = "harvest_now";
    recommendedHarvestWindow = "24-48 hours";
    recommendedShift = "Sunrise pick with same-day dispatch";
    pickupCadence = "Two selective passes in 48 hours";
  } else if (readinessScore >= 50) {
    priority = "staggered_pick";
    recommendedHarvestWindow = "2-4 days";
    recommendedShift = "Split picking and grading teams";
    pickupCadence = "Selective pick every 24-36 hours";
  }

  const spread = 0.08 + (1 - freshness) * 0.12;
  const scenarios: HarvestScenarioSet = {
    pessimistic: roundMetric(ready3Days * (1 - spread)),
    expected: ready3Days,
    optimistic: roundMetric(ready3Days * (1 + spread)),
    percentiles: {
      P10: roundMetric(ready3Days * (1 - spread)),
      P50: ready3Days,
      P90: roundMetric(ready3Days * (1 + spread)),
    },
  };

  const crateEstimate = Math.max(1, Math.ceil(ready3Days / 18));
  const palletEstimate = Math.max(1, Math.ceil(crateEstimate / 12));
  const pickRateKgPerHour = roundMetric(16 + freshness * 4 + (avgFruitWeightKg < 0.08 ? 1.5 : 0));
  const estimatedHarvestHours = roundMetric(Math.max(0.8, ready3Days / pickRateKgPerHour));
  const crewCount = Math.max(1, Math.ceil(ready3Days / 26));
  const lossRisk = readinessScore >= 82 ? "high" : readinessScore >= 55 ? "medium" : "low";
  const sortingLoad = ready3Days >= 50 ? "High" : ready3Days >= 18 ? "Moderate" : "Light";
  const status = form.capturedAt ? "ok" : "assumed_data";
  const cropLabel = snapshot?.cropType || form.cropType;

  const timeline: TimelinePoint[] = [
    { label: "Today", dayOffset: 0, expectedKg: readyToday, focus: readinessScore >= 78 ? "Pull mature lots now" : "Spot-pick only" },
    { label: "72 Hours", dayOffset: 3, expectedKg: ready3Days, focus: readinessScore >= 50 ? "Main harvest wave" : "Scale crews progressively" },
    { label: "1 Week", dayOffset: 7, expectedKg: ready7Days, focus: "Clear remaining market-grade produce" },
  ];

  const actionChecklist = [
    `Allocate ${crewCount} picker${crewCount > 1 ? "s" : ""} for the next cycle.`,
    `Stage ${crateEstimate} crate${crateEstimate > 1 ? "s" : ""} and ${palletEstimate} pallet${palletEstimate > 1 ? "s" : ""}.`,
    priority === "harvest_now" ? "Book transport before noon and prepare sorting tables." : "Keep transport flexible until the next maturity verification.",
  ];

  const insights = [
    `${cropLabel} is tracking a ${recommendedHarvestWindow} harvest window.`,
    `Confidence is ${Math.round((0.56 + 0.34 * freshness) * 100)}% based on ripeness and data freshness.`,
    form.capturedAt ? "Linked to the latest crop-monitor snapshot for faster planning." : "Using assumed freshness because no monitor timestamp is linked.",
  ];
  const marketSignals = buildInstantMarketSignals({
    form,
    readyToday,
    ready3Days,
    ready7Days,
    lossRisk,
    recommendedHarvestWindow,
    sortingLoad,
  });

  const harvestPlanDetails: HarvestPlanDetails = {
    labourHint:
      priority === "harvest_now"
        ? "Bring sorting support and dispatch labour into the same shift."
        : priority === "staggered_pick"
          ? "Run split teams for selective harvest and grading."
          : "Current crew can manage prep, scouting, and light picking.",
    crateEstimate,
    palletEstimate,
    pickRateKgPerHour,
    estimatedHarvestHours,
    recommendedShift,
    routeStrategy: ready3Days >= 90 ? "Book reefer transport and same-day grading" : ready3Days >= 30 ? "Stage crates in two dispatch waves" : "Consolidate with mixed-load route",
    pickupCadence,
    sortingLoad,
    lossRisk,
    readinessScore,
    priority,
    ready7Days,
    crewCount,
    timeline,
    actionChecklist,
    insights,
    marketSignals,
    dataQuality: {
      freshness,
      capturedAtProvided: Boolean(form.capturedAt),
      staleInputs: snapshotFreshness !== null && snapshotFreshness > 48 ? ["capturedAt"] : [],
      assumptionMode: status !== "ok",
    },
  };

  return {
    status,
    confidence: roundMetric(0.56 + 0.34 * freshness),
    readyToday,
    ready3Days,
    ready7Days,
    recommendedHarvestWindow,
    modelVersion: "harvest_edge_preview",
    readinessScore,
    priority,
    scenarios,
    harvestPlanDetails,
    marketSignals,
    timeline,
    actionChecklist,
    insights,
    source: "local",
    syncedAt: new Date().toISOString(),
  };
}

function normalizeTimeline(timeline: Array<Partial<TimelinePoint>> | undefined, fallback: TimelinePoint[]) {
  if (!timeline || timeline.length === 0) return fallback;
  return timeline.map((point, index) => ({
    label: point.label || fallback[index]?.label || `Step ${index + 1}`,
    dayOffset: typeof point.dayOffset === "number" ? point.dayOffset : fallback[index]?.dayOffset || index,
    expectedKg: typeof point.expectedKg === "number" ? point.expectedKg : fallback[index]?.expectedKg || 0,
    focus: point.focus || fallback[index]?.focus || "Operational review",
  }));
}

function normalizeServerPlan(raw: HarvestPlanApiResponse, fallback: HarvestPlanResult): HarvestPlanResult {
  const detailSource = raw.harvestPlanDetails || {};
  const timeline = normalizeTimeline(raw.timeline || detailSource.timeline, fallback.timeline);
  const actionChecklist = raw.actionChecklist || detailSource.actionChecklist || fallback.actionChecklist;
  const insights = raw.insights || detailSource.insights || fallback.insights;
  const dataQuality = { ...fallback.harvestPlanDetails.dataQuality, ...(detailSource.dataQuality || {}) };
  const marketSource = raw.marketSignals || detailSource.marketSignals;
  const fallbackMarket = fallback.marketSignals;
  const marketSignals: HarvestMarketSignals = {
    ...fallbackMarket,
    ...(marketSource || {}),
    quantityProfiles: {
      ...fallbackMarket.quantityProfiles,
      ...(marketSource?.quantityProfiles || {}),
    },
    options:
      marketSource?.options?.map((option, index) => ({
        id: option.id || fallbackMarket.options[index]?.id || `option-${index}`,
        label: option.label || fallbackMarket.options[index]?.label || `Option ${index + 1}`,
        netValue: typeof option.netValue === "number" ? option.netValue : fallbackMarket.options[index]?.netValue || 0,
        market: option.market || fallbackMarket.options[index]?.market || "Market",
        expectedPrice: typeof option.expectedPrice === "number" ? option.expectedPrice : fallbackMarket.options[index]?.expectedPrice || 0,
        quantityKg: typeof option.quantityKg === "number" ? option.quantityKg : fallbackMarket.options[index]?.quantityKg || 0,
        timing: option.timing || fallbackMarket.options[index]?.timing || "now",
      })) || fallbackMarket.options,
  };

  return {
    ...fallback,
    status: raw.status || fallback.status,
    confidence: typeof raw.confidence === "number" ? raw.confidence : fallback.confidence,
    readyToday: typeof raw.readyToday === "number" ? raw.readyToday : fallback.readyToday,
    ready3Days: typeof raw.ready3Days === "number" ? raw.ready3Days : fallback.ready3Days,
    ready7Days: typeof raw.ready7Days === "number" ? raw.ready7Days : typeof detailSource.ready7Days === "number" ? detailSource.ready7Days : fallback.ready7Days,
    recommendedHarvestWindow: raw.recommendedHarvestWindow || fallback.recommendedHarvestWindow,
    modelVersion: raw.modelVersion || fallback.modelVersion,
    readinessScore: typeof raw.readinessScore === "number" ? raw.readinessScore : typeof detailSource.readinessScore === "number" ? detailSource.readinessScore : fallback.readinessScore,
    priority: raw.priority || detailSource.priority || fallback.priority,
    scenarios: {
      pessimistic: typeof raw.scenarios?.pessimistic === "number" ? raw.scenarios.pessimistic : fallback.scenarios.pessimistic,
      expected: typeof raw.scenarios?.expected === "number" ? raw.scenarios.expected : fallback.scenarios.expected,
      optimistic: typeof raw.scenarios?.optimistic === "number" ? raw.scenarios.optimistic : fallback.scenarios.optimistic,
      percentiles: {
        P10: typeof raw.scenarios?.percentiles?.P10 === "number" ? raw.scenarios.percentiles.P10 : fallback.scenarios.percentiles.P10,
        P50: typeof raw.scenarios?.percentiles?.P50 === "number" ? raw.scenarios.percentiles.P50 : fallback.scenarios.percentiles.P50,
        P90: typeof raw.scenarios?.percentiles?.P90 === "number" ? raw.scenarios.percentiles.P90 : fallback.scenarios.percentiles.P90,
      },
    },
    harvestPlanDetails: {
      ...fallback.harvestPlanDetails,
      ...detailSource,
      timeline,
      actionChecklist,
      insights,
      marketSignals,
      dataQuality,
      lossRisk: detailSource.lossRisk || fallback.harvestPlanDetails.lossRisk,
      priority: raw.priority || detailSource.priority || fallback.harvestPlanDetails.priority,
      readinessScore: typeof raw.readinessScore === "number" ? raw.readinessScore : typeof detailSource.readinessScore === "number" ? detailSource.readinessScore : fallback.harvestPlanDetails.readinessScore,
      ready7Days: typeof raw.ready7Days === "number" ? raw.ready7Days : typeof detailSource.ready7Days === "number" ? detailSource.ready7Days : fallback.harvestPlanDetails.ready7Days,
    },
    marketSignals,
    timeline,
    actionChecklist,
    insights,
    source: "server",
    syncedAt: new Date().toISOString(),
  };
}

function createSignature(form: HarvestForm) {
  return [
    form.cropType.trim().toLowerCase(),
    form.fruitCount,
    form.ripeRatio.toFixed(3),
    form.avgFruitWeightKg.toFixed(3),
    form.farmerLocation.trim().toLowerCase(),
    form.holdingCostPerDay.toFixed(2),
    form.capturedAt || "no-timestamp",
  ].join("|");
}

function getPriorityMeta(priority: string) {
  if (priority === "harvest_now") return { label: "Harvest now", className: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (priority === "staggered_pick") return { label: "Staggered pick", className: "border-amber-400/30 bg-amber-500/15 text-amber-100" };
  return { label: "Observe and prepare", className: "border-sky-400/30 bg-sky-500/15 text-sky-100" };
}

function getLossRiskMeta(lossRisk: string) {
  if (lossRisk === "high") return { label: "High loss risk", className: "border-red-400/30 bg-red-500/10 text-red-200" };
  if (lossRisk === "medium") return { label: "Medium loss risk", className: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  return { label: "Low loss risk", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" };
}

function getSyncCopy(syncState: SyncState, usingLiveModel: boolean, syncError: string | null, isPending: boolean) {
  if (usingLiveModel && syncState === "synced") return "Server model synced";
  if (syncState === "error") return syncError || "Using instant estimator";
  if (syncState === "syncing" || isPending) return "Syncing advanced model";
  return "Instant estimator active";
}

function getMarketActionMeta(action: string) {
  if (action === "hold") return { label: "Hold", className: "border-sky-400/30 bg-sky-500/12 text-sky-100" };
  if (action === "stagger_dispatch") return { label: "Stagger", className: "border-amber-400/30 bg-amber-500/12 text-amber-100" };
  return { label: "Sell now", className: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100" };
}

export default function HarvestPage() {
  const { liveDefaults } = useConnectedFarmContext();
  const [storedMonitorSnapshot] = useState<MonitorSnapshot | null>(() => readMonitorSnapshot());
  const liveMonitorSnapshot = useMemo(() => createLiveMonitorSnapshot(liveDefaults), [liveDefaults]);
  const monitorSnapshot = storedMonitorSnapshot || liveMonitorSnapshot;
  const [form, setForm] = useState<HarvestForm>(() => createInitialForm(storedMonitorSnapshot));
  const deferredForm = useDeferredValue(form);
  const [serverPlan, setServerPlan] = useState<(HarvestPlanResult & { signature: string }) | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTick, setSyncTick] = useState(0);
  const [isPending, startTransition] = useTransition();
  const immediateSyncRef = useRef(false);
  const requestIdRef = useRef(0);
  const hydratedFromLiveRef = useRef(false);
  const {
    cropType: deferredCropType,
    fruitCount: deferredFruitCount,
    ripeRatio: deferredRipeRatio,
    avgFruitWeightKg: deferredAvgFruitWeightKg,
    farmerLocation: deferredFarmerLocation,
    holdingCostPerDay: deferredHoldingCostPerDay,
    capturedAt: deferredCapturedAt,
  } = deferredForm;

  useEffect(() => {
    if (storedMonitorSnapshot || hydratedFromLiveRef.current || !liveMonitorSnapshot) {
      return;
    }

    hydratedFromLiveRef.current = true;
    setForm(createInitialForm(liveMonitorSnapshot));
  }, [liveMonitorSnapshot, storedMonitorSnapshot]);

  const instantPlan = buildInstantPlan(deferredForm, monitorSnapshot);
  const signature = createSignature(deferredForm);
  const usingLiveModel = serverPlan?.signature === signature;
  const displayPlan = usingLiveModel ? serverPlan : instantPlan;
  const priorityMeta = getPriorityMeta(displayPlan.priority);
  const lossRiskMeta = getLossRiskMeta(displayPlan.harvestPlanDetails.lossRisk);
  const marketActionMeta = getMarketActionMeta(displayPlan.marketSignals.action);
  const freshnessHours = getHoursSince(form.capturedAt);
  const maxTimelineKg = Math.max(...displayPlan.timeline.map((entry) => entry.expectedKg), 1);

  useEffect(() => {
    const delay = immediateSyncRef.current ? 0 : 260;
    const activeSignature = createSignature(deferredForm);

    const timer = window.setTimeout(async () => {
      immediateSyncRef.current = false;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setSyncState("syncing");
      setSyncError(null);

      const response = await planHarvest({
        cropType: deferredCropType,
        fruitCount: deferredFruitCount,
        ripeRatio: deferredRipeRatio,
        avgFruitWeightKg: deferredAvgFruitWeightKg,
        farmerLocation: deferredFarmerLocation,
        holdingCostPerDay: deferredHoldingCostPerDay,
        capturedAt: deferredCapturedAt,
      });

      if (requestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        const normalized = normalizeServerPlan(response.data as HarvestPlanApiResponse, buildInstantPlan(deferredForm, monitorSnapshot));
        startTransition(() => {
          setServerPlan({ ...normalized, signature: activeSignature });
          setSyncState("synced");
        });
        return;
      }

      setSyncState("error");
      setSyncError(response.error || "Model sync failed. Showing instant estimate.");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [deferredAvgFruitWeightKg, deferredCapturedAt, deferredCropType, deferredFarmerLocation, deferredForm, deferredFruitCount, deferredHoldingCostPerDay, deferredRipeRatio, monitorSnapshot, startTransition, syncTick]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.2),_transparent_42%),linear-gradient(135deg,_rgba(6,16,12,0.96),_rgba(3,10,10,0.98))]">
        <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.14),_transparent_60%)]" />
        <div className="relative p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] ${priorityMeta.className}`}>
                  {priorityMeta.label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {getSyncCopy(syncState, usingLiveModel, syncError, isPending)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {freshnessHours === null ? "No live scan linked" : `Snapshot age ${freshnessHours.toFixed(1)}h`}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">Harvest Command Center</h1>
                <p className="mt-3 max-w-2xl text-base text-emerald-50/70">
                  Instant edge forecast plus background model sync. This view keeps planning responsive while still
                  upgrading the recommendation with server-calculated logistics.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  immediateSyncRef.current = true;
                  setSyncTick((current) => current + 1);
                }}
              >
                <RefreshCw className={`h-4 w-4 ${syncState === "syncing" || isPending ? "animate-spin" : ""}`} />
                Refresh Model
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setForm((current) => ({ ...current, capturedAt: new Date().toISOString() }))}
              >
                <Zap className="h-4 w-4" />
                Stamp Current Check
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/5 bg-white/[0.03] shadow-none">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Ready now</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatKg(displayPlan.readyToday)}</p>
                <p className="mt-2 text-sm text-white/55">Immediate harvestable volume from the current maturity signal.</p>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.03] shadow-none">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">72-hour wave</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatKg(displayPlan.ready3Days)}</p>
                <p className="mt-2 text-sm text-white/55">
                  P50 {formatKg(displayPlan.scenarios.percentiles.P50)} with a window of {displayPlan.recommendedHarvestWindow}.
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.03] shadow-none">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Readiness score</p>
                <p className="mt-3 text-3xl font-semibold text-white">{displayPlan.readinessScore}/100</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300"
                    style={{ width: `${displayPlan.readinessScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.03] shadow-none">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Confidence</p>
                <p className="mt-3 text-3xl font-semibold text-white">{Math.round(displayPlan.confidence * 100)}%</p>
                <p className="mt-2 text-sm text-white/55">
                  {displayPlan.source === "server" ? "Server-verified plan" : "Edge preview"} with model {displayPlan.modelVersion}.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card className="border-white/5 bg-[#091111]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-200">Planner Inputs</p>
              <p className="mt-1 text-sm text-white/55">
                Linked crop monitor: {monitorSnapshot ? `${monitorSnapshot.cropType} snapshot available` : "none"}
              </p>
            </div>
            <p className="text-sm text-white/50">
              Adjusting any input updates the local plan immediately and syncs the advanced model in the background.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Crop type</label>
              <Input
                value={form.cropType}
                onChange={(event) => setForm((current) => ({ ...current, cropType: event.target.value }))}
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Fruit count</label>
              <Input
                type="number"
                min="0"
                value={form.fruitCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fruitCount: Math.max(0, formatNumericInput(event.target.value, current.fruitCount)),
                  }))
                }
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Ripe ratio</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.ripeRatio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ripeRatio: clamp(formatNumericInput(event.target.value, current.ripeRatio), 0, 1),
                  }))
                }
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Avg fruit weight (kg)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.avgFruitWeightKg}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    avgFruitWeightKg: Math.max(0.01, formatNumericInput(event.target.value, current.avgFruitWeightKg)),
                  }))
                }
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Market hub</label>
              <Input
                value={form.farmerLocation}
                onChange={(event) => setForm((current) => ({ ...current, farmerLocation: event.target.value }))}
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Hold cost / day</label>
              <Input
                type="number"
                min="0"
                value={form.holdingCostPerDay}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    holdingCostPerDay: Math.max(0, formatNumericInput(event.target.value, current.holdingCostPerDay)),
                  }))
                }
                className="h-11 border-white/10 bg-black/20 text-white"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Capture source: {form.capturedAt ? "Linked snapshot" : "Assumed freshness"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Forecast band: {formatKg(displayPlan.scenarios.pessimistic)} to {formatKg(displayPlan.scenarios.optimistic)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Market hub: {form.farmerLocation}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${lossRiskMeta.className}`}>{lossRiskMeta.label}</span>
          </div>
        </CardContent>
      </Card>

      {syncError && !usingLiveModel ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          {syncError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/5 bg-[#091111]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Harvest cadence</h2>
                <p className="text-sm text-white/55">Operational output across the next picking windows.</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {displayPlan.timeline.map((point) => (
                <div key={point.label} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{point.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">Day +{point.dayOffset}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{formatKg(point.expectedKg)}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                      style={{ width: `${clamp((point.expectedKg / maxTimelineKg) * 100, 8, 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-white/60">{point.focus}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">P10</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatKg(displayPlan.scenarios.percentiles.P10)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">P50</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatKg(displayPlan.scenarios.percentiles.P50)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">P90</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatKg(displayPlan.scenarios.percentiles.P90)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#091111]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Operations brief</h2>
                <p className="text-sm text-white/55">Crewing, packing, timing, and route strategy in one pass.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Crew</p>
                    <p className="text-xl font-semibold text-white">{displayPlan.harvestPlanDetails.crewCount}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{displayPlan.harvestPlanDetails.labourHint}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Harvest hours</p>
                    <p className="text-xl font-semibold text-white">
                      {displayPlan.harvestPlanDetails.estimatedHarvestHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{displayPlan.harvestPlanDetails.recommendedShift}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-sky-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Packing</p>
                    <p className="text-xl font-semibold text-white">
                      {displayPlan.harvestPlanDetails.crateEstimate} crates / {displayPlan.harvestPlanDetails.palletEstimate} pallets
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{displayPlan.harvestPlanDetails.sortingLoad} sorting load expected.</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Route</p>
                    <p className="text-xl font-semibold text-white">{displayPlan.harvestPlanDetails.pickupCadence}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{displayPlan.harvestPlanDetails.routeStrategy}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs ${lossRiskMeta.className}`}>{lossRiskMeta.label}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                  Pick rate {displayPlan.harvestPlanDetails.pickRateKgPerHour.toFixed(1)} kg/h
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                  Freshness {Math.round(displayPlan.harvestPlanDetails.dataQuality.freshness * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-[#091111]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Market release strategy</h2>
                <p className="text-sm text-white/55">Sell-now vs hold decision using price curve, yield growth, and route economics.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs ${marketActionMeta.className}`}>{marketActionMeta.label}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                Trend {displayPlan.marketSignals.marketTrend}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                Source {displayPlan.marketSignals.priceSource}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Recommendation</p>
              <p className="mt-3 text-2xl font-semibold text-white">{displayPlan.marketSignals.recommendation}</p>
              <p className="mt-3 text-sm text-white/60">{displayPlan.marketSignals.rationale}</p>
              {displayPlan.marketSignals.action === "stagger_dispatch" ? (
                <p className="mt-3 text-sm text-amber-100">
                  Dispatch {displayPlan.marketSignals.sellNowSharePct}% now and hold the balance for the next wave.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Price curve</p>
              <div className="mt-3 space-y-3 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Today</span>
                  <span className="font-medium">INR {displayPlan.marketSignals.currentPricePerKg.toFixed(2)}/kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>3 days</span>
                  <span className="font-medium">INR {displayPlan.marketSignals.projectedPrice3Days.toFixed(2)}/kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>5 days</span>
                  <span className="font-medium">INR {displayPlan.marketSignals.projectedPrice5Days.toFixed(2)}/kg</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/55">
                Volatility {Math.round(displayPlan.marketSignals.volatility * 100)}% with holding cost INR {displayPlan.marketSignals.holdingCostPerDay}/day.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Net value comparison</p>
              <div className="mt-3 space-y-3 text-sm text-white/80">
                {displayPlan.marketSignals.options.map((option) => (
                  <div key={option.id} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{option.label}</p>
                        <p className="text-xs text-white/45">{option.market} · {option.timing}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">INR {option.netValue.toFixed(0)}</p>
                        <p className="text-xs text-white/45">{formatKg(option.quantityKg)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-white/55">
                Best 72-hour market is {displayPlan.marketSignals.bestMarket3Days}. Gain vs today: INR {displayPlan.marketSignals.gainVsToday.toFixed(0)}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/5 bg-[#091111]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Action queue</h2>
                <p className="text-sm text-white/55">Short actions generated from the active harvest mode.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {displayPlan.actionChecklist.map((item) => (
                <div key={item} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white/80">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#091111]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200">
                {displayPlan.status === "ok" ? <Sparkles className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">System notes</h2>
                <p className="text-sm text-white/55">Model interpretation, freshness assumptions, and advisory notes.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {displayPlan.status !== "ok" ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  This plan is operating in assumption mode because the latest crop-monitor timestamp is missing or stale.
                </div>
              ) : null}

              {displayPlan.insights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white/80">
                  {item}
                </div>
              ))}

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    {displayPlan.source === "server" ? "Advanced model active" : "Edge preview active"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    Synced at {new Date(displayPlan.syncedAt).toLocaleTimeString()}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    {displayPlan.modelVersion}
                  </span>
                </div>
              </div>

              {displayPlan.harvestPlanDetails.dataQuality.assumptionMode ? (
                <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-white/75">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                  <p>
                    Use the Crop Monitor module before final dispatch booking if you need a higher-confidence harvest
                    window and fresher maturity signal.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
