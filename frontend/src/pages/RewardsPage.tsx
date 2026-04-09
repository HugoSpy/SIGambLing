import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "../components/layout/DashboardShell";
import { Button } from "../components/ui/Button";
import { useGamificationState } from "../hooks/useGamificationState";
import { claimDailyReward, logoutRequest } from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { LoadingScreen } from "../components/layout/LoadingScreen";

function useCountdown(targetDate: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("Disponible maintenant");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function RewardsPage() {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((state) => state.updateBalance);
  const { data: user } = useAuthenticatedUser();
  const { data: gamification } = useGamificationState();

  const rewardAvailable = gamification != null && !gamification.daily_reward.claimed_today;
  const rewardAmount =
    (gamification?.daily_reward.base_amount ?? 0) +
    (gamification?.daily_reward.streak_bonus ?? 0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const modalInitialized = useRef(false);

  useEffect(() => {
    if (gamification && !modalInitialized.current) {
      modalInitialized.current = true;
      if (rewardAvailable) {
        setIsModalOpen(true);
      }
    }
  }, [gamification, rewardAvailable]);

  const countdown = useCountdown(
    !rewardAvailable || claimed ? gamification?.daily_reward.next_claim_at : null,
  );

  const handleLogout = async () => {
    await logoutRequest();
    notify.success("Session fermée.");
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const result = await claimDailyReward();
      updateBalance(result.user.balance);
      queryClient.setQueryData(["gamification"], result.gamification);
      queryClient.setQueryData(["jackpot"], result.gamification.jackpot);
      setIsModalOpen(false);
      setClaimed(true);
      void confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#f59e0b", "#fbbf24"],
      });
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setIsClaiming(false);
    }
  };

  if (!user) {
    return <LoadingScreen label="Chargement..." />;
  }

  const showCountdown = (!rewardAvailable || claimed) && gamification;

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-500">Récompenses</p>
          <h1 className="mt-3 font-display text-2xl sm:text-4xl text-brand-text">Récompense journalière</h1>
          <p className="mt-3 text-base leading-8 text-brand-muted">
            Connectez-vous chaque jour pour accumuler votre série et augmenter vos bonus.
          </p>
        </div>

        {showCountdown ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mx-auto">
              <Gift className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="mt-4 text-sm uppercase tracking-widest text-zinc-500">
              Prochaine récompense dans
            </p>
            <p className="mt-2 font-display text-3xl sm:text-5xl tabular-nums text-emerald-400">{countdown}</p>
            {gamification && (
              <p className="mt-4 text-sm text-zinc-400">
                Série actuelle :{" "}
                <span className="font-semibold text-zinc-100">
                  {gamification.daily_reward.current_streak} jour
                  {gamification.daily_reward.current_streak > 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mx-auto">
              <Gift className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="mt-4 text-sm uppercase tracking-widest text-emerald-500/70">
              Récompense disponible
            </p>
            <p className="mt-2 font-display text-3xl sm:text-5xl text-emerald-400">
              {formatTokens(rewardAmount)}
            </p>
            <Button
              className="mt-6"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Gift className="mr-2 h-4 w-4" />
              Récupérer
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <button
                className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-5 flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Gift className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Récompense quotidienne</h2>
                  {gamification && (
                    <p className="mt-1 text-sm text-zinc-400">
                      Série actuelle :{" "}
                      <span className="font-medium text-zinc-100">
                        {gamification.daily_reward.current_streak} jour
                        {gamification.daily_reward.current_streak > 1 ? "s" : ""}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-widest text-emerald-500/70">
                  Vous allez recevoir
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-400">
                  {formatTokens(rewardAmount)}
                </p>
                {gamification && gamification.daily_reward.streak_bonus > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    dont +{formatTokens(gamification.daily_reward.streak_bonus)} bonus de série
                  </p>
                )}
              </div>

              <Button
                disabled={isClaiming}
                fullWidth
                variant="primary"
                onClick={() => void handleClaim()}
              >
                {isClaiming ? "Récupération…" : "Récupérer"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
