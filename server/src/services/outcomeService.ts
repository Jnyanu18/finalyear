import { FarmOutcome } from "../models/FarmOutcome.js";
import { FarmIntelligence } from "../models/FarmIntelligence.js";

function safePercentAccuracy(predicted, actual) {
  if (predicted <= 0 && actual <= 0) return 1;
  if (predicted <= 0) return 0;
  const error = Math.abs(predicted - actual) / predicted;
  return Math.max(0, 1 - error);
}

export async function submitOutcome(userId, input) {
  const predictedYield = Number(input.predictedYield);
  const actualYield = Number(input.actualYield);
  const predictedPrice = Number(input.predictedPrice);
  const actualPrice = Number(input.actualPrice);

  const yieldDifference = Number((actualYield - predictedYield).toFixed(2));
  const priceDifference = Number((actualPrice - predictedPrice).toFixed(2));
  const predictionAccuracy = Number(
    ((safePercentAccuracy(predictedYield, actualYield) + safePercentAccuracy(predictedPrice, actualPrice)) / 2).toFixed(2)
  );

  const outcome = await FarmOutcome.create({
    userId,
    crop: input.crop,
    predictedYield,
    actualYield,
    predictedPrice,
    actualPrice,
    harvestDate: new Date(input.harvestDate),
    yieldDifference,
    priceDifference,
    predictionAccuracy
  });

  const current = await FarmIntelligence.findOne({ userId });
  if (!current) {
    await FarmIntelligence.create({
      userId,
      averageYieldError: yieldDifference,
      averagePriceError: priceDifference,
      predictionConfidence: predictionAccuracy,
      sampleCount: 1
    });
  } else {
    const nextSampleCount = current.sampleCount + 1;
    const averageYieldError =
      (current.averageYieldError * current.sampleCount + yieldDifference) / nextSampleCount;
    const averagePriceError =
      (current.averagePriceError * current.sampleCount + priceDifference) / nextSampleCount;
    const predictionConfidence =
      (current.predictionConfidence * current.sampleCount + predictionAccuracy) / nextSampleCount;

    current.averageYieldError = Number(averageYieldError.toFixed(2));
    current.averagePriceError = Number(averagePriceError.toFixed(2));
    current.predictionConfidence = Number(predictionConfidence.toFixed(2));
    current.sampleCount = nextSampleCount;
    await current.save();
  }

  return outcome.toObject();
}

export async function getFarmIntelligence(userId) {
  return FarmIntelligence.findOne({ userId }).lean();
}
