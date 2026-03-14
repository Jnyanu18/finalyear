import { MarketPrediction } from "../models/MarketPrediction.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";
import { distanceTransportCost, mandiCatalog } from "../utils/marketData.js";
import {
  buildInsufficientDataResponse,
  freshnessConfidence,
  toNumber
} from "../utils/modelGovernance.js";
import { fetchMarketSnapshot } from "../utils/externalData.js";
import { safeCreate, safeFindOneLean } from "../utils/persistence.js";

function roundMetric(value) {
  return Number(value.toFixed(2));
}

function averageBasePrice() {
  return mandiCatalog.reduce((sum, market) => sum + market.basePrice, 0) / mandiCatalog.length;
}

export function evaluateMarketOptions({
  quantity,
  referencePricePerKg,
  localDistanceAdjust = 0,
  priceBias = 0
}) {
  const anchorPrice = Math.max(1, toNumber(referencePricePerKg, averageBasePrice()));
  const avgBasePrice = averageBasePrice();

  const options = mandiCatalog.map((market) => {
    const marketMultiplier = market.basePrice / avgBasePrice;
    const expectedPrice = roundMetric(Math.max(1, anchorPrice * marketMultiplier + priceBias * 0.4));
    const distanceKm = Math.max(1, Math.round(market.distanceKm + localDistanceAdjust));
    const transportCost = distanceTransportCost(distanceKm, quantity);
    const gross = expectedPrice * quantity;
    const netProfit = roundMetric(gross - transportCost);

    return {
      market: market.market,
      expectedPrice,
      distanceKm,
      transportCost,
      netProfit
    };
  });

  options.sort((a, b) => b.netProfit - a.netProfit);
  return options;
}

export async function buildMarketRouteRecommendation(userId, input, { persist = true } = {}) {
  const modelVersion = "market_model_v3";
  const cropType = input.crop || input.cropType || "Tomato";
  const quantity = toNumber(input.quantity, 0);
  const farmerLocation = input.farmerLocation || "Bengaluru";
  const localDistanceAdjust = toNumber(input.localDistanceAdjust, 0);

  if (!cropType || !quantity) {
    return buildInsufficientDataResponse({
      moduleName: "market",
      modelVersion,
      missingInputs: [
        ...(!cropType ? ["crop"] : []),
        ...(!quantity ? ["quantity"] : [])
      ],
      staleInputs: [],
      assumptions: { maxFreshHours: 12 }
    });
  }

  const intelligence = await safeFindOneLean(FarmIntelligence, { userId });
  const priceBias = toNumber(intelligence?.averagePriceError, 0);
  const marketSnapshot = input.marketSnapshot || await fetchMarketSnapshot(cropType, farmerLocation);
  const marketRatesCapturedAt = input.marketRatesCapturedAt || marketSnapshot.capturedAt || null;
  const referencePricePerKg = toNumber(input.referencePricePerKg, marketSnapshot.pricePerKg);
  const freshness = marketRatesCapturedAt ? freshnessConfidence(marketRatesCapturedAt, 12) : 0.72;
  const staleInputs = freshness === 0 ? ["marketRatesCapturedAt"] : [];
  const options = evaluateMarketOptions({
    quantity,
    referencePricePerKg,
    localDistanceAdjust,
    priceBias
  });
  const best = options[0];
  const spread = 0.08 + (1 - Math.max(freshness, 0.35)) * 0.08;
  const expected = best.netProfit;
  const pessimistic = roundMetric(expected * (1 - spread));
  const optimistic = roundMetric(expected * (1 + spread));
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
  const locationPenalty = input.farmerLocation ? 0 : 0.06;
  const sourcePenalty = marketSnapshot.source === "fallback" ? 0.04 : 0;
  const confidence = roundMetric(
    Math.max(
      0.45,
      0.6 + 0.22 * Math.max(freshness, 0.35) - locationPenalty - sourcePenalty + toNumber(intelligence?.predictionConfidence, 0.7) * 0.1
    )
  );
  const status = staleInputs.length ? "assumed_data" : "ok";

  const payload = {
    cropType,
    quantity,
    bestMarket: best.market,
    expectedPrice: best.expectedPrice,
    transportCost: best.transportCost,
    netProfit: best.netProfit,
    status,
    modelVersion,
    confidence,
    missingInputs: marketRatesCapturedAt ? [] : ["marketRatesCapturedAt"],
    scenarios,
    provenance: {
      input_sources: {
        marketRatesCapturedAt: marketSnapshot.source,
        farmerLocation: input.farmerLocation ? "module_input" : "default_location",
        quantity: "module_input",
        referencePricePerKg: input.referencePricePerKg ? "module_input" : "market_snapshot"
      },
      assumptions: {
        freshnessMaxHours: 12,
        scenarioSpread: spread,
        priceBiasFromOutcome: priceBias
      },
      formula_terms: {
        expectedPrice: "referencePricePerKg * mandiBasePrice/averageMandiBasePrice + 0.4*averagePriceError",
        transportCost: "distanceTransportCost(distanceKm, quantity)",
        netProfit: "expectedPrice * quantity - transportCost"
      },
      generated_at: new Date().toISOString()
    },
    options,
    inputContext: input
  };

  if (!persist) {
    return {
      ...payload,
      marketSignal: marketSnapshot,
      referencePricePerKg
    };
  }

  const doc = await safeCreate(MarketPrediction, userId, payload);
  return {
    ...doc,
    marketSignal: marketSnapshot,
    referencePricePerKg
  };
}

export async function bestMarketRoute(userId, input) {
  return buildMarketRouteRecommendation(userId, input, { persist: true });
}
