import { z } from "zod";
import { advisorChat, reportSummary } from "../services/advisorService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const chatSchema = z.object({
  query: z.string().min(2)
});

export async function chat(req, res) {
  const { query } = chatSchema.parse(req.body);
  const result = await advisorChat(req.user.id, query);
  return sendSuccess(res, { reply: result.reply, context: result.context }, "Advisor response generated.");
}

export async function report(req, res) {
  const summary = await reportSummary(req.user.id);
  return sendSuccess(res, { summary }, "Report summary fetched.");
}
