import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const ANONYMOUS_USER_ID = "000000000000000000000000";

export async function authMiddleware(req, _res, next) {
  let token = null;

  if (req.cookies && req.cookies.agrivision_session) {
    token = req.cookies.agrivision_session;
  } else {
    const authHeader = req.headers.authorization || "";
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  }

  if (!token) {
    // Allow unauthenticated requests with a fallback anonymous user
    req.user = { id: ANONYMOUS_USER_ID, email: "guest@agrinexus.local" };
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("_id email").lean();
    if (user) {
      req.user = { id: String(user._id), email: user.email };
    } else {
      req.user = { id: ANONYMOUS_USER_ID, email: "guest@agrinexus.local" };
    }
    return next();
  } catch (_error) {
    // Invalid or expired token – fall back to anonymous rather than blocking
    req.user = { id: ANONYMOUS_USER_ID, email: "guest@agrinexus.local" };
    return next();
  }
}

// Strict version – only for account-sensitive endpoints like profile
export async function requireAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.agrivision_session) {
    token = req.cookies.agrivision_session;
  } else {
    const authHeader = req.headers.authorization || "";
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized: please log in." });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("_id email").lean();
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized: user not found." });
    }
    req.user = { id: String(user._id), email: user.email };
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, error: "Unauthorized: session expired. Please log in again." });
  }
}
