import { env } from "../config/env.js";
import { CropAnalysis } from "../models/CropAnalysis.js";
import { callGemini } from "../utils/gemini.js";
import { cacheKey, getCachedFeature, setCachedFeature } from "./featureCacheService.js";
import { trackFallback, trackQuotaFailure } from "../utils/observability.js";

function simpleFallbackAnalysis(input) {
  const cropType = (input.cropTypeHint || "Tomato").trim();
  const fruitCount = Math.max(6, Math.min(80, Math.round((input.estimatedFruitCount || 20) * 1.1)));
  return {
    cropType,
    growthStage: "fruit development",
    fruitCount,
    healthStatus: "moderate",
    stages: [
      { stage: "ripe", count: Math.round(fruitCount * 0.45) },
      { stage: "semi-ripe", count: Math.round(fruitCount * 0.35) },
      { stage: "immature", count: Math.round(fruitCount * 0.2) }
    ],
    summary: `${cropType} crop with moderate fruiting and mixed maturity stages.`
  };
}

export async function analyzePlantImage(userId, input) {
  let analysis = null;
  const key = cacheKey([
    "vision",
    String(input.cropTypeHint || ""),
    String(input.estimatedFruitCount || ""),
    String(input.imageData || "").slice(0, 1024)
  ]);

  const cached = await getCachedFeature(key);
  if (cached) {
    analysis = cached;
  }

  if (!analysis && env.aiMode === "gemini" && input.imageData) {
    const prompt = `
You are an agriculture vision specialist.
Analyze this crop image and return strict JSON with keys:
cropType, growthStage, fruitCount, healthStatus, stages, summary.

Output format:
{
  "cropType": "tomato",
  "growthStage": "fruit development",
  "fruitCount": 20,
  "healthStatus": "healthy|moderate|stressed",
  "stages": [{"stage":"ripe","count":10}],
  "summary": "short farmer-friendly sentence"
}
    `.trim();

    try {
      analysis = await callGemini(prompt, input.imageData, input.mimeType || "image/jpeg");
    } catch (_error) {
      if (String(_error?.message || "").toLowerCase().includes("quota")) {
        trackQuotaFailure();
      }
      analysis = null;
    }
  }

  if (!analysis) {
    trackFallback("vision_fallback");
    analysis = simpleFallbackAnalysis(input);
  }

  await setCachedFeature(key, analysis, 60 * 30, { channel: "vision" });

  const doc = await CropAnalysis.create({
    userId,
    imageUrl: input.imageUrl || "",
    cropType: analysis.cropType || "Tomato",
    growthStage: analysis.growthStage || "unknown",
    fruitCount: Number(analysis.fruitCount || 0),
    healthStatus: analysis.healthStatus || "unknown",
    stages: Array.isArray(analysis.stages) ? analysis.stages : [],
    summary: analysis.summary || "",
    raw: analysis
  });

  return doc.toObject();
}

export async function getLatestCropAnalysis(userId) {
  return CropAnalysis.findOne({ userId }).sort({ createdAt: -1 }).lean();
}
