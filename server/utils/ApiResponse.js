export function sendSuccess(res, data = {}, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    message,
    data
  });
}

export function sendCreated(res, data = {}, message = "Created") {
  return sendSuccess(res, data, message, 201);
}
