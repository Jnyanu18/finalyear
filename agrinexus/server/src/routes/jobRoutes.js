import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createJob, getJob, getJobs } from "../controllers/jobController.js";

const router = Router();

router.use(authMiddleware);
router.post("/", asyncHandler(createJob));
router.get("/", asyncHandler(getJobs));
router.get("/:jobId", asyncHandler(getJob));

export default router;
