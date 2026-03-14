import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { getModelStatus } from "../services/agrosense/modelService.js";

export const getModelStatusController = asyncHandler(async (_req, res) => {
  const status = await getModelStatus();
  return sendSuccess(res, status, "Model status fetched");
});
