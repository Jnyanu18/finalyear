import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { yieldPrediction } from "../controllers/yieldController.js";
import { diseasePrediction } from "../controllers/diseaseController.js";

const router = Router();

router.use(authMiddleware);
router.post("/yield", asyncHandler(yieldPrediction));
router.post("/disease", asyncHandler(diseasePrediction));

export default router;
