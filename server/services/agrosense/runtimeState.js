import { randomUUID } from "crypto";
import { createAgroSenseSeed } from "../../data/agrosenseSeed.js";

const state = createAgroSenseSeed();
const clone = (value) => structuredClone(value);

export function listFields() {
  return clone(state.fields);
}

export function getFieldRecord(fieldId) {
  const field = state.fields.find((candidate) => candidate.id === fieldId);
  return field ? clone(field) : null;
}

export function replaceFieldRecord(fieldId, nextField) {
  const index = state.fields.findIndex((candidate) => candidate.id === fieldId);
  if (index === -1) return null;
  state.fields[index] = clone(nextField);
  return clone(state.fields[index]);
}

export function listAlerts() {
  return clone(state.alerts);
}

export function findOpenAlert(match) {
  return state.alerts.find(
    (alert) =>
      !alert.acknowledgedAt &&
      alert.fieldId === match.fieldId &&
      alert.zoneId === match.zoneId &&
      alert.type === match.type
  );
}

export function addAlerts(alerts) {
  const nextAlerts = alerts.map((alert) => ({ id: alert.id || randomUUID(), ...alert }));
  state.alerts.unshift(...nextAlerts);
  return clone(nextAlerts);
}

export function acknowledgeAlertRecord(alertId, acknowledgedAt = new Date().toISOString()) {
  const alert = state.alerts.find((candidate) => candidate.id === alertId);
  if (!alert) return null;
  alert.acknowledgedAt = acknowledgedAt;
  return clone(alert);
}

export function listModelVersions() {
  return clone(state.modelVersions);
}

export function patchModelVersion(modelName, patch) {
  const model = state.modelVersions.find((candidate) => candidate.modelName === modelName);
  if (!model) return null;
  Object.assign(model, clone(patch));
  return clone(model);
}

export function createAnalysisRun(payload) {
  const run = {
    id: randomUUID(),
    fieldId: payload.fieldId,
    triggeredBy: payload.triggeredBy,
    startedAt: payload.startedAt || new Date().toISOString(),
    completedAt: payload.completedAt || null,
    status: payload.status || "queued",
    jobId: payload.jobId || null,
    resultSummaryJson: payload.resultSummaryJson || null
  };
  state.analysisRuns.unshift(run);
  return clone(run);
}

export function updateAnalysisRun(runId, patch) {
  const run = state.analysisRuns.find((candidate) => candidate.id === runId);
  if (!run) return null;
  Object.assign(run, clone(patch));
  return clone(run);
}

export function listAnalysisRuns() {
  return clone(state.analysisRuns);
}

export function saveReportRecord(report) {
  state.reports.unshift(clone(report));
  return clone(report);
}

export function listReportRecords() {
  return clone(state.reports);
}
