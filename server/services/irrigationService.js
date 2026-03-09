import { IrrigationRecommendation } from "../models/IrrigationRecommendation.js";
import { buildInsufficientDataResponse, freshnessConfidence, toNumber } from "../utils/modelGovernance.js";
import { upsertFieldSnapshot } from "./fieldContextService.js";

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function stageTarget(stageRaw) {
  const stage = String(stageRaw || "").toLowerCase();
  if (stage.includes("seed")) return 70;
  if (stage.includes("veget")) return 64;
  if (stage.includes("flower")) return 67;
  if (stage.includes("fruit")) return 66;
  if (stage.includes("ripen")) return 58;
  if (stage.includes("harvest")) return 54;
  return 62;
}

export async function recommendIrrigation(userId, input) {
  const modelVersion = "irrigation_model_v2";
  const cropStage = input.cropStage || "vegetative";
  const soilMoisture = toNumber(input.soilMoisture, NaN);

  const missingInputs = [];
  if (!Number.isFinite(soilMoisture)) missingInputs.push("soilMoisture");

  if (missingInputs.length) {
    const insufficient = buildInsufficientDataResponse({
      moduleName: "irrigation",
      modelVersion,
      missingInputs,
      staleInputs: [],
      assumptions: { formula: "irrigationNeed = optimalMoisture - soilMoistureIndex - rainAdjustment" }
    });

    const doc = await IrrigationRecommendation.create({
      userId,
      recommendation: "Insufficient data",
      reason: "Soil moisture is required for irrigation advice.",
      nextReviewHours: 6,
      status: insufficient.status,
      modelVersion,
      missingInputs,
      inputContext: input
    });
    return doc.toObject();
  }

  const target = stageTarget(cropStage);
  const optimalSoilMoisture = target;
  const soilMoistureIndex = soilMoisture / optimalSoilMoisture;

  const rainProbability = clamp(toNumber(input.rainProbability ?? input.fieldContext?.weather?.rainProbability, 0.2), 0, 1);
  const rainfallAmount = toNumber(input.rainForecastMm ?? input.fieldContext?.weather?.rainfallMm, 0);
  const rainAdjustment = rainProbability * rainfallAmount * 0.08;

  const irrigationNeed = optimalSoilMoisture - soilMoisture - rainAdjustment;
  const litersPerAcre = Number(clamp(irrigationNeed, 0, 35) * 1100).toFixed(0);

  let recommendation = "Light irrigation";
  let reason = "Moisture slightly below target.";
  let nextReviewHours = 16;

  if (rainProbability > 0.6 && rainfallAmount >= 5) {
    recommendation = "Delay irrigation";
    reason = "Rain forecast can satisfy near-term crop water demand.";
    nextReviewHours = 12;
  } else if (irrigationNeed > 12) {
    recommendation = "Irrigate today";
    reason = "Soil moisture is below optimal range for this crop stage.";
    nextReviewHours = 10;
  } else if (irrigationNeed <= 0) {
    recommendation = "Skip irrigation";
    reason = "Current soil moisture with expected rainfall is adequate.";
    nextReviewHours = 24;
  }

  const freshness = freshnessConfidence(input.fieldContext?.sensorReadings?.capturedAt || input.fieldContext?.capturedAt, 24);
  const confidence = Number(clamp(0.56 + freshness * 0.32, 0.45, 0.94).toFixed(2));

  const doc = await IrrigationRecommendation.create({
    userId,
    recommendation,
    reason,
    nextReviewHours,
    litersPerAcre: Number(litersPerAcre),
    status: "ok",
    modelVersion,
    confidence,
    waterBalance: {
      soilMoistureIndex: Number(soilMoistureIndex.toFixed(3)),
      rainAdjustment: Number(rainAdjustment.toFixed(3)),
      irrigationNeed: Number(irrigationNeed.toFixed(3)),
      optimalSoilMoisture
    },
    provenance: {
      formula_terms: {
        soilMoistureIndex: "currentSoilMoisture / optimalSoilMoisture",
        rainAdjustment: "rainProbability * rainfallAmount * 0.08",
        irrigationNeed: "optimalSoilMoisture - currentSoilMoisture - rainAdjustment"
      },
      generated_at: new Date().toISOString()
    },
    inputContext: input
  });

  await upsertFieldSnapshot(userId, {
    sensorReadings: {
      soilMoisture,
      capturedAt: new Date().toISOString()
    },
    capturedAt: new Date().toISOString()
  }, { source: "irrigation" });

  return doc.toObject();
}
