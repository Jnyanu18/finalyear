import { z } from "zod";
import { predictDiseaseRisk } from "../../services/diseasePredictionService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    cropType: z.string().default("Tomato"),
    cropStage: z.string().default("fruiting"),
    temperature: z.number(),
    humidity: z.number().min(0).max(100),
    regionalDiseaseDataset: z.string().optional()
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const prediction = await predictDiseaseRisk(user.userId, payload);

        res.json({ success: true, data: { prediction } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
