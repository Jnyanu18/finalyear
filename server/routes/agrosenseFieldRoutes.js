import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { agrosenseRateLimit } from "../middlewares/agrosenseRateLimit.js";
import {
  getFieldForecastController,
  getFieldIndicesController,
  getFieldInsightsController,
  getFieldMapController,
  getFieldRiskController,
  getFieldSensorHistoryController,
  getFieldSensorsController,
  listFieldsController,
  triggerFieldAnalysisController
} from "../controllers/agrosenseFieldController.js";

const router = Router();
router.use(authMiddleware, agrosenseRateLimit);

/**
 * @route GET /api/v1/fields
 * @description List all registered fields.
 */
router.get("/fields", listFieldsController);

/**
 * @route GET /api/v1/fields/:id/map
 * @description Return the current NDVI zone map as GeoJSON.
 */
router.get("/fields/:id/map", getFieldMapController);

/**
 * @route GET /api/v1/fields/:id/indices
 * @description Return current vegetation and soil index values.
 */
router.get("/fields/:id/indices", getFieldIndicesController);

/**
 * @route GET /api/v1/fields/:id/sensors
 * @description Return the latest sensor readings for all nodes in a field.
 */
router.get("/fields/:id/sensors", getFieldSensorsController);

/**
 * @route GET /api/v1/fields/:id/sensors/history
 * @description Return sensor time-series data for the requested range.
 */
router.get("/fields/:id/sensors/history", getFieldSensorHistoryController);

/**
 * @route GET /api/v1/fields/:id/risk
 * @description Return pest and disease risk scores per zone.
 */
router.get("/fields/:id/risk", getFieldRiskController);

/**
 * @route GET /api/v1/fields/:id/forecast
 * @description Return the seven-day vegetation forecast.
 */
router.get("/fields/:id/forecast", getFieldForecastController);

/**
 * @route GET /api/v1/fields/:id/insights
 * @description Return AI-generated actionable recommendations.
 */
router.get("/fields/:id/insights", getFieldInsightsController);

/**
 * @route POST /api/v1/fields/:id/analyze
 * @description Trigger a manual analysis run.
 */
router.post("/fields/:id/analyze", triggerFieldAnalysisController);

export default router;
