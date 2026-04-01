import { Navigate, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { useSessionBootstrap } from "./hooks/useSessionBootstrap";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { CasinoPage } from "./pages/CasinoPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuthStore } from "./store/auth-store";

function LandingRedirect() {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Connexion au lounge privé SIGambling..." />;
  }

  return <Navigate replace to={status === "authenticated" ? "/dashboard" : "/login"} />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Initialisation de la session..." />;
  }

  if (status === "authenticated") {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

export default function App() {
  useSessionBootstrap();

  return (
    <AppErrorBoundary>
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
          <Route path="/casino" element={<CasinoPage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </AppErrorBoundary>
  );
}
