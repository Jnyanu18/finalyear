import { ProfitSimulation } from "../models/ProfitSimulation.js";
import { getCropConfig } from "../config/agronomyConfig.js";
import { getMergedFieldContext } from "./fieldContextService.js";
import {
  buildInsufficientDataResponse,
  clamp,
  freshnessConfidence,
  missingRequiredInputs,
  percentileBand,
  toNumber
} from "../utils/modelGovernance.js";

export async function simulateProfit(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "profit");
  const cropType = input.crop || input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.profitModel;

  const quantity = toNumber(input.quantity, 0);
  const priceToday = toNumber(input.priceToday ?? fieldContext.market?.pricePerKg, 0);
  const price3Days = toNumber(input.price3Days, priceToday * 1.05);
  const price5Days = toNumber(input.price5Days, priceToday * 1.03);
  const holdingCost = toNumber(input.holdingCost, 120);
  const fieldLossPct = toNumber(input.fieldLossPct, 4);
  const harvestLossPct = toNumber(input.harvestLossPct, 7);
  const transportLossPct = toNumber(input.transportLossPct, 3);
  const totalLossPct = clamp(fieldLossPct + harvestLossPct + transportLossPct, 0, 35);

  const missingInputs = missingRequiredInputs({ quantity, priceToday }, ["quantity", "priceToday"]).filter(
    (k) => toNumber({ quantity, priceToday }[k], 0) <= 0
  );

  const freshness = freshnessConfidence(input.priceCapturedAt || fieldContext.market?.capturedAt || fieldContext.capturedAt, 8, 48);

  if (missingInputs.length > 0 || freshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: freshness === 0 ? ["market.priceCapturedAt"] : [],
      confidence: freshness * 0.5
    });

    const doc = await ProfitSimulation.create({
      userId,
      cropType,
      quantity: Math.max(0, quantity),
      scenarioToday: 0,
      scenario3Days: 0,
      scenario5Days: 0,
      recommendedOption: "Insufficient data",
      status: insufficient.status,
      modelVersion,
      confidence: insufficient.confidence,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      assumptions: {},
      inputContext: { ...input, fieldContext }
    });

    return doc.toObject();
  }

  const sellableQuantity = quantity * (1 - totalLossPct / 100);
  const scenarioToday = Number((sellableQuantity * priceToday).toFixed(2));
  const scenario3Days = Number((sellableQuantity * price3Days - holdingCost * 1).toFixed(2));
  const scenario5Days = Number((sellableQuantity * price5Days - holdingCost * 2).toFixed(2));

  const options = [
    { label: "Harvest today", value: scenarioToday },
    { label: "Harvest in 3 days", value: scenario3Days },
    { label: "Harvest in 5 days", value: scenario5Days }
  ].sort((a, b) => b.value - a.value);

  const confidence = Number(clamp(0.62 + freshness * 0.25, 0.58, 0.95).toFixed(2));

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
    scenarios: {
      today: percentileBand(scenarioToday),
      day3: percentileBand(scenario3Days),
      day5: percentileBand(scenario5Days)
    },
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      formulaTerms: { sellableQuantity: Number(sellableQuantity.toFixed(2)), totalLossPct },
      generatedAt: new Date().toISOString()
    },
    inputContext: { ...input, fieldContext },
    assumptions: {
      priceToday,
      price3Days,
      price5Days,
      holdingCost,
      losses: { fieldLossPct, harvestLossPct, transportLossPct, totalLossPct }
    }
  });

  return doc.toObject();
}
