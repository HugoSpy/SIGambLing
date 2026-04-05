import { useEffect } from "react";
import { fetchCurrentUser, refreshSession } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function useSessionBootstrap() {
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let cancelled = false;
    const accessTokenAtStart = useAuthStore.getState().accessToken;
    console.log("[bootstrap] useEffect — status:", status, "| accessToken present:", !!accessTokenAtStart);

    if (status !== "idle") {
      console.log("[bootstrap] skipping — status is not idle:", status);
      return;
    }

    const bootstrap = async () => {
      setStatus("loading");
      console.log("[bootstrap] setStatus('loading') called");

      try {
        const accessToken = useAuthStore.getState().accessToken;
        console.log("[bootstrap] accessToken in store:", !!accessToken);

        if (!accessToken) {
          console.log("[bootstrap] no accessToken — calling refreshSession()...");
          const token = await refreshSession();
          console.log("[bootstrap] refreshSession() returned:", token ? "token present" : "null/undefined");

          if (!token) {
            throw new Error("Aucune session active.");
          }
        }

        console.log("[bootstrap] calling fetchCurrentUser()...");
        const user = await fetchCurrentUser();
        console.log("[bootstrap] fetchCurrentUser() returned:", user);

        if (!cancelled) {
          console.log("[bootstrap] calling setUser() then setStatus('authenticated')");
          setUser(user);
          setStatus("authenticated");
        } else {
          console.log("[bootstrap] cancelled before setUser/setStatus — skipping");
        }
      } catch (err) {
        console.error("[bootstrap] caught error:", err);
        if (!cancelled) {
          console.log("[bootstrap] calling clearSession()");
          clearSession();
        } else {
          console.log("[bootstrap] cancelled — skipping clearSession()");
        }
      }
    };

    void bootstrap();

    return () => {
      console.log("[bootstrap] cleanup — marking cancelled=true");
      cancelled = true;
    };
  }, [clearSession, setStatus, setUser, status]);
}
