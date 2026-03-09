import { z } from "zod";
import { planHarvest } from "../services/harvestService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  fruitCount: z.number().nonnegative(),
  ripeRatio: z.number().min(0).max(1),
  avgFruitWeightKg: z.number().positive().default(0.09),
  capturedAt: z.string().datetime().optional()
});

export async function harvestPlan(req, res) {
  const payload = schema.parse(req.body);
  const plan = await planHarvest(req.user.id, payload);
  return sendSuccess(res, { plan }, "Harvest plan generated.");
}
