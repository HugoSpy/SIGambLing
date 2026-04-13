import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import MaintenancePage from "./pages/MaintenancePage";
import EventsDisabledPage from "./pages/EventsDisabledPage";
import { useSessionBootstrap } from "./hooks/useSessionBootstrap";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuthStore } from "./store/auth-store";

const AuthCallbackPage = lazy(() =>
  import("./pages/AuthCallbackPage").then((module) => ({ default: module.AuthCallbackPage })),
);
const CasinoPage = lazy(() =>
  import("./pages/CasinoPage").then((module) => ({ default: module.CasinoPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const EventDetailPage = lazy(() =>
  import("./pages/EventDetailPage").then((module) => ({ default: module.EventDetailPage })),
);
const EventsPage = lazy(() =>
  import("./pages/EventsMarketsPage").then((module) => ({ default: module.EventsPage })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const JackpotPage = lazy(() =>
  import("./pages/JackpotPage").then((module) => ({ default: module.JackpotPage })),
);
const LeaderboardPage = lazy(() =>
  import("./pages/LeaderboardPage").then((module) => ({ default: module.LeaderboardPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/AccountProfilePage").then((module) => ({ default: module.ProfilePage })),
);
const UserProfilePage = lazy(() =>
  import("./pages/UserProfilePage").then((module) => ({ default: module.UserProfilePage })),
);
const AdminEventsPage = lazy(() =>
  import("./pages/admin/AdminEventsPage").then((module) => ({ default: module.AdminEventsPage })),
);
const AdminStatisticsPage = lazy(() =>
  import("./pages/admin/AdminStatisticsPage").then((module) => ({ default: module.AdminStatisticsPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((module) => ({ default: module.HistoryPage })),
);
const RewardsPage = lazy(() =>
  import("./pages/RewardsPage").then((module) => ({ default: module.RewardsPage })),
);
const WinsPage = lazy(() =>
  import("./pages/WinsPage").then((module) => ({ default: module.WinsPage })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LandingRedirect() {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Ouverture de votre espace SIGambling..." />;
  }

  return <Navigate replace to={status === "authenticated" ? "/dashboard" : "/login"} />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Preparation de la session..." />;
  }

  if (status === "authenticated") {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

function EventsGuard({ children }: { children: ReactNode }) {
  const eventsDisabled = useAuthStore((state) => state.eventsDisabled);
  const user = useAuthStore((state) => state.user);

  if (eventsDisabled && user?.role !== "admin") {
    return <EventsDisabledPage />;
  }

  return <>{children}</>;
}

export default function RouterApp() {
  useSessionBootstrap();

  const maintenanceMode = useAuthStore((state) => state.maintenanceMode);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  if (maintenanceMode && (status === "anonymous" || (status === "authenticated" && user?.role !== "admin"))) {
    return <MaintenancePage />;
  }

  return (
    <AppErrorBoundary>
      <Suspense fallback={<LoadingScreen label="Chargement de l'interface..." />}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventsGuard><EventsPage /></EventsGuard>} />
            <Route path="/events/:id" element={<EventsGuard><EventDetailPage /></EventsGuard>} />
            <Route path="/casino" element={<CasinoPage />} />
            <Route path="/casino/:game" element={<CasinoPage />} />
            <Route path="/jackpot" element={<JackpotPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/wins" element={<WinsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["admin", "validator"]} />}>
            <Route path="/admin/events" element={<AdminEventsPage />} />
            <Route path="/admin/statistics" element={<AdminStatisticsPage />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
