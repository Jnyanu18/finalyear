"use client";

import { useAuth } from '@/auth/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CloudRain, MapPin, Sprout, TrendingUp,
  Calendar, Store, MessageSquare, ArrowRight, RefreshCw,
  Droplets, BarChart2, Bug, Leaf
} from 'lucide-react';
import { getLatestAnalysis, getProfile } from '@/lib/api';
import { readModuleSnapshot } from '@/lib/module-context';
import { readMonitorSnapshot } from '@/lib/monitor-context';
import { useFarmStore } from '@/store/farmStore';

const CROP = 'Tomato';

export default function DashboardPage() {
  const { user, isUserLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const farm = useFarmStore();

  const loadAll = async () => {
    setLoading(true);

    const latest = await getLatestAnalysis();
    if (latest.success && latest.data) {
      const analysis = (latest.data as any).analysis || null;
      const fieldSnapshot = (latest.data as any).fieldSnapshot || null;
      if (analysis) farm.setCurrentAnalysis(analysis);
      if (fieldSnapshot?.fieldContext) farm.setFieldSnapshot(fieldSnapshot.fieldContext);
    }

    const yieldSnap = readModuleSnapshot('yield')?.data ?? null;
    const diseaseSnap = readModuleSnapshot('disease')?.data ?? null;
    const marketSnap = readModuleSnapshot('market')?.data ?? null;
    const irrigationSnap = readModuleSnapshot('irrigation')?.data ?? null;

    setData({
      yield: farm.yieldPrediction ?? yieldSnap,
      disease: farm.diseaseRisk ?? diseaseSnap,
      market: farm.marketRecommendation ?? marketSnap,
      irrigation: farm.irrigationAdvice ?? irrigationSnap,
    });

    try {
      const p = await getProfile();
      if (p.success && p.data) setProfile((p.data as any).profile ?? p.data);
    } catch (_) {}

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setData((prev: any) => ({
      ...prev,
      yield: farm.yieldPrediction ?? prev.yield ?? null,
      disease: farm.diseaseRisk ?? prev.disease ?? null,
      market: farm.marketRecommendation ?? prev.market ?? null,
      irrigation: farm.irrigationAdvice ?? prev.irrigation ?? null,
    }));
  }, [farm.yieldPrediction, farm.diseaseRisk, farm.marketRecommendation, farm.irrigationAdvice]);

  useEffect(() => {
    if (!isUserLoading && !user) navigate('/login');
  }, [user, isUserLoading, navigate]);

  if (isUserLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const riskColor = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return 'text-red-400';
    if (l === 'medium') return 'text-orange-400';
    return 'text-green-400';
  };

  const riskBg = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return 'border-red-500/30';
    if (l === 'medium') return 'border-orange-500/30';
    return 'border-green-500/30';
  };

  const monitor = readMonitorSnapshot();
  const primaryCrop = profile?.primaryCrop || monitor?.cropType || CROP;
  const marketPrice = data.market?.expectedPrice ?? data.market?.options?.[0]?.expectedPrice;
  const marketTransport = data.market?.transportCost ?? data.market?.options?.[0]?.transportCost;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <Card className="bg-gradient-to-br from-[#1A1D1D] to-[#0A0C0C] border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground tracking-widest uppercase">Farm Overview</h2>
            <Button variant="ghost" size="icon" onClick={loadAll} disabled={loading} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Leaf className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Farmer</p>
                <p className="text-base font-semibold text-foreground">{profile?.farmerName || user?.email?.split('@')[0] || '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MapPin className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-base font-semibold text-foreground">{profile?.location || profile?.village || '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Sprout className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Primary Crop</p>
                <p className="text-base font-semibold text-foreground">{primaryCrop}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><BarChart2 className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Land Size</p>
                <p className="text-base font-semibold text-foreground">{profile?.landSize ? `${profile.landSize} acres` : '--'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#1A1D1D] border-white/10 hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => navigate('/dashboard/yield')}>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0 group-hover:bg-primary/20 transition-colors"><TrendingUp className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Yield Today</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : data.yield ? `${data.yield.predictedYieldToday} kg` : '--'}</h3>
              {data.yield && <p className="text-xs text-muted-foreground mt-0.5">{(data.yield.confidence * 100).toFixed(0)}% confidence</p>}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-[#1A1D1D] border-white/10 hover:${riskBg(data.disease?.riskLevel)} transition-colors cursor-pointer group`} onClick={() => navigate('/dashboard/disease')}>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="bg-orange-500/10 p-3 rounded-lg text-orange-500 shrink-0 group-hover:bg-orange-500/20 transition-colors"><Bug className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Disease Risk</p>
              <h3 className={`text-2xl font-bold mt-1 ${loading ? 'text-muted-foreground/50' : riskColor(data.disease?.riskLevel)}`}>{loading ? '...' : data.disease ? data.disease.riskLevel?.toUpperCase() : '--'}</h3>
              {data.disease && <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.disease.disease}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1D1D] border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer group" onClick={() => navigate('/dashboard/irrigation')}>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="bg-cyan-500/10 p-3 rounded-lg text-cyan-500 shrink-0 group-hover:bg-cyan-500/20 transition-colors"><Droplets className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Irrigation</p>
              <h3 className="text-xl font-bold text-foreground mt-1">{loading ? '...' : data.irrigation ? data.irrigation.recommendation : 'Enter moisture'}</h3>
              {data.irrigation
                ? <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.irrigation.reason?.substring(0, 44)}...</p>
                : <p className="text-xs text-muted-foreground mt-0.5 truncate">Run irrigation with measured soil moisture.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#1A1D1D] border-white/10 flex flex-col cursor-pointer hover:border-primary/30 transition-all group" onClick={() => navigate('/dashboard/harvest')}>
          <CardContent className="p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">Harvest Recommendation</h3>
              <ArrowRight className="h-4 w-4 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-3">
              <div className="bg-[#0A0C0C] p-4 rounded-lg border border-white/5">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Ready Today</p>
                <p className="text-2xl font-bold text-primary">{loading ? '...' : data.yield ? `${data.yield.predictedYieldToday} kg` : '--'}</p>
              </div>
              <div className="bg-[#0A0C0C] p-4 rounded-lg border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Peak Yield (+7 days)</p>
                  <p className="text-xl font-bold text-foreground">{loading ? '...' : data.yield ? `${data.yield.predictedYield7Days} kg` : '--'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1D1D] border-white/10 flex flex-col cursor-pointer hover:border-green-500/30 transition-all group" onClick={() => navigate('/dashboard/market')}>
          <CardContent className="p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold text-lg text-foreground">Best Market Today</h3>
              <ArrowRight className="h-4 w-4 text-green-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0A0C0C] rounded-lg border border-white/5">
                <span className="font-semibold text-foreground text-lg">{loading ? '...' : data.market ? data.market.bestMarket : '--'}</span>
                <span className="text-primary font-bold text-lg">{loading ? '' : data.market ? `INR ${marketPrice ?? '--'}/kg` : '--'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0A0C0C] rounded-lg border border-white/5">
                <span className="text-muted-foreground">Transport Cost</span>
                <span className="text-muted-foreground">{loading ? '' : data.market ? `INR ${marketTransport ?? '--'}` : '--'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-semibold text-foreground">Est. Net Profit</span>
                <span className="font-bold text-2xl text-primary">{loading ? '...' : data.market ? `INR ${data.market.netProfit}` : '--'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-[#1A1D1D] to-[#0A0C0C] border-primary/30 relative overflow-hidden cursor-pointer group" onClick={() => navigate('/dashboard/advisor')}>
        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
        <CardContent className="p-6 relative z-10 flex gap-6 items-center">
          <div className="hidden sm:flex h-14 w-14 rounded-full bg-primary/20 items-center justify-center shrink-0 border border-primary/30"><MessageSquare className="h-7 w-7 text-primary" /></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <span className="sm:hidden text-primary"><MessageSquare className="h-5 w-5" /></span>
              AI Agronomy Advisor
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {data.disease?.riskLevel?.toLowerCase() === 'high'
                ? `High ${data.disease?.disease} risk detected. Ask for immediate advice.`
                : data.market
                  ? `Best market today: ${data.market.bestMarket}. Ask how to maximize profit.`
                  : 'Run disease, irrigation, and market modules once to get actual farm insights here.'}
            </p>
          </div>
          <ArrowRight className="h-6 w-6 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 transform duration-300" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Disease Risk', icon: Bug, path: '/dashboard/disease', color: 'text-orange-400 bg-orange-500/10' },
          { label: 'Storage', icon: CloudRain, path: '/dashboard/storage', color: 'text-purple-400 bg-purple-500/10' },
          { label: 'Profit Sim', icon: BarChart2, path: '/dashboard/profit', color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Outcomes', icon: TrendingUp, path: '/dashboard/outcomes', color: 'text-green-400 bg-green-500/10' },
        ].map((item) => (
          <Button key={item.label} variant="outline" className="h-auto py-4 flex-col gap-2 bg-[#1A1D1D] border-white/10 hover:bg-white/5 hover:border-white/20" onClick={() => navigate(item.path)}>
            <div className={`p-2 rounded-lg ${item.color}`}><item.icon className="h-4 w-4" /></div>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
