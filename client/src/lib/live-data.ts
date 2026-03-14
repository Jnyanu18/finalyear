import type { FieldSummary, SensorNode } from "@/types/agrosense";

export interface SensorAverageSet {
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  leafWetness: number;
  windSpeed: number;
  solarRadiation: number;
  soilPh: number;
}

export interface SensorThreshold {
  key: keyof SensorAverageSet;
  label: string;
  unit: string;
  current: number;
  min: number;
  target: number;
  max: number;
  status: "low" | "optimal" | "high";
  progress: number;
  helpText: string;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

const shortDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const shortTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit"
});

const cropProfiles = {
  generic: {
    avgUnitWeightKg: 0.08,
    irrigationTargets: {
      seedling: 68,
      vegetative: 63,
      flowering: 66,
      fruit_development: 65,
      ripening: 58,
      harvest_ready: 54
    },
    humidity: { min: 55, target: 68, max: 80 },
    airTemperature: { min: 20, target: 26, max: 31 },
    leafWetness: { min: 0.18, target: 0.34, max: 0.55 },
    windSpeed: { min: 2, target: 8, max: 18 },
    solarRadiation: { min: 260, target: 560, max: 780 },
    soilPh: { min: 6.0, target: 6.6, max: 7.2 }
  },
  tomato: {
    avgUnitWeightKg: 0.09,
    irrigationTargets: {
      seedling: 68,
      vegetative: 63,
      flowering: 66,
      fruit_development: 65,
      ripening: 58,
      harvest_ready: 54
    },
    humidity: { min: 58, target: 70, max: 78 },
    airTemperature: { min: 21, target: 26, max: 30 },
    leafWetness: { min: 0.16, target: 0.3, max: 0.52 },
    windSpeed: { min: 2, target: 7, max: 16 },
    solarRadiation: { min: 300, target: 560, max: 760 },
    soilPh: { min: 6.0, target: 6.5, max: 7.0 }
  },
  chilli: {
    avgUnitWeightKg: 0.015,
    irrigationTargets: {
      seedling: 66,
      vegetative: 61,
      flowering: 63,
      fruit_development: 60,
      ripening: 56,
      harvest_ready: 52
    },
    humidity: { min: 50, target: 64, max: 76 },
    airTemperature: { min: 22, target: 28, max: 33 },
    leafWetness: { min: 0.15, target: 0.28, max: 0.48 },
    windSpeed: { min: 2, target: 7, max: 18 },
    solarRadiation: { min: 320, target: 590, max: 800 },
    soilPh: { min: 6.0, target: 6.5, max: 7.2 }
  },
  rice: {
    avgUnitWeightKg: 0.03,
    irrigationTargets: {
      seedling: 76,
      vegetative: 72,
      flowering: 74,
      fruit_development: 70,
      ripening: 62,
      harvest_ready: 56
    },
    humidity: { min: 62, target: 74, max: 88 },
    airTemperature: { min: 21, target: 27, max: 32 },
    leafWetness: { min: 0.2, target: 0.36, max: 0.6 },
    windSpeed: { min: 1, target: 6, max: 15 },
    solarRadiation: { min: 280, target: 520, max: 760 },
    soilPh: { min: 5.8, target: 6.4, max: 7.0 }
  }
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCropKey(cropType = "") {
  const key = String(cropType || "").trim().toLowerCase();
  if (!key) return "generic";
  if (key.includes("chilli") || key.includes("chili")) return "chilli";
  if (key.includes("tomato")) return "tomato";
  if (key.includes("rice")) return "rice";
  return "generic";
}

function normalizeStageKey(stageRaw = "") {
  const stage = String(stageRaw || "").trim().toLowerCase();
  if (stage.includes("seed")) return "seedling";
  if (stage.includes("veget")) return "vegetative";
  if (stage.includes("flower")) return "flowering";
  if (stage.includes("fruit")) return "fruit_development";
  if (stage.includes("ripen")) return "ripening";
  if (stage.includes("harvest")) return "harvest_ready";
  return "fruit_development";
}

export function safeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function pickFirstNumber(...values: Array<unknown>) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return 0;
}

export function normalizePercentageValue(value: unknown, digits = 0) {
  const numeric = safeNumber(value, NaN);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const normalized = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return Number(normalized.toFixed(digits));
}

export function formatShortDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDateFormatter.format(date);
}

export function formatShortDateTime(value?: string | null) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDateTimeFormatter.format(date);
}

