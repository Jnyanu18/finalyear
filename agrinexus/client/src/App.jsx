import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const CropMonitorPage = lazy(() => import("./pages/CropMonitorPage"));
const YieldForecastPage = lazy(() => import("./pages/YieldForecastPage"));
const DiseaseRiskPage = lazy(() => import("./pages/DiseaseRiskPage"));
const IrrigationPlannerPage = lazy(() => import("./pages/IrrigationPlannerPage"));
const HarvestPlannerPage = lazy(() => import("./pages/HarvestPlannerPage"));
const StorageAdvisorPage = lazy(() => import("./pages/StorageAdvisorPage"));
const MarketRoutingPage = lazy(() => import("./pages/MarketRoutingPage"));
const ProfitSimulatorPage = lazy(() => import("./pages/ProfitSimulatorPage"));
const AdvisorChatPage = lazy(() => import("./pages/AdvisorChatPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OutcomePage = lazy(() => import("./pages/OutcomePage"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<HomePage />} />
            <Route path="crop-monitor" element={<CropMonitorPage />} />
            <Route path="yield-forecast" element={<YieldForecastPage />} />
            <Route path="disease-risk" element={<DiseaseRiskPage />} />
            <Route path="irrigation" element={<IrrigationPlannerPage />} />
            <Route path="harvest" element={<HarvestPlannerPage />} />
            <Route path="storage" element={<StorageAdvisorPage />} />
            <Route path="market" element={<MarketRoutingPage />} />
            <Route path="profit" element={<ProfitSimulatorPage />} />
            <Route path="advisor" element={<AdvisorChatPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="outcome" element={<OutcomePage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
