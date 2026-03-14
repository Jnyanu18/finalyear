import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { agrosenseRateLimit } from "../middlewares/agrosenseRateLimit.js";
import { getModelStatusController } from "../controllers/agrosenseModelController.js";

const router = Router();
router.use(authMiddleware, agrosenseRateLimit);

/**
 * @route GET /api/v1/models/status
 * @description Return model accuracy, last trained, and sample count details.
 */
router.get("/models/status", getModelStatusController);

export default router;
