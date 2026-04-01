import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { useAuthStore } from "../store/auth-store";

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Ouverture de votre espace..." />;
  }

  if (status !== "authenticated") {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
}
