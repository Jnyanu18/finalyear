import { YieldPrediction } from "../models/YieldPrediction.js";

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export async function predictYield(userId, input) {
  const fruitCount = Number(input.fruitCount || 0);
  const avgWeightKg = Number(input.avgFruitWeightKg || 0.09);
  const weatherFactor = clamp(Number(input.weatherScore || 0.8), 0.4, 1.2);
  const historicalFactor = clamp(Number(input.historicalYieldFactor || 1), 0.6, 1.4);
  const stageBoost = input.cropStage?.toLowerCase().includes("ripe") ? 1.08 : 0.95;

  const baseYield = fruitCount * avgWeightKg * weatherFactor * historicalFactor * stageBoost;
  const predictedYieldToday = Number((baseYield * 0.34).toFixed(2));
  const predictedYield3Days = Number((baseYield * 0.68).toFixed(2));
  const predictedYield7Days = Number((baseYield * 1.0).toFixed(2));

  const confidence = Number(
    clamp(0.62 + weatherFactor * 0.14 + historicalFactor * 0.08, 0.55, 0.93).toFixed(2)
  );

  const prediction = await YieldPrediction.create({
    userId,
    cropType: input.cropType || "Tomato",
    predictedYieldToday,
    predictedYield3Days,
    predictedYield7Days,
    confidence,
    inputContext: input
  });

  return prediction.toObject();
}
