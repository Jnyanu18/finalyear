import { MarketPrediction } from "../models/MarketPrediction.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import { cropPriceFactor, distanceTransportCost, mandiCatalog } from "../utils/marketData.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";

export async function bestMarketRoute(userId, input) {
  const modelVersion = "market_model_v2";
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = toNumber(input.quantity, 0);
  const factor = cropPriceFactor(cropType);
  const localDistanceAdjust = toNumber(input.localDistanceAdjust, 0);
  const marketRatesCapturedAt = input.marketRatesCapturedAt || null;
  const farmerLocation = input.farmerLocation || null;
  const freshness = freshnessConfidence(marketRatesCapturedAt, 12);

  const missingInputs = [];
  if (!cropType) missingInputs.push("crop");
  if (!quantity) missingInputs.push("quantity");
  if (!marketRatesCapturedAt) missingInputs.push("marketRatesCapturedAt");
  const staleInputs = freshness === 0 ? ["marketRatesCapturedAt"] : [];

  if (missingInputs.length || staleInputs.length) {
    return buildInsufficientDataResponse({
      moduleName: "market",
      modelVersion,
      missingInputs,
      staleInputs,
      assumptions: { maxFreshHours: 12 }
    });
  }

  const intelligence = await FarmIntelligence.findOne({ userId }).lean();
  const priceBias = toNumber(intelligence?.averagePriceError, 0);

  const options = mandiCatalog.map((market) => {
    const expectedPriceRaw = market.basePrice * factor;
    const expectedPrice = Number(Math.max(1, expectedPriceRaw + priceBias * 0.4).toFixed(2));
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
  const spread = 0.08;
  const expected = best.netProfit;
  const pessimistic = Number((expected * (1 - spread)).toFixed(2));
  const optimistic = Number((expected * (1 + spread)).toFixed(2));
  const scenarios = {
    pessimistic,
    expected,
    optimistic,
    percentiles: {
      P10: pessimistic,
      P50: expected,
      P90: optimistic
    }
  };
  const locationPenalty = farmerLocation ? 0 : 0.08;
  const confidence = Number(Math.max(0.45, (0.58 + 0.26 * freshness - locationPenalty + toNumber(intelligence?.predictionConfidence, 0.7) * 0.12)).toFixed(2));

  const doc = await MarketPrediction.create({
    userId,
    cropType,
    quantity,
    bestMarket: best.market,
    expectedPrice: best.expectedPrice,
    transportCost: best.transportCost,
    netProfit: best.netProfit,
    status: "ok",
    modelVersion,
    confidence,
    missingInputs: [],
    scenarios,
    provenance: {
      input_sources: {
        marketRatesCapturedAt: "market_feed",
        farmerLocation: "module_input",
        quantity: "module_input"
      },
      assumptions: {
        freshnessMaxHours: 12,
        scenarioSpread: spread,
        priceBiasFromOutcome: priceBias
      },
      formula_terms: {
        expectedPrice: "(basePrice * cropPriceFactor) + 0.4 * averagePriceError",
        transportCost: "distanceTransportCost(distanceKm, quantity)",
        netProfit: "expectedPrice * quantity - transportCost"
      },
      generated_at: new Date().toISOString()
    },
    options,
    inputContext: input
  });

  return doc.toObject();
}
