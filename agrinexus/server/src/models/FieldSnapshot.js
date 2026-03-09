import mongoose from "mongoose";

const fieldSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    fieldContext: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, default: "unknown" },
    capturedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: "field_snapshots"
  }
);

export const FieldSnapshot = mongoose.model("FieldSnapshot", fieldSnapshotSchema);
