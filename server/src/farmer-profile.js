import { ObjectId } from 'mongodb';

export const FARM_SCHEME_STATUSES = ['not_applied', 'applied', 'pending', 'approved', 'rejected'];

export function defaultFarmerProfile(userId) {
  const now = new Date();
  return {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    createdAt: now,
    updatedAt: now,
    personal: {
      fullName: '',
      mobile: '',
      village: '',
      district: '',
      preferredLanguage: 'en',
    },
    land: {
      plotId: '',
      plotName: '',
      landAreaAcres: null,
      irrigationType: '',
      soilType: '',
    },
    season: {
      cropName: 'Tomato',
      sowingDate: '',
      expectedHarvestDate: '',
      notes: '',
    },
    schemes: {
      pmKisanStatus: 'not_applied',
      pmfbyStatus: 'not_applied',
      enamStatus: 'not_applied',
    },
    alerts: {
      harvestWindowReminder: true,
      marketForecastReminder: true,
    },
    consent: {
      shareAnalysisData: true,
      shareMarketData: true,
      allowAdvisorAccess: false,
      consentUpdatedAt: null,
    },
  };
}

export function sanitizeProfilePayload(input) {
  const statusSet = new Set(FARM_SCHEME_STATUSES);
  const trim = (v, max = 120) => String(v || '').trim().slice(0, max);

  const payload = {
    personal: {
      fullName: trim(input?.personal?.fullName, 120),
      mobile: trim(input?.personal?.mobile, 20),
      village: trim(input?.personal?.village, 120),
      district: trim(input?.personal?.district, 120),
      preferredLanguage: trim(input?.personal?.preferredLanguage, 40) || 'en',
    },
    land: {
      plotId: trim(input?.land?.plotId, 80),
      plotName: trim(input?.land?.plotName, 120),
      landAreaAcres:
        typeof input?.land?.landAreaAcres === 'number' && Number.isFinite(input.land.landAreaAcres)
          ? Math.max(0, Math.min(100000, input.land.landAreaAcres))
          : null,
      irrigationType: trim(input?.land?.irrigationType, 80),
      soilType: trim(input?.land?.soilType, 80),
    },
    season: {
      cropName: trim(input?.season?.cropName, 80),
      sowingDate: trim(input?.season?.sowingDate, 20),
      expectedHarvestDate: trim(input?.season?.expectedHarvestDate, 20),
      notes: trim(input?.season?.notes, 2000),
    },
    schemes: {
      pmKisanStatus: statusSet.has(input?.schemes?.pmKisanStatus) ? input.schemes.pmKisanStatus : 'not_applied',
      pmfbyStatus: statusSet.has(input?.schemes?.pmfbyStatus) ? input.schemes.pmfbyStatus : 'not_applied',
      enamStatus: statusSet.has(input?.schemes?.enamStatus) ? input.schemes.enamStatus : 'not_applied',
    },
    alerts: {
      harvestWindowReminder: Boolean(input?.alerts?.harvestWindowReminder),
      marketForecastReminder: Boolean(input?.alerts?.marketForecastReminder),
    },
    consent: {
      shareAnalysisData: Boolean(input?.consent?.shareAnalysisData),
      shareMarketData: Boolean(input?.consent?.shareMarketData),
      allowAdvisorAccess: Boolean(input?.consent?.allowAdvisorAccess),
    },
  };

  return payload;
}

export function toProfileResponse(doc) {
  return {
    personal: doc.personal,
    land: doc.land,
    season: doc.season,
    schemes: doc.schemes,
    alerts: doc.alerts,
    consent: {
      shareAnalysisData: doc.consent.shareAnalysisData,
      shareMarketData: doc.consent.shareMarketData,
      allowAdvisorAccess: doc.consent.allowAdvisorAccess,
      consentUpdatedAt: doc.consent.consentUpdatedAt ? doc.consent.consentUpdatedAt.toISOString() : null,
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
