import mongoose from "mongoose";

const fieldSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    cropAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: "CropAnalysis", default: null },
    fieldContext: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, default: "monitor" },
    capturedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: "field_snapshots"
  }
);

export const FieldSnapshot = mongoose.model("FieldSnapshot", fieldSnapshotSchema);
