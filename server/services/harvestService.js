import { HarvestPlan } from "../models/HarvestPlan.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";

export async function planHarvest(userId, input) {
  const modelVersion = "harvest_model_v2";
  const fruitCount = toNumber(input.fruitCount, 0);
  const ripeRatio = toNumber(input.ripeRatio, NaN);
  const avgWeightKg = toNumber(input.avgFruitWeightKg, 0.09);
  const capturedAt = input.capturedAt || null;
  const freshness = freshnessConfidence(capturedAt, 24);

  const missingInputs = [];
  if (!Number.isFinite(ripeRatio)) missingInputs.push("ripeRatio");
  if (!fruitCount) missingInputs.push("fruitCount");
  if (!capturedAt) missingInputs.push("capturedAt");
  const staleInputs = freshness === 0 ? ["capturedAt"] : [];

  if (missingInputs.length || staleInputs.length) {
    return buildInsufficientDataResponse({
      moduleName: "harvest",
      modelVersion,
      missingInputs,
      staleInputs,
      assumptions: { maxFreshHours: 24 }
    });
  }

  const readyToday = Number((fruitCount * ripeRatio * avgWeightKg).toFixed(2));
  const ready3Days = Number((fruitCount * Math.min(1, ripeRatio + 0.25) * avgWeightKg).toFixed(2));
  const lower = ripeRatio < 0.35 ? "4" : "2";
  const upper = ripeRatio < 0.35 ? "6" : "4";
  const recommendedHarvestWindow = `${lower}-${upper} days`;
  const spread = 0.12;
  const expected = ready3Days;
  const pessimistic = Number((expected * (1 - spread)).toFixed(2));
  const optimistic = Number((expected * (1 + spread)).toFixed(2));
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
  const confidence = Number((0.62 + 0.28 * freshness).toFixed(2));

  const doc = await HarvestPlan.create({
    userId,
    readyToday,
    ready3Days,
    recommendedHarvestWindow,
    status: "ok",
    modelVersion,
    confidence,
    missingInputs: [],
    scenarios,
    provenance: {
      input_sources: {
        fruitCount: "module_input",
        ripeRatio: "module_input",
        capturedAt: "module_input"
      },
      assumptions: {
        freshnessMaxHours: 24,
        scenarioSpread: spread
      },
      formula_terms: {
        readyToday: "fruitCount * ripeRatio * avgWeightKg",
        ready3Days: "fruitCount * min(1, ripeRatio + 0.25) * avgWeightKg"
      },
      generated_at: new Date().toISOString()
    },
    harvestPlanDetails: {
      labourHint: readyToday > 25 ? "Arrange extra labor for sorting." : "Current labor may be sufficient.",
      crateEstimate: Math.max(1, Math.round(ready3Days / 18))
    },
    inputContext: input
  });

  return doc.toObject();
}
