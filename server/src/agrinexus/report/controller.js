import { z } from "zod";
import { getLatestCropAnalysis } from "../../services/cropAnalysisService";
import { getUserSession } from "@/lib/auth-server";`nfrom "@/lib/dbConnect";

export const handleRequest = async (req, res) => {
    try {
        await dbConnect();
        const user = req.user; // Set by protect middleware);
        }

        const report = await getLatestCropAnalysis(user.userId);

        res.json({ success: true, data: { report } });
    } catch (error: any) {
        res.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
