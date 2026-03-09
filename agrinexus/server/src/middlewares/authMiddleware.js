import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";

export async function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, "Unauthorized: token required."));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("_id email").lean();
    if (!user) {
      return next(new ApiError(401, "Unauthorized: invalid token."));
    }
    req.user = { id: String(user._id), email: user.email };
    return next();
  } catch (_error) {
    return next(new ApiError(401, "Unauthorized: token verification failed."));
  }
}
