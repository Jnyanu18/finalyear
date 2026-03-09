import mongoose from "mongoose";

const irrigationRecommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recommendation: { type: String, required: true },
    reason: { type: String, required: true },
    nextReviewHours: { type: Number, default: 24 },
    litersPerAcre: { type: Number, default: 0 },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "irrigation_model_v2" },
    confidence: { type: Number, default: 0.7 },
    missingInputs: { type: [String], default: [] },
    staleInputs: { type: [String], default: [] },
    waterBalance: { type: mongoose.Schema.Types.Mixed, default: {} },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "irrigation_recommendations"
  }
);

export const IrrigationRecommendation = mongoose.model(
  "IrrigationRecommendation",
  irrigationRecommendationSchema
);
