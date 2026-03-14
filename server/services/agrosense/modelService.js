import { listModelVersions } from "./runtimeState.js";
import { getQueueSnapshot } from "../../jobs/agrosenseAnalysisQueue.js";

export async function getModelStatus() {
  return {
    queue: getQueueSnapshot(),
    models: listModelVersions()
  };
}
