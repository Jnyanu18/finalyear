import { DiseasePrediction } from "../models/DiseasePrediction.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import { freshnessConfidence, buildInsufficientDataResponse, toNumber } from "../utils/modelGovernance.js";
import { upsertFieldSnapshot } from "./fieldContextService.js";

function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function level(prob) {
  if (prob >= 0.7) return "High";
  if (prob >= 0.4) return "Medium";
  return "Low";
}

function likelyDisease(cropType, humidityFactor, tempFactor) {
  const c = String(cropType || "").toLowerCase();
  if (c.includes("tomato")) {
    return humidityFactor > 0.65 && tempFactor > 0.55 ? "Tomato Blight" : "Early Blight Risk";
  }
  if (c.includes("rice")) return "Rice Blast";
  if (c.includes("chilli")) return "Anthracnose";
  return "General Fungal Disease";
}

function stageFactor(stage) {
  const s = String(stage || "").toLowerCase();
  if (s.includes("seed")) return 0.35;
  if (s.includes("veget")) return 0.5;
  if (s.includes("flower")) return 0.62;
  if (s.includes("fruit")) return 0.75;
  if (s.includes("ripen")) return 0.58;
  if (s.includes("harvest")) return 0.45;
  return 0.55;
}

export async function predictDiseaseRisk(userId, input) {
  const modelVersion = "disease_model_v2";
  const cropType = input.cropType || "Tomato";
  const cropStage = input.cropStage || "fruiting";
  const temperature = toNumber(input.temperature, NaN);
  const humidity = toNumber(input.humidity, NaN);

  const missingInputs = [];
  if (!Number.isFinite(temperature)) missingInputs.push("temperature");
  if (!Number.isFinite(humidity)) missingInputs.push("humidity");

  if (missingInputs.length) {
    const insufficient = buildInsufficientDataResponse({
      moduleName: "disease",
      modelVersion,
      missingInputs,
      staleInputs: [],
      assumptions: { formula: "0.4*humidityFactor + 0.3*temperatureFactor + 0.3*cropStageFactor" }
    });

    const doc = await DiseasePrediction.create({
      userId,
      cropType,
      disease: "Unknown",
      riskProbability: 0,
      riskLevel: "Unknown",
      status: insufficient.status,
      modelVersion,
      missingInputs,
      explanation: "Insufficient data for disease risk computation.",
      inputContext: input
    });
    return doc.toObject();
  }

  const humidityFactor = clamp((humidity - 50) / 40, 0, 1);
  const temperatureFactor = clamp(1 - Math.abs(temperature - 26) / 12, 0, 1);
  const cropStageFactor = stageFactor(cropStage);

  const riskScore = 0.4 * humidityFactor + 0.3 * temperatureFactor + 0.3 * cropStageFactor;

  const intelligence = await FarmIntelligence.findOne({ userId }).lean();
  const confidenceBias = clamp(toNumber(intelligence?.predictionConfidence, 0.7), 0.45, 0.95);
  const probability = Number(clamp(riskScore * (0.9 + confidenceBias * 0.15), 0.02, 0.98).toFixed(2));

  const freshness = freshnessConfidence(input.fieldContext?.sensorReadings?.capturedAt || input.fieldContext?.capturedAt, 24);
  const confidence = Number(clamp(0.54 + freshness * 0.16 + confidenceBias * 0.24, 0.45, 0.95).toFixed(2));

  const prediction = await DiseasePrediction.create({
    userId,
    cropType,
    disease: likelyDisease(cropType, humidityFactor, temperatureFactor),
    riskProbability: probability,
    riskLevel: level(probability),
    status: "ok",
    modelVersion,
    confidence,
    channels: {
      humidityFactor: Number(humidityFactor.toFixed(3)),
      temperatureFactor: Number(temperatureFactor.toFixed(3)),
      cropStageFactor: Number(cropStageFactor.toFixed(3))
    },
    provenance: {
      formula_terms: {
        riskScore: "0.4*humidityFactor + 0.3*temperatureFactor + 0.3*cropStageFactor"
      },
      generated_at: new Date().toISOString()
    },
    explanation: `Disease risk is computed from humidity (${(humidityFactor * 100).toFixed(0)}%), temperature suitability (${(temperatureFactor * 100).toFixed(0)}%), and stage susceptibility (${(cropStageFactor * 100).toFixed(0)}%).`,
    inputContext: input
  });

  await upsertFieldSnapshot(userId, {
    crop: cropType,
    cropStage,
    sensorReadings: {
      temperatureC: temperature,
      humidityRh: humidity,
      capturedAt: new Date().toISOString()
    },
    capturedAt: new Date().toISOString()
  }, { source: "disease" });

  return prediction.toObject();
}
