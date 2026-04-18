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
          <h1 className="text-xl font-bold text-[var(--fg-primary)]">
            Bienvenue, {user.pseudo}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--fg-secondary)]">
            Marchés actifs et positions en cours.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card accent="cyan" className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--fg-secondary)]">Solde</span>
              <Coins className="h-3.5 w-3.5 text-[var(--brand-emerald-hover)]" />
            </div>
            <p className="text-xl font-bold text-[var(--brand-emerald-hover)] numeric leading-tight">
              {formatTokens(user.balance)}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">tokens</p>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--fg-secondary)]">Série</span>
              <Flame className="h-3.5 w-3.5 text-[var(--brand-amber-hover)]" />
            </div>
            <p className="text-xl font-bold text-[var(--fg-primary)] numeric leading-tight">
              {gamification?.daily_reward.current_streak ?? user.streak_days}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">jours</p>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--fg-secondary)]">Positions</span>
              <TrendingUp className="h-3.5 w-3.5 text-[var(--cat-sky)]" />
            </div>
            <p className="text-xl font-bold text-[var(--fg-primary)] numeric leading-tight">
              {openPositions.length}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
              {formatTokens(openPositions.reduce((s, b) => s + b.stake, 0))} engagés
            </p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="space-y-6">
            {/* Événements populaires */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">
                    Événements populaires
                  </p>
                  <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--fg-primary)]">
                    <Flame className="h-5 w-5 text-orange-400" />
                    Top marchés
                  </h2>
                </div>
                <Link
                  className="text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                  to="/events"
                >
                  Voir tout
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {popularEvents.map((event) => (
                  <Link
                    className="flex items-center justify-between rounded-lg border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3 transition hover:border-[var(--ink-700)] hover:bg-[var(--surface-1)]"
                    key={event.id}
                    to={`/events/${event.id}`}
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--fg-primary)]">
                      {event.title}
                    </p>
                    <span className="ml-4 shrink-0 text-sm font-semibold text-[var(--brand-emerald-hover)]">
                      {formatTokens(event.total_pool)}
                    </span>
                  </Link>
                ))}

                {popularEvents.length === 0 && (
                  <p className="text-sm leading-7 text-[var(--fg-secondary)]">
                    Aucun événement disponible pour le moment.
                  </p>
                )}
              </div>
            </Card>

            {/* Mes positions */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">
                    Mes positions
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">Paris en cours</h2>
                </div>
                <Link
                  className="text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                  to="/events?tab=my-bets"
                >
                  Voir mes paris
                </Link>
              </div>

              <div className="mt-4">
                {highlightedOpenPositions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Inbox className="h-8 w-8 text-[var(--fg-muted)]" />
                    <p className="text-sm text-[var(--fg-muted)]">Aucune position ouverte.</p>
                    <Link
                      className="mt-1 text-sm font-medium text-[var(--brand-emerald-hover)] hover:text-[var(--brand-emerald-hover)]"
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
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">
                    Historique des paris
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">Derniers résultats</h2>
                </div>
                <Link
                  className="text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                  to="/history"
                >
                  Voir tout l'historique
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {recentHistory.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Clock className="h-8 w-8 text-[var(--fg-muted)]" />
                    <p className="text-sm text-[var(--fg-muted)]">Aucun pari résolu pour le moment.</p>
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
                        className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3"
                        key={bet.id}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--fg-primary)]">{title}</p>
                          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
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
                            <span className="text-xs font-semibold text-[var(--brand-emerald-hover)]">
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
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-emerald-hover)]">Leaderboard</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">Momentum 60 jours</h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--fg-secondary)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber-300" />
                    Position
                  </span>
                  <span className="text-[var(--fg-primary)]">
                    {openPositions.length > 0 ? "Classement live" : "Prêt à monter"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Paris actifs</span>
                  <span className="text-[var(--fg-primary)]">{openPositions.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Exposition ouverte</span>
                  <span className="text-[var(--fg-primary)]">
                    {formatTokens(openPositions.reduce((sum, bet) => sum + bet.stake, 0))}
                  </span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                to="/leaderboard"
              >
                Ouvrir le leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Jackpot</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">Jackpot</h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--fg-secondary)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Coins className="h-4 w-4 text-[var(--brand-emerald-hover)]" />
                    Pot
                  </span>
                  <span className="text-[var(--fg-primary)]">
                    {formatTokens(Math.round(gamification?.jackpot.current_pot ?? 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-amber-400" />
                    Vos apports
                  </span>
                  <span className="text-[var(--fg-primary)]">
                    {formatTokens(Math.round(gamification?.jackpot.user_contribution_total ?? 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Contributions</span>
                  <span className="text-[var(--fg-primary)]">
                    {gamification?.jackpot.user_contribution_count ?? 0}
                  </span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                to="/jackpot"
              >
                Ouvrir le jackpot
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Compte</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">Votre profil</h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--fg-secondary)]">
                <div className="flex items-center justify-between gap-3">
                  <span>Email</span>
                  <span className="max-w-[180px] truncate text-right text-[var(--fg-primary)]">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Pseudo</span>
                  <span className="text-[var(--fg-primary)]">{user.pseudo}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Role</span>
                  <span className="text-[var(--fg-primary)]">{user.role}</span>
                </div>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-emerald-hover)] transition hover:text-[var(--brand-emerald-hover)]"
                to="/profile"
              >
                Gerer mon profil
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Raccourcis</p>
              <div className="mt-4 space-y-3">
                <Link
                  className="flex items-center justify-between rounded-lg border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg-primary)] transition hover:border-[var(--ink-700)] hover:bg-[var(--surface-1)]"
                  to="/events"
                >
                  <span>Ouvrir les marchés</span>
                  <ArrowRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </Link>
                <Link
                  className="flex items-center justify-between rounded-lg border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg-primary)] transition hover:border-[var(--ink-700)] hover:bg-[var(--surface-1)]"
                  to="/casino"
                >
                  <span>Aller a la roulette</span>
                  <ArrowRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </Link>
                {user.role === "admin" ? (
                  <Link
                    className="flex items-center justify-between rounded-lg border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg-primary)] transition hover:border-[var(--ink-700)] hover:bg-[var(--surface-1)]"
                    to="/admin/events"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Panneau admin
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--fg-muted)]" />
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
