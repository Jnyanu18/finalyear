import Bull from "bull";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
import { logger } from "../services/agrosense/logger.js";
import { createQueuedRun, persistAnalysisOutcome } from "../services/agrosense/fieldService.js";
import { runAgroSensePipeline } from "../services/agrosense/matlabBridgeService.js";
import { evaluateAndPublishAlerts } from "../services/agrosense/alertService.js";
import { broadcastFieldUpdate } from "../websocket/agrosenseSensorStream.js";

let analysisQueue = null;
let queueReady = false;

async function processAnalysisJob(payload) {
  const outcome = await runAgroSensePipeline(payload.fieldId);
  const persisted = await persistAnalysisOutcome({
    fieldId: payload.fieldId,
    runId: payload.runId,
    triggeredBy: payload.triggeredBy,
    outcome,
    jobId: payload.jobId || null
  });
  const alerts = await evaluateAndPublishAlerts({
    previousField: persisted.previousField,
    nextField: persisted.nextField
  });

  broadcastFieldUpdate(payload.fieldId, {
    type: "analysis_completed",
    timestamp: new Date().toISOString(),
    overview: persisted.nextField.overview,
    alerts
  });

  return {
    analysisRun: persisted.analysisRun,
    alerts,
    summary: outcome.resultSummary
  };
}

function ensureQueue() {
  if (!env.redisUrl || analysisQueue) {
    return analysisQueue;
  }

  analysisQueue = new Bull("agrosense-analysis", env.redisUrl, {
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 30,
      removeOnFail: 30
    }
  });

  analysisQueue.process(async (job) => {
    queueReady = true;
    return processAnalysisJob({
      ...job.data,
      jobId: String(job.id)
    });
  });

  analysisQueue.on("error", (error) => {
    logger.warn("analysis_queue_error", { error: error.message });
  });

  return analysisQueue;
}

export async function enqueueAnalysisJob({ fieldId, triggeredBy }) {
  const queue = ensureQueue();
  const queuedRun = createQueuedRun(fieldId, triggeredBy, null);

  if (!queue) {
    const result = await processAnalysisJob({
      fieldId,
      triggeredBy,
      runId: queuedRun.id,
      jobId: `inline-${randomUUID()}`
    });
    return {
      ...result.analysisRun,
      queueMode: "inline"
    };
  }

  const job = await queue.add({
    fieldId,
    triggeredBy,
    runId: queuedRun.id
  });

  return {
    ...queuedRun,
    jobId: String(job.id),
    queueMode: "redis"
  };
}

export function getQueueSnapshot() {
  return {
    enabled: Boolean(env.redisUrl),
    connected: queueReady,
    mode: env.redisUrl ? "redis" : "inline"
  };
}
