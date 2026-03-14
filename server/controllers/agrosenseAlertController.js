import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { acknowledgeAlert, listActiveAlerts } from "../services/agrosense/alertService.js";

export const listAlertsController = asyncHandler(async (_req, res) => {
  const alerts = await listActiveAlerts();
  return sendSuccess(res, { alerts }, "Alerts fetched");
});

export const acknowledgeAlertController = asyncHandler(async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  return sendSuccess(res, { alert }, "Alert acknowledged");
});
