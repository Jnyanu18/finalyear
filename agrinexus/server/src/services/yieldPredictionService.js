import { YieldPrediction } from "../models/YieldPrediction.js";
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

export async function predictYield(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "yield");
  const cropType = input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.yieldModel;

  const acres = toNumber(input.acres ?? fieldContext.acres, 0);
  const plantsPerAcre = toNumber(input.plantsPerAcre ?? fieldContext.plantsPerAcre, 0);
  const fruitsPerPlant = toNumber(input.fruitsPerPlant, 0);
  const fruitCount = toNumber(input.fruitCount, 0);
  const avgWeightKg = toNumber(input.avgFruitWeightKg, cfg.defaultFruitWeightKg);

  const effectiveFruitsPerPlant = fruitsPerPlant > 0 ? fruitsPerPlant : (acres > 0 && plantsPerAcre > 0 ? fruitCount / (acres * plantsPerAcre) : 0);

  const baselineContext = {
    cropType,
    acres,
    plantsPerAcre,
    fruitsPerPlant: effectiveFruitsPerPlant,
    avgFruitWeightKg: avgWeightKg,
    soilMoisture: toNumber(fieldContext.sensorReadings?.soilMoisture, NaN),
    weatherScore: toNumber(input.weatherScore, 0.82),
    historicalYieldFactor: toNumber(input.historicalYieldFactor, 1)
  };

  const missingInputs = missingRequiredInputs(baselineContext, [
    "acres",
    "plantsPerAcre",
    "fruitsPerPlant",
    "avgFruitWeightKg"
  ]).filter((name) => toNumber(baselineContext[name], 0) <= 0);

  const weatherFreshness = freshnessConfidence(
    input.weatherForecast?.capturedAt || fieldContext.weather?.capturedAt || fieldContext.capturedAt,
    24,
    96
  );
  const moistureFreshness = freshnessConfidence(
    fieldContext.sensorReadings?.capturedAt || fieldContext.capturedAt,
    12,
    48
  );
  const confidenceBase = Number((0.58 + weatherFreshness * 0.2 + moistureFreshness * 0.12).toFixed(2));

  if (missingInputs.length > 0 || weatherFreshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: weatherFreshness === 0 ? ["weather.capturedAt"] : [],
      confidence: confidenceBase * 0.6
    });

    const doc = await YieldPrediction.create({
      userId,
      cropType,
      predictedYieldToday: 0,
      predictedYield3Days: 0,
      predictedYield7Days: 0,
      confidence: insufficient.confidence,
      status: insufficient.status,
      modelVersion: insufficient.modelVersion,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      explanation: insufficient.explanation,
      inputContext: { ...input, fieldContext }
    });
    return doc.toObject();
  }

  const totalPlants = acres * plantsPerAcre;
  const grossPotentialYieldKg = totalPlants * effectiveFruitsPerPlant * avgWeightKg;

  const deterministicFactor = clamp(
    toNumber(input.weatherScore, 0.82) * toNumber(input.historicalYieldFactor, 1),
    0.55,
    1.25
  );

  const moisture = toNumber(fieldContext.sensorReadings?.soilMoisture, 60);
  const moistureDelta = moisture >= 50 && moisture <= 78 ? 0.03 : -0.07;
  const mlDelta = clamp(moistureDelta + (weatherFreshness - 0.6) * 0.08, -0.18, 0.12);

  const adjustedPotentialYieldKg = grossPotentialYieldKg * deterministicFactor * (1 + mlDelta);

  const fieldLossPct = toNumber(input.fieldLossPct, 4);
  const harvestLossPct = toNumber(input.harvestLossPct, 7);
  const transportLossPct = toNumber(input.transportLossPct, 3);
  const totalLossPct = clamp(fieldLossPct + harvestLossPct + transportLossPct, 0, 35);

  const netPotentialYieldKg = adjustedPotentialYieldKg * (1 - totalLossPct / 100);
  const predictedYieldToday = Number((netPotentialYieldKg * 0.34).toFixed(2));
  const predictedYield3Days = Number((netPotentialYieldKg * 0.68).toFixed(2));
  const predictedYield7Days = Number(netPotentialYieldKg.toFixed(2));

  const scenarios = {
    today: percentileBand(predictedYieldToday),
    day3: percentileBand(predictedYield3Days),
    day7: percentileBand(predictedYield7Days)
  };

  const confidence = Number(clamp(confidenceBase + 0.18, 0.55, 0.95).toFixed(2));

  const prediction = await YieldPrediction.create({
    userId,
    cropType,
    predictedYieldToday,
    predictedYield3Days,
    predictedYield7Days,
    confidence,
    status: "ok",
    modelVersion,
    scenarios,
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      formulaTerms: {
        totalPlants,
        grossPotentialYieldKg: Number(grossPotentialYieldKg.toFixed(2)),
        deterministicFactor,
        mlDelta,
        adjustedPotentialYieldKg: Number(adjustedPotentialYieldKg.toFixed(2)),
        losses: { fieldLossPct, harvestLossPct, transportLossPct, totalLossPct }
      },
      generatedAt: new Date().toISOString()
    },
    explanation: `Yield is based on ${totalPlants.toLocaleString()} plants and ${effectiveFruitsPerPlant.toFixed(2)} fruits/plant with ${totalLossPct}% total loss applied.`,
    inputContext: { ...input, fieldContext }
  });

  return prediction.toObject();
}
