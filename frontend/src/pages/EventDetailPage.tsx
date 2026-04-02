import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2, Plus, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { BetDrawer } from "../components/BetDrawer";
import { OddsHistoryChart } from "../components/OddsHistoryChart";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { fetchEventById, fetchEventOddsHistory, logoutRequest } from "../lib/api";
import {
  formatEventCategory,
  formatEventDate,
  formatEventOdds,
  formatEventStatus,
  statusTone,
} from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import { useBetCartStore } from "../store/bet-cart-store";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useAuthenticatedUser();
  const addSelection = useBetCartStore((state) => state.addSelection);
  const selectedCartEntry = useBetCartStore((state) =>
    state.selections.find((selection) => selection.eventId === id),
  );
  const [betOpen, setBetOpen] = useState(false);
  const [betOption, setBetOption] = useState<string | null>(null);

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(id ?? ""),
    enabled: Boolean(id),
  });

  const { data: oddsHistory } = useQuery({
    queryKey: ["event-odds-history", id],
    queryFn: () => fetchEventOddsHistory(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: 10_000,
  });

  if (!user || isLoading) {
    return <LoadingScreen label="Chargement de l'evenement..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      {!event || error ? (
        <Card>
          <p className="text-sm text-red-300">{toErrorMessage(error)}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Link
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100"
            to="/events"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux evenements
          </Link>

          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                {formatEventCategory(event.category)}
              </span>
              <span className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(event.status)}`}>
                {formatEventStatus(event.status)}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold text-zinc-100">{event.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              {event.description || "Aucune description fournie pour cet evenement."}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Pool totale</p>
                <p className="mt-2 text-xl font-semibold text-emerald-400">
                  {formatTokens(event.total_pool)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Cloture</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {formatEventDate(event.closing_at)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Createur</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {event.created_by?.pseudo ?? "Admin"}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      Historique des cotes
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-100">
                      Evolution des issues
                    </h2>
                  </div>
                  <CalendarClock className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="mt-4">
                  <OddsHistoryChart series={oddsHistory?.series ?? []} />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Issues</p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-100">
                      Placer un pari
                    </h2>
                  </div>
                  <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    {event.options.length} choix
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {event.options.map((option) => {
                    const inTicket = selectedCartEntry?.optionLabel === option.label;

                    return (
                      <div
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                        key={option.label}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-zinc-100">{option.label}</h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatTokens(option.pool)} tokens places
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Cote</p>
                            <p className="mt-1 text-xl font-semibold text-emerald-400">
                              {formatEventOdds(option.odds)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.max(option.percentage, option.pool > 0 ? 4 : 0)}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                          <span>{option.percentage.toFixed(1)}% de la pool</span>
                          <span>Initiale {formatEventOdds(option.initial_odds)}</span>
                        </div>

                        {event.status === "RESOLVED" && event.resolved_option === option.label ? (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Option gagnante
                          </div>
                        ) : null}

                        <div className="mt-4 flex gap-2">
                          <Button
                            className="flex-1"
                            disabled={!event.can_bet}
                            onClick={() => {
                              setBetOption(option.label);
                              setBetOpen(true);
                            }}
                          >
                            Parier
                          </Button>
                          <Button
                            className="px-3"
                            disabled={!event.can_bet}
                            variant={inTicket ? "primary" : "secondary"}
                            onClick={() => addSelection(event, option)}
                          >
                            {inTicket ? <Ticket className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Marche</p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100">Statut</h2>
                <div className="mt-4 space-y-3 text-sm text-zinc-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>Etat</span>
                    <span className="font-medium text-zinc-100">{formatEventStatus(event.status)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Resolution</span>
                    <span className="text-right text-zinc-100">
                      {event.resolved_at ? formatEventDate(event.resolved_at) : "En attente"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Issue gagnante</span>
                    <span className="text-right text-zinc-100">
                      {event.resolved_option ?? "Aucune"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Vos paris</p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100">Positions enregistrees</h2>

                {event.my_bets.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {event.my_bets.map((bet) => (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" key={bet.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-zinc-100">{bet.chosen_option}</p>
                          <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            {bet.status}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-zinc-500">Mise</p>
                            <p className="mt-1 text-sm font-medium text-zinc-100">
                              {formatTokens(bet.stake)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Cote</p>
                            <p className="mt-1 text-sm font-medium text-zinc-100">
                              {formatEventOdds(bet.odds_at_bet ?? bet.total_odds)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">
                          Pose le {formatEventDate(bet.placed_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    Aucun pari enregistre sur cet evenement pour le moment.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      <BetDrawer
        event={event ?? null}
        initialOption={betOption}
        onClose={() => {
          setBetOpen(false);
          setBetOption(null);
        }}
        open={betOpen}
      />
    </DashboardShell>
  );
}
