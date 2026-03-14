const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const ZONE_CLASSES = ["Healthy", "Mild", "Moderate", "Stressed", "Critical", "Bare/Water"];
const PEST_TYPES = [
  "Fusarium",
  "Aphid",
  "Leaf Rust",
  "Powdery Mildew",
  "Late Blight",
  "Bacterial Spot",
  "Thrips",
  "Stem Borer",
  "Downy Mildew",
  "Whitefly"
];

const round = (value, digits = 3) => Number(value.toFixed(digits));

const isoOffset = (days = 0, hours = 0) =>
  new Date(Date.now() + days * DAY_MS + hours * HOUR_MS).toISOString();

function rectangle(lng, lat, width, height) {
  return [
    [lng, lat],
    [lng + width, lat],
    [lng + width, lat + height],
    [lng, lat + height],
    [lng, lat]
  ];
}

function indexToOffset(zoneLabel) {
  const value = Number(zoneLabel.split(" ").pop() || 0);
  return Number.isFinite(value) ? value : 0;
}

function featureForZone({ zoneId, zoneLabel, status, ndvi, center, coords, pestRisk }) {
  return {
    type: "Feature",
    properties: {
      zoneId,
      zoneLabel,
      status,
      ndvi,
      pestRisk
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    },
    center
  };
}

function buildHistogram(seed, length = 24) {
  return Array.from({ length }, (_, index) => ({
    bucket: index,
    value: round(18 + seed * 4 + Math.sin(index / 3) * 6 + index * 0.8, 2)
  }));
}

function buildBandProfile(seed) {
  return Array.from({ length: 14 }, (_, index) => ({
    wavelengthNm: 450 + index * 45,
    mean: round(0.14 + seed * 0.02 + Math.sin(index / 2.4) * 0.04, 4),
    min: round(0.08 + seed * 0.01 + Math.sin(index / 3) * 0.02, 4),
    max: round(0.24 + seed * 0.03 + Math.cos(index / 2.5) * 0.05, 4),
    histogram: buildHistogram(seed + index * 0.03, 18)
  }));
}

function buildSensorHistory(seed, points, stepMs) {
  const start = Date.now() - points * stepMs;
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin((index + 1 + seed * 5) / 3.6);
    const humidityWave = Math.cos((index + seed * 3) / 4.2);
    return {
      timestamp: new Date(start + index * stepMs).toISOString(),
      soilMoisture: round(58 + wave * 12 - seed * 5, 2),
      airTemperature: round(25 + humidityWave * 4 + seed * 1.5, 2),
      humidity: round(71 + humidityWave * 8, 2),
      leafWetness: round(0.48 + wave * 0.14 + seed * 0.05, 3),
      windSpeed: round(8 + Math.cos(index / 5) * 2.8 + seed, 2),
      solarRadiation: round(530 + Math.sin(index / 4.5) * 90 + seed * 20, 2),
      soilPh: round(6.4 + Math.sin(index / 7) * 0.24 - seed * 0.04, 2)
    };
  });
}

function buildForecastSeries(seed) {
  return Array.from({ length: 37 }, (_, index) => {
    const isForecast = index >= 30;
    const baseline = 0.69 + seed * 0.04;
    const drift = index < 30 ? index * 0.002 : 30 * 0.002 - (index - 29) * 0.009;
    const ndvi = round(baseline + Math.sin(index / 5) * 0.03 + drift, 3);
    return {
      date: new Date(Date.now() - (36 - index) * DAY_MS).toISOString().slice(0, 10),
      ndvi,
      ndre: round(ndvi - 0.08 + Math.cos(index / 6) * 0.01, 3),
      savi: round(ndvi - 0.04 + Math.sin(index / 4) * 0.02, 3),
      stressIndex: round(1 - ndvi + 0.14 + seed * 0.02, 3),
      isForecast
    };
  });
}

