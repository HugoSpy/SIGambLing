import { Clock3, Coins, Ticket, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { useJackpotState } from "../hooks/useGamificationState";
import { logoutRequest } from "../lib/api";
import { formatTokens } from "../lib/utils";

function formatCountdown(target: string) {
  const diffMs = new Date(target).getTime() - Date.now();

  if (diffMs <= 0) {
    return "Resolution imminente";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}j ${hours}h ${minutes}m`;
}

export function JackpotPage() {
  const { data: user } = useAuthenticatedUser();
  const { data: jackpot } = useJackpotState();

  if (!user) {
    return <LoadingScreen label="Chargement du jackpot..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Jackpot live</p>
              <h1 className="mt-3 font-display text-4xl text-brand-text">Le pot commun du casino</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-muted">
                Chaque mise roulette ou blackjack injecte une part dans le pot. Plus vous jouez,
                plus vous accumulez des tickets pour le tirage de fin de round.
              </p>
            </div>
            {jackpot ? (
              <div className="rounded-[24px] border border-brand-cyan/25 bg-brand-cyan/10 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-cyan">Pot actuel</p>
                <p className="mt-2 font-display text-4xl text-brand-text">
                  {formatTokens(jackpot.current_round.current_pot)}
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        {jackpot ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <Coins className="h-5 w-5 text-brand-cyan" />
                <p className="mt-4 text-xs uppercase tracking-[0.24em] text-brand-muted">
                  Vos tickets
                </p>
                <p className="mt-2 font-display text-3xl text-brand-text">
                  {jackpot.current_round.user_tickets}
                </p>
              </Card>
              <Card>
                <Ticket className="h-5 w-5 text-brand-orange" />
                <p className="mt-4 text-xs uppercase tracking-[0.24em] text-brand-muted">
                  Vos entrees
                </p>
                <p className="mt-2 font-display text-3xl text-brand-text">
                  {jackpot.current_round.user_entries}
                </p>
              </Card>
              <Card>
                <Trophy className="h-5 w-5 text-amber-300" />
                <p className="mt-4 text-xs uppercase tracking-[0.24em] text-brand-muted">
                  Chance estimee
                </p>
                <p className="mt-2 font-display text-3xl text-brand-text">
                  {(jackpot.current_round.user_chance_bps / 100).toFixed(2)}%
                </p>
              </Card>
              <Card>
                <Clock3 className="h-5 w-5 text-brand-cyan" />
                <p className="mt-4 text-xs uppercase tracking-[0.24em] text-brand-muted">
                  Fin du round
                </p>
                <p className="mt-2 font-display text-3xl text-brand-text">
                  {formatCountdown(jackpot.current_round.ends_at)}
                </p>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
              <Card>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Round actif</p>
                <h2 className="mt-2 font-display text-3xl text-brand-text">
                  {jackpot.current_round.label}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                      Tickets en circulation
                    </p>
                    <p className="mt-2 font-display text-2xl text-brand-text">
                      {jackpot.current_round.total_tickets}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                      Ticket unit
                    </p>
                    <p className="mt-2 font-display text-2xl text-brand-text">
                      1 ticket / {formatTokens(jackpot.current_round.ticket_unit_amount)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                      Contribution casino
                    </p>
                    <p className="mt-2 font-display text-2xl text-brand-text">
                      {(jackpot.current_round.contribution_rate_bps / 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                      Votre contribution
                    </p>
                    <p className="mt-2 font-display text-2xl text-brand-text">
                      {formatTokens(jackpot.current_round.user_contribution)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    className="inline-flex items-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2 text-sm font-semibold text-brand-cyan transition hover:bg-brand-cyan/20"
                    to="/casino"
                  >
                    Aller au casino
                  </Link>
                  <p className="text-sm text-brand-muted">
                    Le round se cloture automatiquement a l'echeance. Si personne n'entre, un
                    nouveau round redemarre avec le seed initial.
                  </p>
                </div>
              </Card>

              <Card>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Dernier resultat</p>
                {jackpot.last_result ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="font-display text-3xl text-brand-text">
                        {formatTokens(jackpot.last_result.payout_amount)}
                      </p>
                      <p className="mt-2 text-sm text-brand-muted">
                        Verse a{" "}
                        <span className="font-semibold text-brand-text">
                          {jackpot.last_result.winner?.pseudo ?? "aucun gagnant"}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-brand-muted">
                      Resolution{" "}
                      {jackpot.last_result.resolved_at
                        ? new Date(jackpot.last_result.resolved_at).toLocaleString("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "indisponible"}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-brand-muted">
                    Aucun round resolu pour le moment. Les premieres mises casino lanceront la
                    boucle.
                  </p>
                )}
              </Card>
            </div>
          </>
        ) : (
          <LoadingScreen label="Synchronisation du round..." />
        )}
      </div>
    </DashboardShell>
  );
}
