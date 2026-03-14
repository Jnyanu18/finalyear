import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/auth/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { Providers } from '@/app/providers';
import DashboardLayoutWrapper from '@/app/dashboard/layout';

const DashboardPage = lazy(() => import('@/app/dashboard/page'));
const MonitorPage = lazy(() => import('@/app/dashboard/monitor/page'));
const YieldPage = lazy(() => import('@/app/dashboard/yield/page'));
const DiseasePage = lazy(() => import('@/app/dashboard/disease/page'));
const IrrigationPage = lazy(() => import('@/app/dashboard/irrigation/page'));
const HarvestPage = lazy(() => import('@/app/dashboard/harvest/page'));
const StoragePage = lazy(() => import('@/app/dashboard/storage/page'));
const MarketPage = lazy(() => import('@/app/dashboard/market/page'));
const ProfitPage = lazy(() => import('@/app/dashboard/profit/page'));
const AdvisorPage = lazy(() => import('@/app/dashboard/advisor/page'));
const ReportPage = lazy(() => import('@/app/dashboard/report/page'));
const ProfilePage = lazy(() => import('@/app/dashboard/profile/page'));
const OutcomesPage = lazy(() => import('@/app/dashboard/outcomes/page'));
const LoginPage = lazy(() => import('@/app/login/page'));
const RegisterPage = lazy(() => import('@/app/register/page'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Loading AgriNexus...
    </div>
  );
}

function withDashboardShell(node: React.ReactNode) {
  return (
    <DashboardLayoutWrapper>
      <Suspense fallback={<RouteFallback />}>{node}</Suspense>
    </DashboardLayoutWrapper>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Providers>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Suspense fallback={<RouteFallback />}><LoginPage /></Suspense>} />
              <Route path="/register" element={<Suspense fallback={<RouteFallback />}><RegisterPage /></Suspense>} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={withDashboardShell(<DashboardPage />)} />
              <Route path="/dashboard/monitor" element={withDashboardShell(<MonitorPage />)} />
              <Route path="/dashboard/yield" element={withDashboardShell(<YieldPage />)} />
              <Route path="/dashboard/disease" element={withDashboardShell(<DiseasePage />)} />
              <Route path="/dashboard/irrigation" element={withDashboardShell(<IrrigationPage />)} />
              <Route path="/dashboard/harvest" element={withDashboardShell(<HarvestPage />)} />
              <Route path="/dashboard/storage" element={withDashboardShell(<StoragePage />)} />
              <Route path="/dashboard/market" element={withDashboardShell(<MarketPage />)} />
              <Route path="/dashboard/profit" element={withDashboardShell(<ProfitPage />)} />
              <Route path="/dashboard/advisor" element={withDashboardShell(<AdvisorPage />)} />
              <Route path="/dashboard/report" element={withDashboardShell(<ReportPage />)} />
              <Route path="/dashboard/profile" element={withDashboardShell(<ProfilePage />)} />
              <Route path="/dashboard/outcomes" element={withDashboardShell(<OutcomesPage />)} />

              {/* Fallback */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </Providers>
    </I18nextProvider>
  );
}