function buildSensorNodes(fieldId, baseLat, baseLng, seed) {
  return Array.from({ length: 6 }, (_, index) => ({
    nodeId: `${fieldId}-node-${index + 1}`,
    label: `Node ${index + 1}`,
    status: index === 4 ? "watch" : "online",
    lastSeen: isoOffset(0, -(index + 1)),
    location: {
      lat: round(baseLat + index * 0.0018, 6),
      lng: round(baseLng + (index % 2 === 0 ? 0.0022 : -0.0016), 6)
    },
    readings: {
      soilMoisture: round(54 + Math.sin(index + seed) * 13, 2),
      airTemperature: round(24.5 + Math.cos(index + seed) * 3.2, 2),
      humidity: round(68 + Math.sin(index / 2 + seed) * 10, 2),
      leafWetness: round(0.41 + Math.sin(index / 1.8 + seed) * 0.2, 3),
      windSpeed: round(7.2 + Math.cos(index / 1.9 + seed) * 1.4, 2),
      solarRadiation: round(510 + Math.sin(index / 2 + seed) * 84, 2),
      soilPh: round(6.6 + Math.cos(index / 2.5 + seed) * 0.28, 2)
    }
  }));
}

function buildInsights(fieldId, seed) {
  return [
    {
      id: `${fieldId}-insight-1`,
      urgency: "critical",
      recommendation: "Prioritize scouting in Zone 5 before the next irrigation cycle. Pest pressure and falling NDVI are diverging from the rest of the field.",
      modelConfidence: round(0.91 - seed * 0.04, 2),
      timestamp: isoOffset(0, -2),
      modelSource: "SensorFusion"
    },
    {
      id: `${fieldId}-insight-2`,
      urgency: "warning",
      recommendation: "Delay nitrogen top-dressing in low-vigor strips until moisture recovers above 52 percent. Current uptake conditions are inefficient.",
      modelConfidence: round(0.84 - seed * 0.03, 2),
      timestamp: isoOffset(0, -5),
      modelSource: "LSTM"
    },
    {
      id: `${fieldId}-insight-3`,
      urgency: "watch",
      recommendation: "Use the spectral anomaly overlay to verify whether edge stress is wind-driven or tied to irrigation uniformity.",
      modelConfidence: round(0.79 - seed * 0.02, 2),
      timestamp: isoOffset(0, -9),
      modelSource: "CNN"
    }
  ];
}

function buildZoneBreakdown(fieldId, seed) {
  return ZONE_CLASSES.map((status, index) => {
    const ndvi = round(0.85 - index * 0.09 - seed * 0.01, 3);
    const pestBase = 0.26 + index * 0.11 + seed * 0.03;
    return {
      zoneId: `${fieldId}-zone-${index + 1}`,
      zoneLabel: `Zone ${index + 1}`,
      status,
      readiness: Math.max(12, Math.min(96, Math.round(94 - index * 11 - seed * 3))),
      soilHealthScore: Math.max(24, Math.min(94, Math.round(87 - index * 8 - seed * 4))),
      ndvi,
      pestRisks: PEST_TYPES.map((pest, pestIndex) => ({
        pestType: pest,
        probability: round(
          Math.min(0.93, Math.max(0.08, pestBase + (pestIndex % 3) * 0.05 - pestIndex * 0.01)),
          3
        )
      }))
    };
  });
}

