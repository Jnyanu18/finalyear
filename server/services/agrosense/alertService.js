import { randomUUID } from "crypto";
import { ApiError } from "../../utils/ApiError.js";
import {
  acknowledgeAlertRecord,
  addAlerts,
  findOpenAlert,
  listAlerts
} from "./runtimeState.js";
import { deliverAlertNotifications } from "./notificationService.js";
import { broadcastAlertEvent } from "../../websocket/agrosenseSensorStream.js";

const SEVERITY_ORDER = {
  critical: 4,
  warning: 3,
  watch: 2,
  info: 1
};

function buildAlert(alert) {
  return {
    id: randomUUID(),
    acknowledgedAt: null,
    ...alert
  };
}

function topRiskForZone(zone) {
  return [...zone.pestRisks].sort((left, right) => right.probability - left.probability)[0];
}

export async function listActiveAlerts() {
  return listAlerts()
    .filter((alert) => !alert.acknowledgedAt)
    .sort((left, right) => {
      const severityDelta = SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity];
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.triggeredAt).getTime() - new Date(left.triggeredAt).getTime();
    });
}

export async function acknowledgeAlert(alertId) {
  const alert = acknowledgeAlertRecord(alertId);
  if (!alert) {
    throw new ApiError(404, `Alert ${alertId} was not found.`);
  }
  return alert;
}

async function persistAlerts(alerts) {
  const uniqueAlerts = alerts.filter(
    (alert) =>
      !findOpenAlert({
        fieldId: alert.fieldId,
        zoneId: alert.zoneId,
        type: alert.type
      })
  );

  if (!uniqueAlerts.length) {
    return [];
  }

  const storedAlerts = addAlerts(uniqueAlerts);
  await Promise.all(
    storedAlerts.map(async (alert) => {
      broadcastAlertEvent(alert);
      await deliverAlertNotifications(alert);
    })
  );
  return storedAlerts;
}

export async function evaluateAndPublishAlerts({ previousField, nextField }) {
  const alerts = [];
  const previousZones = new Map(previousField.indices.zones.map((zone) => [zone.zoneId, zone]));
  const now = new Date().toISOString();

  for (const zone of nextField.indices.zones) {
    const previousZone = previousZones.get(zone.zoneId);
    if (previousZone && previousZone.ndvi - zone.ndvi > 0.08) {
      alerts.push(
        buildAlert({
          fieldId: nextField.id,
          zoneId: zone.zoneId,
          severity: "warning",
          type: "Rapid Vegetation Decline",
          title: "Rapid vegetation decline detected",
          description: `NDVI dropped from ${previousZone.ndvi} to ${zone.ndvi} in ${zone.zoneLabel} over the latest analysis window.`,
          recommendation: "Validate irrigation delivery, inspect roots, and inspect for localized canopy collapse.",
          modelSource: "Rule",
          confidence: 0.84,
          triggeredAt: now
        })
      );
    }
  }

  for (const zone of nextField.risk.zoneBreakdown) {
    const highestRisk = topRiskForZone(zone);
    if (highestRisk.probability >= 0.8) {
      alerts.push(
        buildAlert({
          fieldId: nextField.id,
          zoneId: zone.zoneId,
          severity: "critical",
          type: "Critical Pest Risk",
          title: `${highestRisk.pestType} risk crossed the critical threshold`,
          description: `${zone.zoneLabel} reached ${(highestRisk.probability * 100).toFixed(0)} percent ${highestRisk.pestType} probability after sensor fusion scoring.`,
          recommendation: "Trigger an immediate scouting and response protocol for the affected zone.",
          modelSource: "SensorFusion",
          confidence: highestRisk.probability,
          triggeredAt: now
        })
      );
    } else if (highestRisk.probability >= 0.6) {
      alerts.push(
        buildAlert({
          fieldId: nextField.id,
          zoneId: zone.zoneId,
          severity: "warning",
          type: "Elevated Pest Risk",
          title: `${highestRisk.pestType} probability is trending upward`,
          description: `${zone.zoneLabel} is now at ${(highestRisk.probability * 100).toFixed(0)} percent risk.`,
          recommendation: "Schedule scouting on the next field pass and validate microclimate hotspots.",
          modelSource: "SensorFusion",
          confidence: highestRisk.probability,
          triggeredAt: now
        })
      );
    }
  }

  const avgSoilMoisture =
    nextField.latestSensors.reduce((sum, node) => sum + node.readings.soilMoisture, 0) / nextField.latestSensors.length;
  if (avgSoilMoisture < 40 || avgSoilMoisture > 90) {
    alerts.push(
      buildAlert({
        fieldId: nextField.id,
        zoneId: "field-wide",
        severity: "warning",
        type: "Irrigation Anomaly",
        title: "Soil moisture moved outside the recommended range",
        description: `Average soil moisture is ${avgSoilMoisture.toFixed(1)} percent across the field.`,
        recommendation: "Audit emitters, pressure balance, and last irrigation duration before the next cycle.",
        modelSource: "Rule",
        confidence: 0.8,
        triggeredAt: now
      })
    );
  }

  const sustainedWindow = nextField.sensorHistory["24h"].slice(-12);
  const diseaseWindowMatched =
    sustainedWindow.length === 12 &&
    sustainedWindow.every(
      (point) => point.leafWetness > 0.7 && point.airTemperature > 25 && point.humidity > 70
    );
  if (diseaseWindowMatched) {
    alerts.push(
      buildAlert({
        fieldId: nextField.id,
        zoneId: "field-wide",
        severity: "critical",
        type: "Disease Favorable Conditions",
        title: "Microclimate conditions strongly favor disease spread",
        description: "Leaf wetness, temperature, and humidity remained elevated for at least 12 hours.",
        recommendation: "Advance scouting, reduce canopy wetting, and prepare fungicide logistics if symptoms are verified.",
        modelSource: "Rule",
        confidence: 0.88,
        triggeredAt: now
      })
    );
  }

  if (
    nextField.forecast.summary.projectedTrend === "declining" &&
    nextField.forecast.summary.projectedTrendWindowDays > 14
  ) {
    alerts.push(
      buildAlert({
        fieldId: nextField.id,
        zoneId: "field-wide",
        severity: "warning",
        type: "Prolonged Stress Trend",
        title: "Forecast indicates a prolonged stress trend",
        description: `The temporal model projects a declining vegetation trend lasting ${nextField.forecast.summary.projectedTrendWindowDays} days.`,
        recommendation: "Review irrigation, nutrient timing, and pest exposure before the decline becomes structural.",
        modelSource: "LSTM",
        confidence: 0.82,
        triggeredAt: now
      })
    );
  }

  return persistAlerts(alerts);
}
