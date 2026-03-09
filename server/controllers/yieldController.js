import { z } from "zod";
import { predictYield } from "../services/yieldPredictionService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  cropStage: z.string().default("fruiting"),
  fruitCount: z.number().nonnegative().optional(),
  fruitsPerPlant: z.number().nonnegative().optional(),
  acres: z.number().positive().default(1),
  plantsPerAcre: z.number().positive().default(4500),
  avgFruitWeightKg: z.number().positive().optional(),
  postHarvestLossPct: z.number().min(0).max(40).default(7),
  historicalYieldFactor: z.number().positive().optional(),
  weatherScore: z.number().positive().optional(),
  weatherForecast: z.object({
    temperature: z.number().optional(),
    rainfall: z.number().optional()
  }).optional()
});

export async function yieldPrediction(req, res) {
  const payload = schema.parse(req.body);
  const prediction = await predictYield(req.user.id, payload);
  return sendSuccess(res, { prediction }, "Yield prediction generated.");
}
