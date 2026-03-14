import { getCropProfile } from "../config/cropProfiles.js";

export const mandiCatalog = [
  { market: "Mysuru", distanceKm: 45, basePrice: 24.5 },
  { market: "Bengaluru", distanceKm: 150, basePrice: 27.2 },
  { market: "Mandya", distanceKm: 30, basePrice: 23.4 },
  { market: "Coimbatore", distanceKm: 220, basePrice: 26.6 },
  { market: "Salem", distanceKm: 190, basePrice: 25.9 }
];

export function cropPriceFactor(cropType = "Tomato") {
  const profile = getCropProfile(cropType);
  return Number(profile.marketPriceFactor || 1);
}

export function distanceTransportCost(distanceKm, quantityKg) {
  const fixed = 120;
  const variable = distanceKm * 2.4 + quantityKg * 0.35;
  return Math.round(fixed + variable);
}
