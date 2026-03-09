import { z } from "zod";
import { analyzePlantImage } from "../services/cropAnalysisService.js";

const bodySchema = z.object({
    imageData: z.string().optional(),
    imageUrl: z.string().url().optional(),
    mimeType: z.string().optional(),
    cropTypeHint: z.string().optional(),
    estimatedFruitCount: z.number().optional()
});

// @desc    Analyze a crop image using AI
// @route   POST /api/agrinexus/crop
// @access  Private
export const analyzeCrop = async (req, res) => {
    try {
        const parsed = bodySchema.safeParse(req.body);
        const body = parsed.success ? parsed.data : {};

        const analysis = await analyzePlantImage(req.user._id, body);

        res.json({ success: true, data: { analysis } });
    } catch (error) {
        console.error("Crop analysis error:", error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};
