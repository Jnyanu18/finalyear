import { getLatestCropAnalysis } from "./cropAnalysisService.js";
import { predictYield } from "./yieldPredictionService.js";
import { predictDiseaseRisk } from "./diseasePredictionService.js";
import { recommendIrrigation } from "./irrigationService.js";
import { planHarvest } from "./harvestService.js";
import { storageAdvice } from "./storageService.js";
import { bestMarketRoute } from "./marketService.js";
import { simulateProfit } from "./profitService.js";
import { getLatestFieldSnapshot, upsertFieldSnapshot } from "./fieldContextService.js";
import { fetchMarketSnapshot, fetchWeatherSnapshot } from "../utils/externalData.js";

export async function runDecisionPipeline(userId, input = {}) {
  const latestAnalysis = await getLatestCropAnalysis(userId);
  const latestSnapshot = await getLatestFieldSnapshot(userId);

  const baseContext = {
    ...(latestSnapshot?.fieldContext || {}),
    crop: input.cropType || latestAnalysis?.cropType || latestSnapshot?.fieldContext?.crop || "Tomato",
    cropStage: input.cropStage || latestAnalysis?.growthStage || latestSnapshot?.fieldContext?.cropStage || "fruit development",
    acres: Number(input.acres ?? latestSnapshot?.fieldContext?.acres ?? 1),
    plantsPerAcre: Number(input.plantsPerAcre ?? latestSnapshot?.fieldContext?.plantsPerAcre ?? 4500),
    sensorReadings: {
      ...(latestSnapshot?.fieldContext?.sensorReadings || {}),
      soilMoisture: Number(input.soilMoisture ?? latestSnapshot?.fieldContext?.sensorReadings?.soilMoisture ?? 58),
      temperatureC: Number(input.temperature ?? latestSnapshot?.fieldContext?.sensorReadings?.temperatureC ?? 27),
      humidityRh: Number(input.humidity ?? latestSnapshot?.fieldContext?.sensorReadings?.humidityRh ?? 68),
      leafColorScore: Number(input.leafColorScore ?? latestSnapshot?.fieldContext?.sensorReadings?.leafColorScore ?? 0.72),
      capturedAt: new Date().toISOString()
    },
    market: {
      ...(latestSnapshot?.fieldContext?.market || {}),
      location: input.marketLocation || latestSnapshot?.fieldContext?.market?.location || "Bengaluru"
    },
    capturedAt: new Date().toISOString()
  };

  const weather = await fetchWeatherSnapshot(baseContext.market.location);
  const market = await fetchMarketSnapshot(baseContext.crop, baseContext.market.location);
  baseContext.weather = weather;
  baseContext.market = { ...baseContext.market, ...market };

  const fruitsPerPlant = Number(input.fruitsPerPlant ?? (latestAnalysis?.fruitCount || 20));

  const yieldPrediction = await predictYield(userId, {
    cropType: baseContext.crop,
    cropStage: baseContext.cropStage,
    fruitsPerPlant,
    acres: baseContext.acres,
    plantsPerAcre: baseContext.plantsPerAcre,
    avgFruitWeightKg: Number(input.avgFruitWeightKg || 0.09),
    weatherScore: Number(input.weatherScore || 0.82),
    historicalYieldFactor: Number(input.historicalYieldFactor || 1),
    fieldContext: baseContext
  });

  const disease = await predictDiseaseRisk(userId, {
    cropType: baseContext.crop,
    cropStage: baseContext.cropStage,
    temperature: baseContext.sensorReadings.temperatureC,
    humidity: baseContext.sensorReadings.humidityRh,
    fieldContext: baseContext
  });

  const irrigation = await recommendIrrigation(userId, {
    cropType: baseContext.crop,
    cropStage: baseContext.cropStage,
    soilMoisture: baseContext.sensorReadings.soilMoisture,
    rainForecastMm: weather.rainfallMm,
    et0Mm: weather.et0Mm,
    acres: baseContext.acres,
    fieldContext: baseContext
  });

  const ripeCount = (latestAnalysis?.stages || []).find((s) => String(s.stage || "").toLowerCase() === "ripe")?.count || 0;
  const ripeRatio = latestAnalysis?.fruitCount ? ripeCount / latestAnalysis.fruitCount : 0.4;

  const harvest = await planHarvest(userId, {
    fruitCount: latestAnalysis?.fruitCount || fruitsPerPlant,
    ripeRatio,
    avgFruitWeightKg: Number(input.avgFruitWeightKg || 0.09),
    capturedAt: new Date().toISOString(),
    fieldContext: baseContext
  });

  const storage = await storageAdvice(userId, {
    cropType: baseContext.crop,
    temperature: weather.temperatureC,
    humidity: weather.humidityRh,
    ventilationScore: Number(input.ventilationScore || 0.7),
    fieldContext: baseContext
  });

  const marketRec = await bestMarketRoute(userId, {
    crop: baseContext.crop,
    quantity: Number(yieldPrediction.predictedYieldToday || 0),
    farmerLocation: baseContext.market.location,
    marketRatesCapturedAt: market.capturedAt,
    fieldContext: baseContext
  });

  const profit = await simulateProfit(userId, {
    crop: baseContext.crop,
    quantity: Number(yieldPrediction.predictedYieldToday || 0),
    priceToday: Number(market.pricePerKg || marketRec.expectedPrice || 20),
    price3Days: Number((market.pricePerKg || 20) * 1.04),
    price5Days: Number((market.pricePerKg || 20) * 1.02),
    holdingCost: Number(input.holdingCost || 120),
    priceCapturedAt: market.capturedAt,
    fieldContext: baseContext
  });

  await upsertFieldSnapshot(userId, baseContext, {
    source: "pipeline",
    cropAnalysisId: latestAnalysis?._id || null,
    capturedAt: new Date().toISOString()
  });

  return {
    fieldContext: baseContext,
    cropAnalysis: latestAnalysis,
    yieldPrediction,
    disease,
    irrigation,
    harvest,
    storage,
    market: marketRec,
    profit
  };
}
