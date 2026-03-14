import { ProfitSimulation } from "../models/ProfitSimulation.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";
import { fetchMarketSnapshot } from "../utils/externalData.js";
import { safeCreate, safeFindOneLean } from "../utils/persistence.js";

function roundMetric(value) {
  return Number(value.toFixed(2));
}

export async function buildProfitSimulation(userId, input, { persist = true } = {}) {
  const modelVersion = "profit_model_v3";
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = toNumber(input.quantity, 0);

  if (!quantity) {
    return buildInsufficientDataResponse({
      moduleName: "profit",
      modelVersion,
      missingInputs: ["quantity"],
      staleInputs: [],
      assumptions: { maxFreshHours: 12 }
    });
  }

  const intelligence = await safeFindOneLean(FarmIntelligence, { userId });
  const marketSnapshot = input.marketSnapshot || await fetchMarketSnapshot(cropType, input.marketLocation || "Bengaluru");
  const priceCapturedAt = input.priceCapturedAt || marketSnapshot.capturedAt || null;
  const freshness = priceCapturedAt ? freshnessConfidence(priceCapturedAt, 12) : 0.72;
  const staleInputs = freshness === 0 ? ["priceCapturedAt"] : [];
  const priceBias = toNumber(intelligence?.averagePriceError, 0);
  const priceToday = toNumber(input.priceToday, marketSnapshot.pricePerKg);
  const price3Days = toNumber(input.price3Days, marketSnapshot.projectedPrice3Days ?? priceToday * 1.04);
  const price5Days = toNumber(input.price5Days, marketSnapshot.projectedPrice5Days ?? priceToday * 1.02);
  const holdingCost = toNumber(input.holdingCost, 120);

  const adjToday = Math.max(1, priceToday + priceBias * 0.4);
  const adj3 = Math.max(1, price3Days + priceBias * 0.4);
  const adj5 = Math.max(1, price5Days + priceBias * 0.4);

  const scenarioToday = roundMetric(quantity * adjToday);
  const scenario3Days = roundMetric(quantity * adj3 - holdingCost * 1);
  const scenario5Days = roundMetric(quantity * adj5 - holdingCost * 2);

  const options = [
    { label: "Harvest today", value: scenarioToday },
    { label: "Harvest in 3 days", value: scenario3Days },
    { label: "Harvest in 5 days", value: scenario5Days }
  ].sort((a, b) => b.value - a.value);

  const sorted = options.map((option) => option.value).sort((a, b) => a - b);
  const scenarios = {
    pessimistic: sorted[0],
    expected: sorted[1],
    optimistic: sorted[2],
    percentiles: {
      P10: sorted[0],
      P50: sorted[1],
      P90: sorted[2]
    }
  };

  const sourcePenalty = marketSnapshot.source === "fallback" ? 0.04 : 0;
  const confidence = roundMetric(
    0.58 + 0.24 * Math.max(freshness, 0.35) - sourcePenalty + toNumber(intelligence?.predictionConfidence, 0.7) * 0.12
  );
  const recommendedOption = options[0].label;
  const holdDelta3Days = roundMetric(scenario3Days - scenarioToday);
  const holdDelta5Days = roundMetric(scenario5Days - scenarioToday);
  const status = staleInputs.length ? "assumed_data" : "ok";

  const payload = {
    cropType,
    quantity,
    scenarioToday,
    scenario3Days,
    scenario5Days,
    recommendedOption,
    status,
    modelVersion,
    confidence,
    missingInputs: priceCapturedAt ? [] : ["priceCapturedAt"],
    scenarios,
    provenance: {
      input_sources: {
        priceCapturedAt: marketSnapshot.source,
        priceToday: input.priceToday ? "module_input" : "market_snapshot",
        quantity: "module_input"
      },
      assumptions: {
        freshnessMaxHours: 12,
        holdingCostPerDay: holdingCost,
        priceBiasFromOutcome: priceBias
      },
      formula_terms: {
        scenarioToday: "quantity * (priceToday + 0.4*averagePriceError)",
        scenario3Days: "quantity * (price3Days + 0.4*averagePriceError) - holdingCost",
        scenario5Days: "quantity * (price5Days + 0.4*averagePriceError) - 2*holdingCost"
      },
      generated_at: new Date().toISOString()
    },
    assumptions: {
      priceToday: adjToday,
      price3Days: adj3,
      price5Days: adj5,
      holdingCost,
      holdDelta3Days,
      holdDelta5Days
    },
    inputContext: input
  };

  if (!persist) {
    return {
      ...payload,
      marketSignal: marketSnapshot
    };
  }

  const doc = await safeCreate(ProfitSimulation, userId, payload);
  return {
    ...doc,
    marketSignal: marketSnapshot
  };
}

export async function simulateProfit(userId, input) {
  return buildProfitSimulation(userId, input, { persist: true });
}
