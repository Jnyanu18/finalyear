import { AsyncJob } from "../models/AsyncJob.js";
import { analyzePlantImage } from "./cropAnalysisService.js";
import { advisorChat } from "./advisorService.js";

const JOB_HANDLERS = {
  analysis_plant: async (userId, payload) => {
    const analysis = await analyzePlantImage(userId, payload || {});
    return { analysis };
  },
  advisor_chat: async (userId, payload) => {
    const query = String(payload?.query || "").trim();
    if (!query) {
      throw new Error("query is required for advisor_chat job");
    }
    const result = await advisorChat(userId, query);
    return { reply: result.reply, context: result.context };
  }
};

async function processJob(jobId) {
  const job = await AsyncJob.findById(jobId);
  if (!job) return;

  const handler = JOB_HANDLERS[job.type];
  if (!handler) {
    job.status = "failed";
    job.error = `Unsupported job type: ${job.type}`;
    job.completedAt = new Date();
    await job.save();
    return;
  }

  try {
    job.status = "running";
    job.startedAt = new Date();
    await job.save();

    const result = await handler(job.userId, job.payload || {});

    job.status = "completed";
    job.result = result;
    job.completedAt = new Date();
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.error = error?.message || "Job execution failed";
    job.completedAt = new Date();
    await job.save();
  }
}

export async function enqueueJob(userId, type, payload) {
  const job = await AsyncJob.create({
    userId,
    type,
    payload,
    status: "queued"
  });

  setImmediate(() => {
    processJob(job._id).catch(() => {});
  });

  return job.toObject();
}

export async function getJobById(userId, jobId) {
  return AsyncJob.findOne({ _id: jobId, userId }).lean();
}

export async function listRecentJobs(userId, limit = 20) {
  const bounded = Math.max(1, Math.min(100, Number(limit) || 20));
  return AsyncJob.find({ userId }).sort({ createdAt: -1 }).limit(bounded).lean();
}
