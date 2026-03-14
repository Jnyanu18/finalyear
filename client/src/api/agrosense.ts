import { API_ORIGIN, API_V1_BASE } from "@/lib/api-base";
import { useAuthStore } from "@/store/authStore";
import type {
  AlertItem,
  AnalysisRun,
  FieldIndicesResponse,
  FieldMapResponse,
  FieldSummary,
  ForecastResponse,
  InsightsResponse,
  ModelStatusResponse,
  ReportRecord,
  RiskResponse,
  SensorHistoryResponse,
  SensorReadingsResponse
} from "@/types/agrosense";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const token = useAuthStore.getState().token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_V1_BASE}${path}`, {
    ...init,
    headers
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
    data?: T;
  };

  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${path}`);
  }

  return (payload.data || payload) as T;
}

export const agrosenseApi = {
  listFields: () => request<{ fields: FieldSummary[] }>("/fields"),
  getFieldMap: (fieldId: string) => request<FieldMapResponse>(`/fields/${fieldId}/map`),
  getFieldIndices: (fieldId: string) => request<FieldIndicesResponse>(`/fields/${fieldId}/indices`),
  getFieldSensors: (fieldId: string) => request<SensorReadingsResponse>(`/fields/${fieldId}/sensors`),
  getFieldSensorHistory: (fieldId: string, range: "24h" | "7d" | "30d", nodeId?: string) =>
    request<SensorHistoryResponse>(
      `/fields/${fieldId}/sensors/history?range=${range}${nodeId ? `&nodeId=${encodeURIComponent(nodeId)}` : ""}`
    ),
  getFieldRisk: (fieldId: string) => request<RiskResponse>(`/fields/${fieldId}/risk`),
  getFieldForecast: (fieldId: string) => request<ForecastResponse>(`/fields/${fieldId}/forecast`),
  getFieldInsights: (fieldId: string) => request<InsightsResponse>(`/fields/${fieldId}/insights`),
  listAlerts: () => request<{ alerts: AlertItem[] }>("/alerts"),
  acknowledgeAlert: (alertId: string) => request<{ alert: AlertItem }>(`/alerts/${alertId}/acknowledge`, { method: "POST" }),
  triggerAnalysis: (fieldId: string) => request<{ analysisRun: AnalysisRun }>(`/fields/${fieldId}/analyze`, { method: "POST" }),
  getModelStatus: () => request<ModelStatusResponse>("/models/status"),
  generateReport: (fieldId: string, start?: string, end?: string) =>
    request<{ report: ReportRecord }>(`/reports/${fieldId}${start || end ? `?start=${start || ""}&end=${end || ""}` : ""}`)
};

export const toAbsoluteAssetUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const origin = API_ORIGIN || window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};
