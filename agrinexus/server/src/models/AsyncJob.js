import mongoose from "mongoose";

const asyncJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, index: true },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued", index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    collection: "async_jobs"
  }
);

export const AsyncJob = mongoose.model("AsyncJob", asyncJobSchema);
