
import { callGemini } from "../utils/gemini.js";
import { CropAnalysis } from "../models/CropAnalysis.js";
import { YieldPrediction } from "../models/YieldPrediction.js";
import { DiseasePrediction } from "../models/DiseasePrediction.js";
import { IrrigationRecommendation } from "../models/IrrigationRecommendation.js";
import { HarvestPlan } from "../models/HarvestPlan.js";
import { MarketPrediction } from "../models/MarketPrediction.js";
import { ProfitSimulation } from "../models/ProfitSimulation.js";
import { StoragePrediction } from "../models/StoragePrediction.js";
import { FarmerProfile } from "../models/FarmerProfile.js";

async function latest(docModel, userId) {
  return docModel.findOne({ userId }).sort({ createdAt: -1 }).lean();
}

function fallbackReply(query, context) {
  const q = query.toLowerCase();
  if (q.includes("harvest") && context.harvest) {
    return `Recommended harvest window is ${context.harvest.recommendedHarvestWindow}. Ready today: ${context.harvest.readyToday} kg.`;
  }
  if ((q.includes("market") || q.includes("sell")) && context.market) {
    return `Best market currently is ${context.market.bestMarket} with estimated net profit ${context.market.netProfit}.`;
  }
  if (q.includes("irrigation") && context.irrigation) {
    return `${context.irrigation.recommendation}: ${context.irrigation.reason}`;
  }
  if (q.includes("disease") && context.disease) {
    return `${context.disease.disease} risk is ${context.disease.riskLevel} (${context.disease.riskProbability}).`;
  }
  return "Run latest crop analysis, prediction, and market modules for a stronger recommendation.";
}

export async function advisorChat(userId, query) {
  const [profile, crop, yieldPrediction, disease, irrigation, harvest, storage, market, profit] =
    await Promise.all([
      FarmerProfile.findOne({ userId }).lean(),
      latest(CropAnalysis, userId),
      latest(YieldPrediction, userId),
      latest(DiseasePrediction, userId),
      latest(IrrigationRecommendation, userId),
      latest(HarvestPlan, userId),
      latest(StoragePrediction, userId),
      latest(MarketPrediction, userId),
      latest(ProfitSimulation, userId)
    ]);

  const context = { profile, crop, yieldPrediction, disease, irrigation, harvest, storage, market, profit };

  if (env.aiMode === "gemini" && env.geminiApiKey) {
    try {
      const prompt = `
You are AgriNexus farm advisor. Answer in simple farmer-friendly language.
Use this context JSON:
${JSON.stringify(context)}

User query: ${query}

Respond with strict JSON:
{"reply":"short practical advice"}
      `.trim();

      const model = await callGemini(prompt);
      if (model?.reply) {
        return { reply: model.reply, context };
      }
    } catch (_error) {
      // fallback intentionally
    }
  }

  return { reply: fallbackReply(query, context), context };
}

export async function reportSummary(userId) {
  const [crop, yieldPrediction, disease, irrigation, harvest, storage, market, profit] = await Promise.all([
    latest(CropAnalysis, userId),
    latest(YieldPrediction, userId),
    latest(DiseasePrediction, userId),
    latest(IrrigationRecommendation, userId),
    latest(HarvestPlan, userId),
    latest(StoragePrediction, userId),
    latest(MarketPrediction, userId),
    latest(ProfitSimulation, userId)
  ]);

  return { crop, yieldPrediction, disease, irrigation, harvest, storage, market, profit };
}
