// @ts-nocheck


"use client";

import { useEffect, useState } from "react";
import { Download, Globe, Leaf, LogOut, Search, UserRound, BadgeCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/auth/client';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '../ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { supportedLngs } from '@/lib/i18n';

export function AgriVisionHeader() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const tx = (key: string, fallback: string) => {
    if (!isMounted) return fallback;
    return t(key, { defaultValue: fallback });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePrint = () => {
    window.print();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl print:hidden transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Leaf className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
          </div>
          <h1 className="font-headline text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{tx('agrivision_ai', 'AgriVisionAI')}</h1>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => window.dispatchEvent(new Event("agrivision:quickactions"))}
            aria-label="Quick actions"
            title="Quick actions (Ctrl/Cmd + K)"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex h-9 px-4 rounded-full border-primary/20 hover:bg-primary/5 transition-colors">
            <Download className="mr-2 h-4 w-4" />
            {tx('download_report', 'Download Report')}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <span className="hidden" />
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">{tx('project_report_title', 'Project Report')}</DialogTitle>
                <DialogDescription>
                  {tx('project_report_description', 'Summary of this platform and how it works.')}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-6 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    AgriVisionAI is a comprehensive, cloud-native web application designed to provide intelligent yield analysis and forecasting for tomato farmers. It leverages a modern tech stack to deliver a seamless user experience, from image upload to AI-powered insights.
                  </p>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">1. Frontend & User Interface (Next.js & ShadCN UI)</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-semibold">Modern Dashboard:</span> A responsive, tab-based interface for Detection, Forecast, Market Price, and an AI Chat Assistant.</li>
                      <li><span className="font-semibold">Interactive Controls:</span> A collapsible sidebar for adjusting forecast parameters and uploading plant images.</li>
                      <li><span className="font-semibold">Authentication Flow:</span> Secure user registration and login using MongoDB-backed session authentication. The main dashboard is a protected route.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">2. AI-Powered Vision Analysis (Genkit & Gemini)</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-semibold">Tomato Detection:</span> The app uses a Genkit AI flow calling the Gemini vision model to analyze uploaded tomato plant images.</li>
                      <li><span className="font-semibold">Analysis Process:</span> The model counts all visible tomatoes and classifies them by growth stage (flower, immature, ripening, mature), returning a structured JSON object with the results.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">3. Yield & Harvest Forecasting</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-semibold">Data-Driven Forecast:</span> Tomato counts from the AI analysis are fed into a sophisticated forecasting function.</li>
                      <li><span className="font-semibold">Calculations:</span> Estimates current yield, sellable yield, and projects a "Ready-to-Harvest" curve.</li>
                      <li><span className="font-semibold">Optimal Harvest Plan:</span> Creates a daily harvest schedule based on the forecast and the user's specified harvest capacity.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">4. Market Price Forecasting & Profit Analysis</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-semibold">AI-Powered Market Insights:</span> A dedicated Genkit flow forecasts future tomato prices for a specified district.</li>
                      <li><span className="font-semibold">Profit Optimization:</span> The flow identifies the best date to sell for maximum profit and calculates expected revenue.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">5. AI Chat Assistant</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-semibold">Context-Aware:</span> An integrated assistant answers natural language questions using the latest detection, forecast, and market data as context.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold text-foreground">6. MongoDB Integration</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="fontsemibold">User Management:</span> User accounts are stored in MongoDB with hashed passwords.</li>
                      <li><span className="font-semibold">Security:</span> Session management is handled through secure HTTP-only cookies signed by the backend.</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                <Globe className="h-5 w-5" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(supportedLngs).map(([code, name]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => i18n.changeLanguage(code)}
                  disabled={i18n.resolvedLanguage === code}
                >
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Profile menu" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                <UserRound className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                <BadgeCheck className="mr-2 h-4 w-4" />
                Farmer profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {tx('logout', 'Logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
