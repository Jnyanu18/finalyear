import { create } from "zustand";

interface AgroSenseState {
  selectedFieldId: string;
  sensorRange: "24h" | "7d" | "30d";
  setSelectedFieldId: (fieldId: string) => void;
  setSensorRange: (range: "24h" | "7d" | "30d") => void;
}

export const useAgroSenseStore = create<AgroSenseState>((set) => ({
  selectedFieldId: "",
  sensorRange: "24h",
  setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
  setSensorRange: (sensorRange) => set({ sensorRange })
}));
