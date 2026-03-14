import { StoragePrediction } from "../models/StoragePrediction.js";
import { safeCreate } from "../utils/persistence.js";
import { getCropProfile } from "../config/cropProfiles.js";

export async function storageAdvice(userId, input) {
  const cropType = input.cropType || "Tomato";
  const profile = getCropProfile(cropType);
  const temperature = Number(input.temperature || 28);
  const humidity = Number(input.humidity || 70);
  const ventilationScore = Number(input.ventilationScore || 0.7);

  const baseDays = Number(profile.shelfLifeDays || 6);
  const tempPenalty = Math.max(0, (temperature - 20) * 0.25);
  const humidityPenalty = Math.max(0, (humidity - 75) * 0.08);
  const ventilationBoost = ventilationScore * 1.2;

  const safeStorageDays = Math.max(1, Math.round(baseDays - tempPenalty - humidityPenalty + ventilationBoost));
  const recommendation =
    safeStorageDays <= 2
      ? "Sell immediately or within 24 hours."
      : `Store for ${Math.max(1, safeStorageDays - 2)} days, then re-evaluate market price.`;

  const doc = await safeCreate(StoragePrediction, userId, {
    cropType,
    safeStorageDays,
    recommendation,
    inputContext: input
  });

  return doc;
}
