import { z } from "zod";
import { analyzePlantImage } from "../services/cropAnalysisService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const bodySchema = z.object({
  imageData: z.string().optional(),
  imageUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  cropTypeHint: z.string().optional(),
  estimatedFruitCount: z.number().optional()
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
