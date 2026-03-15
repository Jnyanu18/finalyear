"use client";

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Camera, CheckCircle2, AlertTriangle, Leaf, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
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
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1400px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 mb-2">Crop Intelligence</h1>
          <p className="text-muted-foreground/80 text-lg max-w-2xl">Upload a plant image for instant AI analysis of growth stage, health, fruit load, and actionable field insights.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upload Card */}
        <Card className="bg-background/40 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden h-full flex flex-col rounded-3xl group/card">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none transition-opacity duration-700 group-hover/card:opacity-70 opacity-30" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none transition-opacity duration-700 opacity-20" />
          <CardContent className="p-8 md:p-10 relative z-10 flex-1 flex flex-col items-center justify-center text-center min-h-[500px]">
            {!isUploading && !analysisResult ? (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="w-full mb-8 relative z-20" onClick={(event) => event.stopPropagation()}>
                  <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-2 block">Detected Crop Profile</label>
                  <select
                    value={cropType}
                    onChange={(event) => setCropType(event.target.value)}
                    className="w-full bg-white/5 backdrop-blur-md border border-white/10 text-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner appearance-none cursor-pointer hover:bg-white/10"
                  >
                    {CROPS.map((crop) => <option key={crop} value={crop} className="bg-background text-foreground">{crop}</option>)}
                  </select>
                </div>
                <div
                  className="w-full flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-white/5 hover:border-primary/40 transition-all duration-300 cursor-pointer group"
                  onClick={triggerUpload}
                >
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.2)] transition-all duration-500">
                    <UploadCloud className="h-10 w-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-3">Drop Image Here</h3>
                  <p className="text-muted-foreground/80 text-sm max-w-[280px] mb-8 leading-relaxed">
                    Upload a high-res JPG, PNG, or WEBP up to 10MB to begin advanced structural processing.
                  </p>
                  <Button size="lg" className="gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto" onClick={(event) => { event.stopPropagation(); triggerUpload(); }}>
                    <Camera className="h-4 w-4" /> Browse Files
                  </Button>
                </div>
              </>
            ) : isUploading ? (
              <>
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
              </>
            ) : (
              <>
                <div className="w-full h-full flex flex-col bg-black/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 relative shadow-inner">
                  <div className="w-full flex-1 min-h-[350px] relative flex flex-col items-center justify-center overflow-hidden p-2">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Analyzed Crop" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Leaf className="h-16 w-16 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-xl border border-white/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-2 z-20 shadow-lg shadow-black/20">
                    <CheckCircle2 className="h-4 w-4" /> Analysis Complete
                  </div>
                  <div className="p-6 relative z-20 bg-background/60 backdrop-blur-xl border-t border-white/5">
                    <Button
                      onClick={() => { setAnalysisResult(null); setImagePreview(null); }}
                      variant="outline"
                      className="gap-2 w-full border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-12"
                    >
                      <UploadCloud className="h-4 w-4" /> Scan Another Item
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="bg-background/40 backdrop-blur-2xl border-white/5 shadow-2xl h-full rounded-3xl overflow-hidden relative">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <CardContent className="p-8 md:p-10 h-full flex flex-col relative z-10">
            <h2 className="text-2xl font-headline font-bold text-foreground mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <TrendingUp className="h-4 w-4" />
              </span>
              Intelligence Report
            </h2>

            {!analysisResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Leaf className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground">
                  {isLoadingLatest ? 'Loading your latest crop analysis...' : 'Upload a crop image to see the crop analysis here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Profile</p>
                    <p className="text-lg font-headline font-bold text-foreground capitalize group-hover:text-primary transition-colors">{analysisResult.cropType}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Stage</p>
                    <p className="text-lg font-headline font-bold text-foreground capitalize group-hover:text-primary transition-colors">{analysisResult.growthStage}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Count</p>
                    <p className="text-2xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-emerald-400">{analysisResult?.fruitCount}</p>
                  </div>
                  
                  <div className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-center transition-transform hover:-translate-y-1 duration-300 shadow-lg ${hc?.bg.replace('/10', '/20')} ${hc?.border}`}>
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest z-10">Status</p>
                    <div className="flex items-center gap-2 z-10">
                      <HealthIcon className={`h-6 w-6 ${hc?.color}`} />
                      <p className={`text-xl font-headline font-bold ${hc?.color} capitalize drop-shadow-sm`}>{analysisResult?.healthStatus}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Vigor Score</p>
                    <p className="text-2xl font-headline font-black text-foreground">{healthScore}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Confidence</p>
                    <p className="text-2xl font-headline font-black text-foreground">{cropMatchConfidence}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Canopy Density</p>
                    <p className="text-lg font-headline font-bold text-foreground capitalize">{details.canopyDensity || 'Unknown'}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-widest">Flowering Level</p>
                    <p className="text-lg font-headline font-bold text-foreground capitalize">{details.floweringLevel || 'Unknown'}</p>
                  </div>
                </div>

                {analysisResult && analysisResult.stages.length > 0 ? (
                  <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground/80 mb-4 uppercase tracking-widest">Maturity Breakdown</p>
                    <div className="flex gap-4">
                      {analysisResult.stages.map((stage: { stage: string; count: number }, index: number) => (
                        <div key={`${stage.stage}-${index}`} className="flex-1 text-center bg-black/20 rounded-xl p-3 border border-white/5">
                          <p className="text-2xl font-headline font-bold text-foreground">{stage.count}</p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">{stage.stage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {analysisResult && (
                  <div className={`border p-6 rounded-2xl flex gap-4 backdrop-blur-md shadow-lg ${hc?.bg.replace('/10', '/30')} ${hc?.border}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${hc?.bg.replace('/10','/50')}`}>
                      <HealthIcon className={`h-5 w-5 ${hc?.color}`} />
                    </div>
                    <div>
                      <h4 className={`font-headline font-bold mb-2 text-lg ${hc?.color}`}>
                        {analysisResult.healthStatus === 'healthy' ? 'Field Notes' : 'Attention Needed'}
                      </h4>
                      <p className="text-sm text-foreground/90 leading-relaxed">{analysisResult.summary}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-4 uppercase tracking-widest">
                        Source: {analysisResult.analysisSource}
                        {analysisResult.updatedAt ? ` • Updated ${formatRelativeTime(analysisResult.updatedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {likelyIssues.length > 0 ? (
                  <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-red-500/20">
                    <p className="text-[10px] font-bold text-red-400/80 mb-3 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" /> Detected Anomalies
                    </p>
                    <div className="space-y-2">
                      {likelyIssues.map((issue, index) => (
                        <div key={`${issue}-${index}`} className="text-sm text-foreground/90 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 shadow-inner">
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {recommendations.length > 0 ? (
                  <div className="bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md p-6 rounded-2xl border border-primary/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                    <p className="text-[10px] font-bold text-primary/80 mb-3 uppercase tracking-widest relative z-10">AI Recommended Actions</p>
                    <div className="space-y-2 relative z-10">
                      {recommendations.map((recommendation, index) => (
                        <div key={`${recommendation}-${index}`} className="text-sm font-medium text-foreground/90 bg-white/5 border border-white/10 rounded-xl px-4 py-3 shadow-sm hover:bg-white/10 transition-colors">
                          <span className="text-primary mr-2">•</span>{recommendation}
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
