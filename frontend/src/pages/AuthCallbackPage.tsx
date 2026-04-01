import { startTransition, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { fetchCurrentUser } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setStatus = useAuthStore((state) => state.setStatus);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const error = searchParams.get("error");

    const completeCallback = async () => {
      if (error || !accessToken) {
        clearSession();
        toast.error(error ?? "La connexion Microsoft n'a pas pu être finalisée.");
        startTransition(() => {
          navigate("/login", { replace: true });
        });
        return;
      }

      try {
        setStatus("loading");
        setAccessToken(accessToken);
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
  }, [clearSession, navigate, searchParams, setAccessToken, setSession, setStatus]);

  return <LoadingScreen label="Connexion en cours..." />;
}
