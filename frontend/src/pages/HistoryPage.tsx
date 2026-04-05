import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { fetchEvents, fetchMyEventBets, logoutRequest } from "../lib/api";
import { formatEventBetStatus, formatEventDate, formatEventOdds } from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import type { EventBetStatus, EventBetView } from "../types/event";

const PAGE_SIZE = 10;

const filterOptions: { label: string; value: EventBetStatus | "ALL" }[] = [
  { label: "Tous", value: "ALL" },
  { label: "Gagné", value: "WON" },
  { label: "Perdu", value: "LOST" },
  { label: "Annulé", value: "CANCELLED" },
];

function betStatusBadgeClass(status: EventBetStatus) {
  if (status === "WON") return "border-emerald-500/25 bg-emerald-500/15 text-emerald-300";
  if (status === "LOST") return "border-red-500/25 bg-red-500/15 text-red-300";
  if (status === "CANCELLED") return "border-zinc-700 bg-zinc-700/50 text-zinc-400";
  return "border-sky-500/25 bg-sky-500/15 text-sky-300";
}

function getEventTitle(bet: EventBetView, events: { id: string; title: string }[] | undefined) {
  if (bet.type === "PARLAY") return `Combiné ${bet.legs.length} sélections`;
  if (bet.event_id) {
    return events?.find((e) => e.id === bet.event_id)?.title ?? "Événement inconnu";
  }
  return "Pari simple";
}

export function HistoryPage() {
  const { data: user } = useAuthenticatedUser();
  const { data: allBets, isLoading } = useQuery({
    queryKey: ["my-event-bets"],
    queryFn: fetchMyEventBets,
  });
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const [filter, setFilter] = useState<EventBetStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);

  const resolvedBets = useMemo(
    () =>
      (allBets ?? [])
        .filter((b) => b.status !== "PENDING")
        .slice()
        .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()),
    [allBets],
  );

  const filteredBets = useMemo(
    () => (filter === "ALL" ? resolvedBets : resolvedBets.filter((b) => b.status === filter)),
    [resolvedBets, filter],
  );

  const totalPages = Math.ceil(filteredBets.length / PAGE_SIZE);
  const pageBets = filteredBets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!user) return <LoadingScreen label="Chargement de l'historique..." />;

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Historique des paris</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Retrouvez tous vos paris résolus, perdus ou annulés.
          </p>
        </div>

        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  filter === opt.value
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                }`}
                type="button"
                onClick={() => {
                  setFilter(opt.value);
                  setPage(0);
                }}
              >
                {opt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-zinc-500">{filteredBets.length} paris</span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Chargement...</p>
          ) : pageBets.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Aucun pari dans cet historique.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageBets.map((bet) => {
                const isParlay = bet.type === "PARLAY";
                const payout = bet.actual_payout ?? 0;
                const gain = payout - bet.stake;

                return (
                  <div
                    className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                    key={bet.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-100">
                          {getEventTitle(bet, events)}
                        </p>
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${betStatusBadgeClass(bet.status)}`}
                        >
                          {formatEventBetStatus(bet.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {!isParlay && bet.chosen_option && <span>{bet.chosen_option}</span>}
                        <span>Mise : {formatTokens(bet.stake)}</span>
                        <span>
                          Cote : {formatEventOdds(isParlay ? bet.total_odds : bet.odds_at_bet)}
                        </span>
                        {bet.status === "WON" && (
                          <span className="text-emerald-400">+{formatTokens(gain)}</span>
                        )}
                        {bet.status === "LOST" && (
                          <span className="text-red-400">-{formatTokens(bet.stake)}</span>
                        )}
                        {bet.status === "CANCELLED" && (
                          <span className="text-zinc-400">
                            Remboursé {formatTokens(bet.actual_payout ?? bet.stake)}
                          </span>
                        )}
                        <span>{formatEventDate(bet.placed_at)}</span>
                      </div>
                    </div>
                    {bet.event_id && (
                      <Link
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
                        to={`/events/${bet.event_id}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === 0}
                type="button"
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </button>
              <span className="text-xs text-zinc-500">
                {page + 1} / {totalPages}
              </span>
              <button
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= totalPages - 1}
                type="button"
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
