import { FieldSnapshot } from "../models/FieldSnapshot.js";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mergeDeep(base = {}, patch = {}) {
  return {
    ...base,
    ...patch,
    sensorReadings: { ...(base.sensorReadings || {}), ...(patch.sensorReadings || {}) },
    weather: { ...(base.weather || {}), ...(patch.weather || {}) },
    market: { ...(base.market || {}), ...(patch.market || {}) }
  };
}

export function normalizeFieldContext(input = {}) {
  return {
    crop: input.crop || input.cropType || "Tomato",
    cropStage: input.cropStage || "fruit development",
    acres: toNum(input.acres) ?? 1,
    plantsPerAcre: toNum(input.plantsPerAcre) ?? 4500,
    soilType: input.soilType || null,
    irrigationType: input.irrigationType || null,
    sensorReadings: {
      soilMoisture: toNum(input.sensorReadings?.soilMoisture ?? input.soilMoisture),
      temperatureC: toNum(input.sensorReadings?.temperatureC ?? input.temperature),
      humidityRh: toNum(input.sensorReadings?.humidityRh ?? input.humidity),
      leafColorScore: toNum(input.sensorReadings?.leafColorScore),
      capturedAt: input.sensorReadings?.capturedAt || input.capturedAt || new Date().toISOString()
    },
    weather: {
      temperatureC: toNum(input.weather?.temperatureC),
      humidityRh: toNum(input.weather?.humidityRh),
      rainfallMm: toNum(input.weather?.rainfallMm),
      rainProbability: toNum(input.weather?.rainProbability),
      et0Mm: toNum(input.weather?.et0Mm),
      capturedAt: input.weather?.capturedAt || null
    },
    market: {
      location: input.market?.location || input.location || "Bengaluru",
      pricePerKg: toNum(input.market?.pricePerKg),
      capturedAt: input.market?.capturedAt || null
    },
    capturedAt: input.capturedAt || new Date().toISOString()
  };
}

export async function getLatestFieldSnapshot(userId) {
  return FieldSnapshot.findOne({ userId }).sort({ updatedAt: -1 }).lean();
}

export async function upsertFieldSnapshot(userId, contextPatch = {}, meta = {}) {
  const current = await FieldSnapshot.findOne({ userId }).lean();
  const merged = mergeDeep(current?.fieldContext || {}, normalizeFieldContext(contextPatch));

  const snapshot = await FieldSnapshot.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        cropAnalysisId: meta.cropAnalysisId || current?.cropAnalysisId || null,
        source: meta.source || "module",
        fieldContext: merged,
        capturedAt: meta.capturedAt || merged.capturedAt || new Date()
      }
    },
    { upsert: true, new: true }
  );

  return snapshot.toObject();
}
