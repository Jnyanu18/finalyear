import mongoose from "mongoose";

const cropAnalysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageUrl: { type: String, default: "" },
    cropType: { type: String, required: true },
    growthStage: { type: String, default: "unknown" },
    fruitCount: { type: Number, default: 0 },
    healthStatus: { type: String, default: "unknown" },
    healthScore: { type: Number, default: 0 },
    stages: [
      {
        stage: { type: String, required: true },
        count: { type: Number, required: true }
      }
    ],
    summary: { type: String, default: "" },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "crop_analyses"
  }
);

export const CropAnalysis = mongoose.model("CropAnalysis", cropAnalysisSchema);
