import { env } from "../config/env.js";
import mongoose from "mongoose";
import { CropAnalysis } from "../models/CropAnalysis.js";
import { callGemini } from "../utils/gemini.js";
import { callGroqVision, callOllamaVision } from "../utils/visionProviders.js";
import { uploadImageToCloud } from "../utils/imageStorage.js";
import { computeHealthScore } from "../utils/externalData.js";
import { upsertFieldSnapshot } from "./fieldContextService.js";
import { getLatestLocalAnalysis, saveLocalAnalysis } from "../utils/localAnalysisStore.js";
import { getCropProfile } from "../config/cropProfiles.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeStageLabel(stageRaw = "") {
  const stage = String(stageRaw || "").trim().toLowerCase();
  if (!stage) return "vegetative";
  return stage;
}

function buildDefaultRecommendations({ cropType, healthStatus, growthStage }) {
  const crop = String(cropType || "crop");
  const status = String(healthStatus || "moderate").toLowerCase();
  const stage = String(growthStage || "vegetative").toLowerCase();
  const recommendations = [];

  if (status === "stressed") {
    recommendations.push(`Inspect ${crop} leaves for blight, curl, or visible pest damage before the next irrigation cycle.`);
    recommendations.push("Check soil moisture distribution and root-zone drainage in the affected row section.");
  } else if (status === "moderate") {
    recommendations.push(`Monitor ${crop} canopy color and fruit set over the next 3-5 days for any decline.`);
    recommendations.push("Keep irrigation and foliar scouting on schedule to avoid stress escalation.");
  } else {
    recommendations.push(`Maintain current ${crop} nutrition and irrigation schedule; canopy vigor looks stable.`);
  }

  if (stage.includes("flower")) {
    recommendations.push("Support pollination and avoid moisture swings during flowering.");
  }
  if (stage.includes("fruit") || stage.includes("ripen") || stage.includes("harvest")) {
    recommendations.push("Track fruit maturity mix and plan harvest logistics from the current fruit load.");
  }

  return recommendations.slice(0, 3);
}

function buildDefaultIssues({ cropType, healthStatus, growthStage }) {
  const status = String(healthStatus || "moderate").toLowerCase();
  const stage = String(growthStage || "vegetative").toLowerCase();

  if (status === "healthy") {
    return ["No major visible stress detected from the uploaded image."];
  }

  if (status === "stressed") {
    return [
      `${cropType} canopy shows visible stress cues that may indicate disease, water imbalance, or nutrient pressure.`,
      "A close field check is recommended to confirm the exact cause."
    ];
  }

  if (stage.includes("vegetative")) {
    return ["Moderate canopy vigor with no strong fruiting signal yet."];
  }

  return ["Moderate vigor with mixed maturity or canopy unevenness visible in the uploaded plant image."];
}

function normalizeStages(stages, fruitCount) {
  if (Array.isArray(stages) && stages.length) {
    return stages
      .filter((entry) => entry && entry.stage)
      .map((entry) => ({
        stage: String(entry.stage),
        count: Math.max(0, Number(entry.count || 0))
      }));
  }

  const total = Math.max(0, Number(fruitCount || 0));
  return [
    { stage: "ripe", count: Math.round(total * 0.4) },
    { stage: "semi-ripe", count: Math.round(total * 0.35) },
    { stage: "immature", count: Math.max(0, total - Math.round(total * 0.4) - Math.round(total * 0.35)) }
  ];
}

function buildAnalysisPrompt(cropTypeHint = "tomato") {
  const hint = String(cropTypeHint || "tomato").trim().toLowerCase();
  const cropSpecificInstruction = hint === "tomato"
    ? "The farmer is most likely uploading a tomato plant photo. Confirm whether the plant looks like tomato and analyze the plant canopy, flowering, fruit load, and visible stress."
    : `The farmer believes this is ${hint}. Confirm whether the plant matches that crop and analyze the visible growth and stress condition.`;

  return `You are an agriculture vision specialist.
${cropSpecificInstruction}

Return ONLY valid JSON with this exact shape:
{
  "cropType": "${hint}",
  "cropMatchConfidence": <number between 0 and 1>,
  "targetCropDetected": <true or false>,
  "growthStage": "seedling | vegetative | flowering | fruit development | ripening | harvest-ready",
  "fruitCount": <integer>,
  "healthStatus": "healthy | moderate | stressed",
  "canopyDensity": "low | medium | high",
  "floweringLevel": "none | low | moderate | high",
  "likelyIssues": ["short issue 1", "short issue 2"],
  "recommendations": ["short action 1", "short action 2", "short action 3"],
  "stages": [
    {"stage": "ripe", "count": <n>},
    {"stage": "semi-ripe", "count": <n>},
    {"stage": "immature", "count": <n>}
  ],
  "summary": "2-3 sentence farmer-friendly observation focused on the uploaded plant image"
}`;
}

