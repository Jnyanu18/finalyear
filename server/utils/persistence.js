import mongoose from "mongoose";
import { randomUUID } from "crypto";

export function canUseMongoForUser(userId) {
  return mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(String(userId));
}

export function ephemeralDoc(userId, payload = {}) {
  const now = new Date().toISOString();
  return {
    _id: randomUUID(),
    userId: String(userId),
    createdAt: now,
    updatedAt: now,
    ...payload
  };
}

export async function safeCreate(model, userId, payload = {}) {
  if (!canUseMongoForUser(userId)) {
    return ephemeralDoc(userId, payload);
  }
  try {
    const doc = await model.create({ userId, ...payload });
    return doc.toObject();
  } catch (_error) {
    return ephemeralDoc(userId, payload);
  }
}

export async function safeFindOneLean(model, query = {}) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    return await model.findOne(query).lean();
  } catch (_error) {
    return null;
  }
}

