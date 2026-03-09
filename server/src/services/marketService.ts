import { MarketPrediction } from "../models/MarketPrediction.js";
import { cropPriceFactor, distanceTransportCost, mandiCatalog } from "../utils/marketData.js";

export async function bestMarketRoute(userId, input) {
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = Number(input.quantity || 0);
  const factor = cropPriceFactor(cropType);
  const localDistanceAdjust = Number(input.localDistanceAdjust || 0);

  const options = mandiCatalog.map((market) => {
    const expectedPrice = Number((market.basePrice * factor).toFixed(2));
    const distanceKm = Math.max(1, Math.round(market.distanceKm + localDistanceAdjust));
    const transportCost = distanceTransportCost(distanceKm, quantity);
    const gross = expectedPrice * quantity;
    const netProfit = Number((gross - transportCost).toFixed(2));
    return {
      market: market.market,
      expectedPrice,
      distanceKm,
      transportCost,
      netProfit
    };
  });

  options.sort((a, b) => b.netProfit - a.netProfit);
  const best = options[0];

  const doc = await MarketPrediction.create({
    userId,
    cropType,
    quantity,
    bestMarket: best.market,
    expectedPrice: best.expectedPrice,
    transportCost: best.transportCost,
    netProfit: best.netProfit,
    options,
    inputContext: input
  });

  return doc.toObject();
}
