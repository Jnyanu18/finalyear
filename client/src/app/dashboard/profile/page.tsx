"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/client';
import type { FarmerProfileResponse } from '@/lib/farmer-profile-shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

function profilePayload(profile: FarmerProfileResponse) {
  return {
    personal: profile.personal,
    land: profile.land,
    season: profile.season,
    schemes: profile.schemes,
    alerts: profile.alerts,
    consent: {
      shareAnalysisData: profile.consent.shareAnalysisData,
      shareMarketData: profile.consent.shareMarketData,
      allowAdvisorAccess: profile.consent.allowAdvisorAccess,
    },
  };
}

export default function FarmerProfilePage() {
  const { user, isUserLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<FarmerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      navigate('/login');
      return;
    }

    if (!user) return;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile', { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body = await response.json().catch(() => ({}));

        if (!response.ok || !body?.profile) {
          throw new Error(body?.error || 'Unable to load profile');
        }

        setProfile(body.profile as FarmerProfileResponse);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Profile load failed',
          description: error?.message || 'Please refresh and try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [isUserLoading, navigate, toast, user]);

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload(profile)),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body?.profile) {
        throw new Error(body?.error || 'Unable to save profile');
      }

      setProfile(body.profile as FarmerProfileResponse);
      toast({ title: 'Profile saved', description: 'Your farmer profile is updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not save profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isLoading || !profile || !user) {
    return (
      <div className="space-y-6 animate-in fade-in max-w-5xl">
        <Skeleton className="h-10 w-64 bg-primary/10" />
        <Skeleton className="h-4 w-96 bg-[#1A1D1D]" />
        <Card className="bg-[#1A1D1D] border-white/10 mt-6">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-8 w-40 bg-white/5" />
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-16 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Farmer Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your farm context to personalize AgriNexus recommendations.</p>
      </div>

      <Card className="bg-[#0E1111] border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <CardContent className="p-8 relative z-10">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">Farm Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure your land and crop parameters.</p>
          </div>

          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Farmer Name</label>
              <Input
                value={profile.personal.fullName}
                onChange={e => setProfile({ ...profile, personal: { ...profile.personal, fullName: e.target.value } })}
                placeholder="e.g. Ravi Kumar"
                className="bg-[#1A1D1D] border-white/10 focus-visible:ring-primary h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Location</label>
              <Input
                value={profile.personal.district}
                onChange={e => setProfile({ ...profile, personal: { ...profile.personal, district: e.target.value } })}
                placeholder="e.g. Central Valley, California"
                className="bg-[#1A1D1D] border-white/10 focus-visible:ring-primary h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Land Size (Acres)</label>
              <Input
                type="number"
                value={profile.land.landAreaAcres ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  const parsed = raw === '' ? null : Number(raw);
                  setProfile({
                    ...profile,
                    land: { ...profile.land, landAreaAcres: Number.isNaN(parsed) ? null : parsed },
                  });
                }}
                className="bg-[#1A1D1D] border-white/10 focus-visible:ring-primary h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Soil Type</label>
              <select
                value={profile.land.soilType}
                onChange={e => setProfile({ ...profile, land: { ...profile.land, soilType: e.target.value } })}
                className="flex h-12 w-full rounded-md border border-white/10 bg-[#1A1D1D] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              >
                <option value="Loam">Loam</option>
                <option value="Clay">Clay</option>
                <option value="Sand">Sand</option>
                <option value="Silt">Silt</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Primary Crop</label>
              <select
                value={profile.season.cropName}
                onChange={e => setProfile({ ...profile, season: { ...profile.season, cropName: e.target.value } })}
                className="flex h-12 w-full rounded-md border border-white/10 bg-[#1A1D1D] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              >
                <option value="Corn">Corn</option>
                <option value="Tomato">Tomato</option>
                <option value="Wheat">Wheat</option>
                <option value="Soybean">Soybean</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-muted-foreground">Irrigation Source</label>
              <select
                value={profile.land.irrigationType}
                onChange={e => setProfile({ ...profile, land: { ...profile.land, irrigationType: e.target.value } })}
                className="flex h-12 w-full rounded-md border border-white/10 bg-[#1A1D1D] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              >
                <option value="Drip">Drip</option>
                <option value="Canal">Canal</option>
                <option value="Rainfed">Rainfed</option>
                <option value="Borewell">Borewell</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={saveProfile}
              disabled={isSaving}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

