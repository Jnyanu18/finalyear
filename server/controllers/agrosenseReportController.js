import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { generateFieldReport } from "../services/agrosense/reportService.js";

export const getFieldReportController = asyncHandler(async (req, res) => {
  const report = await generateFieldReport(req.params.fieldId, {
    generatedBy: req.user?.email || req.user?.id || "system",
    dateRangeStart: req.query.start,
    dateRangeEnd: req.query.end
  });
  return sendSuccess(res, { report }, "Report generated");
});
