import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { irrigationRecommendation } from "../controllers/irrigationController.js";

const router = Router();

router.use(authMiddleware);
router.post("/recommend", asyncHandler(irrigationRecommendation));

export default router;
