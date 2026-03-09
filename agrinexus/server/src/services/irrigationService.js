import { IrrigationRecommendation } from "../models/IrrigationRecommendation.js";
import { getCropConfig } from "../config/agronomyConfig.js";
import { getMergedFieldContext } from "./fieldContextService.js";
import {
  buildInsufficientDataResponse,
  clamp,
  freshnessConfidence,
  missingRequiredInputs,
  toNumber
} from "../utils/modelGovernance.js";

export async function recommendIrrigation(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "irrigation");
  const cropType = input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.irrigationModel;

  const stage = String(input.cropStage || "fruiting").toLowerCase();
  const moistureBand = cfg.moistureBands[stage] || cfg.moistureBands.fruiting;

  const soilMoisture = toNumber(input.soilMoisture ?? fieldContext.sensorReadings?.soilMoisture, NaN);
  const et0Mm = toNumber(input.et0Mm ?? fieldContext.weather?.et0Mm, 5.1);
  const rainForecastMm = toNumber(input.rainForecastMm ?? fieldContext.weather?.rainfallMm, 0);
  const rootZoneDepthM = toNumber(input.rootZoneDepthM, 0.35);
  const soilWaterHoldingMmPerM = toNumber(input.soilWaterHoldingMmPerM, 120);
  const irrigationEfficiencyPct = clamp(toNumber(input.irrigationEfficiencyPct, 82), 40, 98);
  const acres = toNumber(input.acres ?? fieldContext.acres, 1);

  const missingInputs = missingRequiredInputs({ soilMoisture, stage }, ["soilMoisture", "stage"]);
  const freshness = freshnessConfidence(fieldContext.sensorReadings?.capturedAt || fieldContext.capturedAt, 8, 36);

  if (missingInputs.length > 0 || freshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: freshness === 0 ? ["sensorReadings.capturedAt"] : [],
      confidence: freshness * 0.5
    });

    const doc = await IrrigationRecommendation.create({
      userId,
      recommendation: "Insufficient data",
      reason: insufficient.explanation,
      nextReviewHours: 6,
      litersPerAcre: 0,
      status: insufficient.status,
      modelVersion,
      confidence: insufficient.confidence,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      inputContext: { ...input, fieldContext }
    });

    return doc.toObject();
  }

  const availableWaterMm = rootZoneDepthM * soilWaterHoldingMmPerM;
  const targetMoisturePct = moistureBand.target;
  const deficitPct = clamp(targetMoisturePct - soilMoisture, 0, 100);
  const depletionMm = (deficitPct / 100) * availableWaterMm;
  const effectiveRainMm = rainForecastMm * 0.8;
  const etDemandMm = et0Mm * 1.05;
  const netWaterNeedMm = clamp(depletionMm + etDemandMm - effectiveRainMm, 0, 80);
  const grossWaterNeedMm = netWaterNeedMm / (irrigationEfficiencyPct / 100);
  const litersPerAcre = Number((grossWaterNeedMm * 4046.86).toFixed(0));
  const farmLiters = Number((litersPerAcre * Math.max(1, acres)).toFixed(0));

  let recommendation = "Irrigate today";
  let reason = `Apply ~${litersPerAcre.toLocaleString()} L/acre based on ET and moisture deficit.`;
  let nextReviewHours = 12;

  if (grossWaterNeedMm < 4) {
    recommendation = "Skip irrigation";
    reason = "Root-zone water balance is sufficient for now.";
    nextReviewHours = 24;
  } else if (effectiveRainMm >= netWaterNeedMm * 0.7) {
    recommendation = "Delay irrigation";
    reason = "Forecast rainfall covers most of crop water demand.";
    nextReviewHours = 18;
  }

  const confidence = Number(clamp(0.6 + freshness * 0.3, 0.55, 0.95).toFixed(2));

  const doc = await IrrigationRecommendation.create({
    userId,
    recommendation,
    reason,
    nextReviewHours,
    litersPerAcre,
    status: "ok",
    modelVersion,
    confidence,
    waterBalance: {
      stage,
      targetMoisturePct,
      availableWaterMm: Number(availableWaterMm.toFixed(2)),
      depletionMm: Number(depletionMm.toFixed(2)),
      etDemandMm: Number(etDemandMm.toFixed(2)),
      effectiveRainMm: Number(effectiveRainMm.toFixed(2)),
      netWaterNeedMm: Number(netWaterNeedMm.toFixed(2)),
      grossWaterNeedMm: Number(grossWaterNeedMm.toFixed(2)),
      farmLiters
    },
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      generatedAt: new Date().toISOString()
    },
    inputContext: { ...input, fieldContext }
  });

  return doc.toObject();
}
