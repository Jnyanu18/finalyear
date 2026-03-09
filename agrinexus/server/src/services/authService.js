import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

function buildToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

export async function registerUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail }).lean();
  if (exists) {
    throw new ApiError(409, "Email already registered.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash
  });

  const token = buildToken(String(user._id));
  return {
    token,
    user: { id: String(user._id), email: user.email }
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = buildToken(String(user._id));
  return {
    token,
    user: { id: String(user._id), email: user.email }
  };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select("_id email").lean();
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return { id: String(user._id), email: user.email };
}
