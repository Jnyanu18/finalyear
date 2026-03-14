import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { agrosenseApi } from "@/api/agrosense";
import { getLatestAnalysis } from "@/lib/api";
import {
  averageSensorReadings,
  deriveWeatherScoreFromSensors,
  getAverageUnitWeightKg,
  normalizePercentageValue,
  pickFirstNumber,
  safeNumber
} from "@/lib/live-data";
import { useAgroSenseFields } from "@/hooks/useAgroSense";
import { useRealtimeSensors } from "@/hooks/useRealtimeSensors";
import { useAgroSenseStore } from "@/store/agrosenseStore";
import type { FieldSummary, SensorReadingsResponse } from "@/types/agrosense";

type RawStage = {
  stage?: string;
  count?: number;
};

type RawLatestAnalysis = {
  imageUrl?: string;
  cropType?: string;
  crop_type?: string;
  growthStage?: string;
  growth_stage?: string;
  fruitCount?: number | string;
  fruit_count?: number | string;
  healthStatus?: string;
  health_status?: string;
  healthScore?: number | string;
  health_score?: number | string;
  stages?: RawStage[];
  summary?: string;
  analysisDetails?: {
    cropMatchConfidence?: number | string;
    canopyDensity?: string;
    floweringLevel?: string;
    analysisSource?: string;
  };
  analysis_details?: {
    cropMatchConfidence?: number | string;
    canopyDensity?: string;
    floweringLevel?: string;
    analysisSource?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  raw?: {
    _source?: string;
  };
};

type LatestFieldSnapshot = {
  capturedAt?: string;
  fieldContext?: {
    crop?: string;
    cropStage?: string;
    acres?: number;
    plantsPerAcre?: number;
    sensorReadings?: {
      soilMoisture?: number;
      temperatureC?: number;
      humidityRh?: number;
      leafColorScore?: number;
      capturedAt?: string;
    };
    weather?: {
      temperatureC?: number;
      humidityRh?: number;
      rainfallMm?: number;
      rainProbability?: number;
      et0Mm?: number;
      capturedAt?: string;
    };
    market?: {
      location?: string;
      pricePerKg?: number;
      capturedAt?: string;
    };
    capturedAt?: string;
  };
};

type LatestAnalysisBundle = {
  analysis?: RawLatestAnalysis | null;
  fieldSnapshot?: LatestFieldSnapshot | null;
};

export interface ConnectedFarmDefaults {
  cropType: string;
  growthStage: string;
  fruitCount: number;
  healthStatus: string;
  healthScore: number;
  cropMatchConfidence: number;
  canopyDensity: string;
  floweringLevel: string;
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  leafWetness: number;
  windSpeed: number;
  solarRadiation: number;
  soilPh: number;
  weatherScore: number;
  rainForecastMm: number;
  rainProbability: number;
  marketLocation: string;
  marketPricePerKg: number;
  acres: number;
  plantsPerAcre: number;
  avgUnitWeightKg: number;
  updatedAt: string | null;
}

function mapLatestAnalysis(raw: RawLatestAnalysis | null | undefined) {
  if (!raw) {
    return null;
  }

  const details = raw.analysisDetails || raw.analysis_details || {};
  return {
    imageUrl: raw.imageUrl || "",
    cropType: raw.cropType || raw.crop_type || "Tomato",
    growthStage: raw.growthStage || raw.growth_stage || "fruit development",
    fruitCount: safeNumber(raw.fruitCount ?? raw.fruit_count, 0),
    healthStatus: raw.healthStatus || raw.health_status || "moderate",
    healthScore: normalizePercentageValue(raw.healthScore ?? raw.health_score, 0),
    cropMatchConfidence: normalizePercentageValue(details.cropMatchConfidence, 0),
    canopyDensity: details.canopyDensity || "unknown",
    floweringLevel: details.floweringLevel || "unknown",
    stages: Array.isArray(raw.stages)
      ? raw.stages.map((stage) => ({
          stage: String(stage.stage || "unknown"),
          count: safeNumber(stage.count, 0)
        }))
      : [],
    summary: raw.summary || "",
    analysisSource: details.analysisSource || raw.raw?._source || "unknown",
    updatedAt: raw.updatedAt || raw.createdAt || null
  };
}

async function fetchLatestAnalysisBundle() {
  const response = await getLatestAnalysis();
  if (!response.success) {
    return {
      analysis: null,
      fieldSnapshot: null
    } satisfies LatestAnalysisBundle;
  }
  return (response.data || {
    analysis: null,
    fieldSnapshot: null
  }) as LatestAnalysisBundle;
}

export function useConnectedFarmContext() {
  const { data: fieldsData, isLoading: isFieldsLoading } = useAgroSenseFields();
  const { selectedFieldId, setSelectedFieldId } = useAgroSenseStore();
  const latestAnalysisQuery = useQuery({
    queryKey: ["agrinexus", "latest-analysis"],
    queryFn: fetchLatestAnalysisBundle,
    staleTime: 30_000
  });
  const sensorsQuery = useQuery({
    queryKey: ["agrosense", selectedFieldId, "sensors"],
    queryFn: () => agrosenseApi.getFieldSensors(selectedFieldId),
    enabled: Boolean(selectedFieldId),
    refetchInterval: 30_000
  });
  const realtime = useRealtimeSensors(selectedFieldId);

  const fields = useMemo(() => fieldsData?.fields || [], [fieldsData?.fields]);

  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId, setSelectedFieldId]);

  const selectedField = useMemo<FieldSummary | null>(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  const latestAnalysis = useMemo(
    () => mapLatestAnalysis(latestAnalysisQuery.data?.analysis),
    [latestAnalysisQuery.data?.analysis]
  );
  const fieldSnapshot = latestAnalysisQuery.data?.fieldSnapshot || null;
  const fieldContext = fieldSnapshot?.fieldContext || null;
  const sensorsData = useMemo(
    () => ((realtime.sensors || sensorsQuery.data) as SensorReadingsResponse | undefined),
    [realtime.sensors, sensorsQuery.data]
  );
  const sensorAverages = useMemo(
    () => averageSensorReadings(sensorsData?.nodes || []),
    [sensorsData?.nodes]
  );

  const liveDefaults = useMemo<ConnectedFarmDefaults>(() => {
    const cropType =
      latestAnalysis?.cropType ||
      fieldContext?.crop ||
      selectedField?.cropType ||
      "Tomato";
    const growthStage =
      latestAnalysis?.growthStage ||
      fieldContext?.cropStage ||
      "fruit development";
    const fruitCount = latestAnalysis?.fruitCount || 0;
    const soilMoisture = pickFirstNumber(
      sensorAverages.soilMoisture,
      fieldContext?.sensorReadings?.soilMoisture,
      selectedField?.overview.soilMoisturePct,
      58
    );
    const airTemperature = pickFirstNumber(
      sensorAverages.airTemperature,
      fieldContext?.sensorReadings?.temperatureC,
      fieldContext?.weather?.temperatureC,
      26
    );
    const humidity = pickFirstNumber(
      sensorAverages.humidity,
      fieldContext?.sensorReadings?.humidityRh,
      fieldContext?.weather?.humidityRh,
      selectedField?.overview.avgHumidityPct,
      68
    );
    const leafWetness = pickFirstNumber(
      sensorAverages.leafWetness,
      selectedField?.overview.avgLeafWetness,
      0.32
    );
    const windSpeed = pickFirstNumber(sensorAverages.windSpeed, 7.5);
    const solarRadiation = pickFirstNumber(sensorAverages.solarRadiation, 540);
    const soilPh = pickFirstNumber(sensorAverages.soilPh, 6.5);

    return {
      cropType,
      growthStage,
      fruitCount,
      healthStatus: latestAnalysis?.healthStatus || "moderate",
      healthScore: latestAnalysis?.healthScore || 0,
      cropMatchConfidence: latestAnalysis?.cropMatchConfidence || 0,
      canopyDensity: latestAnalysis?.canopyDensity || "unknown",
      floweringLevel: latestAnalysis?.floweringLevel || "unknown",
      soilMoisture,
      airTemperature,
      humidity,
      leafWetness,
      windSpeed,
      solarRadiation,
      soilPh,
      weatherScore: deriveWeatherScoreFromSensors({
        soilMoisture,
        airTemperature,
        humidity,
        leafWetness
      }),
      rainForecastMm: pickFirstNumber(fieldContext?.weather?.rainfallMm, 0),
      rainProbability: pickFirstNumber(fieldContext?.weather?.rainProbability, 0.2),
      marketLocation: fieldContext?.market?.location || "Bengaluru",
      marketPricePerKg: pickFirstNumber(fieldContext?.market?.pricePerKg, 20),
      acres: pickFirstNumber(fieldContext?.acres, 1),
      plantsPerAcre: pickFirstNumber(fieldContext?.plantsPerAcre, 4500),
      avgUnitWeightKg: getAverageUnitWeightKg(cropType),
      updatedAt:
        sensorsData?.updatedAt ||
        latestAnalysis?.updatedAt ||
        fieldSnapshot?.capturedAt ||
        fieldContext?.capturedAt ||
        fieldContext?.sensorReadings?.capturedAt ||
        fieldContext?.weather?.capturedAt ||
        fieldContext?.market?.capturedAt ||
        null
    };
  }, [fieldContext, fieldSnapshot?.capturedAt, latestAnalysis, selectedField, sensorAverages, sensorsData?.updatedAt]);

  const liveFieldContext = useMemo(
    () => ({
      crop: liveDefaults.cropType,
      cropStage: liveDefaults.growthStage,
      acres: liveDefaults.acres,
      plantsPerAcre: liveDefaults.plantsPerAcre,
      sensorReadings: {
        soilMoisture: liveDefaults.soilMoisture,
        temperatureC: liveDefaults.airTemperature,
        humidityRh: liveDefaults.humidity,
        leafColorScore: liveDefaults.healthScore ? Number((liveDefaults.healthScore / 100).toFixed(2)) : undefined,
        capturedAt: liveDefaults.updatedAt
      },
      weather: {
        temperatureC: fieldContext?.weather?.temperatureC ?? liveDefaults.airTemperature,
        humidityRh: fieldContext?.weather?.humidityRh ?? liveDefaults.humidity,
        rainfallMm: liveDefaults.rainForecastMm,
        rainProbability: liveDefaults.rainProbability,
        et0Mm: fieldContext?.weather?.et0Mm ?? null,
        capturedAt: fieldContext?.weather?.capturedAt || liveDefaults.updatedAt
      },
      market: {
        location: liveDefaults.marketLocation,
        pricePerKg: liveDefaults.marketPricePerKg,
        capturedAt: fieldContext?.market?.capturedAt || liveDefaults.updatedAt
      },
      capturedAt: liveDefaults.updatedAt
    }),
    [fieldContext?.market?.capturedAt, fieldContext?.weather?.capturedAt, fieldContext?.weather?.et0Mm, liveDefaults]
  );

  return {
    fields,
    selectedFieldId,
    setSelectedFieldId,
    selectedField,
    sensorsData,
    sensorAverages,
    latestAnalysis,
    fieldSnapshot,
    fieldContext,
    liveDefaults,
    liveFieldContext,
    realtimeStatus: realtime.status,
    isLoading: isFieldsLoading || latestAnalysisQuery.isLoading || (Boolean(selectedFieldId) && sensorsQuery.isLoading)
  };
}
