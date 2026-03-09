import mongoose from "mongoose";

const profitSimulationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType: { type: String, required: true },
    quantity: { type: Number, required: true },
    scenarioToday: { type: Number, required: true },
    scenario3Days: { type: Number, required: true },
    scenario5Days: { type: Number, required: true },
    recommendedOption: { type: String, required: true },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "profit_model_v2" },
    confidence: { type: Number, default: 0.7 },
    missingInputs: { type: [String], default: [] },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    scenarios: { type: mongoose.Schema.Types.Mixed, default: {} },
    assumptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "profit_simulations"
  }
);

export const ProfitSimulation = mongoose.model("ProfitSimulation", profitSimulationSchema);
