import { startTransition, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { fetchCurrentUser, refreshSession } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setStatus = useAuthStore((state) => state.setStatus);

  useEffect(() => {
    const error = searchParams.get("error");

    const completeCallback = async () => {
      if (error) {
        clearSession();
        toast.error(error ?? "La connexion Microsoft n'a pas pu être finalisée.");
        startTransition(() => {
          navigate("/login", { replace: true });
        });
        return;
      }

      try {
        setStatus("loading");
        const accessToken = await refreshSession();

        if (!accessToken) {
          throw new Error("Aucune session Microsoft active.");
        }

        const user = await fetchCurrentUser();
        setSession({ user, accessToken });
        startTransition(() => {
          navigate("/dashboard", { replace: true });
        });
      } catch (callbackError) {
        clearSession();
        toast.error(
          callbackError instanceof Error
            ? callbackError.message
            : "Impossible de finaliser la session Microsoft.",
        );
        startTransition(() => {
          navigate("/login", { replace: true });
        });
      }
    };

    void completeCallback();
  }, [clearSession, navigate, searchParams, setSession, setStatus]);

  return <LoadingScreen label="Connexion en cours..." />;
}
