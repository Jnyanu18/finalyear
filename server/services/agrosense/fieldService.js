import { ApiError } from "../../utils/ApiError.js";
import {
  createAnalysisRun,
  getFieldRecord,
  listFields,
  patchModelVersion,
  replaceFieldRecord,
  updateAnalysisRun
} from "./runtimeState.js";

const clone = (value) => structuredClone(value);
const round = (value, digits = 3) => Number(value.toFixed(digits));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const metricRanges = {
  soilMoisture: { min: 0, max: 100, digits: 2 },
  airTemperature: { min: 0, max: 60, digits: 2 },
  humidity: { min: 0, max: 100, digits: 2 },
  leafWetness: { min: 0, max: 1, digits: 3 },
  windSpeed: { min: 0, max: 60, digits: 2 },
  solarRadiation: { min: 0, max: 1200, digits: 2 },
  soilPh: { min: 4, max: 9, digits: 2 }
};

function getFieldOrThrow(fieldId) {
  const field = getFieldRecord(fieldId);
  if (!field) {
    throw new ApiError(404, `Field ${fieldId} was not found.`);
  }
  return field;
}

function summarizeField(field) {
  return {
    id: field.id,
    orgId: field.orgId,
    name: field.name,
    cropType: field.cropType,
    areaHa: field.areaHa,
    plantedAt: field.plantedAt,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
    lastAnalyzedAt: field.lastAnalyzedAt,
    locationGeojson: field.locationGeojson,
    overview: field.overview,
    soil: field.soil,
    activeAlerts: field.risk.topRisks.filter((risk) => risk.probability >= 0.6).length
  };
}

export async function listRegisteredFields() {
  return listFields().map(summarizeField);
}

export async function getFieldMap(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    name: field.name,
    updatedAt: field.indices.updatedAt,
    geojson: field.mapGeoJson
  };
}

export async function getFieldIndices(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    cropType: field.cropType,
    updatedAt: field.indices.updatedAt,
    summary: field.indices.summary,
    zones: field.indices.zones,
    geotiffLayers: field.indices.geotiffLayers,
    spectralBands: field.indices.spectralBands
  };
}

export async function getLatestSensorReadings(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    updatedAt: field.updatedAt,
    nodes: field.latestSensors
  };
}

export async function getSensorHistory(fieldId, range = "24h") {
  const field = getFieldOrThrow(fieldId);
  const series = field.sensorHistory[range];
  if (!series) {
    throw new ApiError(400, "Invalid range. Use 24h, 7d, or 30d.");
  }

  return {
    fieldId: field.id,
    range,
    scope: "field",
    series
  };
}

function buildNodeSeries(series, node) {
  const latestFieldPoint = series[series.length - 1];
  if (!latestFieldPoint) {
    return [];
  }

  return series.map((point) => {
    const entry = {
      timestamp: point.timestamp
    };

    for (const key of Object.keys(metricRanges)) {
      const { min, max, digits } = metricRanges[key];
      const offset = Number(node.readings[key] || 0) - Number(latestFieldPoint[key] || 0);
      entry[key] = round(clamp(Number(point[key] || 0) + offset, min, max), digits);
    }

    return entry;
  });
}

export async function getNodeSensorHistory(fieldId, range = "24h", nodeId) {
  const field = getFieldOrThrow(fieldId);
  const series = field.sensorHistory[range];
  if (!series) {
    throw new ApiError(400, "Invalid range. Use 24h, 7d, or 30d.");
  }

  const node = field.latestSensors.find((candidate) => candidate.nodeId === nodeId);
  if (!node) {
    throw new ApiError(404, `Sensor node ${nodeId} was not found for field ${fieldId}.`);
  }

  return {
    fieldId: field.id,
    range,
    scope: "node",
    nodeId: node.nodeId,
    nodeLabel: node.label,
    series: buildNodeSeries(series, node)
  };
}

