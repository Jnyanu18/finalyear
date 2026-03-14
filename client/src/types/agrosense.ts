export interface FieldSummary {
  id: string;
  orgId: string;
  name: string;
  cropType: string;
  areaHa: number;
  plantedAt: string;
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt: string;
  locationGeojson: GeoJsonFeature;
  overview: FieldOverview;
  soil: SoilHealth;
  activeAlerts: number;
}

export interface FieldOverview {
  avgNdvi: number;
  soilMoisturePct: number;
  activeStressZones: number;
  peakPestRiskPct: number;
  avgHumidityPct: number;
  avgLeafWetness: number;
}

export interface SoilHealth {
  score: number;
  degradationTrend: "improving" | "stable" | "declining";
}

export interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][];
  };
  properties: Record<string, string | number | boolean | null>;
  center?: {
    lat: number;
    lng: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: string;
  features: GeoJsonFeature[];
}

export interface FieldMapResponse {
  fieldId: string;
  name: string;
  updatedAt: string;
  geojson: GeoJsonFeatureCollection;
}

export interface SpectralBand {
  wavelengthNm: number;
  mean: number;
  min: number;
  max: number;
  histogram: Array<{ bucket: number; value: number }>;
}

export interface ZoneIndex {
  zoneId: string;
  zoneLabel: string;
  status: string;
  ndvi: number;
  ndre: number;
  savi: number;
  evi: number;
  smi: number;
  clayMineralRatio: number;
  ironOxideIndex: number;
}

export interface FieldIndicesResponse {
  fieldId: string;
  cropType: string;
  updatedAt: string;
  summary: {
    avgNdvi: number;
    avgNdre: number;
    avgSavi: number;
    avgEvi: number;
    avgSmi: number;
    clayMineralRatio: number;
    ironOxideIndex: number;
    soilHealthScore: number;
  };
  zones: ZoneIndex[];
  geotiffLayers: Record<string, string>;
  spectralBands: SpectralBand[];
}

export interface SensorNode {
  nodeId: string;
  label: string;
  status: string;
  lastSeen: string;
  location: {
    lat: number;
    lng: number;
  };
  readings: {
    soilMoisture: number;
    airTemperature: number;
    humidity: number;
    leafWetness: number;
    windSpeed: number;
    solarRadiation: number;
    soilPh: number;
  };
}

export interface SensorReadingsResponse {
  fieldId: string;
  updatedAt: string;
  nodes: SensorNode[];
}

export interface SensorHistoryPoint {
  timestamp: string;
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  leafWetness: number;
  windSpeed: number;
  solarRadiation: number;
  soilPh: number;
}

export interface SensorHistoryResponse {
  fieldId: string;
  range: "24h" | "7d" | "30d";
  scope?: "field" | "node";
  nodeId?: string;
  nodeLabel?: string;
  series: SensorHistoryPoint[];
}

export interface PestRiskEntry {
  zoneId: string;
  zoneLabel: string;
  pestType: string;
  probability: number;
  severity: "info" | "watch" | "warning" | "critical";
}

export interface ZoneRiskBreakdown {
  zoneId: string;
  zoneLabel: string;
  status: string;
  readiness: number;
  soilHealthScore: number;
  ndvi: number;
  pestRisks: Array<{ pestType: string; probability: number }>;
}

export interface RiskResponse {
  fieldId: string;
  updatedAt: string;
  topRisks: PestRiskEntry[];
  zoneBreakdown: ZoneRiskBreakdown[];
}

export interface ForecastPoint {
  date: string;
  ndvi: number;
  ndre: number;
  savi: number;
  stressIndex: number;
  isForecast: boolean;
}

export interface ForecastResponse {
  fieldId: string;
  updatedAt: string;
  summary: {
    currentStressIndex: number;
    projectedStressIndex7Day: number;
    projectedTrend: string;
    projectedTrendWindowDays: number;
  };
  series: ForecastPoint[];
}

export interface Insight {
  id: string;
  urgency: "critical" | "warning" | "watch" | "info";
  recommendation: string;
  modelConfidence: number;
  timestamp: string;
  modelSource: string;
}

export interface InsightsResponse {
  fieldId: string;
  updatedAt: string;
  insights: Insight[];
}

export interface AlertItem {
  id: string;
  fieldId: string;
  zoneId: string;
  severity: "info" | "watch" | "warning" | "critical";
  type: string;
  title: string;
  description: string;
  recommendation: string;
  modelSource: "CNN" | "LSTM" | "SensorFusion" | "Rule" | string;
  confidence: number;
  triggeredAt: string;
  acknowledgedAt: string | null;
}

export interface ModelStatusItem {
  id: string;
  modelName: string;
  version: string;
  accuracy: number;
  trainedAt: string;
  sampleCount: number;
  isActive: boolean;
}

export interface ModelStatusResponse {
  queue: {
    enabled: boolean;
    connected: boolean;
    mode: string;
  };
  models: ModelStatusItem[];
}

export interface ReportRecord {
  id: string;
  fieldId: string;
  generatedBy: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  pdfUrl: string;
  createdAt: string;
  format: string;
}

export interface AnalysisRun {
  id: string;
  fieldId: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  jobId: string | null;
  resultSummaryJson: Record<string, unknown> | null;
  queueMode?: string;
}
