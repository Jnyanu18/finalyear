import { env } from "../config/env.js";
import { CropAnalysis } from "../models/CropAnalysis.js";
import { callGemini } from "../utils/gemini.js";
import { callGroqVision, callOllamaVision } from "../utils/visionProviders.js";
import { uploadImageToCloud } from "../utils/imageStorage.js";
import { computeHealthScore } from "../utils/externalData.js";
import { upsertFieldSnapshot } from "./fieldContextService.js";

async function textBasedAnalysis(input) {
  const hint = input.cropTypeHint || "tomato";
  const prompt = `You are an agricultural analyst. A farmer has uploaded a crop photo.
Crop type hint from farmer: "${hint}"

Return ONLY this JSON:
{
  "cropType": "${hint}",
  "growthStage": "seedling | vegetative | flowering | fruit development | ripening | harvest-ready",
  "fruitCount": <integer between 8 and 60>,
  "healthStatus": "healthy | moderate | stressed",
  "stages": [
    {"stage": "ripe", "count": <n>},
    {"stage": "semi-ripe", "count": <n>},
    {"stage": "immature", "count": <n>}
  ],
  "summary": "2-3 sentence realistic field observation"
}`;

  try {
    const result = await callGemini(prompt, null, null);
    if (result?.cropType) {
      result._source = "gemini-text";
      return result;
    }
  } catch (_) {}

  return null;
}

function deterministicFallback(input) {
  const cropType = (input.cropTypeHint || "Tomato").trim();
  const stage = "fruit development";
  const fruitCount = 24;
  return {
    cropType,
    growthStage: stage,
    fruitCount,
    healthStatus: "moderate",
    stages: [
      { stage: "ripe", count: Math.round(fruitCount * 0.4) },
      { stage: "semi-ripe", count: Math.round(fruitCount * 0.35) },
      { stage: "immature", count: Math.round(fruitCount * 0.25) }
    ],
    summary: `${cropType} observed in ${stage} stage with moderate canopy vigor. (fallback analysis)`,
    _source: "fallback"
  };
}

function buildVisionPrompt() {
  return `You are an agriculture vision specialist.
Analyze this crop photo and return ONLY JSON:
{
  "cropType": "crop name",
  "growthStage": "seedling | vegetative | flowering | fruit development | ripening | harvest-ready",
  "fruitCount": <integer>,
  "healthStatus": "healthy | moderate | stressed",
  "stages": [{"stage": "ripe", "count": <n>}, {"stage": "semi-ripe", "count": <n>}, {"stage": "immature", "count": <n>}],
  "summary": "2-3 sentence farmer-friendly observation"
}`;
}

function deriveComponentScores(analysis) {
  const status = String(analysis.healthStatus || "moderate").toLowerCase();
  const leafColorScore = status === "healthy" ? 0.86 : status === "moderate" ? 0.68 : 0.42;
  const fruitCount = Number(analysis.fruitCount || 0);
  const fruitDensityScore = Math.max(0.2, Math.min(1, fruitCount / 40));
  const stage = String(analysis.growthStage || "").toLowerCase();
  const growthStageConsistency = stage.includes("fruit") || stage.includes("ripen") || stage.includes("harvest") ? 0.82 : 0.66;
  return { leafColorScore, fruitDensityScore, growthStageConsistency };
}

export async function analyzePlantImage(userId, input) {
  let analysis = null;
  let imageData = input.imageData || null;
  if (imageData && imageData.includes(",")) imageData = imageData.split(",")[1];

  const hasImage = Boolean(imageData && imageData.length > 100);
  const hasGeminiKey = Boolean(env.geminiApiKey);
  const hasGroqKey = Boolean(env.groqApiKey);
  const prompt = buildVisionPrompt();

  if (!analysis && hasImage && hasGroqKey) {
    try {
      analysis = await callGroqVision(prompt, imageData, input.mimeType || "image/jpeg");
      analysis._source = "groq-vision";
    } catch (_) {}
  }

  if (!analysis && hasImage && hasGeminiKey) {
    try {
      analysis = await callGemini(prompt, imageData, input.mimeType || "image/jpeg");
      analysis._source = "gemini-vision";
    } catch (_) {}
  }

  if (!analysis && hasImage) {
    try {
      analysis = await callOllamaVision(prompt, imageData);
      analysis._source = "ollama-vision";
    } catch (_) {}
  }

  if (!analysis && hasGeminiKey && !hasImage) {
    analysis = await textBasedAnalysis({ cropTypeHint: input.cropTypeHint || "tomato" });
  }

  if (!analysis) {
    analysis = deterministicFallback(input);
  }

  const scoreParts = deriveComponentScores(analysis);
  const healthScore = computeHealthScore(scoreParts);

  let finalImageUrl = input.imageUrl || "";
  if (hasImage) {
    try {
      const uploaded = await uploadImageToCloud(imageData, input.mimeType || "image/jpeg");
      finalImageUrl = uploaded.url || finalImageUrl;
    } catch {
      finalImageUrl = `data:${input.mimeType || "image/jpeg"};base64,${imageData}`;
    }
  }

  const doc = await CropAnalysis.create({
    userId,
    imageUrl: finalImageUrl,
    cropType: analysis.cropType || "Unknown",
    growthStage: analysis.growthStage || "unknown",
    fruitCount: Number(analysis.fruitCount || 0),
    healthStatus: analysis.healthStatus || "unknown",
    healthScore,
    stages: Array.isArray(analysis.stages) ? analysis.stages : [],
    summary: analysis.summary || "",
    raw: { ...analysis, scoreParts }
  });

  await upsertFieldSnapshot(
    userId,
    {
      crop: doc.cropType,
      cropStage: doc.growthStage,
      sensorReadings: {
        leafColorScore: scoreParts.leafColorScore,
        capturedAt: new Date().toISOString()
      },
      capturedAt: new Date().toISOString()
    },
    { source: "crop_monitor", cropAnalysisId: doc._id }
  );

  return doc.toObject();
}

export async function getLatestCropAnalysis(userId) {
  return CropAnalysis.findOne({ userId }).sort({ createdAt: -1 }).lean();
}
