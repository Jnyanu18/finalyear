import mongoose from "mongoose";

const farmIntelligenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    averageYieldError: { type: Number, default: 0 },
    averagePriceError: { type: Number, default: 0 },
    predictionConfidence: { type: Number, default: 0.8 },
    sampleCount: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: "farm_intelligence"
  }
);

export const FarmIntelligence = mongoose.model("FarmIntelligence", farmIntelligenceSchema);
