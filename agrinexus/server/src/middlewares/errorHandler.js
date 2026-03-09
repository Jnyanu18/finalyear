import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  if (err?.name === "ZodError") {
    return res.status(400).json({
      ok: false,
      message: "Validation failed.",
      details: err.flatten ? err.flatten() : err.errors
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR]", err);
  }

  return res.status(statusCode).json({
    ok: false,
    message,
    details: err.details || null
  });
}
