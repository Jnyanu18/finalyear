import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { submitFarmOutcome } from "../controllers/outcomeController.js";

const router = Router();

router.use(authMiddleware);
router.post("/submit", asyncHandler(submitFarmOutcome));

export default router;
