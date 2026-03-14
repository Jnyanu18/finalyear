const DEFAULT_PROFILE = {
  key: "generic",
  label: "Generic Crop",
  avgUnitWeightKg: 0.08,
  shelfLifeDays: 6,
  marketPriceFactor: 1,
  typicalUnitsPerPlant: 18,
  irrigationTargets: {
    seedling: 68,
    vegetative: 63,
    flowering: 66,
    fruit_development: 65,
    ripening: 58,
    harvest_ready: 54
  },
  disease: {
    humidWarm: "General Fungal Risk",
    humidCool: "Leaf Spot Risk",
    dryHot: "Stress-related Disease Risk",
    default: "General Crop Disease"
  }
};

const CROP_PROFILES = {
  tomato: {
    label: "Tomato",
    avgUnitWeightKg: 0.09,
    shelfLifeDays: 4,
    marketPriceFactor: 1,
    typicalUnitsPerPlant: 24,
    disease: {
      humidWarm: "Tomato Blight",
      humidCool: "Early Blight Risk",
      dryHot: "Wilt Risk",
      default: "Tomato Disease Risk"
    }
  },
  chilli: {
    label: "Chilli",
    avgUnitWeightKg: 0.015,
    shelfLifeDays: 5,
    marketPriceFactor: 1.35,
    typicalUnitsPerPlant: 85,
    disease: {
      humidWarm: "Anthracnose Risk",
      humidCool: "Leaf Curl Risk",
      dryHot: "Mite/Thrips Stress Risk",
      default: "Chilli Disease Risk"
    }
  },
  rice: {
    label: "Rice",
    avgUnitWeightKg: 0.03,
    shelfLifeDays: 22,
    marketPriceFactor: 0.95,
    typicalUnitsPerPlant: 16,
    irrigationTargets: {
      seedling: 76,
      vegetative: 72,
      flowering: 74,
      fruit_development: 70,
      ripening: 62,
      harvest_ready: 56
    },
    disease: {
      humidWarm: "Rice Blast Risk",
      humidCool: "Sheath Blight Risk",
      dryHot: "Brown Spot Risk",
      default: "Rice Disease Risk"
    }
  },
  wheat: {
    label: "Wheat",
    avgUnitWeightKg: 0.04,
    shelfLifeDays: 26,
    marketPriceFactor: 0.9,
    typicalUnitsPerPlant: 12,
    irrigationTargets: {
      seedling: 62,
      vegetative: 60,
      flowering: 62,
      fruit_development: 59,
      ripening: 54,
      harvest_ready: 50
    },
    disease: {
      humidWarm: "Rust Risk",
      humidCool: "Powdery Mildew Risk",
      dryHot: "Heat Stress Disease Risk",
      default: "Wheat Disease Risk"
    }
  },
  potato: {
    label: "Potato",
    avgUnitWeightKg: 0.11,
    shelfLifeDays: 30,
    marketPriceFactor: 0.82,
    typicalUnitsPerPlant: 10,
    disease: {
      humidWarm: "Late Blight Risk",
      humidCool: "Early Blight Risk",
      dryHot: "Scab Risk",
      default: "Potato Disease Risk"
    }
  },
  onion: {
    label: "Onion",
    avgUnitWeightKg: 0.08,
    shelfLifeDays: 20,
    marketPriceFactor: 0.8,
    typicalUnitsPerPlant: 9,
    disease: {
      humidWarm: "Purple Blotch Risk",
      humidCool: "Downy Mildew Risk",
      dryHot: "Thrips Stress Risk",
      default: "Onion Disease Risk"
    }
  },
  cotton: {
    label: "Cotton",
    avgUnitWeightKg: 0.02,
    shelfLifeDays: 18,
    marketPriceFactor: 1.1,
    typicalUnitsPerPlant: 35,
    irrigationTargets: {
      seedling: 62,
      vegetative: 58,
      flowering: 60,
      fruit_development: 58,
      ripening: 50,
      harvest_ready: 48
    },
    disease: {
      humidWarm: "Boll Rot Risk",
      humidCool: "Leaf Spot Risk",
      dryHot: "Wilt/Stress Risk",
      default: "Cotton Disease Risk"
    }
  },
  maize: {
    label: "Maize",
    avgUnitWeightKg: 0.18,
    shelfLifeDays: 14,
    marketPriceFactor: 0.88,
    typicalUnitsPerPlant: 2,
    irrigationTargets: {
      seedling: 64,
      vegetative: 60,
      flowering: 63,
      fruit_development: 61,
      ripening: 55,
      harvest_ready: 50
    },
    disease: {
      humidWarm: "Leaf Blight Risk",
      humidCool: "Rust Risk",
      dryHot: "Stalk Rot Risk",
      default: "Maize Disease Risk"
    }
  },
  brinjal: {
    label: "Brinjal",
    avgUnitWeightKg: 0.12,
    shelfLifeDays: 6,
    marketPriceFactor: 1.05,
    typicalUnitsPerPlant: 22,
    disease: {
      humidWarm: "Phomopsis Blight Risk",
      humidCool: "Leaf Spot Risk",
      dryHot: "Borer Stress Risk",
      default: "Brinjal Disease Risk"
    }
  },
  cabbage: {
    label: "Cabbage",
    avgUnitWeightKg: 0.9,
    shelfLifeDays: 12,
    marketPriceFactor: 0.92,
    typicalUnitsPerPlant: 1,
    disease: {
      humidWarm: "Black Rot Risk",
      humidCool: "Downy Mildew Risk",
      dryHot: "Tip Burn/Stress Risk",
      default: "Cabbage Disease Risk"
    }
  }
};

function normalizeCropKey(cropType = "") {
  const key = String(cropType || "").trim().toLowerCase();
  if (!key) return "generic";
  if (key.includes("chilli") || key.includes("chili")) return "chilli";
  if (key.includes("eggplant")) return "brinjal";
  return key;
}

function normalizeStageKey(stageRaw = "") {
  const stage = String(stageRaw || "").toLowerCase();
  if (stage.includes("seed")) return "seedling";
  if (stage.includes("veget")) return "vegetative";
  if (stage.includes("flower")) return "flowering";
  if (stage.includes("fruit")) return "fruit_development";
  if (stage.includes("ripen")) return "ripening";
  if (stage.includes("harvest")) return "harvest_ready";
  return "fruit_development";
}

export function getCropProfile(cropType = "") {
  const key = normalizeCropKey(cropType);
  return {
    ...DEFAULT_PROFILE,
    ...(CROP_PROFILES[key] || {}),
    key
  };
}

export function getIrrigationTargetForStage(cropType, stageRaw) {
  const profile = getCropProfile(cropType);
  const stage = normalizeStageKey(stageRaw);
  return profile.irrigationTargets?.[stage] ?? DEFAULT_PROFILE.irrigationTargets[stage] ?? 62;
}

export function getDiseaseLabel(cropType, humidityFactor, temperatureFactor) {
  const profile = getCropProfile(cropType);
  const d = profile.disease || DEFAULT_PROFILE.disease;
  if (humidityFactor > 0.65 && temperatureFactor > 0.55) return d.humidWarm || d.default;
  if (humidityFactor > 0.6 && temperatureFactor <= 0.55) return d.humidCool || d.default;
  if (humidityFactor < 0.35 && temperatureFactor > 0.55) return d.dryHot || d.default;
  return d.default || "General Crop Disease";
}

