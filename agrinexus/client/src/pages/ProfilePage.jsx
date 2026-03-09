import { useEffect, useState } from "react";
import { AppCard } from "../components/AppCard";
import { ActionButton, FormField, TextInput } from "../components/FormField";
import { profileApi } from "../services/moduleApi";
import { useModuleAction } from "../hooks/useModuleAction";

const emptyProfile = {
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

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [schemeText, setSchemeText] = useState("");
  const saveMutation = useModuleAction(profileApi.update);

  useEffect(() => {
    profileApi
      .get()
      .then((data) => {
        const p = data.profile || emptyProfile;
        setProfile(p);
        setSchemeText((p.schemeEnrollment || []).join(", "));
      })
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...profile,
      landSize: Number(profile.landSize),
      schemeEnrollment: schemeText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    };
    saveMutation.mutate(payload);
  };

  if (loading) {
    return <AppCard title="Farmer Profile">Loading profile...</AppCard>;
  }

  return (
    <AppCard title="Farmer Profile System" subtitle="Context data used for personalized intelligence">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
        {[
          "farmerName",
          "location",
          "village",
          "state",
          "landSize",
          "soilType",
          "primaryCrop",
          "irrigationSource"
        ].map((key) => (
          <FormField key={key} label={key}>
            <TextInput value={profile[key]} onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))} />
          </FormField>
        ))}
        <FormField label="schemeEnrollment (comma separated)">
          <TextInput value={schemeText} onChange={(e) => setSchemeText(e.target.value)} />
        </FormField>
        <div className="md:col-span-3 flex gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={profile.alertPreferences.sms}
              onChange={(e) =>
                setProfile((p) => ({ ...p, alertPreferences: { ...p.alertPreferences, sms: e.target.checked } }))
              }
            />
            SMS alerts
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={profile.alertPreferences.app}
              onChange={(e) =>
                setProfile((p) => ({ ...p, alertPreferences: { ...p.alertPreferences, app: e.target.checked } }))
              }
            />
            App alerts
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={profile.alertPreferences.whatsapp}
              onChange={(e) =>
                setProfile((p) => ({ ...p, alertPreferences: { ...p.alertPreferences, whatsapp: e.target.checked } }))
              }
            />
            WhatsApp alerts
          </label>
        </div>
        <div className="md:col-span-3">
          <ActionButton type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </ActionButton>
        </div>
      </form>
      {saveMutation.error ? <p className="mt-2 text-sm text-red-400">{saveMutation.error.message}</p> : null}
      {saveMutation.isSuccess ? <p className="mt-2 text-sm text-brand-300">Profile saved successfully.</p> : null}
    </AppCard>
  );
}
