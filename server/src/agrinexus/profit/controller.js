import { z } from "zod";
import { simulateProfit } from "../../services/profitService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    crop: z.string().default("Tomato"),
    quantity: z.number().positive(),
    priceToday: z.number().positive(),
    price3Days: z.number().positive(),
    price5Days: z.number().positive(),
    holdingCost: z.number().nonnegative().default(120)
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const simulation = await simulateProfit(user.userId, payload);

        res.json({ success: true, data: { simulation } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
