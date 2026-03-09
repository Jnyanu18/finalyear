import mongoose from "mongoose";

const featureCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "feature_cache"
  }
);

featureCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const FeatureCache = mongoose.model("FeatureCache", featureCacheSchema);
