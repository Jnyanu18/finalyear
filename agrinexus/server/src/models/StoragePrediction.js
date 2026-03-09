import mongoose from "mongoose";

const storagePredictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType: { type: String, required: true },
    safeStorageDays: { type: Number, required: true },
    recommendation: { type: String, required: true },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "storage_predictions"
  }
);

export const StoragePrediction = mongoose.model("StoragePrediction", storagePredictionSchema);
