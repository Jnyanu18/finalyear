import { z } from "zod";
import { recommendIrrigation } from "../services/irrigationService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  soilMoisture: z.number().min(0).max(100),
  rainForecastMm: z.number().min(0).default(0),
  cropStage: z.string().default("vegetative")
});

export async function irrigationRecommendation(req, res) {
  const payload = schema.parse(req.body);
  const recommendation = await recommendIrrigation(req.user.id, payload);
  return sendSuccess(res, { recommendation }, "Irrigation recommendation generated.");
}
