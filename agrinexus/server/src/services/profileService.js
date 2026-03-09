import { FarmerProfile } from "../models/FarmerProfile.js";

function defaultProfile(userId) {
  return {
    userId,
    farmerName: "",
    location: "",
    village: "",
    state: "",
    landSize: 0,
    soilType: "",
    primaryCrop: "Tomato",
    irrigationSource: "",
    schemeEnrollment: [],
    alertPreferences: {
      sms: true,
      app: true,
      whatsapp: false
    }
  };
}

export async function getOrCreateProfile(userId) {
  let profile = await FarmerProfile.findOne({ userId }).lean();
  if (!profile) {
    profile = await FarmerProfile.create(defaultProfile(userId));
    profile = profile.toObject();
  }
  return profile;
}

export async function updateProfile(userId, payload) {
  const profile = await FarmerProfile.findOneAndUpdate(
    { userId },
    { $set: payload, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  return profile;
}
