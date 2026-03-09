import { HarvestPlan } from "../models/HarvestPlan.js";
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

export async function planHarvest(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "harvest");
  const cropType = input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.harvestModel;

  const acres = toNumber(input.acres ?? fieldContext.acres, 0);
  const plantsPerAcre = toNumber(input.plantsPerAcre ?? fieldContext.plantsPerAcre, 0);
  const fruitsPerPlant = toNumber(input.fruitsPerPlant, 0);
  const avgWeightKg = toNumber(input.avgFruitWeightKg, cfg.defaultFruitWeightKg);
  const ripeRatio = clamp(toNumber(input.ripeRatio, 0.45), 0, 1);

  const missingInputs = missingRequiredInputs(
    { acres, plantsPerAcre, fruitsPerPlant, avgFruitWeightKg, ripeRatio },
    ["acres", "plantsPerAcre", "fruitsPerPlant", "avgFruitWeightKg"]
  ).filter((k) => toNumber({ acres, plantsPerAcre, fruitsPerPlant, avgFruitWeightKg }[k], 0) <= 0);

  const freshness = freshnessConfidence(fieldContext.capturedAt, 24, 96);

  if (missingInputs.length > 0 || freshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: freshness === 0 ? ["fieldContext.capturedAt"] : [],
      confidence: freshness * 0.5
    });

    const doc = await HarvestPlan.create({
      userId,
      readyToday: 0,
      ready3Days: 0,
      recommendedHarvestWindow: "Insufficient data",
      status: insufficient.status,
      modelVersion,
      confidence: insufficient.confidence,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      harvestPlanDetails: {},
      inputContext: { ...input, fieldContext }
    });

    return doc.toObject();
  }

  const totalPlants = acres * plantsPerAcre;
  const grossYieldKg = totalPlants * fruitsPerPlant * avgWeightKg;
  const readyToday = Number((grossYieldKg * ripeRatio * 0.88).toFixed(2));
  const ready3Days = Number((grossYieldKg * clamp(ripeRatio + 0.22, 0, 1) * 0.9).toFixed(2));

  const recommendedHarvestWindow = ripeRatio < 0.35 ? "4-6 days" : ripeRatio < 0.6 ? "2-4 days" : "0-2 days";
  const scenarios = {
    readyToday: percentileBand(readyToday),
    ready3Days: percentileBand(ready3Days)
  };

  const confidence = Number(clamp(0.62 + freshness * 0.25, 0.58, 0.94).toFixed(2));

  const doc = await HarvestPlan.create({
    userId,
    readyToday,
    ready3Days,
    recommendedHarvestWindow,
    status: "ok",
    modelVersion,
    confidence,
    scenarios,
    harvestPlanDetails: {
      labourHint: readyToday > 120 ? "Arrange extra labor for sorting and grading." : "Current labor may be sufficient.",
      crateEstimate: Math.max(1, Math.round(ready3Days / 18))
    },
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      formulaTerms: { totalPlants, grossYieldKg: Number(grossYieldKg.toFixed(2)), ripeRatio },
      generatedAt: new Date().toISOString()
    },
    inputContext: { ...input, fieldContext }
  });

  return doc.toObject();
}
