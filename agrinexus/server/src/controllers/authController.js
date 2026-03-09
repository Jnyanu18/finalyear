import { z } from "zod";
import { registerUser, loginUser, getCurrentUser } from "../services/authService.js";
import { sendCreated, sendSuccess } from "../utils/ApiResponse.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function register(req, res) {
  const body = credentialsSchema.parse(req.body);
  const result = await registerUser(body);
  return sendCreated(res, result, "User registered successfully.");
}

export async function login(req, res) {
  const body = credentialsSchema.parse(req.body);
  const result = await loginUser(body);
  return sendSuccess(res, result, "Login successful.");
}

export async function me(req, res) {
  const user = await getCurrentUser(req.user.id);
  return sendSuccess(res, { user }, "Session valid.");
}

export async function logout(_req, res) {
  return sendSuccess(res, {}, "Logout successful.");
}
