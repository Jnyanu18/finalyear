import { z } from "zod";
import { bestMarketRoute } from "../services/marketService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string().default("Tomato"),
  cropType: z.string().optional(),
  quantity: z.number().positive(),
  farmerLocation: z.string().optional(),
  localDistanceAdjust: z.number().optional(),
  marketRatesCapturedAt: z.string().datetime().optional(),
  referencePricePerKg: z.number().positive().optional(),
  fieldContext: z.any().optional()
});

export async function bestMarket(req, res) {
  const parsed = schema.parse(req.body);
  const payload = {
    ...parsed,
    crop: parsed.cropType || parsed.crop
  };
  const market = await bestMarketRoute(req.user.id, payload);
  return sendSuccess(res, { market }, "Best market identified.");
}
