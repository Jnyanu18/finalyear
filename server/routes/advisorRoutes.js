import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chat, report } from "../controllers/advisorController.js";

const router = Router();

router.use(authMiddleware);
router.post("/chat", asyncHandler(chat));
router.get("/report", asyncHandler(report));

export default router;
