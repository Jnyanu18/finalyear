function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function calculateHarvestForecast(analysis, controls) {
  const stageCounts = (analysis?.stages || []).reduce((acc, s) => {
    acc[String(s.stage || '').toLowerCase()] = Number(s.count) || 0;
    return acc;
  }, {});

  const avgWeightG = Number(controls?.avgWeightG || 85);
  const postHarvestLossPct = Number(controls?.postHarvestLossPct || 7);
  const numPlants = Number(controls?.numPlants || 10);
  const forecastDays = Number(controls?.forecastDays || 14);
  const gddBaseC = Number(controls?.gddBaseC || 10);
  const harvestCapacityKgDay = Number(controls?.harvestCapacityKgDay || 20);

  const totalDetections =
    (stageCounts.immature || 0) +
    (stageCounts.ripening || 0) +
    (stageCounts.mature || 0) +
    (stageCounts.breaker || 0) +
    (stageCounts.pink || 0);

  const yieldNowKgPerPlant = ((stageCounts.mature || 0) * avgWeightG) / 1000;
  const yieldNowKg = yieldNowKgPerPlant * numPlants;
  const sellableKg = yieldNowKg * (1 - postHarvestLossPct / 100);

  const daily = [];
  const breakerGDD = 70;
  const ripeningGDD = 80;
  const pinkGDD = 40;
  const maturingGDD = 55;

  let immatureCount = stageCounts.immature || 0;
  let breakerCount = stageCounts.breaker || 0;
  let ripeningCount = stageCounts.ripening || 0;
  let pinkCount = stageCounts.pink || 0;
  let cumGDD = 0;

  for (let i = 0; i < forecastDays; i += 1) {
    const date = addDays(new Date(), i);
    const dailyGDD = gddBaseC / 2 + Math.random() * 8;
    cumGDD += dailyGDD;

    const newBreaker = immatureCount * Math.min(1, dailyGDD / breakerGDD);
    const newRipening = breakerCount * Math.min(1, dailyGDD / ripeningGDD);
    const newPink = ripeningCount * Math.min(1, dailyGDD / pinkGDD);
    const newMature = pinkCount * Math.min(1, dailyGDD / maturingGDD);

    immatureCount -= newBreaker;
    breakerCount += newBreaker - newRipening;
    ripeningCount += newRipening - newPink;
    pinkCount += newPink - newMature;
    const matureCount = totalDetections - immatureCount - breakerCount - ripeningCount - pinkCount;

    daily.push({
      date: isoDate(date),
      ready_kg: (matureCount * avgWeightG / 1000) * numPlants,
      gdd_cum: cumGDD,
    });
  }

  const harvestPlan = [];
  let cumulativeReadyKg = 0;
  let lastHarvestedKg = 0;
  for (const day of daily) {
    cumulativeReadyKg += day.ready_kg - lastHarvestedKg;
    const canHarvest = Math.min(cumulativeReadyKg, harvestCapacityKgDay);
    if (canHarvest > 0.1) {
      harvestPlan.push({
        date: day.date,
        harvest_kg: canHarvest,
      });
      cumulativeReadyKg -= canHarvest;
    }
    lastHarvestedKg = day.ready_kg;
  }

  const harvestWindow =
    harvestPlan.length > 0
      ? { start: harvestPlan[0].date, end: harvestPlan[harvestPlan.length - 1].date }
      : undefined;

  return {
    yield_now_kg: yieldNowKg,
    sellable_kg: sellableKg,
    daily,
    harvest_plan: harvestPlan,
    harvestWindow,
    notes: [
      'Forecast assumes average daily growth heat units.',
      `Harvest plan is optimized for capacity ${harvestCapacityKgDay} kg/day.`,
    ],
  };
}
