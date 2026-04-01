import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { useAuthStore } from "../store/auth-store";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return <LoadingScreen label="Ouverture de votre espace..." />;
  }

  if (status !== "authenticated") {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
