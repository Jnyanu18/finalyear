import { z } from "zod";
import { bestMarketRoute } from "../../services/marketService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    crop: z.string().default("Tomato"),
    quantity: z.number().positive(),
    farmerLocation: z.string().optional(),
    localDistanceAdjust: z.number().optional()
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const market = await bestMarketRoute(user.userId, payload);

        res.json({ success: true, data: { market } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
