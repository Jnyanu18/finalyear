import { FieldSnapshot } from "../models/FieldSnapshot.js";
import { toNumber } from "../utils/modelGovernance.js";

const DEFAULT_CONTEXT = {
  crop: "Tomato",
  acres: null,
  plantsPerAcre: null,
  soilType: null,
  irrigationType: null,
  sensorReadings: {
    soilMoisture: null,
    temperatureC: null,
    humidityRh: null,
    leafWetnessPct: null,
    capturedAt: null
  },
  weather: {
    temperatureC: null,
    humidityRh: null,
    rainfallMm: null,
    et0Mm: null,
    capturedAt: null
  },
  market: {
    location: null,
    pricePerKg: null,
    capturedAt: null
  },
  capturedAt: null
};

function cleanValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function normalizeFieldContext(raw = {}, legacy = {}) {
  const merged = {
    ...DEFAULT_CONTEXT,
    ...raw,
    sensorReadings: {
      ...DEFAULT_CONTEXT.sensorReadings,
      ...(raw.sensorReadings || {})
    },
    weather: {
      ...DEFAULT_CONTEXT.weather,
      ...(raw.weather || {})
    },
    market: {
      ...DEFAULT_CONTEXT.market,
      ...(raw.market || {})
    }
  };

  if (!merged.crop && legacy.cropType) merged.crop = legacy.cropType;
  if (merged.acres == null && legacy.acres != null) merged.acres = toNumber(legacy.acres);
  if (merged.plantsPerAcre == null && legacy.plantsPerAcre != null) merged.plantsPerAcre = toNumber(legacy.plantsPerAcre);
  if (merged.sensorReadings.soilMoisture == null && legacy.soilMoisture != null) {
    merged.sensorReadings.soilMoisture = toNumber(legacy.soilMoisture);
  }
  if (merged.sensorReadings.temperatureC == null && legacy.temperature != null) {
    merged.sensorReadings.temperatureC = toNumber(legacy.temperature);
  }
  if (merged.sensorReadings.humidityRh == null && legacy.humidity != null) {
    merged.sensorReadings.humidityRh = toNumber(legacy.humidity);
  }
  if (merged.weather.rainfallMm == null && legacy.rainForecastMm != null) {
    merged.weather.rainfallMm = toNumber(legacy.rainForecastMm);
  }
  if (merged.market.location == null && legacy.farmerLocation) {
    merged.market.location = legacy.farmerLocation;
  }

  merged.crop = cleanValue(merged.crop) || "Tomato";
  merged.soilType = cleanValue(merged.soilType);
  merged.irrigationType = cleanValue(merged.irrigationType);
  merged.capturedAt = cleanValue(merged.capturedAt) || new Date().toISOString();
  return merged;
}

export async function getMergedFieldContext(userId, payload = {}, source = "module") {
  const snapshot = await FieldSnapshot.findOne({ userId }).lean();
  const fromPayload = normalizeFieldContext(payload.fieldContext || {}, payload);
  const base = normalizeFieldContext(snapshot?.fieldContext || {}, {});

  const merged = {
    ...base,
    ...fromPayload,
    sensorReadings: { ...base.sensorReadings, ...fromPayload.sensorReadings },
    weather: { ...base.weather, ...fromPayload.weather },
    market: { ...base.market, ...fromPayload.market },
    capturedAt: fromPayload.capturedAt || base.capturedAt || new Date().toISOString()
  };

  await FieldSnapshot.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        fieldContext: merged,
        source,
        capturedAt: merged.capturedAt
      }
    },
    { upsert: true, new: true }
  );

  return merged;
}
