import { useEffect } from "react";
import { fetchCurrentUser, getMaintenanceStatus, refreshSession } from "../lib/api";
import { useAuthStore } from "../store/auth-store";
import { useThemeStore } from "../store/theme-store";

export function useSessionBootstrap() {
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setMaintenanceMode = useAuthStore((state) => state.setMaintenanceMode);
  const setFeatureFlags = useAuthStore((state) => state.setFeatureFlags);

  useEffect(() => {
    let cancelled = false;

    if (status !== "idle") {
      return;
    }

    const bootstrap = async () => {
      setStatus("loading");

      try {
        // Fetch maintenance status + feature flags (public, no auth required, single request)
        const { maintenanceMode, rouletteDisabled, blackjackDisabled, eventsDisabled, minesDisabled, crashDisabled } = await getMaintenanceStatus();
        setMaintenanceMode(maintenanceMode);
        setFeatureFlags({ rouletteDisabled, blackjackDisabled, eventsDisabled, minesDisabled, crashDisabled });

        const accessToken = useAuthStore.getState().accessToken;

        if (!accessToken) {
          const token = await refreshSession();

          if (!token) {
            throw new Error("Aucune session active.");
          }
        }

        const user = await fetchCurrentUser();

        setUser(user);
        setStatus("authenticated");
        useThemeStore.getState().initTheme(user.theme_preference);

      } catch (err) {
        if (!cancelled) {
          clearSession();
          useThemeStore.getState().initTheme();
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, setFeatureFlags, setMaintenanceMode, setStatus, setUser, status]);
}
