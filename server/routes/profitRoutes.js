import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { profitSimulation } from "../controllers/profitController.js";

const router = Router();

router.use(authMiddleware);
router.post("/simulate", asyncHandler(profitSimulation));

export default router;
