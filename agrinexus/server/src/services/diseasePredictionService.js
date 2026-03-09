import { DiseasePrediction } from "../models/DiseasePrediction.js";
import { getCropConfig } from "../config/agronomyConfig.js";
import { getMergedFieldContext } from "./fieldContextService.js";
import {
  buildInsufficientDataResponse,
  clamp,
  freshnessConfidence,
  missingRequiredInputs,
  toNumber
} from "../utils/modelGovernance.js";

function riskLevel(probability) {
  if (probability >= 0.67) return "High";
  if (probability >= 0.4) return "Medium";
  return "Low";
}

function likelyDisease(cropType, envRisk) {
  const key = (cropType || "").toLowerCase();
  if (key.includes("tomato")) return envRisk > 0.65 ? "Tomato blight" : "Early blight risk";
  if (key.includes("chilli")) return "Anthracnose";
  if (key.includes("rice")) return "Blast";
  return "General fungal disease";
}

export async function predictDiseaseRisk(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "disease");
  const cropType = input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.diseaseModel;

  const temperature = toNumber(input.temperature ?? fieldContext.sensorReadings?.temperatureC, NaN);
  const humidity = toNumber(input.humidity ?? fieldContext.sensorReadings?.humidityRh, NaN);
  const leafWetness = toNumber(input.leafWetnessPct ?? fieldContext.sensorReadings?.leafWetnessPct, 45);
  const stage = String(input.cropStage || "fruiting").toLowerCase();
  const symptomSignal = clamp(toNumber(input.symptomSignal, 0.3), 0, 1);

  const baselineContext = { temperature, humidity, stage };
  const missingInputs = missingRequiredInputs(baselineContext, ["temperature", "humidity", "stage"]);

  const sensorFreshness = freshnessConfidence(
    fieldContext.sensorReadings?.capturedAt || fieldContext.capturedAt,
    8,
    36
  );

  if (missingInputs.length > 0 || sensorFreshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: sensorFreshness === 0 ? ["sensorReadings.capturedAt"] : [],
      confidence: sensorFreshness * 0.5
    });

    const doc = await DiseasePrediction.create({
      userId,
      cropType,
      disease: "Unknown",
      riskProbability: 0,
      riskLevel: "Unknown",
      status: insufficient.status,
      modelVersion,
      confidence: insufficient.confidence,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      explanation: insufficient.explanation,
      inputContext: { ...input, fieldContext }
    });

    return doc.toObject();
  }

  const envTempRisk = clamp(1 - Math.abs(temperature - 25) / 15, 0, 1);
  const envHumidityRisk = clamp((humidity - 50) / 50, 0, 1);
  const envLeafWetnessRisk = clamp((leafWetness - 40) / 50, 0, 1);
  const environmentRisk = Number((envTempRisk * 0.35 + envHumidityRisk * 0.4 + envLeafWetnessRisk * 0.25).toFixed(2));

  const stageRisk = Number((cfg.stageSusceptibility[stage] ?? 0.55).toFixed(2));
  const observedSignal = Number(symptomSignal.toFixed(2));

  const deterministic = environmentRisk * 0.5 + stageRisk * 0.3;
  const mlDelta = clamp((observedSignal - 0.4) * 0.35 + (sensorFreshness - 0.6) * 0.08, -0.15, 0.2);
  const probability = Number(clamp(deterministic + observedSignal * 0.2 + mlDelta, 0.02, 0.97).toFixed(2));

  const confidence = Number(clamp(0.55 + sensorFreshness * 0.3 + observedSignal * 0.1, 0.5, 0.95).toFixed(2));

  const prediction = await DiseasePrediction.create({
    userId,
    cropType,
    disease: likelyDisease(cropType, environmentRisk),
    riskProbability: probability,
    riskLevel: riskLevel(probability),
    status: "ok",
    modelVersion,
    confidence,
    channels: {
      environmentRisk,
      stageRisk,
      observedSignal,
      mlDelta
    },
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      generatedAt: new Date().toISOString()
    },
    explanation: `Risk combines environment (${environmentRisk}), stage susceptibility (${stageRisk}), and symptom signal (${observedSignal}).`,
    inputContext: { ...input, fieldContext }
  });

  return prediction.toObject();
}
