import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { agrosenseRateLimit } from "../middlewares/agrosenseRateLimit.js";
import { getFieldReportController } from "../controllers/agrosenseReportController.js";

const router = Router();
router.use(authMiddleware, agrosenseRateLimit);

/**
 * @route GET /api/v1/reports/:fieldId
 * @description Generate and return a field report payload with a downloadable artifact URL.
 */
router.get("/reports/:fieldId", getFieldReportController);

export default router;
