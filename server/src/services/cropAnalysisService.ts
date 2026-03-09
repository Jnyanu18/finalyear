
import { CropAnalysis } from "../models/CropAnalysis.js";
import { callGemini } from "../utils/gemini.js";

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

  if (env.aiMode === "gemini" && input.imageData) {
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
      analysis = null;
    }
  }

  if (!analysis) {
    analysis = simpleFallbackAnalysis(input);
  }

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
