import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import { logger } from "./logger.js";
import { getRawField, mergeFieldStateFromOutcome } from "./fieldService.js";

const round = (value, digits = 3) => Number(value.toFixed(digits));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function updateZoneStatus(ndvi) {
  if (ndvi >= 0.76) return "Healthy";
  if (ndvi >= 0.66) return "Mild";
  if (ndvi >= 0.56) return "Moderate";
  if (ndvi >= 0.46) return "Stressed";
  if (ndvi >= 0.32) return "Critical";
  return "Bare/Water";
}

function buildSyntheticOutcome(fieldId) {
  const field = getRawField(fieldId);
  const startedAt = new Date().toISOString();
  const latestFieldPoint = field.sensorHistory["24h"][field.sensorHistory["24h"].length - 1];
  const previousFieldPoint = field.sensorHistory["24h"][field.sensorHistory["24h"].length - 2] || latestFieldPoint;
  const baseRiskPressure = Math.max(...field.risk.topRisks.map((risk) => risk.probability), 0);

  const trend = {
    soilMoisture: (latestFieldPoint?.soilMoisture || 0) - (previousFieldPoint?.soilMoisture || 0),
    airTemperature: (latestFieldPoint?.airTemperature || 0) - (previousFieldPoint?.airTemperature || 0),
    humidity: (latestFieldPoint?.humidity || 0) - (previousFieldPoint?.humidity || 0),
    leafWetness: (latestFieldPoint?.leafWetness || 0) - (previousFieldPoint?.leafWetness || 0),
    windSpeed: (latestFieldPoint?.windSpeed || 0) - (previousFieldPoint?.windSpeed || 0),
    solarRadiation: (latestFieldPoint?.solarRadiation || 0) - (previousFieldPoint?.solarRadiation || 0),
    soilPh: (latestFieldPoint?.soilPh || 0) - (previousFieldPoint?.soilPh || 0)
  };

  const nextIndicesZones = field.indices.zones.map((zone, index) => {
    const zoneRisk = Math.max(...field.risk.zoneBreakdown[index].pestRisks.map((risk) => risk.probability), 0);
    const soilBias = (field.risk.zoneBreakdown[index].soilHealthScore - 60) * 0.00035;
    const readinessBias = (field.risk.zoneBreakdown[index].readiness - 50) * 0.00018;
    const moistureLift = trend.soilMoisture * 0.0014;
    const humidityPenalty = trend.humidity * 0.0004;
    const heatPenalty = Math.max(0, trend.airTemperature) * 0.0012;
    const wetnessPenalty = Math.max(0, trend.leafWetness) * 0.024;
    const stressPenalty = zoneRisk * 0.011 + index * 0.0015;
    const recoveryBias = zone.status === "Healthy" ? 0.002 : zone.status === "Critical" ? -0.004 : 0;
    const delta = clamp(
      moistureLift + soilBias + readinessBias + recoveryBias - humidityPenalty - heatPenalty - wetnessPenalty - stressPenalty,
      -0.022,
      0.011
    );
    const ndvi = round(clamp(zone.ndvi + delta, 0.2, 0.9), 3);
    return {
      ...zone,
      ndvi,
      ndre: round(clamp(ndvi - 0.08, 0.12, 0.82), 3),
      savi: round(clamp(ndvi - 0.03, 0.15, 0.87), 3),
      evi: round(clamp(ndvi - 0.11, 0.1, 0.74), 3),
      smi: round(clamp(zone.smi + moistureLift * 2.2 - wetnessPenalty * 0.6, 0.18, 0.84), 3),
      clayMineralRatio: round(clamp(zone.clayMineralRatio + soilBias * 10 - wetnessPenalty * 0.2, 0.8, 1.6), 3),
      ironOxideIndex: round(clamp(zone.ironOxideIndex + heatPenalty * 5 - moistureLift * 2, 0.42, 1.18), 3),
      status: updateZoneStatus(ndvi)
    };
  });

  const nextMapGeoJson = {
    ...field.mapGeoJson,
    features: field.mapGeoJson.features.map((feature, index) => ({
      ...feature,
      properties: {
        ...feature.properties,
        status: nextIndicesZones[index].status,
        ndvi: nextIndicesZones[index].ndvi,
        pestRisk: clamp(
          Math.max(...field.risk.zoneBreakdown[index].pestRisks.map((risk) => risk.probability), 0) +
            Math.max(0, trend.leafWetness) * 0.2 +
            index * 0.006,
          0.18,
          0.94
        )
      }
    }))
  };

  const nextFieldAverages = {
    soilMoisture: round(clamp((latestFieldPoint?.soilMoisture || 58) + trend.soilMoisture * 0.35 - Math.max(0, baseRiskPressure - 0.55) * 6, 28, 92), 2),
    airTemperature: round(clamp((latestFieldPoint?.airTemperature || 25) + trend.airTemperature * 0.3 + Math.max(0, baseRiskPressure - 0.5) * 1.2, 18, 37), 2),
    humidity: round(clamp((latestFieldPoint?.humidity || 70) + trend.humidity * 0.35 + Math.max(0, baseRiskPressure - 0.48) * 4, 42, 96), 2),
    leafWetness: round(clamp((latestFieldPoint?.leafWetness || 0.45) + trend.leafWetness * 0.4 + Math.max(0, trend.humidity) * 0.002, 0.1, 0.96), 3),
    windSpeed: round(clamp((latestFieldPoint?.windSpeed || 8) + trend.windSpeed * 0.25, 1.5, 19.5), 2),
    solarRadiation: round(clamp((latestFieldPoint?.solarRadiation || 540) + trend.solarRadiation * 0.28 - Math.max(0, trend.humidity) * 1.8, 220, 820), 2),
    soilPh: round(clamp((latestFieldPoint?.soilPh || 6.5) + trend.soilPh * 0.25 - Math.max(0, trend.soilMoisture) * 0.002, 5.7, 7.9), 2)
  };

  const nextSensors = field.latestSensors.map((node, index) => {
    const zoneRisk = Math.max(...field.risk.zoneBreakdown[Math.min(index, field.risk.zoneBreakdown.length - 1)].pestRisks.map((risk) => risk.probability), 0);
    const offsets = {
      soilMoisture: node.readings.soilMoisture - (latestFieldPoint?.soilMoisture || nextFieldAverages.soilMoisture),
      airTemperature: node.readings.airTemperature - (latestFieldPoint?.airTemperature || nextFieldAverages.airTemperature),
      humidity: node.readings.humidity - (latestFieldPoint?.humidity || nextFieldAverages.humidity),
      leafWetness: node.readings.leafWetness - (latestFieldPoint?.leafWetness || nextFieldAverages.leafWetness),
      windSpeed: node.readings.windSpeed - (latestFieldPoint?.windSpeed || nextFieldAverages.windSpeed),
      solarRadiation: node.readings.solarRadiation - (latestFieldPoint?.solarRadiation || nextFieldAverages.solarRadiation),
      soilPh: node.readings.soilPh - (latestFieldPoint?.soilPh || nextFieldAverages.soilPh)
    };

    return {
      ...node,
      status: zoneRisk >= 0.68 ? "watch" : "online",
      lastSeen: startedAt,
      readings: {
        soilMoisture: round(clamp(nextFieldAverages.soilMoisture + offsets.soilMoisture * 0.82 - zoneRisk * 1.8, 28, 92), 2),
        airTemperature: round(clamp(nextFieldAverages.airTemperature + offsets.airTemperature * 0.78 + zoneRisk * 0.35, 18, 37), 2),
        humidity: round(clamp(nextFieldAverages.humidity + offsets.humidity * 0.8 + zoneRisk * 0.9, 42, 96), 2),
        leafWetness: round(clamp(nextFieldAverages.leafWetness + offsets.leafWetness * 0.75 + zoneRisk * 0.04, 0.1, 0.96), 3),
        windSpeed: round(clamp(nextFieldAverages.windSpeed + offsets.windSpeed * 0.8, 1.5, 19.5), 2),
        solarRadiation: round(clamp(nextFieldAverages.solarRadiation + offsets.solarRadiation * 0.78, 220, 820), 2),
        soilPh: round(clamp(nextFieldAverages.soilPh + offsets.soilPh * 0.7, 5.7, 7.9), 2)
      }
    };
  });

  const nextHistory24h = [
    ...field.sensorHistory["24h"].slice(-23),
    {
      timestamp: startedAt,
      soilMoisture: round(nextSensors.reduce((sum, node) => sum + node.readings.soilMoisture, 0) / nextSensors.length, 2),
      airTemperature: round(nextSensors.reduce((sum, node) => sum + node.readings.airTemperature, 0) / nextSensors.length, 2),
      humidity: round(nextSensors.reduce((sum, node) => sum + node.readings.humidity, 0) / nextSensors.length, 2),
      leafWetness: round(nextSensors.reduce((sum, node) => sum + node.readings.leafWetness, 0) / nextSensors.length, 3),
      windSpeed: round(nextSensors.reduce((sum, node) => sum + node.readings.windSpeed, 0) / nextSensors.length, 2),
      solarRadiation: round(nextSensors.reduce((sum, node) => sum + node.readings.solarRadiation, 0) / nextSensors.length, 2),
      soilPh: round(nextSensors.reduce((sum, node) => sum + node.readings.soilPh, 0) / nextSensors.length, 2)
    }
  ];

  const zoneBreakdown = field.risk.zoneBreakdown.map((zone, zoneIndex) => ({
    ...zone,
    status: nextIndicesZones[zoneIndex].status,
    ndvi: nextIndicesZones[zoneIndex].ndvi,
    soilHealthScore: Math.max(26, zone.soilHealthScore + Math.round(trend.soilMoisture * 0.4) - zoneIndex),
    pestRisks: zone.pestRisks.map((risk, riskIndex) => ({
      ...risk,
      probability: round(
        clamp(
          risk.probability +
            Math.max(0, nextHistory24h[nextHistory24h.length - 1].leafWetness - 0.45) * 0.18 +
            Math.max(0, nextHistory24h[nextHistory24h.length - 1].humidity - 75) * 0.0025 +
            zoneIndex * 0.01 +
            riskIndex * 0.003 -
            nextIndicesZones[zoneIndex].ndvi * 0.04,
          0.05,
          0.95
        ),
        3
      )
    }))
  }));

  const topRisks = zoneBreakdown
    .flatMap((zone) =>
      zone.pestRisks.map((risk) => ({
        zoneId: zone.zoneId,
        zoneLabel: zone.zoneLabel,
        pestType: risk.pestType,
        probability: risk.probability,
        severity:
          risk.probability >= 0.8 ? "critical" : risk.probability >= 0.6 ? "warning" : risk.probability >= 0.4 ? "watch" : "info"
      }))
    )
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 10);

  const observedNdvi = round(nextIndicesZones.reduce((sum, zone) => sum + zone.ndvi, 0) / nextIndicesZones.length, 3);
  const latestObservedForecast = field.forecast.series.filter((point) => !point.isForecast).slice(-1)[0] || field.forecast.series[29];
  const observedGap = observedNdvi - latestObservedForecast.ndvi;
  const nextForecastSeries = field.forecast.series.map((point, index) => {
    const horizon = point.isForecast ? index - 29 : 0;
    const forecastPressure = point.isForecast ? Math.max(0, baseRiskPressure - 0.45) * horizon * 0.004 : 0;
    const drift = point.isForecast ? observedGap - horizon * 0.003 - forecastPressure : observedGap * 0.35;
    const ndvi = round(clamp(point.ndvi + drift, 0.22, 0.89), 3);
    return {
      ...point,
      ndvi,
      ndre: round(clamp(ndvi - 0.08, 0.12, 0.8), 3),
      savi: round(clamp(ndvi - 0.03, 0.14, 0.86), 3),
      stressIndex: round(clamp(1 - ndvi + 0.16, 0.12, 0.92), 3)
    };
  });

  const completedAt = startedAt;
  const dominantRisk = topRisks[0];
  const driestNode = [...nextSensors].sort((left, right) => left.readings.soilMoisture - right.readings.soilMoisture)[0];
  const wettestNode = [...nextSensors].sort((left, right) => right.readings.leafWetness - left.readings.leafWetness)[0];

  const nextPatch = {
    indices: {
      ...field.indices,
      updatedAt: completedAt,
      summary: {
        avgNdvi: round(nextIndicesZones.reduce((sum, zone) => sum + zone.ndvi, 0) / nextIndicesZones.length, 3),
        avgNdre: round(nextIndicesZones.reduce((sum, zone) => sum + zone.ndre, 0) / nextIndicesZones.length, 3),
        avgSavi: round(nextIndicesZones.reduce((sum, zone) => sum + zone.savi, 0) / nextIndicesZones.length, 3),
        avgEvi: round(nextIndicesZones.reduce((sum, zone) => sum + zone.evi, 0) / nextIndicesZones.length, 3),
        avgSmi: round(nextIndicesZones.reduce((sum, zone) => sum + zone.smi, 0) / nextIndicesZones.length, 3),
        clayMineralRatio: round(nextIndicesZones.reduce((sum, zone) => sum + zone.clayMineralRatio, 0) / nextIndicesZones.length, 3),
        ironOxideIndex: round(nextIndicesZones.reduce((sum, zone) => sum + zone.ironOxideIndex, 0) / nextIndicesZones.length, 3),
        soilHealthScore: Math.round(zoneBreakdown.reduce((sum, zone) => sum + zone.soilHealthScore, 0) / zoneBreakdown.length)
      },
      zones: nextIndicesZones
    },
    mapGeoJson: nextMapGeoJson,
    latestSensors: nextSensors,
    sensorHistory: {
      "24h": nextHistory24h,
      "7d": field.sensorHistory["7d"],
      "30d": field.sensorHistory["30d"]
    },
    risk: {
      updatedAt: completedAt,
      topRisks,
      zoneBreakdown
    },
    forecast: {
      updatedAt: completedAt,
      summary: {
        currentStressIndex: nextForecastSeries[29].stressIndex,
        projectedStressIndex7Day: nextForecastSeries[36].stressIndex,
        projectedTrend: "declining",
        projectedTrendWindowDays: 18
      },
      series: nextForecastSeries
    },
    insights: [
      {
        id: `${fieldId}-${randomUUID()}`,
        urgency: "critical",
        recommendation: `${dominantRisk.zoneLabel} reached ${Math.round(dominantRisk.probability * 100)}% ${dominantRisk.pestType} risk after the latest fused run. Dispatch scouting before the next irrigation cycle.`,
        modelConfidence: round(clamp(0.82 + dominantRisk.probability * 0.12, 0.72, 0.96), 2),
        timestamp: completedAt,
        modelSource: "SensorFusion"
      },
      {
        id: `${fieldId}-${randomUUID()}`,
        urgency: "warning",
        recommendation: `${driestNode.label} is now the driest node at ${driestNode.readings.soilMoisture}% soil moisture. Tighten irrigation uniformity in the low-vigor strip over the next 24 hours.`,
        modelConfidence: round(clamp(0.74 + Math.max(0, 60 - driestNode.readings.soilMoisture) * 0.01, 0.68, 0.92), 2),
        timestamp: completedAt,
        modelSource: "Rule"
      },
      {
        id: `${fieldId}-${randomUUID()}`,
        urgency: "watch",
        recommendation: `${wettestNode.label} carries the highest leaf-wetness signal at ${wettestNode.readings.leafWetness.toFixed(2)}. Use the spectral page to confirm whether canopy wetness aligns with the weakest NDVI zones.`,
        modelConfidence: round(clamp(0.7 + wettestNode.readings.leafWetness * 0.2, 0.65, 0.9), 2),
        timestamp: completedAt,
        modelSource: "LSTM"
      }
    ],
    soil: {
      score: Math.max(28, field.soil.score - 1),
      degradationTrend: field.soil.score > 74 ? "stable" : "declining"
    }
  };

  const fieldState = mergeFieldStateFromOutcome(field, nextPatch);
  return {
    startedAt,
    completedAt,
    source: "synthetic-fallback",
    fieldState,
    resultSummary: {
      updatedZones: nextIndicesZones.length,
      topRisk: topRisks[0],
      avgNdvi: nextPatch.indices.summary.avgNdvi,
      soilScore: nextPatch.soil.score
    },
    modelMetrics: [
      {
        modelName: "CNN Spatial Anomaly Detector",
        accuracy: 0.928,
        trainedAt: completedAt,
        sampleCount: 18240 + nextIndicesZones.length
      },
      {
        modelName: "LSTM Temporal Stress Predictor",
        accuracy: 0.913,
        trainedAt: completedAt,
        sampleCount: 56200 + 30
      },
      {
        modelName: "Sensor Fusion Pest Risk Classifier",
        accuracy: 0.904,
        trainedAt: completedAt,
        sampleCount: 9080 + nextSensors.length
      },
      {
        modelName: "Soil Degradation Index",
        accuracy: 0.891,
        trainedAt: completedAt,
        sampleCount: 13450 + nextSensors.length
      }
    ]
  };
}

