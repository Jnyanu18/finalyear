import { z } from "zod";
import { submitOutcome, getFarmIntelligence } from "../services/outcomeService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const schema = z.object({
  crop: z.string(),
  predictedYield: z.number().nonnegative(),
  actualYield: z.number().nonnegative(),
  predictedPrice: z.number().nonnegative(),
  actualPrice: z.number().nonnegative(),
  harvestDate: z.string()
});

export async function submitFarmOutcome(req, res) {
  const payload = schema.parse(req.body);
  const outcome = await submitOutcome(req.user.id, payload);
  const intelligence = await getFarmIntelligence(req.user.id);
  return sendSuccess(res, { outcome, intelligence }, "Outcome saved and learning updated.");
}
