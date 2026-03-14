"use client";

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Camera, CheckCircle2, AlertTriangle, Leaf, ShieldCheck, Sprout } from 'lucide-react';
import { getLatestAnalysis, runDecisionPipeline, runPlantAnalysis } from '@/lib/api';
import { saveMonitorSnapshot } from '@/lib/monitor-context';
import { formatRelativeTime, normalizePercentageValue } from '@/lib/live-data';
import { useFarmStore } from '@/store/farmStore';

const CROPS = ['Tomato', 'Chilli', 'Rice', 'Wheat', 'Potato', 'Onion', 'Cotton', 'Maize', 'Brinjal', 'Cabbage'];

type AnalysisDetails = {
  cropMatchConfidence?: number;
  targetCropDetected?: boolean;
  canopyDensity?: string;
  floweringLevel?: string;
  likelyIssues?: string[];
  recommendations?: string[];
  analysisSource?: string;
};

type AnalysisResult = {
  cropType: string;
  growthStage: string;
  fruitCount: number | string;
  healthStatus: string;
  healthScore: number;
  updatedAt?: string | null;
  analysisDetails: AnalysisDetails;
  analysisSource: string;
  stages: Array<{ stage: string; count: number }>;
  summary: string;
};

type ServerStage = {
  stage?: string;
  count?: number;
};

type ServerAnalysis = {
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
  analysisDetails?: AnalysisDetails;
  analysis_details?: AnalysisDetails;
  stages?: ServerStage[];
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  raw?: {
    _source?: string;
  };
};

type PlantAnalysisPayload = {
  analysis?: ServerAnalysis;
} & ServerAnalysis;

const healthConfig: Record<string, { color: string; icon: typeof ShieldCheck; label: string; bg: string; border: string }> = {
  healthy: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: ShieldCheck,
    label: 'Healthy'
  },
  moderate: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
    label: 'Moderate'
  },
  stressed: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: AlertTriangle,
    label: 'Stressed'
  }
};

function getHealthConfig(status: string) {
  const key = (status || '').toLowerCase();
  return healthConfig[key] || {
    color: 'text-muted-foreground',
    bg: 'bg-white/5',
    border: 'border-white/10',
    icon: Leaf,
    label: status || 'Unknown'
  };
}

function toMappedAnalysis(analysis: ServerAnalysis): AnalysisResult {
  return {
    cropType: analysis.cropType || analysis.crop_type || 'Unknown',
    growthStage: analysis.growthStage || analysis.growth_stage || 'Unknown',
    fruitCount: analysis.fruitCount ?? analysis.fruit_count ?? '--',
    healthStatus: analysis.healthStatus || analysis.health_status || 'unknown',
    healthScore: Number(analysis.healthScore || 0),
    updatedAt: analysis.updatedAt || analysis.createdAt || null,
    analysisDetails: analysis.analysisDetails || analysis.analysis_details || {},
    analysisSource: analysis.analysisDetails?.analysisSource || analysis.raw?._source || 'unknown',
    stages: Array.isArray(analysis.stages)
      ? analysis.stages.map((stage) => ({
          stage: String(stage.stage || "unknown"),
          count: Number(stage.count || 0)
        }))
      : [],
    summary: analysis.summary || 'Analysis complete.'
  };
}

