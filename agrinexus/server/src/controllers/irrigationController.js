import { z } from "zod";
import { recommendIrrigation } from "../services/irrigationService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  soilMoisture: z.number().min(0).max(100).optional(),
  rainForecastMm: z.number().min(0).default(0),
  et0Mm: z.number().min(0).optional(),
  rootZoneDepthM: z.number().positive().optional(),
  soilWaterHoldingMmPerM: z.number().positive().optional(),
  irrigationEfficiencyPct: z.number().min(0).max(100).optional(),
  acres: z.number().positive().optional(),
  cropStage: z.string().default("vegetative"),
  fieldContext: z.any().optional()
});

export async function irrigationRecommendation(req, res) {
  const payload = schema.parse(req.body);
  const recommendation = await recommendIrrigation(req.user.id, payload);
  return sendSuccess(res, { recommendation }, "Irrigation recommendation generated.");
}
