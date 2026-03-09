import mongoose from "mongoose";

const diseasePredictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType: { type: String, default: "Tomato" },
    disease: { type: String, required: true },
    riskProbability: { type: Number, required: true },
    riskLevel: { type: String, required: true },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "disease_model_v2" },
    confidence: { type: Number, default: 0.7 },
    missingInputs: { type: [String], default: [] },
    staleInputs: { type: [String], default: [] },
    channels: { type: mongoose.Schema.Types.Mixed, default: {} },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    explanation: { type: String, default: "" },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "disease_predictions"
  }
);

export const DiseasePrediction = mongoose.model("DiseasePrediction", diseasePredictionSchema);
