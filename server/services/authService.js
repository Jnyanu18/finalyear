import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { createLocalUser, findLocalUserByEmail, findLocalUserById } from "../utils/localAuthStore.js";

function buildToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

function dbReady() {
  return mongoose.connection.readyState === 1;
}

export async function registerUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!dbReady()) {
    const existsLocal = await findLocalUserByEmail(normalizedEmail);
    if (existsLocal) {
      throw new ApiError(409, "Email already registered.");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createLocalUser({ email: normalizedEmail, passwordHash });
    const token = buildToken(String(user.id));
    return { token, user: { id: String(user.id), email: user.email } };
  }

  try {
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const existsLocal = await findLocalUserByEmail(normalizedEmail);
    if (existsLocal) {
      throw new ApiError(409, "Email already registered.");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createLocalUser({ email: normalizedEmail, passwordHash });
    const token = buildToken(String(user.id));
    return { token, user: { id: String(user.id), email: user.email } };
  }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!dbReady()) {
    const user = await findLocalUserByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new ApiError(401, "Invalid email or password.");
    }
    const token = buildToken(String(user.id));
    return { token, user: { id: String(user.id), email: user.email } };
  }

  try {
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const user = await findLocalUserByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new ApiError(401, "Invalid email or password.");
    }
    const token = buildToken(String(user.id));
    return { token, user: { id: String(user.id), email: user.email } };
  }
}

export async function getCurrentUser(userId) {
  if (!dbReady()) {
    const localUser = await findLocalUserById(userId);
    if (!localUser) {
      throw new ApiError(404, "User not found.");
    }
    return { id: String(localUser.id), email: localUser.email };
  }

  try {
    const user = await User.findById(userId).select("_id email").lean();
    if (!user) {
      throw new ApiError(404, "User not found.");
    }
    return { id: String(user._id), email: user.email };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const localUser = await findLocalUserById(userId);
    if (!localUser) {
      throw new ApiError(404, "User not found.");
    }
    return { id: String(localUser.id), email: localUser.email };
  }
}
