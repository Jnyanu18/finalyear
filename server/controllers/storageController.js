import { z } from "zod";
import { storageAdvice } from "../services/storageService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  storageConditions: z.string().optional(),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  ventilationScore: z.number().min(0).max(1).default(0.7)
});

export async function storageRecommendation(req, res) {
  const payload = schema.parse(req.body);
  const advice = await storageAdvice(req.user.id, payload);
  return sendSuccess(res, { advice }, "Storage advice generated.");
}
