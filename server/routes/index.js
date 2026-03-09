import { Router } from "express";
import authRoutes from "./authRoutes.js";
import profileRoutes from "./profileRoutes.js";
import analysisRoutes from "./analysisRoutes.js";
import predictionRoutes from "./predictionRoutes.js";
import irrigationRoutes from "./irrigationRoutes.js";
import harvestRoutes from "./harvestRoutes.js";
import storageRoutes from "./storageRoutes.js";
import marketRoutes from "./marketRoutes.js";
import profitRoutes from "./profitRoutes.js";
import outcomeRoutes from "./outcomeRoutes.js";
import advisorRoutes from "./advisorRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "AgriNexus API healthy",
    timestamp: new Date().toISOString()
  });
});

router.get("/docs", (_req, res) => {
  res.status(200).json({
    ok: true,
    version: "v1",
    endpoints: [
      "POST /api/v1/auth/register",
      "POST /api/v1/auth/login",
      "GET /api/v1/auth/me",
      "POST /api/v1/auth/logout",
      "GET /api/v1/profile",
      "PUT /api/v1/profile",
      "POST /api/v1/analysis/plant",
      "GET /api/v1/analysis/latest",
      "POST /api/v1/analysis/pipeline",
      "POST /api/v1/prediction/yield",
      "POST /api/v1/prediction/disease",
      "POST /api/v1/irrigation/recommend",
      "POST /api/v1/harvest/plan",
      "POST /api/v1/storage/advice",
      "POST /api/v1/market/best",
      "POST /api/v1/profit/simulate",
      "POST /api/v1/outcome/submit",
      "POST /api/v1/advisor/chat",
      "GET /api/v1/advisor/report"
    ]
  });
});

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/analysis", analysisRoutes);
router.use("/prediction", predictionRoutes);
router.use("/irrigation", irrigationRoutes);
router.use("/harvest", harvestRoutes);
router.use("/storage", storageRoutes);
router.use("/market", marketRoutes);
router.use("/profit", profitRoutes);
router.use("/outcome", outcomeRoutes);
router.use("/advisor", advisorRoutes);

export default router;
