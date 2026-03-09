// @ts-nocheck
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/auth/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import React from 'react';
import { Providers } from '@/app/providers';

// Pages
import DashboardPage from '@/app/dashboard/page';
import MonitorPage from '@/app/dashboard/monitor/page';
import YieldPage from '@/app/dashboard/yield/page';
import DiseasePage from '@/app/dashboard/disease/page';
import IrrigationPage from '@/app/dashboard/irrigation/page';
import HarvestPage from '@/app/dashboard/harvest/page';
import StoragePage from '@/app/dashboard/storage/page';
import MarketPage from '@/app/dashboard/market/page';
import ProfitPage from '@/app/dashboard/profit/page';
import AdvisorPage from '@/app/dashboard/advisor/page';
import ReportPage from '@/app/dashboard/report/page';
import ProfilePage from '@/app/dashboard/profile/page';
import OutcomesPage from '@/app/dashboard/outcomes/page';

import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import DashboardLayoutWrapper from '@/app/dashboard/layout';

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Providers>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<DashboardLayoutWrapper><DashboardPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/monitor" element={<DashboardLayoutWrapper><MonitorPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/yield" element={<DashboardLayoutWrapper><YieldPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/disease" element={<DashboardLayoutWrapper><DiseasePage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/irrigation" element={<DashboardLayoutWrapper><IrrigationPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/harvest" element={<DashboardLayoutWrapper><HarvestPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/storage" element={<DashboardLayoutWrapper><StoragePage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/market" element={<DashboardLayoutWrapper><MarketPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/profit" element={<DashboardLayoutWrapper><ProfitPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/advisor" element={<DashboardLayoutWrapper><AdvisorPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/report" element={<DashboardLayoutWrapper><ReportPage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/profile" element={<DashboardLayoutWrapper><ProfilePage /></DashboardLayoutWrapper>} />
              <Route path="/dashboard/outcomes" element={<DashboardLayoutWrapper><OutcomesPage /></DashboardLayoutWrapper>} />

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
