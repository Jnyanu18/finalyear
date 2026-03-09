import { MarketPrediction } from "../models/MarketPrediction.js";
import { cropPriceFactor, distanceTransportCost, mandiCatalog } from "../utils/marketData.js";
import { getCropConfig } from "../config/agronomyConfig.js";
import { getMergedFieldContext } from "./fieldContextService.js";
import {
  buildInsufficientDataResponse,
  clamp,
  freshnessConfidence,
  missingRequiredInputs,
  percentileBand,
  toNumber
} from "../utils/modelGovernance.js";
import { cacheKey, getCachedFeature, setCachedFeature } from "./featureCacheService.js";

export async function bestMarketRoute(userId, input) {
  const fieldContext = await getMergedFieldContext(userId, input, "market");
  const cropType = input.crop || input.cropType || fieldContext.crop || "Tomato";
  const cfg = getCropConfig(cropType);
  const modelVersion = cfg.marketModel;

  const quantity = toNumber(input.quantity, 0);
  const localDistanceAdjust = toNumber(input.localDistanceAdjust, 0);
  const marketRatesCapturedAt = input.marketRatesCapturedAt || fieldContext.market?.capturedAt || fieldContext.capturedAt;

  const missingInputs = missingRequiredInputs({ quantity }, ["quantity"]).filter((k) => toNumber({ quantity }[k], 0) <= 0);
  const freshness = freshnessConfidence(marketRatesCapturedAt, 8, 48);

  if (missingInputs.length > 0 || freshness === 0) {
    const insufficient = buildInsufficientDataResponse({
      modelVersion,
      missingInputs,
      staleInputs: freshness === 0 ? ["market.capturedAt"] : [],
      confidence: freshness * 0.5
    });

    const doc = await MarketPrediction.create({
      userId,
      cropType,
      quantity: Math.max(0, quantity),
      bestMarket: "Insufficient data",
      expectedPrice: 0,
      transportCost: 0,
      netProfit: 0,
      options: [],
      status: insufficient.status,
      modelVersion,
      confidence: insufficient.confidence,
      missingInputs: insufficient.missingInputs,
      staleInputs: insufficient.staleInputs,
      inputContext: { ...input, fieldContext }
    });

    return doc.toObject();
  }

  const factor = cropPriceFactor(cropType);
  const hourlyBucket = new Date().toISOString().slice(0, 13);
  const mkKey = cacheKey(["market", cropType, String(quantity), String(localDistanceAdjust), hourlyBucket]);

  let options = await getCachedFeature(mkKey);
  if (!options) {
    options = mandiCatalog.map((market) => {
    const expectedPrice = Number((market.basePrice * factor).toFixed(2));
    const distanceKm = Math.max(1, Math.round(market.distanceKm + localDistanceAdjust));
    const transportCost = distanceTransportCost(distanceKm, quantity);
    const mandiFee = Number((expectedPrice * quantity * 0.015).toFixed(2));
    const gross = expectedPrice * quantity;
    const netProfit = Number((gross - transportCost - mandiFee).toFixed(2));

    return {
      market: market.market,
      expectedPrice,
      distanceKm,
      transportCost,
      netProfit
    };
  });
    await setCachedFeature(mkKey, options, 60 * 20, { channel: "market" });
  }

  options.sort((a, b) => b.netProfit - a.netProfit);
  const best = options[0];

  const confidence = Number(clamp(0.6 + freshness * 0.28, 0.58, 0.95).toFixed(2));

  const doc = await MarketPrediction.create({
    userId,
    cropType,
    quantity,
    bestMarket: best.market,
    expectedPrice: best.expectedPrice,
    transportCost: best.transportCost,
    netProfit: best.netProfit,
    options,
    status: "ok",
    modelVersion,
    confidence,
    scenarios: {
      netProfit: percentileBand(best.netProfit)
    },
    provenance: {
      layers: ["deterministic_agronomy_rules", "ml_adjustment_delta", "explanation_layer"],
      generatedAt: new Date().toISOString(),
      marketRatesCapturedAt
    },
    inputContext: { ...input, fieldContext }
  });

  return doc.toObject();
}
