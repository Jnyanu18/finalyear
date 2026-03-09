import { z } from "zod";
import { predictYield } from "../services/yieldPredictionService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  cropStage: z.string().default("fruiting"),
  fruitCount: z.number().nonnegative().optional(),
  fruitsPerPlant: z.number().nonnegative().optional(),
  acres: z.number().positive().optional(),
  plantsPerAcre: z.number().positive().optional(),
  avgFruitWeightKg: z.number().positive().optional(),
  historicalYieldFactor: z.number().positive().optional(),
  weatherScore: z.number().positive().optional(),
  fieldLossPct: z.number().min(0).max(100).optional(),
  harvestLossPct: z.number().min(0).max(100).optional(),
  transportLossPct: z.number().min(0).max(100).optional(),
  fieldContext: z.any().optional(),
  weatherForecast: z.object({
    temperature: z.number().optional(),
    rainfall: z.number().optional(),
    capturedAt: z.string().optional()
  }).optional()
});

export async function yieldPrediction(req, res) {
  const payload = schema.parse(req.body);
  const prediction = await predictYield(req.user.id, payload);
  return sendSuccess(res, { prediction }, "Yield prediction generated.");
}
