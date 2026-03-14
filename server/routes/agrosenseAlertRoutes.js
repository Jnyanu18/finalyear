import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { agrosenseRateLimit } from "../middlewares/agrosenseRateLimit.js";
import {
  acknowledgeAlertController,
  listAlertsController
} from "../controllers/agrosenseAlertController.js";

const router = Router();
router.use(authMiddleware, agrosenseRateLimit);

/**
 * @route GET /api/v1/alerts
 * @description Return active alerts sorted by severity.
 */
router.get("/alerts", listAlertsController);

/**
 * @route POST /api/v1/alerts/:id/acknowledge
 * @description Mark an alert as acknowledged.
 */
router.post("/alerts/:id/acknowledge", acknowledgeAlertController);

export default router;
