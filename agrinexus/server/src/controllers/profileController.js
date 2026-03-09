import { z } from "zod";
import { getOrCreateProfile, updateProfile } from "../services/profileService.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const profileSchema = z.object({
  farmerName: z.string().max(120),
  location: z.string().max(120),
  village: z.string().max(120),
  state: z.string().max(120),
  landSize: z.number().min(0).max(100000),
  soilType: z.string().max(80),
  primaryCrop: z.string().max(80),
  irrigationSource: z.string().max(80),
  schemeEnrollment: z.array(z.string().max(80)).max(20),
  alertPreferences: z.object({
    sms: z.boolean(),
    app: z.boolean(),
    whatsapp: z.boolean()
  })
});

export async function getProfile(req, res) {
  const profile = await getOrCreateProfile(req.user.id);
  return sendSuccess(res, { profile });
}

export async function putProfile(req, res) {
  const payload = profileSchema.parse(req.body);
  const profile = await updateProfile(req.user.id, payload);
  return sendSuccess(res, { profile }, "Profile updated.");
}
