import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyzePlant, latestAnalysis, runPipeline } from "../controllers/cropController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.post("/plant", upload.single("image"), asyncHandler(analyzePlant));
router.get("/latest", asyncHandler(latestAnalysis));
router.post("/pipeline", asyncHandler(runPipeline));

export default router;
