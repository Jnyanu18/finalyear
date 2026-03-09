export const CROP_MODEL_CONFIG = {
  tomato: {
    spacingSqmPerPlant: 0.5,
    defaultFruitWeightKg: 0.09,
    yieldModel: "yield_model_v2",
    diseaseModel: "disease_model_v2",
    irrigationModel: "irrigation_model_v2",
    harvestModel: "harvest_model_v2",
    marketModel: "market_model_v2",
    profitModel: "profit_model_v2",
    stageSusceptibility: {
      seedling: 0.35,
      vegetative: 0.45,
      flowering: 0.65,
      fruiting: 0.8,
      ripe: 0.7,
      "harvest-ready": 0.72
    },
    moistureBands: {
      seedling: { min: 60, target: 70, max: 82 },
      vegetative: { min: 55, target: 65, max: 80 },
      flowering: { min: 58, target: 68, max: 82 },
      fruiting: { min: 60, target: 70, max: 84 },
      ripe: { min: 52, target: 62, max: 78 },
      "harvest-ready": { min: 48, target: 58, max: 75 }
    }
  }
};

export function getCropConfig(cropType = "tomato") {
  const key = String(cropType).toLowerCase();
  return CROP_MODEL_CONFIG[key] || CROP_MODEL_CONFIG.tomato;
}
