import mongoose from "mongoose";

const marketOptionSchema = new mongoose.Schema(
  {
    market: String,
    expectedPrice: Number,
    transportCost: Number,
    distanceKm: Number,
    netProfit: Number
  },
  { _id: false }
);

const marketPredictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType: { type: String, required: true },
    quantity: { type: Number, required: true },
    bestMarket: { type: String, required: true },
    expectedPrice: { type: Number, required: true },
    transportCost: { type: Number, required: true },
    netProfit: { type: Number, required: true },
    status: { type: String, default: "ok" },
    modelVersion: { type: String, default: "market_model_v2" },
    confidence: { type: Number, default: 0.7 },
    missingInputs: { type: [String], default: [] },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    scenarios: { type: mongoose.Schema.Types.Mixed, default: {} },
    options: { type: [marketOptionSchema], default: [] },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: "market_predictions"
  }
);

export const MarketPrediction = mongoose.model("MarketPrediction", marketPredictionSchema);
