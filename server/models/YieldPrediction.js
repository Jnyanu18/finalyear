import mongoose from "mongoose";

const yieldPredictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType: { type: String, default: "Tomato" },
    predictedYieldToday: { type: Number, required: true },
    predictedYield3Days: { type: Number, required: true },
    predictedYield7Days: { type: Number, required: true },
    confidence: { type: Number, required: true },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "yield_model_v2" },
    missingInputs: { type: [String], default: [] },
    staleInputs: { type: [String], default: [] },
    scenarios: { type: mongoose.Schema.Types.Mixed, default: {} },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    explanation: { type: String, default: "" },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "yield_predictions"
  }
);

export const YieldPrediction = mongoose.model("YieldPrediction", yieldPredictionSchema);
