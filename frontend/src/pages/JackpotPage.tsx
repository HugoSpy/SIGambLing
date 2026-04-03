import { useEffect, useState } from "react";
import { Coins, Sparkles, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { useJackpotState } from "../hooks/useGamificationState";
import { logoutRequest } from "../lib/api";
import { formatTokens } from "../lib/utils";

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "indisponible";
  }

  const diffMs = Date.now() - new Date(value).getTime();

  if (diffMs < 60_000) {
    return "il y a quelques secondes";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);

  if (totalMinutes < 60) {
    return `il y a ${totalMinutes} min`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    return `il y a ${totalHours} h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `il y a ${totalDays} jour${totalDays > 1 ? "s" : ""}`;
}

export function JackpotPage() {
  const { data: user } = useAuthenticatedUser();
  const { data: jackpot } = useJackpotState();
  const [displayedPot, setDisplayedPot] = useState(0);

  useEffect(() => {
    if (!jackpot) {
      return;
    }

    setDisplayedPot((current) => {
      if (current === 0) {
        return jackpot.current_pot;
      }

      return current;
    });
  }, [jackpot]);

  useEffect(() => {
    if (!jackpot) {
      return;
    }

    const target = jackpot.current_pot;
    const interval = window.setInterval(() => {
      setDisplayedPot((current) => {
        if (current === target) {
          return current;
        }

        const delta = target - current;
        const step = Math.max(1, Math.ceil(Math.abs(delta) / 12));
        return current + Math.sign(delta) * step;
      });
    }, 80);

    return () => window.clearInterval(interval);
  }, [jackpot]);

  if (!user) {
    return <LoadingScreen label="Chargement du jackpot..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card className="overflow-hidden border-brand-cyan/20 bg-[radial-gradient(circle_at_top,#15374d,transparent_58%),linear-gradient(135deg,#08141d,#0c2230_55%,#143645)]">
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.36em] text-brand-cyan">Jackpot live</p>
                <h1 className="mt-4 font-display text-4xl text-brand-text md:text-6xl">
                  La cagnotte permanente
                </h1>
              </div>
              <div className="hidden rounded-full border border-brand-cyan/20 bg-brand-cyan/10 p-4 md:block">
                <Sparkles className="h-7 w-7 text-brand-cyan" />
              </div>
            </div>

            <div className="rounded-[32px] border border-brand-cyan/25 bg-slate-950/35 px-6 py-8 text-center shadow-[0_30px_80px_rgba(7,15,24,0.35)]">
              <p className="text-xs uppercase tracking-[0.32em] text-brand-cyan">Montant actuel</p>
              <p className="mt-5 font-display text-5xl text-brand-text md:text-7xl">
                {formatTokens(displayedPot)}
              </p>
              <p className="mt-4 text-sm text-brand-muted">
                1% de chaque pari alimente le pot. Le prochain gagnant sera designe lors d'un
                événement GOLD exceptionnel.
              </p>
            </div>
          </div>
        </Card>

        {jackpot ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">
                    Votre impact
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-brand-text">
                    Contribution live
                  </h2>
                </div>
                <Coins className="h-6 w-6 text-brand-cyan" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                    Vos apports
                  </p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {formatTokens(jackpot.user_contribution_total)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                    Contributions
                  </p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {jackpot.user_contribution_count}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                    Taux de feed
                  </p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {(jackpot.contribution_rate_bps / 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-brand-muted">
                Le jackpot ne tourne plus par deadline ni par tickets. Chaque mise roulette,
                blackjack ou événement ajoute automatiquement une fraction au pot, et le montant
                reste visible en continu pour tout le monde.
              </div>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Dernier gagnant</p>
              {jackpot.last_result ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-brand-orange/25 bg-brand-orange/10 p-5">
                    <Trophy className="h-6 w-6 text-brand-orangeSoft" />
                    <p className="mt-4 font-display text-3xl text-brand-text">
                      {formatTokens(jackpot.last_result.payout_amount)}
                    </p>
                    <p className="mt-2 text-sm text-brand-muted">
                      Verse a{" "}
                      <span className="font-semibold text-brand-text">
                        {jackpot.last_result.winner?.pseudo ?? "aucun gagnant"}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm text-brand-muted">
                    Remporte {formatRelativeDate(jackpot.last_result.won_at)}.
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-brand-muted">
                  Aucun gagnant pour le moment. Le premier payout GOLD initialisera l'historique.
                </p>
              )}

              <div className="mt-6 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-brand-muted">
                Total redistribue au jackpot depuis l'ouverture:{" "}
                <span className="font-semibold text-brand-text">
                  {formatTokens(jackpot.total_contributed)}
                </span>
              </div>
            </Card>
          </div>
        ) : (
          <LoadingScreen label="Synchronisation du jackpot..." />
        )}
      </div>
    </DashboardShell>
  );
}
