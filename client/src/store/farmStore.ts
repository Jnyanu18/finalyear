import { create } from "zustand";
import { persist } from "zustand/middleware";

type AnyObj = Record<string, any> | null;

type FarmState = {
  currentAnalysis: AnyObj;
  fieldSnapshot: AnyObj;
  yieldPrediction: AnyObj;
  diseaseRisk: AnyObj;
  irrigationAdvice: AnyObj;
  harvestPlan: AnyObj;
  storageAdvice: AnyObj;
  marketRecommendation: AnyObj;
  profitSimulation: AnyObj;
  setCurrentAnalysis: (value: AnyObj) => void;
  setFieldSnapshot: (value: AnyObj) => void;
  setPipeline: (value: AnyObj) => void;
  resetFarm: () => void;
};

const initialState = {
  currentAnalysis: null,
  fieldSnapshot: null,
  yieldPrediction: null,
  diseaseRisk: null,
  irrigationAdvice: null,
  harvestPlan: null,
  storageAdvice: null,
  marketRecommendation: null,
  profitSimulation: null
};

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentAnalysis: (value) => set({ currentAnalysis: value }),
      setFieldSnapshot: (value) => set({ fieldSnapshot: value }),
      setPipeline: (value) =>
        set({
          fieldSnapshot: value?.fieldContext ?? null,
          currentAnalysis: value?.cropAnalysis ?? null,
          yieldPrediction: value?.yieldPrediction ?? null,
          diseaseRisk: value?.disease ?? null,
          irrigationAdvice: value?.irrigation ?? null,
          harvestPlan: value?.harvest ?? null,
          storageAdvice: value?.storage ?? null,
          marketRecommendation: value?.market ?? null,
          profitSimulation: value?.profit ?? null
        }),
      resetFarm: () => set({ ...initialState })
    }),
    {
      name: "agri:zustand:farm"
    }
  )
);
