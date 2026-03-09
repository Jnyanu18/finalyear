import { StoragePrediction } from "../models/StoragePrediction.js";

function cropShelfFactor(cropType) {
  const key = (cropType || "").toLowerCase();
  if (key.includes("tomato")) return 4;
  if (key.includes("onion")) return 20;
  if (key.includes("potato")) return 30;
  return 6;
}

export async function storageAdvice(userId, input) {
  const cropType = input.cropType || "Tomato";
  const temperature = Number(input.temperature || 28);
  const humidity = Number(input.humidity || 70);
  const ventilationScore = Number(input.ventilationScore || 0.7);

  const baseDays = cropShelfFactor(cropType);
  const tempPenalty = Math.max(0, (temperature - 20) * 0.25);
  const humidityPenalty = Math.max(0, (humidity - 75) * 0.08);
  const ventilationBoost = ventilationScore * 1.2;

  const safeStorageDays = Math.max(1, Math.round(baseDays - tempPenalty - humidityPenalty + ventilationBoost));
  const recommendation =
    safeStorageDays <= 2
      ? "Sell immediately or within 24 hours."
      : `Store for ${Math.max(1, safeStorageDays - 2)} days, then re-evaluate market price.`;

  const doc = await StoragePrediction.create({
    userId,
    cropType,
    safeStorageDays,
    recommendation,
    inputContext: input
  });

  return doc.toObject();
}
