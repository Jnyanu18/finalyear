import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { login, logout, me, register } from "../controllers/authController.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(me));
router.post("/logout", authMiddleware, asyncHandler(logout));

export default router;
