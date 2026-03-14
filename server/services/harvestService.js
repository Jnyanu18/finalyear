import { HarvestPlan } from "../models/HarvestPlan.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";
import { safeCreate } from "../utils/persistence.js";
import { getCropProfile } from "../config/cropProfiles.js";
import { buildMarketRouteRecommendation } from "./marketService.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value) {
  return Number(value.toFixed(2));
}

function roundWhole(value) {
  return Math.round(value);
}

function buildMarketDecision({
  cropProfile,
  readyToday,
  ready3Days,
  ready7Days,
  readinessScore,
  lossRisk,
  marketNow,
  market3Days,
  market5Days,
  holdingCostPerDay,
  recommendedHarvestWindow,
  sortingLoad
}) {
  const ready5Days = roundMetric(ready3Days + (ready7Days - ready3Days) * 0.5);
  const todayNet = roundMetric(marketNow.netProfit);
  const day3Net = roundMetric(market3Days.netProfit - holdingCostPerDay);
  const day5Net = roundMetric(market5Days.netProfit - holdingCostPerDay * 2);
  const options = [
    {
      id: "sell_now",
      label: "Sell now",
      netValue: todayNet,
      market: marketNow.bestMarket,
      expectedPrice: marketNow.expectedPrice,
      quantityKg: readyToday,
      timing: "today"
    },
    {
      id: "hold_3_days",
      label: "Hold 3 days",
      netValue: day3Net,
      market: market3Days.bestMarket,
      expectedPrice: market3Days.expectedPrice,
      quantityKg: ready3Days,
      timing: "3 days"
    },
    {
      id: "hold_5_days",
      label: "Hold 5 days",
      netValue: day5Net,
      market: market5Days.bestMarket,
      expectedPrice: market5Days.expectedPrice,
      quantityKg: ready5Days,
      timing: "5 days"
    }
  ].sort((a, b) => b.netValue - a.netValue);

  const topOption = options[0];
  const topFutureOption = options.find((option) => option.id !== "sell_now") || topOption;
  const gainVsToday = roundMetric(topFutureOption.netValue - todayNet);
  const safeToHold = cropProfile.shelfLifeDays >= 5 && lossRisk !== "high";

  let action = "sell_now";
  let recommendation = "Sell now";
  let rationale = `Current maturity and ${lossRisk} loss risk favor monetizing within ${recommendedHarvestWindow}.`;

  if (safeToHold && topOption.id === "hold_5_days" && topOption.netValue > todayNet * 1.08) {
    action = "hold";
    recommendation = "Hold and sell later";
    rationale = `Price momentum is strong enough to justify waiting, with shelf life supporting a longer hold.`;
  } else if (safeToHold && topOption.id === "hold_3_days" && topOption.netValue > todayNet * 1.05) {
    action = "hold";
    recommendation = "Hold 3 days";
    rationale = `Projected market uplift outweighs holding cost while ripeness continues improving.`;
  } else if (safeToHold && gainVsToday > 0 && readyToday < ready3Days) {
    action = "stagger_dispatch";
    recommendation = "Stagger dispatch";
    rationale = `Ship the ready volume now and keep the remaining lots for the next price window.`;
  }

  const sellNowSharePct =
    action === "stagger_dispatch"
      ? clamp(roundWhole((readyToday / Math.max(ready3Days, 1)) * 100), 25, 70)
      : action === "sell_now"
        ? 100
        : 0;

  return {
    action,
    recommendation,
    rationale,
    bestMarketNow: marketNow.bestMarket,
    bestMarket3Days: market3Days.bestMarket,
    bestMarket5Days: market5Days.bestMarket,
    currentPricePerKg: marketNow.referencePricePerKg,
    projectedPrice3Days: market3Days.referencePricePerKg,
    projectedPrice5Days: market5Days.referencePricePerKg,
    marketTrend: marketNow.marketSignal?.trend || "stable",
    volatility: marketNow.marketSignal?.volatility || 0.08,
    currentNetValue: todayNet,
    projectedNet3Days: day3Net,
    projectedNet5Days: day5Net,
    gainVsToday,
    sellNowSharePct,
    holdingCostPerDay,
    quantityProfiles: {
      readyToday,
      ready3Days,
      ready5Days,
      ready7Days
    },
    priceSource: marketNow.marketSignal?.source || "fallback",
    capturedAt: marketNow.marketSignal?.capturedAt || new Date().toISOString(),
    sortingLoad,
    options
  };
}