async function runMatlabJsonBridge(fieldId) {
  const runId = randomUUID();
  const workingDirectory = path.resolve(process.cwd(), "agrosense-runtime");
  const inputPath = path.join(workingDirectory, `${runId}.input.json`);
  const outputPath = path.join(workingDirectory, `${runId}.output.json`);
  await fs.mkdir(workingDirectory, { recursive: true });
  await fs.writeFile(inputPath, JSON.stringify({ fieldId, outputPath }, null, 2), "utf8");

  await new Promise((resolve, reject) => {
    const child = spawn(env.matlabExecutable, ["-batch", "run('matlab/run_pipeline.m');"], {
      cwd: path.resolve(process.cwd(), "..")
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`MATLAB exited with code ${code}`));
    });
  });

  const raw = await fs.readFile(outputPath, "utf8");
  return JSON.parse(raw);
}

export async function runAgroSensePipeline(fieldId) {
  const field = getRawField(fieldId);
  if (env.matlabBridgeMode === "matlab" && env.matlabExecutable) {
    try {
      return await runMatlabJsonBridge(fieldId);
    } catch (error) {
      logger.warn("matlab_bridge_failed", { fieldId, error: error.message });
    }
  }

  if (env.matlabBridgeMode === "python" || env.matlabBridgeMode === "hybrid") {
    try {
      const response = await fetch(`${env.pythonInferenceUrl}/analysis/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, field })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      logger.warn("python_inference_unavailable", { fieldId, error: error.message });
    }
  }

  return buildSyntheticOutcome(fieldId);
}
