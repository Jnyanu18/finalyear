import mongoose from "mongoose";

const farmerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    personal: {
      fullName: { type: String, default: "" },
      mobile: { type: String, default: "" },
      village: { type: String, default: "" },
      district: { type: String, default: "" },
      preferredLanguage: { type: String, default: "en" }
    },
    land: {
      plotId: { type: String, default: "" },
      plotName: { type: String, default: "" },
      landAreaAcres: { type: Number, default: null },
      irrigationType: { type: String, default: "" },
      soilType: { type: String, default: "" }
    },
    season: {
      cropName: { type: String, default: "Tomato" },
      sowingDate: { type: String, default: "" },
      expectedHarvestDate: { type: String, default: "" },
      notes: { type: String, default: "" }
    },
    schemes: {
      pmKisanStatus: { type: String, default: "not_applied" },
      pmfbyStatus: { type: String, default: "not_applied" },
      enamStatus: { type: String, default: "not_applied" }
    },
    alerts: {
      harvestWindowReminder: { type: Boolean, default: true },
      marketForecastReminder: { type: Boolean, default: true }
    },
    consent: {
      shareAnalysisData: { type: Boolean, default: true },
      shareMarketData: { type: Boolean, default: true },
      allowAdvisorAccess: { type: Boolean, default: true },
      consentUpdatedAt: { type: Date, default: null }
    },
    farmerName: { type: String, default: "" },
    location: { type: String, default: "" },
    village: { type: String, default: "" },
    state: { type: String, default: "" },
    landSize: { type: Number, default: 0 },
    soilType: { type: String, default: "" },
    primaryCrop: { type: String, default: "Tomato" },
    irrigationSource: { type: String, default: "" },
    schemeEnrollment: { type: [String], default: [] },
    alertPreferences: {
      sms: { type: Boolean, default: true },
      app: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    collection: "farmer_profiles"
  }
);

export const FarmerProfile = mongoose.model("FarmerProfile", farmerProfileSchema);