function normalizeAnalysis(analysis, cropTypeHint = "tomato") {
  const cropType = String(analysis?.cropType || cropTypeHint || "Tomato").trim();
  const growthStage = normalizeStageLabel(analysis?.growthStage);
  const fruitCount = Math.max(0, Number(analysis?.fruitCount || 0));
  const healthStatus = String(analysis?.healthStatus || "moderate").trim().toLowerCase();
  const cropMatchConfidence = clamp(Number(analysis?.cropMatchConfidence ?? analysis?.confidence ?? 0.84), 0.2, 0.99);
  const targetCropDetected =
    typeof analysis?.targetCropDetected === "boolean"
      ? analysis.targetCropDetected
      : cropMatchConfidence >= 0.6;
  const canopyDensity = ["low", "medium", "high"].includes(String(analysis?.canopyDensity || "").toLowerCase())
    ? String(analysis.canopyDensity).toLowerCase()
    : fruitCount >= 24 ? "high" : fruitCount >= 12 ? "medium" : "low";
  const floweringLevel = ["none", "low", "moderate", "high"].includes(String(analysis?.floweringLevel || "").toLowerCase())
    ? String(analysis.floweringLevel).toLowerCase()
    : growthStage.includes("flower") ? "moderate" : growthStage.includes("vegetative") ? "low" : "none";
  const likelyIssues = Array.isArray(analysis?.likelyIssues) && analysis.likelyIssues.length
    ? analysis.likelyIssues.map((entry) => String(entry))
    : buildDefaultIssues({ cropType, healthStatus, growthStage });
  const recommendations = Array.isArray(analysis?.recommendations) && analysis.recommendations.length
    ? analysis.recommendations.map((entry) => String(entry))
    : buildDefaultRecommendations({ cropType, healthStatus, growthStage });
  const stages = normalizeStages(analysis?.stages, fruitCount);

  return {
    cropType,
    cropMatchConfidence,
    targetCropDetected,
    growthStage,
    fruitCount,
    healthStatus,
    canopyDensity,
    floweringLevel,
    likelyIssues,
    recommendations,
    stages,
    summary: String(analysis?.summary || `${cropType} plant analyzed successfully.`).trim(),
    _source: analysis?._source || "normalized"
  };
}

async function textBasedAnalysis(input) {
  const hint = input.cropTypeHint || "tomato";
  const prompt = buildAnalysisPrompt(hint);

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
  const profile = getCropProfile(cropType);
  const stage = "fruit development";
  const fruitCount = Number(profile.typicalUnitsPerPlant || 24);
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
    cropMatchConfidence: cropType.toLowerCase() === "tomato" ? 0.92 : 0.84,
    targetCropDetected: true,
    canopyDensity: fruitCount >= 20 ? "high" : "medium",
    floweringLevel: "moderate",
    likelyIssues: buildDefaultIssues({ cropType, healthStatus: "moderate", growthStage: stage }),
    recommendations: buildDefaultRecommendations({ cropType, healthStatus: "moderate", growthStage: stage }),
    summary: `${cropType} observed in ${stage} stage with moderate canopy vigor. Fallback profile logic for ${profile.label}.`,
    _source: "fallback"
  };
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
  const prompt = buildAnalysisPrompt(input.cropTypeHint || "tomato");

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

  analysis = normalizeAnalysis(analysis, input.cropTypeHint || "tomato");

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

  const payload = {
    imageUrl: finalImageUrl,
    cropType: analysis.cropType || "Unknown",
    growthStage: analysis.growthStage || "unknown",
    fruitCount: Number(analysis.fruitCount || 0),
    healthStatus: analysis.healthStatus || "unknown",
    healthScore,
    stages: Array.isArray(analysis.stages) ? analysis.stages : [],
    summary: analysis.summary || "",
    analysisDetails: {
      cropMatchConfidence: analysis.cropMatchConfidence,
      targetCropDetected: analysis.targetCropDetected,
      canopyDensity: analysis.canopyDensity,
      floweringLevel: analysis.floweringLevel,
      likelyIssues: analysis.likelyIssues,
      recommendations: analysis.recommendations,
      analysisSource: analysis._source || "unknown"
    },
    raw: { ...analysis, scoreParts }
  };

  const dbReady = mongoose.connection.readyState === 1;
  const canUseMongoUserId = mongoose.Types.ObjectId.isValid(String(userId));
  let saved = null;

  if (dbReady && canUseMongoUserId) {
    try {
      const doc = await CropAnalysis.create({
        userId,
        ...payload
      });
      saved = doc.toObject();
    } catch (_error) {
      saved = null;
    }
  }

  if (!saved) {
    saved = await saveLocalAnalysis(userId, payload);
  }

  try {
    await upsertFieldSnapshot(
      userId,
      {
        crop: saved.cropType,
        cropStage: saved.growthStage,
        sensorReadings: {
          leafColorScore: scoreParts.leafColorScore,
          capturedAt: new Date().toISOString()
        },
        capturedAt: new Date().toISOString()
      },
      { source: "crop_monitor", cropAnalysisId: saved._id }
    );
  } catch (_error) {
    // Snapshot persistence is optional when DB is offline.
  }

  return saved;
}

export async function getLatestCropAnalysis(userId) {
  const dbReady = mongoose.connection.readyState === 1;
  const canUseMongoUserId = mongoose.Types.ObjectId.isValid(String(userId));

  if (dbReady && canUseMongoUserId) {
    try {
      const doc = await CropAnalysis.findOne({ userId }).sort({ createdAt: -1 }).lean();
      if (doc) return doc;
    } catch (_error) {
      // Fall back to local file store.
    }
  }

  return getLatestLocalAnalysis(userId);
}
