import mongoose from "mongoose";

const farmOutcomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    crop: { type: String, required: true },
    predictedYield: { type: Number, required: true },
    actualYield: { type: Number, required: true },
    predictedPrice: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    harvestDate: { type: Date, required: true },
    predictionError: { type: Number, required: true },
    priceError: { type: Number, required: true },
    yieldDifference: { type: Number, required: true },
    priceDifference: { type: Number, required: true },
    predictionAccuracy: { type: Number, required: true }
  },
  {
    timestamps: true,
    collection: "farm_outcomes"
  }
);

export const FarmOutcome = mongoose.model("FarmOutcome", farmOutcomeSchema);
