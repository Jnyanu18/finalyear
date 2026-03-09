import { z } from "zod";
import { predictYield } from "../../services/yieldPredictionService.js";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    cropType: z.string().default("Tomato"),
    cropStage: z.string().default("fruiting"),
    fruitCount: z.number().nonnegative(),
    avgFruitWeightKg: z.number().positive().optional(),
    historicalYieldFactor: z.number().positive().optional(),
    weatherScore: z.number().positive().optional(),
    weatherForecast: z.object({
        temperature: z.number().optional(),
        rainfall: z.number().optional()
    }).optional()
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const prediction = await predictYield(user.userId, payload);

        res.json({ success: true, data: { prediction } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