export async function planHarvest(userId, input) {
  const modelVersion = "harvest_model_v4";
  const cropType = input.cropType || input.crop || "Tomato";
  const profile = getCropProfile(cropType);
  const fruitCount = toNumber(input.fruitCount, 0);
  const ripeRatio = toNumber(input.ripeRatio, NaN);
  const avgWeightKg = toNumber(input.avgFruitWeightKg ?? input.avgUnitWeightKg, profile.avgUnitWeightKg);
  const capturedAt = input.capturedAt || null;
  const hasCapturedAt = Boolean(capturedAt);
  const freshness = hasCapturedAt ? freshnessConfidence(capturedAt, 24) : 0.58;

  const missingInputs = [];
  if (!Number.isFinite(ripeRatio)) missingInputs.push("ripeRatio");
  if (!fruitCount) missingInputs.push("fruitCount");
  if (!(avgWeightKg > 0)) missingInputs.push("avgFruitWeightKg");
  const staleInputs = hasCapturedAt && freshness === 0 ? ["capturedAt"] : [];

  if (missingInputs.length) {
    return buildInsufficientDataResponse({
      moduleName: "harvest",
      modelVersion,
      missingInputs,
      staleInputs: [],
      assumptions: { maxFreshHours: 24 }
    });
  }

  const effectiveFreshness = clamp(freshness, 0.35, 1);
  const ripeLift3Days = 0.16 + (1 - ripeRatio) * 0.12 + effectiveFreshness * 0.04;
  const ripeLift7Days = 0.38 + (1 - ripeRatio) * 0.18;
  const readyToday = roundMetric(fruitCount * ripeRatio * avgWeightKg);
  const ready3Days = roundMetric(fruitCount * clamp(ripeRatio + ripeLift3Days, ripeRatio, 1) * avgWeightKg);
  const ready7Days = roundMetric(fruitCount * clamp(ripeRatio + ripeLift7Days, ripeRatio, 1) * avgWeightKg);
  const readinessScore = roundWhole(
    clamp(ripeRatio * 72 + effectiveFreshness * 18 + Math.min(10, ready3Days * 0.45), 12, 98)
  );

  let priority = "observe_and_prepare";
  let recommendedHarvestWindow = "4-6 days";
  let recommendedShift = "Prep storage and labour only";
  let pickupCadence = "Single verification in 48 hours";

  if (readinessScore >= 78) {
    priority = "harvest_now";
    recommendedHarvestWindow = "24-48 hours";
    recommendedShift = "Start with sunrise pick and same-day dispatch";
    pickupCadence = "Two selective passes within 48 hours";
  } else if (readinessScore >= 50) {
    priority = "staggered_pick";
    recommendedHarvestWindow = "2-4 days";
    recommendedShift = "Split teams into grading and picking shifts";
    pickupCadence = "Selective pick every 24-36 hours";
  }

  const spread = 0.08 + (1 - effectiveFreshness) * 0.12;
  const expected = ready3Days;
  const pessimistic = roundMetric(expected * (1 - spread));
  const optimistic = roundMetric(expected * (1 + spread));
  const scenarios = {
    pessimistic,
    expected,
    optimistic,
    percentiles: {
      P10: pessimistic,
      P50: expected,
      P90: optimistic
    }
  };
  const confidence = roundMetric(0.56 + 0.34 * effectiveFreshness);
  const crateEstimate = Math.max(1, Math.ceil(ready3Days / 18));
  const palletEstimate = Math.max(1, Math.ceil(crateEstimate / 12));
  const pickRateKgPerHour = roundMetric(16 + effectiveFreshness * 4 + (avgWeightKg < 0.08 ? 1.5 : 0));
  const estimatedHarvestHours = roundMetric(Math.max(0.8, ready3Days / pickRateKgPerHour));
  const crewCount = Math.max(1, Math.ceil(ready3Days / 26));
  const lossRisk = readinessScore >= 82 ? "high" : readinessScore >= 55 ? "medium" : "low";
  const sortingLoad = ready3Days >= 50 ? "High" : ready3Days >= 18 ? "Moderate" : "Light";
  const routeStrategy =
    ready3Days >= 90
      ? "Book reefer transport and same-day grading"
      : ready3Days >= 30
        ? "Stage crates in two dispatch waves"
        : "Consolidate with mixed-load route";
  const status = hasCapturedAt && !staleInputs.length ? "ok" : "assumed_data";
  const timeline = [
    {
      label: "Today",
      dayOffset: 0,
      expectedKg: readyToday,
      focus: readinessScore >= 78 ? "Prioritize red-ripe lots" : "Selective spot pick only"
    },
    {
      label: "72 Hours",
      dayOffset: 3,
      expectedKg: ready3Days,
      focus: readinessScore >= 50 ? "Main harvest wave" : "Scale crews progressively"
    },
    {
      label: "1 Week",
      dayOffset: 7,
      expectedKg: ready7Days,
      focus: "Clear remaining market-grade volume"
    }
  ];
  const actionChecklist = [
    `Allocate ${crewCount} picker${crewCount > 1 ? "s" : ""} for the next cycle.`,
    `Stage ${crateEstimate} crate${crateEstimate > 1 ? "s" : ""} and ${palletEstimate} pallet${palletEstimate > 1 ? "s" : ""} before dispatch.`,
    readinessScore >= 78
      ? "Pre-book transport before noon to avoid holding mature produce."
      : "Hold transport booking until next scan confirms maturity lift.",
    lossRisk === "high"
      ? "Increase sorting frequency to reduce overripe loss."
      : "Maintain standard grading cadence."
  ];
  const insights = [
    `${profile.label} profile suggests ${profile.shelfLifeDays} days of shelf life after harvest.`,
    hasCapturedAt
      ? `Snapshot freshness is contributing ${roundWhole(effectiveFreshness * 100)}% of available confidence.`
      : "No image timestamp was supplied, so freshness is estimated conservatively.",
    `Expected 72-hour packhouse load is ${sortingLoad.toLowerCase()} with a ${recommendedHarvestWindow} action window.`
  ];

  const holdingCostPerDay = toNumber(
    input.holdingCostPerDay,
    Math.max(120, roundWhole(ready3Days * 1.4))
  );
  const farmerLocation = input.farmerLocation || "Bengaluru";
  const localDistanceAdjust = toNumber(input.localDistanceAdjust, 0);
  const marketNow = await buildMarketRouteRecommendation(
    userId,
    {
      cropType,
      quantity: Math.max(1, readyToday),
      farmerLocation,
      localDistanceAdjust
    },
    { persist: false }
  );
  const market3Days = await buildMarketRouteRecommendation(
    userId,
    {
      cropType,
      quantity: Math.max(1, ready3Days),
      farmerLocation,
      localDistanceAdjust,
      marketSnapshot: marketNow.marketSignal,
      marketRatesCapturedAt: marketNow.marketSignal?.capturedAt,
      referencePricePerKg: marketNow.marketSignal?.projectedPrice3Days || marketNow.referencePricePerKg
    },
    { persist: false }
  );
  const market5Days = await buildMarketRouteRecommendation(
    userId,
    {
      cropType,
      quantity: Math.max(1, roundMetric(ready3Days + (ready7Days - ready3Days) * 0.5)),
      farmerLocation,
      localDistanceAdjust,
      marketSnapshot: marketNow.marketSignal,
      marketRatesCapturedAt: marketNow.marketSignal?.capturedAt,
      referencePricePerKg: marketNow.marketSignal?.projectedPrice5Days || marketNow.referencePricePerKg
    },
    { persist: false }
  );

  const marketSignals = buildMarketDecision({
    cropProfile: profile,
    readyToday,
    ready3Days,
    ready7Days,
    readinessScore,
    lossRisk,
    marketNow,
    market3Days,
    market5Days,
    holdingCostPerDay,
    recommendedHarvestWindow,
    sortingLoad
  });

  const doc = await safeCreate(HarvestPlan, userId, {
    readyToday,
    ready3Days,
    recommendedHarvestWindow,
    status,
    modelVersion,
    confidence,
    missingInputs: hasCapturedAt ? [] : ["capturedAt"],
    scenarios,
    provenance: {
      input_sources: {
        fruitCount: "module_input",
        ripeRatio: "module_input",
        avgFruitWeightKg: input.avgFruitWeightKg ? "module_input" : "crop_profile_default",
        capturedAt: hasCapturedAt ? "module_input" : "assumed_freshness_baseline",
        marketSignals: marketNow.marketSignal?.source || "fallback"
      },
      assumptions: {
        freshnessMaxHours: 24,
        scenarioSpread: spread,
        fallbackFreshnessWhenMissingTimestamp: 0.58,
        holdingCostPerDay
      },
      formula_terms: {
        readyToday: "fruitCount * ripeRatio * avgWeightKg",
        ready3Days: "fruitCount * clamp(ripeRatio + ripeLift3Days, ripeRatio, 1) * avgWeightKg",
        readinessScore: "ripeRatio * 72 + freshness * 18 + min(10, ready3Days * 0.45)"
      },
      generated_at: new Date().toISOString()
    },
    harvestPlanDetails: {
      labourHint:
        priority === "harvest_now"
          ? "Bring in sorting support and dispatch labour on the same shift."
          : priority === "staggered_pick"
            ? "Maintain a split team for selective harvest and grading."
            : "Current crew can manage scouting and prep.",
      crateEstimate,
      palletEstimate,
      pickRateKgPerHour,
      estimatedHarvestHours,
      recommendedShift,
      routeStrategy,
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
        freshness: effectiveFreshness,
        capturedAtProvided: hasCapturedAt,
        staleInputs,
        assumptionMode: status !== "ok"
      }
    },
    inputContext: input
  });

  return {
    ...doc,
    recommendedHarvestWindow,
    ready7Days,
    readinessScore,
    priority,
    timeline,
    actionChecklist,
    insights,
    marketSignals
  };
}
