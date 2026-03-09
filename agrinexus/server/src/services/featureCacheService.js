import crypto from "crypto";
import { FeatureCache } from "../models/FeatureCache.js";

export function cacheKey(parts = []) {
  const joined = parts.join("|");
  const digest = crypto.createHash("sha256").update(joined).digest("hex");
  return `fc_${digest}`;
}

export async function getCachedFeature(key) {
  const doc = await FeatureCache.findOne({ key }).lean();
  if (!doc) return null;
  if (new Date(doc.expiresAt).getTime() <= Date.now()) {
    await FeatureCache.deleteOne({ key });
    return null;
  }
  return doc.value;
}

export async function setCachedFeature(key, value, ttlSeconds, meta = {}) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await FeatureCache.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        value,
        expiresAt,
        meta
      }
    },
    { upsert: true, new: true }
  );
  return value;
}
