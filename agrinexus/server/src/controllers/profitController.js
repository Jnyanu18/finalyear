import { z } from "zod";
import { simulateProfit } from "../services/profitService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string().default("Tomato"),
  quantity: z.number().positive(),
  priceToday: z.number().positive().optional(),
  price3Days: z.number().positive().optional(),
  price5Days: z.number().positive().optional(),
  holdingCost: z.number().nonnegative().default(120),
  fieldLossPct: z.number().min(0).max(100).optional(),
  harvestLossPct: z.number().min(0).max(100).optional(),
  transportLossPct: z.number().min(0).max(100).optional(),
  priceCapturedAt: z.string().optional(),
  fieldContext: z.any().optional()
});

export async function profitSimulation(req, res) {
  const payload = schema.parse(req.body);
  const simulation = await simulateProfit(req.user.id, payload);
  return sendSuccess(res, { simulation }, "Profit simulation generated.");
}
