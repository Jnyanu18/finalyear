import { YieldPrediction } from "../models/YieldPrediction.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import { freshnessConfidence, buildInsufficientDataResponse, toNumber } from "../utils/modelGovernance.js";
import { upsertFieldSnapshot } from "./fieldContextService.js";

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function stageCurve(stageRaw) {
  const stage = String(stageRaw || "").toLowerCase();
  if (stage.includes("seed")) return { today: 0.03, day3: 0.06, day7: 0.14 };
  if (stage.includes("veget")) return { today: 0.1, day3: 0.18, day7: 0.35 };
  if (stage.includes("flower")) return { today: 0.2, day3: 0.34, day7: 0.56 };
  if (stage.includes("fruit")) return { today: 0.36, day3: 0.58, day7: 0.8 };
  if (stage.includes("ripen")) return { today: 0.64, day3: 0.83, day7: 0.96 };
  if (stage.includes("harvest")) return { today: 0.86, day3: 0.95, day7: 1.0 };
  return { today: 0.32, day3: 0.5, day7: 0.76 };
}

export async function predictYield(userId, input) {
  const modelVersion = "yield_model_v2";
  const cropType = input.cropType || "Tomato";
  const cropStage = input.cropStage || "fruiting";
  const fruitsPerPlant = toNumber(input.fruitsPerPlant ?? input.fruitCount, 0);
  const acres = toNumber(input.acres, 0);
  const plantsPerAcre = toNumber(input.plantsPerAcre, 0);
  const avgFruitWeightKg = toNumber(input.avgFruitWeightKg, 0.09);
  const weatherScore = clamp(toNumber(input.weatherScore, 0.8), 0.45, 1.25);
  const historicalYieldFactor = clamp(toNumber(input.historicalYieldFactor, 1), 0.6, 1.4);

  const fieldLossPct = clamp(toNumber(input.fieldLossPct, 4), 0, 30);
  const harvestLossPct = clamp(toNumber(input.harvestLossPct ?? input.postHarvestLossPct, 7), 0, 30);
  const transportLossPct = clamp(toNumber(input.transportLossPct, 3), 0, 20);
  const totalLossPct = clamp(fieldLossPct + harvestLossPct + transportLossPct, 0, 45);

  const weatherFreshness = freshnessConfidence(input.fieldContext?.weather?.capturedAt || input.weatherForecast?.capturedAt, 24);
  const missingInputs = [];
  if (!acres) missingInputs.push("acres");
  if (!plantsPerAcre) missingInputs.push("plantsPerAcre");
  if (!fruitsPerPlant) missingInputs.push("fruitsPerPlant|fruitCount");

  if (missingInputs.length) {
    const insufficient = buildInsufficientDataResponse({
      moduleName: "yield",
      modelVersion,
      missingInputs,
      staleInputs: [],
      assumptions: { formula: "baseYield = fruitsPerPlant * avgFruitWeightKg * totalPlants" }
    });

    const doc = await YieldPrediction.create({
      userId,
      cropType,
      predictedYieldToday: 0,
      predictedYield3Days: 0,
      predictedYield7Days: 0,
      confidence: 0,
      status: insufficient.status,
      modelVersion,
      missingInputs,
      inputContext: input,
      explanation: "Insufficient data: acres, plants per acre, and fruits per plant are required."
    });
    return doc.toObject();
  }

  const curve = stageCurve(cropStage);
  const totalPlants = acres * plantsPerAcre;
  const baseYield = fruitsPerPlant * avgFruitWeightKg * totalPlants;

  const rainfallFactor = clamp(1 - toNumber(input.fieldContext?.weather?.rainfallMm, 0) * 0.01, 0.82, 1.06);
  const temperatureC = toNumber(input.fieldContext?.weather?.temperatureC, 27);
  const temperatureFactor = clamp(1 - Math.abs(temperatureC - 26) * 0.015, 0.82, 1.08);
  const weatherAdjustment = weatherScore * ((temperatureFactor + rainfallFactor) / 2);

  const grossPotentialYieldKg = baseYield * weatherAdjustment * historicalYieldFactor;

  const intelligence = await FarmIntelligence.findOne({ userId }).lean();
  const yieldErrorBiasPct = clamp(toNumber(intelligence?.averageYieldError, 0) / Math.max(grossPotentialYieldKg, 1), -0.2, 0.2);
  const correctedYieldKg = grossPotentialYieldKg * (1 - yieldErrorBiasPct);
  const sellableYieldKg = correctedYieldKg * (1 - totalLossPct / 100);

  const predictedYieldToday = Number((sellableYieldKg * curve.today).toFixed(2));
  const predictedYield3Days = Number((sellableYieldKg * curve.day3).toFixed(2));
  const predictedYield7Days = Number((sellableYieldKg * curve.day7).toFixed(2));

  const confidence = Number(
    clamp(0.56 + weatherFreshness * 0.18 + toNumber(intelligence?.predictionConfidence, 0.7) * 0.26, 0.48, 0.95).toFixed(2)
  );

  const spread = 0.12;
  const scenarios = {
    pessimistic: Number((predictedYield7Days * (1 - spread)).toFixed(2)),
    expected: predictedYield7Days,
    optimistic: Number((predictedYield7Days * (1 + spread)).toFixed(2)),
    percentiles: {
      P10: Number((predictedYield7Days * (1 - spread)).toFixed(2)),
      P50: predictedYield7Days,
      P90: Number((predictedYield7Days * (1 + spread)).toFixed(2))
    }
  };

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
      formula_terms: {
        baseYield: "fruitsPerPlant * avgFruitWeightKg * totalPlants",
        weatherAdjustment: "weatherScore * ((temperatureFactor + rainfallFactor) / 2)",
        correctedYield: "grossPotentialYieldKg * (1 - intelligenceYieldBias)",
        sellableYield: "correctedYieldKg * (1 - totalLossPct/100)"
      },
      generated_at: new Date().toISOString()
    },
    explanation: `Yield uses ${totalPlants} plants over ${acres} acre(s). Base yield is weather-adjusted and corrected by past outcome error before applying field/harvest/transport losses (${totalLossPct}%).`,
    inputContext: {
      ...input,
      computed: {
        totalPlants,
        baseYield,
        weatherAdjustment,
        grossPotentialYieldKg,
        correctedYieldKg,
        sellableYieldKg,
        losses: { fieldLossPct, harvestLossPct, transportLossPct, totalLossPct },
        yieldErrorBiasPct
      }
    }
  });

  await upsertFieldSnapshot(userId, {
    crop: cropType,
    cropStage,
    acres,
    plantsPerAcre,
    capturedAt: new Date().toISOString()
  }, { source: "yield" });

  return prediction.toObject();
}
