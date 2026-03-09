import { Router } from "express";
import { getMetricsSnapshot } from "../utils/observability.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const router = Router();

router.get("/metrics", (_req, res) => {
  const metrics = getMetricsSnapshot();
  return sendSuccess(res, { metrics }, "System metrics fetched.");
});

export default router;
