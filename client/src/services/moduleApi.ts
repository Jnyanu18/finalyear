import { get, post, put } from "./api";

export const authApi = {
  // Use Next.js auth routes
  register: (payload: any) => post("/api/auth/register", payload),
  login: (payload: any) => post("/api/auth/login", payload),
  me: () => get("/api/auth/me"),
  logout: () => post("/api/auth/logout", {})
};

export const profileApi = {
  get: () => get("/api/profile"),
  update: (payload: any) => put("/api/profile", payload)
};

export const modulesApi = {
  analyzePlant: (payload: any) => post("/api/v1/analysis/plant", payload),
  yieldPredict: (payload: any) => post("/api/v1/prediction/yield", payload),
  diseasePredict: (payload: any) => post("/api/v1/prediction/disease", payload),
  irrigationRecommend: (payload: any) => post("/api/v1/irrigation/recommend", payload),
  harvestPlan: (payload: any) => post("/api/v1/harvest/plan", payload),
  storageAdvice: (payload: any) => post("/api/v1/storage/advice", payload),
  marketBest: (payload: any) => post("/api/v1/market/best", payload),
  profitSimulate: (payload: any) => post("/api/v1/profit/simulate", payload),
  submitOutcome: (payload: any) => post("/api/v1/outcome/submit", payload),
  advisorChat: (payload: any) => post("/api/v1/advisor/chat", payload),
  reportSummary: () => get("/api/v1/advisor/report")
};
