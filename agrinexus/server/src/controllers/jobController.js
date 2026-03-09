import { z } from "zod";
import { enqueueJob, getJobById, listRecentJobs } from "../services/jobService.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const createSchema = z.object({
  type: z.enum(["analysis_plant", "advisor_chat"]),
  payload: z.record(z.any()).optional()
});

export async function createJob(req, res) {
  const { type, payload } = createSchema.parse(req.body || {});
  const job = await enqueueJob(req.user.id, type, payload || {});
  return sendSuccess(
    res,
    {
      jobId: String(job._id),
      status: job.status,
      type: job.type,
      queuedAt: job.createdAt
    },
    "Job queued. Poll /api/v1/jobs/:jobId for completion."
  );
}

export async function getJob(req, res) {
  const { jobId } = req.params;
  const job = await getJobById(req.user.id, jobId);
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  return sendSuccess(res, { job }, "Job fetched.");
}

export async function getJobs(req, res) {
  const limit = req.query.limit;
  const jobs = await listRecentJobs(req.user.id, limit);
  return sendSuccess(res, { jobs }, "Recent jobs fetched.");
}
