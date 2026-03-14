import { getCropProfile } from "../config/cropProfiles.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function computeHealthScore({ leafColorScore, fruitDensityScore, growthStageConsistency }) {
  const score =
    0.4 * clamp(toNumber(leafColorScore, 0.6), 0, 1) +
    0.3 * clamp(toNumber(fruitDensityScore, 0.6), 0, 1) +
    0.3 * clamp(toNumber(growthStageConsistency, 0.6), 0, 1);
  return Number((score * 100).toFixed(2));
}

export async function fetchWeatherSnapshot(location = "Bengaluru") {
  const apiKey = process.env.OPENWEATHER_API_KEY || "";
  if (!apiKey) {
    return {
      source: "fallback",
      capturedAt: new Date().toISOString(),
      temperatureC: 27,
      humidityRh: 68,
      rainfallMm: 2,
      rainProbability: 0.2,
      et0Mm: 4.7
    };
  }

  const encoded = encodeURIComponent(location);
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`weather status ${response.status}`);
    const data = await response.json();
    const temp = toNumber(data?.main?.temp, 27);
    const humidity = toNumber(data?.main?.humidity, 68);
    const rain = toNumber(data?.rain?.["1h"], 0);
    // simple ET0 approximation from temp & humidity
    const et0 = clamp(0.16 * temp * (1 - humidity / 100) + 3.2, 2.5, 8.5);

    return {
      source: "openweather",
      capturedAt: new Date().toISOString(),
      temperatureC: Number(temp.toFixed(2)),
      humidityRh: Number(humidity.toFixed(2)),
      rainfallMm: Number(rain.toFixed(2)),
      rainProbability: rain > 0 ? 0.7 : 0.2,
      et0Mm: Number(et0.toFixed(2))
    };
  } catch {
    return {
      source: "fallback",
      capturedAt: new Date().toISOString(),
      temperatureC: 27,
      humidityRh: 68,
      rainfallMm: 2,
      rainProbability: 0.2,
      et0Mm: 4.7
    };
  }
}

export async function fetchMarketSnapshot(cropType = "Tomato", location = "Bengaluru") {
  const profile = getCropProfile(cropType);
  const baseReferencePrice = 25;
  const locationPremiumMap = {
    bengaluru: 1.05,
    mysuru: 0.98,
    mandya: 0.95,
    coimbatore: 1.02,
    salem: 1.01,
  };
  const locationKey = String(location || "").trim().toLowerCase();
  const locationPremium = locationPremiumMap[locationKey] || 1;
  const price = Number((baseReferencePrice * (profile.marketPriceFactor || 1) * locationPremium).toFixed(2));
  const shelfLifeBias = profile.shelfLifeDays >= 10 ? 0.012 : -0.004;
  const cropMomentum = clamp((profile.marketPriceFactor || 1) - 1, -0.08, 0.12);
  const trendFactor3Days = 1 + shelfLifeBias + cropMomentum * 0.4;
  const trendFactor5Days = 1 + shelfLifeBias * 1.4 + cropMomentum * 0.25 - 0.01;
  const projectedPrice3Days = Number((price * trendFactor3Days).toFixed(2));
  const projectedPrice5Days = Number((price * trendFactor5Days).toFixed(2));
  const volatility = Number(clamp(0.05 + Math.abs(cropMomentum) * 0.45 + (profile.shelfLifeDays <= 5 ? 0.03 : 0), 0.05, 0.18).toFixed(2));
  const trend =
    projectedPrice3Days > price * 1.015
      ? "rising"
      : projectedPrice3Days < price * 0.985
        ? "softening"
        : "stable";

  return {
    source: process.env.MARKET_API_KEY ? "market_api_stub" : "fallback",
    capturedAt: new Date().toISOString(),
    location,
    pricePerKg: price,
    projectedPrice3Days,
    projectedPrice5Days,
    trend,
    volatility,
    currency: "INR"
  };
}
