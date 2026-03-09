import { z } from "zod";
import { storageAdvice } from "../../services/storageService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    cropType: z.string().default("Tomato"),
    storageConditions: z.string().optional(),
    temperature: z.number(),
    humidity: z.number().min(0).max(100),
    ventilationScore: z.number().min(0).max(1).default(0.7)
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const advice = await storageAdvice(user.userId, payload);

        res.json({ success: true, data: { advice } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
