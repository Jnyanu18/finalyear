import { get, post, put } from "./api";

export const authApi = {
  register: (payload) => post("/auth/register", payload),
  login: (payload) => post("/auth/login", payload),
  me: () => get("/auth/me"),
  logout: () => post("/auth/logout", {})
};

export const profileApi = {
  get: () => get("/profile"),
  update: (payload) => put("/profile", payload)
};

export const modulesApi = {
  analyzePlant: (payload) => post("/analysis/plant", payload),
  yieldPredict: (payload) => post("/prediction/yield", payload),
  diseasePredict: (payload) => post("/prediction/disease", payload),
  irrigationRecommend: (payload) => post("/irrigation/recommend", payload),
  harvestPlan: (payload) => post("/harvest/plan", payload),
  storageAdvice: (payload) => post("/storage/advice", payload),
  marketBest: (payload) => post("/market/best", payload),
  profitSimulate: (payload) => post("/profit/simulate", payload),
  submitOutcome: (payload) => post("/outcome/submit", payload),
  advisorChat: (payload) => post("/advisor/chat", payload),
  reportSummary: () => get("/advisor/report"),
  createJob: (payload) => post("/jobs", payload),
  jobStatus: (jobId) => get(`/jobs/${jobId}`),
  jobs: () => get("/jobs"),
  systemMetrics: () => get("/system/metrics")
};
