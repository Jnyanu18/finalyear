"use client";

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Camera, CheckCircle2, AlertTriangle, Leaf, ShieldCheck, Sprout } from 'lucide-react';
import { runDecisionPipeline, runPlantAnalysis } from '@/lib/api';
import { saveMonitorSnapshot } from '@/lib/monitor-context';
import { useFarmStore } from '@/store/farmStore';

const CROPS = ['Tomato', 'Chilli', 'Rice', 'Wheat', 'Potato', 'Onion', 'Cotton', 'Maize', 'Brinjal', 'Cabbage'];

const healthConfig: Record<string, { color: string; icon: typeof ShieldCheck; label: string; bg: string; border: string }> = {
    healthy: {
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        icon: ShieldCheck,
        label: "Healthy"
    },
    moderate: {
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        icon: AlertTriangle,
        label: "Moderate"
    },
    stressed: {
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: AlertTriangle,
        label: "Stressed"
    },
};

function getHealthConfig(status: string) {
    const key = (status || "").toLowerCase();
    return healthConfig[key] || {
        color: "text-muted-foreground",
        bg: "bg-white/5",
        border: "border-white/10",
        icon: Leaf,
        label: status || "Unknown"
    };
}

export default function CropMonitorPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [cropType, setCropType] = useState('Tomato');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const setCurrentAnalysis = useFarmStore((s) => s.setCurrentAnalysis);
    const setPipeline = useFarmStore((s) => s.setPipeline);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const mimeType = file.type;
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result as string;
                setImagePreview(base64Data);
                callRealAnalysis(base64Data, mimeType);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const callRealAnalysis = async (dataUri: string, mimeType: string) => {
        setIsUploading(true);
        setAnalysisResult(null);

        const response = await runPlantAnalysis(dataUri, mimeType, cropType.toLowerCase());

        if (response.success && response.data) {
            // Backend wraps in { data: { analysis: {...} } }
            const raw: any = response.data;
            const analysis = raw.analysis ?? raw;
            const mapped = {
                cropType: analysis.cropType || analysis.crop_type || "Unknown",
                growthStage: analysis.growthStage || analysis.growth_stage || "Unknown",
                fruitCount: analysis.fruitCount ?? analysis.fruit_count ?? "—",
                healthStatus: analysis.healthStatus || analysis.health_status || "unknown",
                stages: Array.isArray(analysis.stages) ? analysis.stages : [],
                summary: analysis.summary || "Analysis complete.",
            };
            setAnalysisResult(mapped);
            setCurrentAnalysis(analysis);
            saveMonitorSnapshot({
                cropType: String(mapped.cropType),
                growthStage: String(mapped.growthStage),
                fruitCount: Number(mapped.fruitCount || 0),
                healthStatus: String(mapped.healthStatus),
                stages: mapped.stages,
                summary: String(mapped.summary || ""),
            });
            const pipelineResult = await runDecisionPipeline({
                cropType: String(mapped.cropType),
                cropStage: String(mapped.growthStage),
                fruitsPerPlant: Number(mapped.fruitCount || 0),
            });
            if (pipelineResult.success && pipelineResult.data?.pipeline) {
                setPipeline(pipelineResult.data.pipeline);
            }
        } else {
            setAnalysisResult({
                cropType: "Analysis Failed",
                growthStage: "Error",
                fruitCount: "—",
                healthStatus: "stressed",
                stages: [],
                summary: response.error || "Could not connect to the analysis endpoint. Make sure the backend server & Gemini API are running.",
            });
        }
        setIsUploading(false);
    };

    const hc = analysisResult ? getHealthConfig(analysisResult.healthStatus) : null;
    const HealthIcon = hc?.icon ?? Leaf;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Crop Monitor</h1>
                <p className="text-muted-foreground mt-2">Upload field images or drone footage for Gemini AI analysis.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Card */}
                <Card className="bg-[#0E1111] border-white/5 relative overflow-hidden h-full flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <CardContent className="p-8 relative z-10 flex-1 flex flex-col items-center justify-center text-center min-h-[400px]">
                        {!isUploading && !analysisResult ? (
                            <>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                {/* Crop type selector */}
                                <div className="w-full mb-4" onClick={e => e.stopPropagation()}>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Crop Type in Photo</label>
                                    <select
                                        value={cropType}
                                        onChange={e => setCropType(e.target.value)}
                                        className="w-full bg-[#1A1D1D] border border-white/10 text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                                    >
                                        {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div
                                    className="w-full flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 hover:bg-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                                    onClick={triggerUpload}
                                >
                                    <div className="h-20 w-20 rounded-full bg-[#1A1D1D] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="h-10 w-10 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Drag & Drop Image</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mb-8">
                                        Supports JPG, PNG, WEBP up to 10MB. Gemini Vision AI will analyze your crop.
                                    </p>
                                    <Button variant="outline" className="gap-2 bg-transparent border-white/20 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>
                                        <Camera className="h-4 w-4" /> Take Photo
                                    </Button>
                                </div>
                            </>
                        ) : isUploading ? (
                            <div className="w-full flex-1 flex flex-col items-center justify-center">
                                {imagePreview && (
                                    <div className="w-full h-48 rounded-xl overflow-hidden mb-6 border border-primary/30">
                                        <img src={imagePreview} alt="Uploading" className="w-full h-full object-cover opacity-60" />
                                    </div>
                                )}
                                <div className="h-16 w-16 relative mb-4">
                                    <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                                    <Sprout className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Scanning with Gemini AI...</h3>
                                <p className="text-muted-foreground text-sm">Detecting crop type, growth stage, and health metrics.</p>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col bg-[#1A1D1D] rounded-xl overflow-hidden border border-primary/30 relative">
                                <div className="w-full h-56 bg-muted/20 flex flex-col items-center justify-center overflow-hidden">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Analyzed Crop" className="w-full h-full object-cover" />
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
                                        variant="outline" className="gap-2 w-full border-white/10 bg-transparent hover:bg-white/5"
                                    >
                                        <UploadCloud className="h-4 w-4" /> Analyze Another Image
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Card */}
                <Card className="bg-[#0E1111] border-white/5 h-full">
                    <CardContent className="p-8 h-full flex flex-col">
                        <h2 className="text-xl font-semibold text-foreground mb-6">Analysis Results</h2>

                        {!analysisResult ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <Leaf className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                                <p className="text-lg text-muted-foreground">Upload a crop image to see AI analysis here.</p>
                            </div>
                        ) : (
                            <div className="space-y-5 flex-1 animate-in fade-in slide-in-from-bottom-4">
                                {/* Core stats grid */}
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
                                </div>

                                {/* Maturity stages breakdown */}
                                {analysisResult.stages && analysisResult.stages.length > 0 && (
                                    <div className="bg-[#1A1D1D] p-4 rounded-xl border border-white/5">
                                        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Maturity Breakdown</p>
                                        <div className="flex gap-3">
                                            {analysisResult.stages.map((s: any, i: number) => (
                                                <div key={i} className="flex-1 text-center">
                                                    <p className="text-lg font-bold text-foreground">{s.count}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{s.stage}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Summary */}
                                <div className={`border p-4 rounded-xl flex gap-3 ${hc?.bg} ${hc?.border}`}>
                                    <HealthIcon className={`h-5 w-5 shrink-0 mt-0.5 ${hc?.color}`} />
                                    <div>
                                        <h4 className={`font-semibold mb-1 text-sm ${hc?.color}`}>
                                            {analysisResult.healthStatus === "healthy" ? "Field Notes" : "Attention Needed"}
                                        </h4>
                                        <p className="text-sm text-foreground/80">{analysisResult.summary}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


