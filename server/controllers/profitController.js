import { z } from "zod";
import { simulateProfit } from "../services/profitService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string().default("Tomato"),
  cropType: z.string().optional(),
  quantity: z.number().positive(),
  priceToday: z.number().positive().optional(),
  price3Days: z.number().positive().optional(),
  price5Days: z.number().positive().optional(),
  holdingCost: z.number().nonnegative().default(120),
  priceCapturedAt: z.string().datetime().optional(),
  marketLocation: z.string().optional(),
  fieldContext: z.any().optional()
});

export async function profitSimulation(req, res) {
  const parsed = schema.parse(req.body);
  const payload = {
    ...parsed,
    crop: parsed.cropType || parsed.crop
  };
  const simulation = await simulateProfit(req.user.id, payload);
  return sendSuccess(res, { simulation }, "Profit simulation generated.");
}
