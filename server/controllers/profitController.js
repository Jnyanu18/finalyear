import { z } from "zod";
import { simulateProfit } from "../services/profitService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string().default("Tomato"),
  quantity: z.number().positive(),
  priceToday: z.number().positive(),
  price3Days: z.number().positive(),
  price5Days: z.number().positive(),
  holdingCost: z.number().nonnegative().default(120),
  priceCapturedAt: z.string().datetime().optional()
});

export async function profitSimulation(req, res) {
  const payload = schema.parse(req.body);
  const simulation = await simulateProfit(req.user.id, payload);
  return sendSuccess(res, { simulation }, "Profit simulation generated.");
}