function buildField(fieldId, name, cropType, center, areaHa, seed) {
  const [baseLng, baseLat] = center;
  const fieldBoundary = rectangle(baseLng, baseLat, 0.03, 0.024);
  const zoneRectangles = [
    rectangle(baseLng + 0.001, baseLat + 0.001, 0.009, 0.01),
    rectangle(baseLng + 0.011, baseLat + 0.001, 0.009, 0.01),
    rectangle(baseLng + 0.021, baseLat + 0.001, 0.007, 0.01),
    rectangle(baseLng + 0.001, baseLat + 0.012, 0.009, 0.01),
    rectangle(baseLng + 0.011, baseLat + 0.012, 0.009, 0.01),
    rectangle(baseLng + 0.021, baseLat + 0.012, 0.007, 0.01)
  ];
  const zoneBreakdown = buildZoneBreakdown(fieldId, seed);
  const mapGeoJson = {
    type: "FeatureCollection",
    features: zoneBreakdown.map((zone, index) =>
      featureForZone({
        zoneId: zone.zoneId,
        zoneLabel: zone.zoneLabel,
        status: zone.status,
        ndvi: zone.ndvi,
        center: {
          lat: round(baseLat + 0.006 + Math.floor(index / 3) * 0.011, 6),
          lng: round(baseLng + 0.005 + (index % 3) * 0.01, 6)
        },
        coords: zoneRectangles[index],
        pestRisk: Math.max(...zone.pestRisks.map((risk) => risk.probability))
      })
    )
  };
  const sensorHistory = {
    "24h": buildSensorHistory(seed, 24, HOUR_MS),
    "7d": buildSensorHistory(seed + 0.04, 28, 6 * HOUR_MS),
    "30d": buildSensorHistory(seed + 0.08, 30, DAY_MS)
  };
  const forecastSeries = buildForecastSeries(seed);
  const topRisks = zoneBreakdown
    .flatMap((zone) =>
      zone.pestRisks.map((risk) => ({
        zoneId: zone.zoneId,
        zoneLabel: zone.zoneLabel,
        pestType: risk.pestType,
        probability: risk.probability,
        severity:
          risk.probability >= 0.8
            ? "critical"
            : risk.probability >= 0.6
              ? "warning"
              : risk.probability >= 0.4
                ? "watch"
                : "info"
      }))
    )
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 10);

  const avgSoilMoisture =
    sensorHistory["24h"].reduce((sum, point) => sum + point.soilMoisture, 0) /
    sensorHistory["24h"].length;
  const avgHumidity =
    sensorHistory["24h"].reduce((sum, point) => sum + point.humidity, 0) /
    sensorHistory["24h"].length;
  const avgLeafWetness =
    sensorHistory["24h"].reduce((sum, point) => sum + point.leafWetness, 0) /
    sensorHistory["24h"].length;

  return {
    id: fieldId,
    orgId: "org-demo",
    name,
    cropType,
    areaHa,
    plantedAt: isoOffset(-54),
    createdAt: isoOffset(-120),
    updatedAt: isoOffset(0, -1),
    lastAnalyzedAt: isoOffset(0, -1),
    locationGeojson: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [fieldBoundary]
      },
      properties: {
        label: name
      }
    },
    overview: {
      avgNdvi: round(zoneBreakdown.reduce((sum, zone) => sum + zone.ndvi, 0) / zoneBreakdown.length, 3),
      soilMoisturePct: round(avgSoilMoisture, 2),
      activeStressZones: zoneBreakdown.filter((zone) => zone.status === "Stressed" || zone.status === "Critical").length,
      peakPestRiskPct: Math.round(Math.max(...topRisks.map((risk) => risk.probability)) * 100),
      avgHumidityPct: round(avgHumidity, 2),
      avgLeafWetness: round(avgLeafWetness, 3)
    },
    mapGeoJson,
    indices: {
      updatedAt: isoOffset(0, -1),
      geotiffLayers: {
        ndvi: `/generated-reports/geotiff/${fieldId}-ndvi.tif`,
        ndre: `/generated-reports/geotiff/${fieldId}-ndre.tif`,
        savi: `/generated-reports/geotiff/${fieldId}-savi.tif`,
        evi: `/generated-reports/geotiff/${fieldId}-evi.tif`,
        smi: `/generated-reports/geotiff/${fieldId}-smi.tif`,
        clayMineralRatio: `/generated-reports/geotiff/${fieldId}-clay.tif`,
        ironOxideIndex: `/generated-reports/geotiff/${fieldId}-iron.tif`
      },
      summary: {
        avgNdvi: round(zoneBreakdown.reduce((sum, zone) => sum + zone.ndvi, 0) / zoneBreakdown.length, 3),
        avgNdre: round(0.56 + seed * 0.03, 3),
        avgSavi: round(0.61 + seed * 0.02, 3),
        avgEvi: round(0.48 + seed * 0.03, 3),
        avgSmi: round(0.57 - seed * 0.04, 3),
        clayMineralRatio: round(1.21 + seed * 0.08, 3),
        ironOxideIndex: round(0.83 + seed * 0.03, 3),
        soilHealthScore: Math.round(82 - seed * 8)
      },
      zones: zoneBreakdown.map((zone) => ({
        zoneId: zone.zoneId,
        zoneLabel: zone.zoneLabel,
        status: zone.status,
        ndvi: zone.ndvi,
        ndre: round(zone.ndvi - 0.08, 3),
        savi: round(zone.ndvi - 0.03, 3),
        evi: round(zone.ndvi - 0.11, 3),
        smi: round(0.69 - seed * 0.04 - zone.readiness / 220, 3),
        clayMineralRatio: round(1.12 + seed * 0.06 + zone.soilHealthScore / 300, 3),
        ironOxideIndex: round(0.74 + indexToOffset(zone.zoneLabel) * 0.03, 3)
      })),
      spectralBands: buildBandProfile(seed)
    },
    latestSensors: buildSensorNodes(fieldId, baseLat, baseLng, seed),
    sensorHistory,
    risk: {
      updatedAt: isoOffset(0, -1),
      topRisks,
      zoneBreakdown
    },
    forecast: {
      updatedAt: isoOffset(0, -1),
      summary: {
        currentStressIndex: round(forecastSeries[29].stressIndex, 3),
        projectedStressIndex7Day: round(forecastSeries[36].stressIndex, 3),
        projectedTrend: "declining",
        projectedTrendWindowDays: 18
      },
      series: forecastSeries
    },
    soil: {
      score: Math.round(83 - seed * 6),
      degradationTrend: seed > 0.08 ? "stable" : "improving"
    },
    insights: buildInsights(fieldId, seed),
    analysisPipeline: {
      status: "completed",
      source: "seeded-runtime",
      lastRunAt: isoOffset(0, -1)
    }
  };
}

