import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { AppLayout } from '../components/layout/AppLayout';

// Features
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { NutritionPage } from '../features/nutrition/NutritionPage';
import { WorkoutsPage } from '../features/workouts/WorkoutsPage';
import { ActivitiesPage } from '../features/activities/ActivitiesPage';
import { WeightPage } from '../features/weight/WeightPage';
import { PlannerPage } from '../features/planner/PlannerPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { AiAssistantPage } from '../features/ai-assistant/AiAssistantPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ScreenTimePage } from '../features/screentime/ScreenTimePage';
import { FinancePage } from '../features/finance/FinancePage';
import { ModuleBuilderPage } from '../features/custom-modules/ModuleBuilderPage';
import { CustomModuleViewPage } from '../features/custom-modules/CustomModuleViewPage';
import { WaterPage } from '../features/water/WaterPage';
import { FitnessPage } from '../features/fitness/FitnessPage';
import { CustomizationCenterPage } from '../features/customization/CustomizationCenterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 3, // 3 minutes
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-medium tracking-wide">
            Loading FITPULSE AI...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="fitness" element={<FitnessPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="water" element={<WaterPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="weight" element={<WeightPage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="screen-time" element={<ScreenTimePage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="modules/builder" element={<ModuleBuilderPage />} />
            <Route path="modules/:slug" element={<CustomModuleViewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="ai-assistant" element={<AiAssistantPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="customization" element={<CustomizationCenterPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
export default App;
