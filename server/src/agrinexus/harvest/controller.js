import { z } from "zod";
import { planHarvest } from "../../services/harvestService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

const schema = z.object({
    fruitCount: z.number().nonnegative(),
    ripeRatio: z.number().min(0).max(1),
    avgFruitWeightKg: z.number().positive().default(0.09)
});

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const body = req.body;
        const payload = schema.parse(body);

        const plan = await planHarvest(user.userId, payload);

        res.json({ success: true, data: { plan } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
