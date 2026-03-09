import { z } from "zod";
import { analyzePlantImage, getLatestCropAnalysis } from "../services/cropAnalysisService.js";
import { runDecisionPipeline } from "../services/decisionPipelineService.js";
import { getLatestFieldSnapshot } from "../services/fieldContextService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const bodySchema = z.object({
  imageData: z.string().optional(),
  imageUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  cropTypeHint: z.string().optional(),
  estimatedFruitCount: z.number().optional(),
  fieldContext: z.any().optional()
});

const pipelineSchema = z.object({
  cropType: z.string().optional(),
  cropStage: z.string().optional(),
  acres: z.number().positive().optional(),
  plantsPerAcre: z.number().positive().optional(),
  fruitsPerPlant: z.number().nonnegative().optional(),
  avgFruitWeightKg: z.number().positive().optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  marketLocation: z.string().optional(),
  fieldContext: z.any().optional()
});

export async function analyzePlant(req, res) {
  const parsed = bodySchema.safeParse(req.body || {});
  const body = parsed.success ? parsed.data : {};

  let imageData = body.imageData;
  let mimeType = body.mimeType || "image/jpeg";

  if (!imageData && req.file?.buffer) {
    imageData = req.file.buffer.toString("base64");
    mimeType = req.file.mimetype || mimeType;
  }

  const analysis = await analyzePlantImage(req.user.id, {
    ...body,
    imageData,
    mimeType
  });

  return sendSuccess(res, { analysis }, "Crop analysis complete.");
}

export async function latestAnalysis(req, res) {
  const analysis = await getLatestCropAnalysis(req.user.id);
  const snapshot = await getLatestFieldSnapshot(req.user.id);
  return sendSuccess(res, { analysis, fieldSnapshot: snapshot || null }, "Latest analysis fetched.");
}

export async function runPipeline(req, res) {
  const payload = pipelineSchema.parse(req.body || {});
  const result = await runDecisionPipeline(req.user.id, payload);
  return sendSuccess(res, { pipeline: result }, "Decision pipeline executed.");
}
