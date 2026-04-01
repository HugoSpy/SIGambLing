import { useEffect } from "react";
import { fetchCurrentUser, refreshSession } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function useSessionBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let cancelled = false;

    if (status !== "idle") {
      return;
    }

    const bootstrap = async () => {
      setStatus("loading");

      try {
        if (!accessToken) {
          const token = await refreshSession();

          if (!token) {
            throw new Error("Aucune session active.");
          }
        }

        const user = await fetchCurrentUser();

        if (!cancelled) {
          setUser(user);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, setStatus, setUser, status]);
}
