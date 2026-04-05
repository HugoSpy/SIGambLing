import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Clock,
  Coins,
  Flame,
  Gift,
  Inbox,
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
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { useGamificationState } from "../hooks/useGamificationState";
import { fetchEvents, fetchMyEventBets, logoutRequest } from "../lib/api";
import { formatEventBetStatus, formatEventDate } from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import type { EventBetStatus } from "../types/event";

function betStatusBadgeClass(status: EventBetStatus) {
  if (status === "WON") return "border-emerald-500/25 bg-emerald-500/15 text-emerald-300";
  if (status === "LOST") return "border-red-500/25 bg-red-500/15 text-red-300";
  if (status === "CANCELLED") return "border-zinc-700 bg-zinc-700/50 text-zinc-400";
  return "border-sky-500/25 bg-sky-500/15 text-sky-300";
}

export function DashboardPage() {
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

  const popularEvents = useMemo(
    () =>
      (events ?? [])
        .slice()
        .sort((a, b) => b.total_pool - a.total_pool)
        .slice(0, 5),
    [events],
  );

  const openPositions = useMemo(() => {
    const bets = myBets ?? [];

    return bets.filter((bet) => {
      if (bet.status !== "PENDING") return false;
      if (bet.type === "PARLAY") {
        return bet.legs.every(
          (leg) => leg.event.status === "OPEN" || leg.event.status === "CLOSED",
        );
      }
      return bet.event?.status === "OPEN" || bet.event?.status === "CLOSED";
    });
  }, [myBets]);
  const highlightedOpenPositions = openPositions.slice(0, 4);

  const recentHistory = useMemo(
    () =>
      (myBets ?? [])
        .filter((b) => b.status !== "PENDING")
        .slice()
        .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
        .slice(0, 5),
    [myBets],
  );

  const unlockedBadges = gamification?.badges.filter((badge) => badge.unlocked).length ?? 0;

  console.log("[DEBUG] bets filtrés :", openPositions.map(b => ({ id: b.id, bet_status: b.status, event_status: b.event?.status, event_title: b.event?.title })));

  if (!user) {
    return <LoadingScreen label="Chargement de votre espace..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Bienvenue, {user.pseudo}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Retrouvez vos stats, les marchés actifs et vos positions en cours.
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
              <span className="text-sm text-zinc-400">Série</span>
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
              {formatTokens(openPositions.reduce((sum, bet) => sum + bet.stake, 0))} engagés
            </p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="space-y-6">
            {/* Événements populaires */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Événements populaires
                  </p>
                  <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    <Flame className="h-5 w-5 text-orange-400" />
                    Top marchés
                  </h2>
                </div>
                <Link
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  to="/events"
                >
                  Voir tout
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {popularEvents.map((event) => (
                  <Link
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900"
                    key={event.id}
                    to={`/events/${event.id}`}
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                      {event.title}
                    </p>
                    <span className="ml-4 shrink-0 text-sm font-semibold text-emerald-400">
                      {formatTokens(event.total_pool)}
                    </span>
                  </Link>
                ))}

                {popularEvents.length === 0 && (
                  <p className="text-sm leading-7 text-zinc-400">
                    Aucun événement disponible pour le moment.
                  </p>
                )}
              </div>
            </Card>

            {/* Mes positions */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Mes positions
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-100">Paris en cours</h2>
                </div>
                <Link
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  to="/events?tab=my-bets"
                >
                  Voir mes paris
                </Link>
              </div>

              <div className="mt-4">
                {highlightedOpenPositions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Inbox className="h-8 w-8 text-zinc-600" />
                    <p className="text-sm text-zinc-500">Aucune position ouverte.</p>
                    <Link
                      className="mt-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                      to="/events"
                    >
                      Parcourir les marchés
                    </Link>
                  </div>
                ) : (
                  <ActiveEventBetsList
                    bets={highlightedOpenPositions}
                    emptyMessage="Aucune position ouverte."
                    events={events}
                    fallbackLinkTarget="/events?tab=my-bets"
                  />
                )}
              </div>
            </Card>

            {/* Historique des paris */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Historique des paris
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-100">Derniers résultats</h2>
                </div>
                <Link
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                  to="/history"
                >
                  Voir tout l'historique
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {recentHistory.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Clock className="h-8 w-8 text-zinc-600" />
                    <p className="text-sm text-zinc-500">Aucun pari résolu pour le moment.</p>
                  </div>
                ) : (
                  recentHistory.map((bet) => {
                    const isParlay = bet.type === "PARLAY";
                    const title = isParlay
                      ? (bet.legs[0]?.event.title ?? "Pari combiné")
                      : (bet.event?.title ?? "Pari");
                    const payout = bet.actual_payout ?? 0;
                    const gain = payout - bet.stake;

                    return (
                      <div
                        className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3"
                        key={bet.id}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-100">{title}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {isParlay
                              ? `${bet.legs.length} sélections · `
                              : bet.chosen_option
                                ? `${bet.chosen_option} · `
                                : ""}
                            Mise : {formatTokens(bet.stake)} · {formatEventDate(bet.placed_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${betStatusBadgeClass(bet.status)}`}
                          >
                            {formatEventBetStatus(bet.status)}
                          </span>
                          {bet.status === "WON" && (
                            <span className="text-xs font-semibold text-emerald-400">
                              +{formatTokens(gain)}
                            </span>
                          )}
                          {bet.status === "LOST" && (
                            <span className="text-xs font-semibold text-red-400">
                              -{formatTokens(bet.stake)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
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
                    {openPositions.length > 0 ? "Classement live" : "Prêt à monter"}
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
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">État live</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-400" />
                    Récompense
                  </span>
                  <span className="text-right text-zinc-100">
                    {gamification?.daily_reward.claimed_today
                      ? "Récupérée"
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
                  <span>Victoires aux paris</span>
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
                Ouvrir le centre de récompenses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Jackpot</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Jackpot</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-400" />
                    Pot
                  </span>
                  <span className="text-zinc-100">
                    {formatTokens(gamification?.jackpot.current_pot ?? 0)}
                  </span>
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
                  <span className="max-w-[180px] truncate text-right text-zinc-100">
                    {user.email}
                  </span>
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
                  <span>Ouvrir les marchés</span>
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