export function formatShortTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortTimeFormatter.format(date);
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return value;
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 1) return "just now";
  if (Math.abs(diffMinutes) < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function averageSensorReadings(nodes: SensorNode[] = []): SensorAverageSet {
  if (!nodes.length) {
    return {
      soilMoisture: 0,
      airTemperature: 0,
      humidity: 0,
      leafWetness: 0,
      windSpeed: 0,
      solarRadiation: 0,
      soilPh: 0
    };
  }

  const totals = nodes.reduce(
    (current, node) => ({
      soilMoisture: current.soilMoisture + safeNumber(node.readings.soilMoisture),
      airTemperature: current.airTemperature + safeNumber(node.readings.airTemperature),
      humidity: current.humidity + safeNumber(node.readings.humidity),
      leafWetness: current.leafWetness + safeNumber(node.readings.leafWetness),
      windSpeed: current.windSpeed + safeNumber(node.readings.windSpeed),
      solarRadiation: current.solarRadiation + safeNumber(node.readings.solarRadiation),
      soilPh: current.soilPh + safeNumber(node.readings.soilPh)
    }),
    {
      soilMoisture: 0,
      airTemperature: 0,
      humidity: 0,
      leafWetness: 0,
      windSpeed: 0,
      solarRadiation: 0,
      soilPh: 0
    }
  );

  return {
    soilMoisture: Number((totals.soilMoisture / nodes.length).toFixed(1)),
    airTemperature: Number((totals.airTemperature / nodes.length).toFixed(1)),
    humidity: Number((totals.humidity / nodes.length).toFixed(1)),
    leafWetness: Number((totals.leafWetness / nodes.length).toFixed(2)),
    windSpeed: Number((totals.windSpeed / nodes.length).toFixed(1)),
    solarRadiation: Number((totals.solarRadiation / nodes.length).toFixed(1)),
    soilPh: Number((totals.soilPh / nodes.length).toFixed(2))
  };
}

export function deriveWeatherScoreFromSensors(sensors: Partial<SensorAverageSet>) {
  const soilMoisture = pickFirstNumber(sensors.soilMoisture, 58);
  const humidity = pickFirstNumber(sensors.humidity, 68);
  const airTemperature = pickFirstNumber(sensors.airTemperature, 26);
  const leafWetness = pickFirstNumber(sensors.leafWetness, 0.32);

  const moistureFactor = clamp(soilMoisture / 65, 0.5, 1.05);
  const temperaturePenalty = Math.abs(airTemperature - 26) * 0.018;
  const humidityPenalty = humidity > 85 ? 0.08 : humidity < 45 ? 0.05 : 0;
  const wetnessPenalty = leafWetness > 0.7 ? 0.1 : leafWetness > 0.55 ? 0.05 : 0;

  return Number(clamp(0.86 + (moistureFactor - 0.8) * 0.35 - temperaturePenalty - humidityPenalty - wetnessPenalty, 0.45, 0.96).toFixed(2));
}

export function getAverageUnitWeightKg(cropType = "") {
  const profile = cropProfiles[normalizeCropKey(cropType)] || cropProfiles.generic;
  return profile.avgUnitWeightKg;
}

export function deriveSensorThresholds({
  cropType,
  growthStage,
  current,
  selectedField
}: {
  cropType?: string;
  growthStage?: string;
  current: SensorAverageSet;
  selectedField?: FieldSummary | null;
}) {
  const profile = cropProfiles[normalizeCropKey(cropType)] || cropProfiles.generic;
  const stage = normalizeStageKey(growthStage);
  const soilTarget = profile.irrigationTargets[stage] ?? cropProfiles.generic.irrigationTargets[stage];
  const thresholds = {
    soilMoisture: { min: Math.max(20, soilTarget - 12), target: soilTarget, max: Math.min(95, soilTarget + 10) },
    humidity: profile.humidity,
    airTemperature: profile.airTemperature,
    leafWetness: profile.leafWetness,
    windSpeed: profile.windSpeed,
    solarRadiation: profile.solarRadiation,
    soilPh: profile.soilPh
  };

  const definitions: Array<{ key: keyof SensorAverageSet; label: string; unit: string; helpText: string }> = [
    {
      key: "soilMoisture",
      label: "Soil moisture",
      unit: "%",
      helpText: `Recommended moisture band for ${cropType || selectedField?.cropType || "this crop"} during ${stage.replace(/_/g, " ")}.`
    },
    {
      key: "humidity",
      label: "Humidity",
      unit: "%",
      helpText: "Canopy humidity above the upper band increases disease pressure."
    },
    {
      key: "airTemperature",
      label: "Air temperature",
      unit: "C",
      helpText: "Field-air operating band used by disease and irrigation logic."
    },
    {
      key: "leafWetness",
      label: "Leaf wetness",
      unit: "idx",
      helpText: "Sustained wetness above the upper band increases foliar risk."
    },
    {
      key: "windSpeed",
      label: "Wind speed",
      unit: "km/h",
      helpText: "Wind affects evapotranspiration and spray timing."
    },
    {
      key: "solarRadiation",
      label: "Solar radiation",
      unit: "W/m2",
      helpText: "Photosynthetic load band derived from the current crop profile."
    },
    {
      key: "soilPh",
      label: "Soil pH",
      unit: "pH",
      helpText: "Root-zone acidity band used for nutrient uptake checks."
    }
  ];

  return definitions.map((definition) => {
    const currentValue = safeNumber(current[definition.key]);
    const band = thresholds[definition.key];
    const status =
      currentValue < band.min ? "low" : currentValue > band.max ? "high" : "optimal";
    const denominator = band.max - band.min || 1;
    const progress = clamp(((currentValue - band.min) / denominator) * 100, 0, 100);

    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      current: Number(currentValue.toFixed(definition.key === "leafWetness" || definition.key === "soilPh" ? 2 : 1)),
      min: band.min,
      target: band.target,
      max: band.max,
      status,
      progress,
      helpText: definition.helpText
    } satisfies SensorThreshold;
  });
}
