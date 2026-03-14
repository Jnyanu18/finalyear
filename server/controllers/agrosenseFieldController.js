import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/ApiResponse.js";
import {
  getFieldForecast,
  getFieldIndices,
  getFieldInsights,
  getFieldMap,
  getFieldRisk,
  getLatestSensorReadings,
  getNodeSensorHistory,
  getSensorHistory,
  listRegisteredFields
} from "../services/agrosense/fieldService.js";
import { enqueueAnalysisJob } from "../jobs/agrosenseAnalysisQueue.js";

export const listFieldsController = asyncHandler(async (_req, res) => {
  const fields = await listRegisteredFields();
  return sendSuccess(res, { fields }, "Fields fetched");
});

export const getFieldMapController = asyncHandler(async (req, res) => {
  const map = await getFieldMap(req.params.id);
  return sendSuccess(res, map, "Field map fetched");
});

export const getFieldIndicesController = asyncHandler(async (req, res) => {
  const indices = await getFieldIndices(req.params.id);
  return sendSuccess(res, indices, "Field indices fetched");
});

export const getFieldSensorsController = asyncHandler(async (req, res) => {
  const sensors = await getLatestSensorReadings(req.params.id);
  return sendSuccess(res, sensors, "Sensor readings fetched");
});

export const getFieldSensorHistoryController = asyncHandler(async (req, res) => {
  const history = req.query.nodeId
    ? await getNodeSensorHistory(req.params.id, req.query.range || "24h", req.query.nodeId)
    : await getSensorHistory(req.params.id, req.query.range || "24h");
  return sendSuccess(res, history, "Sensor history fetched");
});

export const getFieldRiskController = asyncHandler(async (req, res) => {
  const risk = await getFieldRisk(req.params.id);
  return sendSuccess(res, risk, "Risk scores fetched");
});

export const getFieldForecastController = asyncHandler(async (req, res) => {
  const forecast = await getFieldForecast(req.params.id);
  return sendSuccess(res, forecast, "Forecast fetched");
});

export const getFieldInsightsController = asyncHandler(async (req, res) => {
  const insights = await getFieldInsights(req.params.id);
  return sendSuccess(res, insights, "Insights fetched");
});

export const triggerFieldAnalysisController = asyncHandler(async (req, res) => {
  const analysisRun = await enqueueAnalysisJob({
    fieldId: req.params.id,
    triggeredBy: req.user?.email || req.user?.id || "system"
  });
  return res.status(202).json({
    ok: true,
    message: "Analysis triggered",
    data: { analysisRun }
  });
});
