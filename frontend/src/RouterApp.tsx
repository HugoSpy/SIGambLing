import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { LoadingScreen } from "./components/layout/LoadingScreen";
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
const AdminEventsPage = lazy(() =>
  import("./pages/admin/AdminEventsPage").then((module) => ({ default: module.AdminEventsPage })),
);
const AdminStatisticsPage = lazy(() =>
  import("./pages/admin/AdminStatisticsPage").then((module) => ({ default: module.AdminStatisticsPage })),
);

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

export default function RouterApp() {
  useSessionBootstrap();

  return (
    <AppErrorBoundary>
      <Suspense fallback={<LoadingScreen label="Chargement de l'interface..." />}>
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
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/casino" element={<CasinoPage />} />
            <Route path="/casino/:game" element={<CasinoPage />} />
            <Route path="/jackpot" element={<JackpotPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/events" element={<AdminEventsPage />} />
            <Route path="/admin/statistics" element={<AdminStatisticsPage />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
