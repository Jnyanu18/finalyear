import { z } from "zod";
import { bestMarketRoute } from "../services/marketService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string().default("Tomato"),
  quantity: z.number().positive(),
  farmerLocation: z.string().optional(),
  localDistanceAdjust: z.number().optional(),
  marketRatesCapturedAt: z.string().datetime().optional()
});

export async function bestMarket(req, res) {
  const payload = schema.parse(req.body);
  const market = await bestMarketRoute(req.user.id, payload);
  return sendSuccess(res, { market }, "Best market identified.");
}
