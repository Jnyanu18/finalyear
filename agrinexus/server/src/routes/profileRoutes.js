import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProfile, putProfile } from "../controllers/profileController.js";

const router = Router();

router.use(authMiddleware);
router.get("/", asyncHandler(getProfile));
router.put("/", asyncHandler(putProfile));

export default router;
