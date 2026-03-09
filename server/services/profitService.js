import { ProfitSimulation } from "../models/ProfitSimulation.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";

export async function simulateProfit(userId, input) {
  const modelVersion = "profit_model_v2";
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = toNumber(input.quantity, 0);
  const priceToday = toNumber(input.priceToday, 0);
  const price3Days = toNumber(input.price3Days, priceToday * 1.06);
  const price5Days = toNumber(input.price5Days, priceToday * 1.03);
  const holdingCost = toNumber(input.holdingCost, 120);
  const priceCapturedAt = input.priceCapturedAt || null;
  const freshness = freshnessConfidence(priceCapturedAt, 12);

  const missingInputs = [];
  if (!quantity) missingInputs.push("quantity");
  if (!priceToday) missingInputs.push("priceToday");
  if (!priceCapturedAt) missingInputs.push("priceCapturedAt");
  const staleInputs = freshness === 0 ? ["priceCapturedAt"] : [];

  if (missingInputs.length || staleInputs.length) {
    return buildInsufficientDataResponse({
      moduleName: "profit",
      modelVersion,
      missingInputs,
      staleInputs,
      assumptions: { maxFreshHours: 12 }
    });
  }

  const intelligence = await FarmIntelligence.findOne({ userId }).lean();
  const priceBias = toNumber(intelligence?.averagePriceError, 0);

  const adjToday = Math.max(1, priceToday + priceBias * 0.4);
  const adj3 = Math.max(1, price3Days + priceBias * 0.4);
  const adj5 = Math.max(1, price5Days + priceBias * 0.4);

  const scenarioToday = Number((quantity * adjToday).toFixed(2));
  const scenario3Days = Number((quantity * adj3 - holdingCost * 1).toFixed(2));
  const scenario5Days = Number((quantity * adj5 - holdingCost * 2).toFixed(2));

  const options = [
    { label: "Harvest today", value: scenarioToday },
    { label: "Harvest in 3 days", value: scenario3Days },
    { label: "Harvest in 5 days", value: scenario5Days }
  ];
  options.sort((a, b) => b.value - a.value);
  const sorted = options.map((o) => o.value).sort((a, b) => a - b);
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
  const confidence = Number((0.58 + 0.28 * freshness + toNumber(intelligence?.predictionConfidence, 0.7) * 0.12).toFixed(2));

  const doc = await ProfitSimulation.create({
    userId,
    cropType,
    quantity,
    scenarioToday,
    scenario3Days,
    scenario5Days,
    recommendedOption: options[0].label,
    status: "ok",
    modelVersion,
    confidence,
    missingInputs: [],
    scenarios,
    provenance: {
      input_sources: {
        priceCapturedAt: "market_feed",
        priceToday: "module_input_or_market",
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
      holdingCost
    },
    inputContext: input
  });

  return doc.toObject();
}
