import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarClock, CheckCircle2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { BetDrawer } from "../components/BetDrawer";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { fetchEventById, logoutRequest } from "../lib/api";
import {
  formatEventCategory,
  formatEventDate,
  formatEventOdds,
  formatEventStatus,
  statusTone,
} from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useAuthenticatedUser();
  const [betOpen, setBetOpen] = useState(false);

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(id ?? ""),
    enabled: Boolean(id),
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
        <Card className="min-w-[300px]">
          <p className="text-sm leading-7 text-red-200">{toErrorMessage(error)}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card accent="cyan" className="min-w-[300px] overflow-hidden">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 opacity-35"
                style={{
                  background: event.image_url
                    ? `linear-gradient(180deg, rgba(7,19,33,0.15), rgba(7,19,33,0.92)), url(${event.image_url}) center/cover`
                    : "radial-gradient(circle at top right, rgba(6,182,212,0.18), transparent 38%), radial-gradient(circle at bottom left, rgba(245,158,11,0.14), transparent 34%)",
                }}
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-cyan">
                    {formatEventCategory(event.category)}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${statusTone(event.status)}`}>
                    {formatEventStatus(event.status)}
                  </span>
                </div>
                <h1 className="mt-4 font-display text-4xl text-brand-text">{event.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-brand-muted">
                  {event.description || "Aucune description fournie pour cet evenement."}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-brand-muted">
                  <span>Pool {formatTokens(event.total_pool)} tokens</span>
                  <span>Cloture {formatEventDate(event.closing_at)}</span>
                  <span>Createur {event.created_by?.pseudo ?? "Admin"}</span>
                </div>
                <div className="mt-6">
                  <Button disabled={!event.can_bet} onClick={() => setBetOpen(true)}>
                    Parier sur cet evenement
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            <Card className="min-w-[300px]">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-brand-cyan" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">
                    Repartition live
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-brand-text">Distribution de la pool</h2>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {event.options.map((option) => (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5" key={option.label}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-brand-text">{option.label}</p>
                        <p className="mt-2 text-sm text-brand-muted">
                          {formatTokens(option.pool)} tokens places
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Cote</p>
                        <p className="mt-1 font-display text-2xl text-brand-cyan">
                          {formatEventOdds(option.odds)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">
                      <div
                        className="h-full rounded-full bg-cta-gradient"
                        style={{ width: `${Math.max(option.percentage, option.pool > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-brand-muted">
                      {option.percentage.toFixed(2)}% de la pool totale
                    </p>
                    {event.status === "RESOLVED" && event.resolved_option === option.label ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs text-brand-cyanSoft">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Option gagnante
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="min-w-[300px]">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-brand-orange" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">Marche</p>
                    <h2 className="mt-2 font-display text-3xl text-brand-text">Statut</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-sm leading-7 text-brand-muted">
                  <p>Etat actuel: {formatEventStatus(event.status)}</p>
                  <p>Cloture: {formatEventDate(event.closing_at)}</p>
                  <p>
                    Resolution:{" "}
                    {event.resolved_at ? formatEventDate(event.resolved_at) : "En attente"}
                  </p>
                  <p>
                    Option resolue: {event.resolved_option ?? "Aucune option gagnante declaree"}
                  </p>
                </div>
              </Card>

              <Card className="min-w-[300px]">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Votre bet</p>
                    <h2 className="mt-2 font-display text-3xl text-brand-text">Position perso</h2>
                  </div>
                </div>

                {event.my_bet ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-[22px] border border-brand-cyan/20 bg-brand-cyan/10 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-brand-cyan">Option</p>
                      <p className="mt-2 text-lg font-semibold text-brand-text">
                        {event.my_bet.chosen_option}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Mise</p>
                        <p className="mt-2 font-display text-2xl text-brand-text">
                          {formatTokens(event.my_bet.amount)}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                          Snapshot
                        </p>
                        <p className="mt-2 font-display text-2xl text-brand-text">
                          {formatEventOdds(event.my_bet.odd_at_bet)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-brand-muted">
                      Enregistre le {formatEventDate(event.my_bet.created_at)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 text-sm leading-7 text-brand-muted">
                    Aucun pari enregistre sur cet evenement pour le moment.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      <BetDrawer event={event ?? null} onClose={() => setBetOpen(false)} open={betOpen} />
    </DashboardShell>
  );
}
