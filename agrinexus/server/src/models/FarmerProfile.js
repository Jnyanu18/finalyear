import mongoose from "mongoose";

const farmerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
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
