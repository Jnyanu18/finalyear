import { DiseasePrediction } from "../models/DiseasePrediction.js";

function riskLevel(probability) {
  if (probability >= 0.67) return "High";
  if (probability >= 0.4) return "Medium";
  return "Low";
}

function likelyDisease(cropType) {
  const key = (cropType || "").toLowerCase();
  if (key.includes("tomato")) return "Tomato blight";
  if (key.includes("chilli")) return "Anthracnose";
  if (key.includes("rice")) return "Blast";
  return "General fungal disease";
}

export async function predictDiseaseRisk(userId, input) {
  const temperature = Number(input.temperature || 28);
  const humidity = Number(input.humidity || 70);
  const stageFactor = input.cropStage?.toLowerCase().includes("flower") ? 0.1 : 0.2;

  const tempRisk = Math.max(0, 1 - Math.abs(temperature - 26) / 18);
  const humidityRisk = Math.max(0, Math.min(1, (humidity - 40) / 60));
  const probability = Number(Math.min(0.97, 0.2 + tempRisk * 0.35 + humidityRisk * 0.35 + stageFactor).toFixed(2));

  const prediction = await DiseasePrediction.create({
    userId,
    cropType: input.cropType || "Tomato",
    disease: likelyDisease(input.cropType),
    riskProbability: probability,
    riskLevel: riskLevel(probability),
    inputContext: input
  });

  return prediction.toObject();
}
