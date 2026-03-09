import { HarvestPlan } from "../models/HarvestPlan.js";

export async function planHarvest(userId, input) {
  const fruitCount = Number(input.fruitCount || 0);
  const ripeRatio = Number(input.ripeRatio || 0.45);
  const avgWeightKg = Number(input.avgFruitWeightKg || 0.09);

  const readyToday = Number((fruitCount * ripeRatio * avgWeightKg).toFixed(2));
  const ready3Days = Number((fruitCount * Math.min(1, ripeRatio + 0.25) * avgWeightKg).toFixed(2));
  const lower = ripeRatio < 0.35 ? "4" : "2";
  const upper = ripeRatio < 0.35 ? "6" : "4";
  const recommendedHarvestWindow = `${lower}-${upper} days`;

  const doc = await HarvestPlan.create({
    userId,
    readyToday,
    ready3Days,
    recommendedHarvestWindow,
    harvestPlanDetails: {
      labourHint: readyToday > 25 ? "Arrange extra labor for sorting." : "Current labor may be sufficient.",
      crateEstimate: Math.max(1, Math.round(ready3Days / 18))
    },
    inputContext: input
  });

  return doc.toObject();
}