export async function getFieldRisk(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    updatedAt: field.risk.updatedAt,
    topRisks: field.risk.topRisks,
    zoneBreakdown: field.risk.zoneBreakdown
  };
}

export async function getFieldForecast(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    updatedAt: field.forecast.updatedAt,
    summary: field.forecast.summary,
    series: field.forecast.series
  };
}

export async function getFieldInsights(fieldId) {
  const field = getFieldOrThrow(fieldId);
  return {
    fieldId: field.id,
    updatedAt: field.updatedAt,
    insights: field.insights
  };
}

export function createQueuedRun(fieldId, triggeredBy, jobId) {
  getFieldOrThrow(fieldId);
  return createAnalysisRun({
    fieldId,
    triggeredBy,
    jobId,
    status: "queued"
  });
}

export async function persistAnalysisOutcome({ fieldId, runId, triggeredBy, outcome, jobId }) {
  const previousField = getFieldOrThrow(fieldId);
  const nextField = clone(outcome.fieldState);
  nextField.updatedAt = outcome.completedAt;
  nextField.lastAnalyzedAt = outcome.completedAt;
  nextField.analysisPipeline = {
    status: "completed",
    source: outcome.source,
    lastRunAt: outcome.completedAt,
    lastJobId: jobId || null
  };
  replaceFieldRecord(fieldId, nextField);

  if (runId) {
    updateAnalysisRun(runId, {
      completedAt: outcome.completedAt,
      status: "completed",
      resultSummaryJson: outcome.resultSummary,
      jobId: jobId || null
    });
  }

  if (outcome.modelMetrics) {
    for (const metric of outcome.modelMetrics) {
      patchModelVersion(metric.modelName, {
        accuracy: metric.accuracy,
        trainedAt: metric.trainedAt,
        sampleCount: metric.sampleCount
      });
    }
  }

  return {
    previousField,
    nextField,
    analysisRun: runId
      ? {
          id: runId,
          fieldId,
          triggeredBy,
          startedAt: outcome.startedAt,
          completedAt: outcome.completedAt,
          status: "completed",
          jobId: jobId || null,
          resultSummaryJson: outcome.resultSummary
        }
      : null
  };
}

export function mergeFieldStateFromOutcome(field, patch) {
  const nextField = clone(field);
  nextField.indices = patch.indices;
  nextField.mapGeoJson = patch.mapGeoJson;
  nextField.risk = patch.risk;
  nextField.forecast = patch.forecast;
  nextField.latestSensors = patch.latestSensors;
  nextField.sensorHistory = patch.sensorHistory;
  nextField.insights = patch.insights;
  nextField.soil = patch.soil;
  nextField.overview = {
    avgNdvi: round(patch.indices.summary.avgNdvi, 3),
    soilMoisturePct: round(
      patch.latestSensors.reduce((sum, node) => sum + node.readings.soilMoisture, 0) / patch.latestSensors.length,
      2
    ),
    activeStressZones: patch.indices.zones.filter((zone) =>
      ["Stressed", "Critical"].includes(zone.status)
    ).length,
    peakPestRiskPct: Math.round(
      Math.max(...patch.risk.topRisks.map((risk) => risk.probability), 0) * 100
    ),
    avgHumidityPct: round(
      patch.latestSensors.reduce((sum, node) => sum + node.readings.humidity, 0) / patch.latestSensors.length,
      2
    ),
    avgLeafWetness: round(
      patch.latestSensors.reduce((sum, node) => sum + node.readings.leafWetness, 0) / patch.latestSensors.length,
      3
    )
  };
  return nextField;
}

export function computeFieldSummary(nextField) {
  return {
    avgNdvi: nextField.overview.avgNdvi,
    soilMoisturePct: nextField.overview.soilMoisturePct,
    activeStressZones: nextField.overview.activeStressZones,
    peakPestRiskPct: nextField.overview.peakPestRiskPct
  };
}

export function getRawField(fieldId) {
  return getFieldOrThrow(fieldId);
}
