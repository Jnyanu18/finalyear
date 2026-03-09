import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { storageRecommendation } from "../controllers/storageController.js";

const router = Router();

router.use(authMiddleware);
router.post("/advice", asyncHandler(storageRecommendation));

export default router;
