import { z } from "zod";
import { planHarvest } from "../services/harvestService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  acres: z.number().positive().optional(),
  plantsPerAcre: z.number().positive().optional(),
  fruitsPerPlant: z.number().nonnegative().optional(),
  ripeRatio: z.number().min(0).max(1).optional(),
  avgFruitWeightKg: z.number().positive().default(0.09),
  fieldContext: z.any().optional(),
  capturedAt: z.string().optional()
});

export async function harvestPlan(req, res) {
  const payload = schema.parse(req.body);
  const plan = await planHarvest(req.user.id, payload);
  return sendSuccess(res, { plan }, "Harvest plan generated.");
}
