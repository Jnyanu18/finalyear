import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { harvestPlan } from "../controllers/harvestController.js";

const router = Router();

router.use(authMiddleware);
router.post("/plan", asyncHandler(harvestPlan));

export default router;
