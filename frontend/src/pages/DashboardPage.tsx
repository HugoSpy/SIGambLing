import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Coins,
  Flame,
  Gift,
  Github,
  Medal,
  ShieldCheck,
  Ticket,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ActiveEventBetsList } from "../components/ActiveEventBetsList";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { useGamificationState } from "../hooks/useGamificationState";
import { claimGitHubBonus, fetchEvents, fetchMyEventBets, logoutRequest } from "../lib/api";
import { formatEventDate } from "../lib/event-utils";
import { getErrorMessage } from "../lib/notifications";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { applyGitHubBonusClaim } from "../../../shared/auth-user-updates";

export function DashboardPage() {
  const [claimingBonus, setClaimingBonus] = useState(false);
  const { data: user } = useAuthenticatedUser();
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });
  const { data: gamification } = useGamificationState();
  const { data: myBets } = useQuery({
    queryKey: ["my-event-bets"],
    queryFn: fetchMyEventBets,
  });
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const activeEvents = (events ?? []).filter((event) => event.status === "OPEN").slice(0, 5);
  const openPositions = myBets?.filter((bet) => bet.status === "PENDING") ?? [];
  const highlightedOpenPositions = openPositions.slice(0, 4);
  const unlockedBadges = gamification?.badges.filter((badge) => badge.unlocked).length ?? 0;

  if (!user) {
    return <LoadingScreen label="Chargement de votre espace..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  const handleClaimGitHubBonus = async () => {
    try {
      setClaimingBonus(true);
      const result = await claimGitHubBonus();
      const updatedUser = applyGitHubBonusClaim(user, result.amount);

      setUser(updatedUser);
      queryClient.setQueryData(["me"], updatedUser);
      toast.success(`Bonus GitHub valide: +${formatTokens(result.amount)} tokens`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setClaimingBonus(false);
    }
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Bienvenue, {user.pseudo}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Retrouvez vos stats, les marches actifs et vos positions en cours.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card accent="cyan">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Solde</span>
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-400">{formatTokens(user.balance)}</p>
            <p className="mt-1 text-xs text-zinc-500">Tokens disponibles pour vos paris</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Serie</span>
              <Flame className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-zinc-100">
              {gamification?.daily_reward.current_streak ?? user.streak_days} jour
              {(gamification?.daily_reward.current_streak ?? user.streak_days) > 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Connexion quotidienne actuelle</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Positions ouvertes</span>
              <TrendingUp className="h-4 w-4 text-sky-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-zinc-100">{openPositions.length}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatTokens(openPositions.reduce((sum, bet) => sum + bet.stake, 0))} engages
            </p>
          </Card>
        </div>

        {!user.claimed_github_bonus ? (
          <Card accent="cyan">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Onboarding</p>
                <h2 className="mt-2 text-2xl font-bold text-zinc-100">
                  Bonus GitHub a activer
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Ajoutez une etoile au repo SIGambLing puis declenchez votre bonus de bonne foi pour
                  crediter {formatTokens(300)} tokens sur votre compte.
                </p>
                <a
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  href="https://github.com/HugoSpy/SIGambLing"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Github className="h-4 w-4" />
                  Ouvrir le repo SIGambLing
                </a>
              </div>

              <Button disabled={claimingBonus} onClick={() => void handleClaimGitHubBonus()}>
                <Gift className="mr-2 h-4 w-4" />
                {claimingBonus ? "Verification..." : "Crediter +300 tokens"}
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="animate-pulse text-sm font-bold uppercase tracking-[0.28em] text-red-500" style={{ animationDuration: "2s" }}>● LIVE</h1>
                  <h2 className="mt-2 text-2xl font-bold text-zinc-100">Mes paris à surveiller</h2>
                </div>
                <Link
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  to="/events?tab=my-bets"
                >
                  Voir mes paris
                </Link>
              </div>

              <div className="mt-4">
                <ActiveEventBetsList
                  bets={highlightedOpenPositions}
                  emptyMessage="Aucune position ouverte. Ouvrez un marche ou composez un combine."
                  events={events}
                  fallbackLinkTarget="/events?tab=my-bets"
                />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Evenements actifs</p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-100">A surveiller</h2>
                </div>
                <Link
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  to="/events"
                >
                  Voir tout
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {activeEvents.map((event) => (
                  <Link
                    className="block rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                    key={event.id}
                    to={`/events/${event.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>{formatEventDate(event.closing_at)}</span>
                          <span>{formatTokens(event.total_pool)}</span>
                        </div>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 text-zinc-500" />
                    </div>
                  </Link>
                ))}

                {activeEvents.length === 0 ? (
                  <p className="text-sm leading-7 text-zinc-400">
                    Aucun marche ouvert pour le moment.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card accent="cyan">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Leaderboard</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Momentum 60 jours</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber-300" />
                    Position
                  </span>
                  <span className="text-zinc-100">
                    {openPositions.length > 0 ? "Classement live" : "Pret a monter"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Paris actifs</span>
                  <span className="text-zinc-100">{openPositions.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Exposition ouverte</span>
                  <span className="text-zinc-100">
                    {formatTokens(openPositions.reduce((sum, bet) => sum + bet.stake, 0))}
                  </span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                to="/leaderboard"
              >
                Ouvrir le leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Gamification</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Etat live</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-400" />
                    Recompense
                  </span>
                  <span className="text-right text-zinc-100">
                    {gamification?.daily_reward.claimed_today
                      ? "Recuperee"
                      : `${formatTokens(gamification?.daily_reward.next_amount ?? 100)} tokens`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-400" />
                    Badges
                  </span>
                  <span className="text-zinc-100">{unlockedBadges}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Victoires paris</span>
                  <span className="text-zinc-100">{gamification?.stats.event_wins ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Victoires casino</span>
                  <span className="text-zinc-100">{gamification?.stats.casino_wins ?? 0}</span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                to="/profile"
              >
                Ouvrir le centre de recompenses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Jackpot</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Pot Total Commun</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-400" />
                    Pot
                  </span>
                  <span className="text-zinc-100">{formatTokens(gamification?.jackpot.current_pot ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-amber-400" />
                    Vos apports
                  </span>
                  <span className="text-zinc-100">
                    {formatTokens(gamification?.jackpot.user_contribution_total ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Contributions</span>
                  <span className="text-zinc-100">
                    {gamification?.jackpot.user_contribution_count ?? 0}
                  </span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                to="/jackpot"
              >
                Ouvrir le jackpot
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Compte</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Votre profil</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span>Email</span>
                  <span className="max-w-[180px] truncate text-right text-zinc-100">{user.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Pseudo</span>
                  <span className="text-zinc-100">{user.pseudo}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Role</span>
                  <span className="text-zinc-100">{user.role}</span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                to="/profile"
              >
                Gerer mon profil
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Raccourcis</p>
              <div className="mt-4 space-y-3">
                <Link
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
                  to="/events"
                >
                  <span>Ouvrir les marches</span>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </Link>
                <Link
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
                  to="/casino"
                >
                  <span>Aller a la roulette</span>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </Link>
                {user.role === "admin" ? (
                  <Link
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
                    to="/admin/events"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Panneau admin
                    </span>
                    <ArrowRight className="h-4 w-4 text-zinc-500" />
                  </Link>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
