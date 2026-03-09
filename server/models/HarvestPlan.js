import mongoose from "mongoose";

const harvestPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    readyToday: { type: Number, required: true },
    ready3Days: { type: Number, required: true },
    recommendedHarvestWindow: { type: String, required: true },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "harvest_model_v2" },
    confidence: { type: Number, default: 0.7 },
    missingInputs: { type: [String], default: [] },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    scenarios: { type: mongoose.Schema.Types.Mixed, default: {} },
    harvestPlanDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "harvest_plans"
  }
);

export const HarvestPlan = mongoose.model("HarvestPlan", harvestPlanSchema);