export function createAgroSenseSeed() {
  const fieldA = buildField("field-001", "North Orchard", "Tomato", [76.6394, 12.3035], 48.2, 0.08);
  const fieldB = buildField("field-002", "Canal Block", "Chili", [76.6821, 12.3186], 31.7, 0.14);
  const alerts = [
    {
      id: "alert-001",
      fieldId: fieldA.id,
      zoneId: `${fieldA.id}-zone-5`,
      severity: "critical",
      type: "Critical Pest Risk",
      title: "Pest pressure above critical threshold",
      description: "Late Blight and Aphid probabilities crossed 80 percent in Zone 5 after the latest fused run.",
      recommendation: "Scout immediately, isolate symptomatic plants, and prepare a targeted intervention block.",
      modelSource: "SensorFusion",
      confidence: 0.91,
      triggeredAt: isoOffset(0, -2),
      acknowledgedAt: null
    },
    {
      id: "alert-002",
      fieldId: fieldA.id,
      zoneId: `${fieldA.id}-zone-4`,
      severity: "warning",
      type: "Rapid Vegetation Decline",
      title: "NDVI dropped sharply in the upper canopy strip",
      description: "Zone 4 lost more than 0.08 NDVI within the current rolling seven-day window.",
      recommendation: "Inspect irrigation uniformity and root-zone saturation before the next fertigation cycle.",
      modelSource: "Rule",
      confidence: 0.86,
      triggeredAt: isoOffset(0, -6),
      acknowledgedAt: null
    },
    {
      id: "alert-003",
      fieldId: fieldB.id,
      zoneId: "field-wide",
      severity: "warning",
      type: "Irrigation Anomaly",
      title: "Field moisture variability widened overnight",
      description: "Two sensor nodes dipped below the lower irrigation threshold while canopy humidity stayed elevated.",
      recommendation: "Check dripline pressure and rebalance emitter flow before sunrise irrigation.",
      modelSource: "Rule",
      confidence: 0.78,
      triggeredAt: isoOffset(0, -9),
      acknowledgedAt: null
    }
  ];

  return {
    organizations: [
      {
        id: "org-demo",
        name: "AgroSense Demo Farms",
        subscriptionTier: "enterprise",
        createdAt: isoOffset(-240)
      }
    ],
    fields: [fieldA, fieldB],
    alerts,
    analysisRuns: [],
    reports: [],
    modelVersions: [
      {
        id: "model-cnn-v3",
        modelName: "CNN Spatial Anomaly Detector",
        version: "3.1.0",
        accuracy: 0.928,
        trainedAt: isoOffset(-1),
        sampleCount: 18240,
        isActive: true
      },
      {
        id: "model-lstm-v5",
        modelName: "LSTM Temporal Stress Predictor",
        version: "5.4.2",
        accuracy: 0.912,
        trainedAt: isoOffset(0, -10),
        sampleCount: 56200,
        isActive: true
      },
      {
        id: "model-fusion-v4",
        modelName: "Sensor Fusion Pest Risk Classifier",
        version: "4.0.6",
        accuracy: 0.903,
        trainedAt: isoOffset(-2),
        sampleCount: 9080,
        isActive: true
      },
      {
        id: "model-soil-v2",
        modelName: "Soil Degradation Index",
        version: "2.6.1",
        accuracy: 0.889,
        trainedAt: isoOffset(-3),
        sampleCount: 13450,
        isActive: true
      }
    ]
  };
}
