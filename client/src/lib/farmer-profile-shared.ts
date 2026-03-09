export const FARM_SCHEME_STATUSES = ['not_applied', 'applied', 'pending', 'approved', 'rejected'] as const;
export type FarmSchemeStatus = (typeof FARM_SCHEME_STATUSES)[number];

export type FarmerProfilePayload = {
  personal: {
    fullName: string;
    mobile: string;
    village: string;
    district: string;
    preferredLanguage: string;
  };
  land: {
    plotId: string;
    plotName: string;
    landAreaAcres: number | null;
    irrigationType: string;
    soilType: string;
  };
  season: {
    cropName: string;
    sowingDate: string;
    expectedHarvestDate: string;
    notes: string;
  };
  schemes: {
    pmKisanStatus: FarmSchemeStatus;
    pmfbyStatus: FarmSchemeStatus;
    enamStatus: FarmSchemeStatus;
  };
  alerts: {
    harvestWindowReminder: boolean;
    marketForecastReminder: boolean;
  };
  consent: {
    shareAnalysisData: boolean;
    shareMarketData: boolean;
    allowAdvisorAccess: boolean;
  };
};

export type FarmerProfileResponse = FarmerProfilePayload & {
  consent: FarmerProfilePayload['consent'] & {
    consentUpdatedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
};
