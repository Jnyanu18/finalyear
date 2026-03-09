import { ProfitSimulation } from "../models/ProfitSimulation.js";

export async function simulateProfit(userId, input) {
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = Number(input.quantity || 0);
  const priceToday = Number(input.priceToday || 20);
  const price3Days = Number(input.price3Days || priceToday * 1.06);
  const price5Days = Number(input.price5Days || priceToday * 1.03);
  const holdingCost = Number(input.holdingCost || 120);

  const scenarioToday = Number((quantity * priceToday).toFixed(2));
  const scenario3Days = Number((quantity * price3Days - holdingCost * 1).toFixed(2));
  const scenario5Days = Number((quantity * price5Days - holdingCost * 2).toFixed(2));

  const options = [
    { label: "Harvest today", value: scenarioToday },
    { label: "Harvest in 3 days", value: scenario3Days },
    { label: "Harvest in 5 days", value: scenario5Days }
  ];
  options.sort((a, b) => b.value - a.value);

  const doc = await ProfitSimulation.create({
    userId,
    cropType,
    quantity,
    scenarioToday,
    scenario3Days,
    scenario5Days,
    recommendedOption: options[0].label,
    assumptions: {
      priceToday,
      price3Days,
      price5Days,
      holdingCost
    }
  });

  return doc.toObject();
}
