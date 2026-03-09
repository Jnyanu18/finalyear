import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bestMarket } from "../controllers/marketController.js";

const router = Router();

router.use(authMiddleware);
router.post("/best", asyncHandler(bestMarket));

export default router;