export default function CropMonitorPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropType, setCropType] = useState('Tomato');
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setCurrentAnalysis = useFarmStore((state) => state.setCurrentAnalysis);
  const setPipeline = useFarmStore((state) => state.setPipeline);

  useEffect(() => {
    let disposed = false;

    const loadLatestAnalysis = async () => {
      const response = await getLatestAnalysis();
      if (disposed) {
        return;
      }

      const latest = response.success ? (response.data as { analysis?: ServerAnalysis } | undefined)?.analysis : null;
      if (!latest) {
        setIsLoadingLatest(false);
        return;
      }

      const mapped = toMappedAnalysis(latest);
      setAnalysisResult(mapped);
      setCurrentAnalysis(latest);
      setCropType(mapped.cropType || 'Tomato');

      if (latest.imageUrl) {
        setImagePreview(latest.imageUrl);
      }

      saveMonitorSnapshot({
        cropType: String(mapped.cropType),
        growthStage: String(mapped.growthStage),
        fruitCount: Number(mapped.fruitCount || 0),
        healthStatus: String(mapped.healthStatus),
        healthScore: normalizePercentageValue(mapped.healthScore, 0),
        stages: mapped.stages,
        summary: String(mapped.summary || ''),
        updatedAt: mapped.updatedAt
      });

      setIsLoadingLatest(false);
    };

    void loadLatestAnalysis();

    return () => {
      disposed = true;
    };
  }, [setCurrentAnalysis]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const mimeType = file.type;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);
      void callRealAnalysis(base64Data, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const callRealAnalysis = async (dataUri: string, mimeType: string) => {
    setIsUploading(true);
    setAnalysisResult(null);

    const response = await runPlantAnalysis(dataUri, mimeType, cropType.toLowerCase());

    if (response.success && response.data) {
      const raw = response.data as PlantAnalysisPayload;
      const analysis = raw.analysis ?? raw;
      const mapped = toMappedAnalysis(analysis);
      setAnalysisResult(mapped);
      setCurrentAnalysis(analysis);

      saveMonitorSnapshot({
        cropType: String(mapped.cropType),
        growthStage: String(mapped.growthStage),
        fruitCount: Number(mapped.fruitCount || 0),
        healthStatus: String(mapped.healthStatus),
        healthScore: normalizePercentageValue(mapped.healthScore, 0),
        stages: mapped.stages,
        summary: String(mapped.summary || ''),
        updatedAt: mapped.updatedAt
      });

      const pipelineResult = await runDecisionPipeline({
        cropType: String(mapped.cropType),
        cropStage: String(mapped.growthStage),
        fruitsPerPlant: Number(mapped.fruitCount || 0)
      });

      if (pipelineResult.success && pipelineResult.data?.pipeline) {
        setPipeline(pipelineResult.data.pipeline);
      }
    } else {
      setAnalysisResult({
        cropType: 'Analysis Failed',
        growthStage: 'Error',
        fruitCount: '--',
        healthStatus: 'stressed',
        healthScore: 0,
        updatedAt: null,
        analysisDetails: {
          cropMatchConfidence: 0,
          targetCropDetected: false,
          canopyDensity: 'unknown',
          floweringLevel: 'unknown',
          likelyIssues: [],
          recommendations: []
        },
        analysisSource: 'error',
        stages: [],
        summary: response.error || 'Could not connect to the analysis endpoint. Make sure the backend server and AI provider are running.'
      });
    }

    setIsUploading(false);
    setIsLoadingLatest(false);
  };

  const hc = analysisResult ? getHealthConfig(analysisResult.healthStatus) : null;
  const HealthIcon = hc?.icon ?? Leaf;
  const details = analysisResult?.analysisDetails || {};
  const cropMatchConfidence = normalizePercentageValue(details.cropMatchConfidence, 0);
  const healthScore = normalizePercentageValue(analysisResult?.healthScore, 0);
  const likelyIssues = Array.isArray(details.likelyIssues) ? details.likelyIssues : [];
  const recommendations = Array.isArray(details.recommendations) ? details.recommendations : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Crop Monitor</h1>
        <p className="text-muted-foreground mt-2">Upload a tomato plant or crop image to analyze growth stage, plant health, fruit load, and visible field issues.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#0E1111] border-white/5 relative overflow-hidden h-full flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <CardContent className="p-8 relative z-10 flex-1 flex flex-col items-center justify-center text-center min-h-[400px]">
            {!isUploading && !analysisResult ? (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="w-full mb-4" onClick={(event) => event.stopPropagation()}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Crop Type in Photo</label>
                  <select
                    value={cropType}
                    onChange={(event) => setCropType(event.target.value)}
                    className="w-full bg-[#1A1D1D] border border-white/10 text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  >
                    {CROPS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                  </select>
                </div>
                <div
                  className="w-full flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 hover:bg-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={triggerUpload}
                >
                  <div className="h-20 w-20 rounded-full bg-[#1A1D1D] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload Plant Image</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mb-8">
                    Supports JPG, PNG, WEBP up to 10MB. Upload a tomato plant image to get a structured agronomy result.
                  </p>
                  <Button variant="outline" className="gap-2 bg-transparent border-white/20 hover:bg-white/10" onClick={(event) => { event.stopPropagation(); triggerUpload(); }}>
                    <Camera className="h-4 w-4" /> Select Photo
                  </Button>
                </div>
              </>
            ) : isUploading ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center">
                {imagePreview ? (
                  <div className="w-full h-48 rounded-xl overflow-hidden mb-6 border border-primary/30">
                    <img src={imagePreview} alt="Uploading" className="w-full h-full object-contain bg-black/30 opacity-60" />
                  </div>
                ) : null}
                <div className="h-16 w-16 relative mb-4">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                  <Sprout className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Analyzing Plant Image...</h3>
                <p className="text-muted-foreground text-sm">Detecting crop type, canopy vigor, flowering, fruit load, and visible stress.</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col bg-[#1A1D1D] rounded-xl overflow-hidden border border-primary/30 relative">
                <div className="w-full min-h-[320px] bg-muted/20 flex flex-col items-center justify-center overflow-hidden p-2">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Analyzed Crop" className="w-full h-full object-contain" />
                  ) : (
                    <Leaf className="h-10 w-10 text-muted-foreground opacity-50" />
                  )}
                </div>
                <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md border border-primary/50 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Analysis Complete
                </div>
                <div className="p-6 flex-1 flex items-end">
                  <Button
                    onClick={() => { setAnalysisResult(null); setImagePreview(null); }}
                    variant="outline"
                    className="gap-2 w-full border-white/10 bg-transparent hover:bg-white/5"
                  >
                    <UploadCloud className="h-4 w-4" /> Analyze Another Image
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0E1111] border-white/5 h-full">
          <CardContent className="p-8 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-foreground mb-6">Analysis Results</h2>

            {!analysisResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Leaf className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground">
                  {isLoadingLatest ? 'Loading your latest crop analysis...' : 'Upload a crop image to see the crop analysis here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-5 flex-1 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Crop Type</p>
                    <p className="text-lg font-bold text-foreground capitalize">{analysisResult.cropType}</p>
                  </div>
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Growth Stage</p>
                    <p className="text-lg font-bold text-foreground capitalize">{analysisResult.growthStage}</p>
                  </div>
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Fruit / Object Count</p>
                    <p className="text-2xl font-bold text-primary">{analysisResult.fruitCount}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${hc?.bg} ${hc?.border}`}>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Overall Health</p>
                    <div className="flex items-center gap-2">
                      <HealthIcon className={`h-5 w-5 ${hc?.color}`} />
                      <p className={`text-lg font-bold ${hc?.color} capitalize`}>{analysisResult.healthStatus}</p>
                    </div>
                  </div>
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Health Score</p>
                    <p className="text-2xl font-bold text-foreground">{healthScore}%</p>
                  </div>
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Crop Match</p>
                    <p className="text-2xl font-bold text-foreground">{cropMatchConfidence}%</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{details.targetCropDetected ? 'Target crop detected' : 'Needs manual review'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Canopy Density</p>
                    <p className="text-lg font-bold text-foreground capitalize">{details.canopyDensity || 'Unknown'}</p>
                  </div>
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Flowering Level</p>
                    <p className="text-lg font-bold text-foreground capitalize">{details.floweringLevel || 'Unknown'}</p>
                  </div>
                </div>

                {analysisResult.stages.length > 0 ? (
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Maturity Breakdown</p>
                    <div className="flex gap-3">
                      {analysisResult.stages.map((stage, index) => (
                        <div key={`${stage.stage}-${index}`} className="flex-1 text-center">
                          <p className="text-lg font-bold text-foreground">{stage.count}</p>
                          <p className="text-xs text-muted-foreground capitalize">{stage.stage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={`border p-4 rounded-xl flex gap-3 ${hc?.bg} ${hc?.border}`}>
                  <HealthIcon className={`h-5 w-5 shrink-0 mt-0.5 ${hc?.color}`} />
                  <div>
                    <h4 className={`font-semibold mb-1 text-sm ${hc?.color}`}>
                      {analysisResult.healthStatus === 'healthy' ? 'Field Notes' : 'Attention Needed'}
                    </h4>
                    <p className="text-sm text-foreground/80">{analysisResult.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                      Source: {analysisResult.analysisSource}
                      {analysisResult.updatedAt ? ` • Updated ${formatRelativeTime(analysisResult.updatedAt)}` : ''}
                    </p>
                  </div>
                </div>

                {likelyIssues.length > 0 ? (
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Likely Issues</p>
                    <div className="space-y-2">
                      {likelyIssues.map((issue, index) => (
                        <div key={`${issue}-${index}`} className="text-sm text-foreground/80 border border-white/5 rounded-lg px-3 py-2">
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {recommendations.length > 0 ? (
                  <div className="bg-[#1A1D1D] p-4 rounded-xl border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Recommended Next Steps</p>
                    <div className="space-y-2">
                      {recommendations.map((recommendation, index) => (
                        <div key={`${recommendation}-${index}`} className="text-sm text-foreground/90 border border-primary/10 rounded-lg px-3 py-2 bg-primary/5">
                          {recommendation}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
