import { z } from "zod";
import { predictDiseaseRisk } from "../services/diseasePredictionService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  cropType: z.string().default("Tomato"),
  cropStage: z.string().default("fruiting"),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  regionalDiseaseDataset: z.string().optional()
});

export async function diseasePrediction(req, res) {
  const payload = schema.parse(req.body);
  const prediction = await predictDiseaseRisk(req.user.id, payload);
  return sendSuccess(res, { prediction }, "Disease forecast generated.");
}
