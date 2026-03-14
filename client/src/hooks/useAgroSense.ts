import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { agrosenseApi } from "@/api/agrosense";
import type { AlertItem } from "@/types/agrosense";

export function useAgroSenseFields() {
  return useQuery({
    queryKey: ["agrosense", "fields"],
    queryFn: agrosenseApi.listFields,
    staleTime: 60_000
  });
}

export function useAgroSenseAlerts() {
  return useQuery({
    queryKey: ["agrosense", "alerts"],
    queryFn: agrosenseApi.listAlerts,
    refetchInterval: 20_000
  });
}

export function useAgroSenseModels() {
  return useQuery({
    queryKey: ["agrosense", "models"],
    queryFn: agrosenseApi.getModelStatus,
    staleTime: 60_000
  });
}

export function useAgroSenseFieldBundle(fieldId: string, range: "24h" | "7d" | "30d") {
  const results = useQueries({
    queries: [
      { queryKey: ["agrosense", fieldId, "map"], queryFn: () => agrosenseApi.getFieldMap(fieldId), enabled: Boolean(fieldId) },
      { queryKey: ["agrosense", fieldId, "indices"], queryFn: () => agrosenseApi.getFieldIndices(fieldId), enabled: Boolean(fieldId) },
      { queryKey: ["agrosense", fieldId, "sensors"], queryFn: () => agrosenseApi.getFieldSensors(fieldId), enabled: Boolean(fieldId), refetchInterval: 30_000 },
      { queryKey: ["agrosense", fieldId, "history", range], queryFn: () => agrosenseApi.getFieldSensorHistory(fieldId, range), enabled: Boolean(fieldId) },
      { queryKey: ["agrosense", fieldId, "risk"], queryFn: () => agrosenseApi.getFieldRisk(fieldId), enabled: Boolean(fieldId) },
      { queryKey: ["agrosense", fieldId, "forecast"], queryFn: () => agrosenseApi.getFieldForecast(fieldId), enabled: Boolean(fieldId) },
      { queryKey: ["agrosense", fieldId, "insights"], queryFn: () => agrosenseApi.getFieldInsights(fieldId), enabled: Boolean(fieldId) }
    ]
  });

  return useMemo(() => ({
    map: results[0],
    indices: results[1],
    sensors: results[2],
    sensorHistory: results[3],
    risk: results[4],
    forecast: results[5],
    insights: results[6],
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.error)?.error
  }), [results]);
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => agrosenseApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agrosense", "alerts"] });
    }
  });
}

export function useTriggerFieldAnalysis(fieldId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => agrosenseApi.triggerAnalysis(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agrosense", fieldId] });
      queryClient.invalidateQueries({ queryKey: ["agrosense", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["agrosense", "models"] });
    }
  });
}

export function getHighestSeverityAlert(alerts: AlertItem[]) {
  const severityRank: Record<AlertItem["severity"], number> = {
    info: 1,
    watch: 2,
    warning: 3,
    critical: 4
  };
  return [...alerts].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0] || null;
}
