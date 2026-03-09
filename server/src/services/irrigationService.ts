import { IrrigationRecommendation } from "../models/IrrigationRecommendation.js";

export async function recommendIrrigation(userId, input) {
  const soilMoisture = Number(input.soilMoisture || 40);
  const rainForecastMm = Number(input.rainForecastMm || 0);
  const cropStage = (input.cropStage || "").toLowerCase();

  let recommendation = "Irrigate today";
  let reason = "Soil moisture is below healthy range for this crop stage.";
  let nextReviewHours = 18;

  if (rainForecastMm >= 5) {
    recommendation = "Delay irrigation";
    reason = "Rain is likely in the next 24 hours.";
    nextReviewHours = 24;
  } else if (soilMoisture > 60) {
    recommendation = "Skip irrigation";
    reason = "Current soil moisture is adequate.";
    nextReviewHours = 30;
  } else if (soilMoisture >= 45 && cropStage.includes("flower")) {
    recommendation = "Light irrigation";
    reason = "Flowering stage needs stable moisture without overwatering.";
    nextReviewHours = 20;
  }

  const doc = await IrrigationRecommendation.create({
    userId,
    recommendation,
    reason,
    nextReviewHours,
    inputContext: input
  });

  return doc.toObject();
}
