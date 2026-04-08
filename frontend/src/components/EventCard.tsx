import { ArrowRight, Lock, Plus, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatEventDate,
  formatEventOdds,
  formatEventStatus,
  statusTone,
} from "../lib/event-utils";
import { cn, formatTokens } from "../lib/utils";
import { useBetCartStore } from "../store/bet-cart-store";
import type { EventView } from "../types/event";
import { Card } from "./ui/Card";

interface EventCardProps {
  event: EventView;
  onBet: (event: EventView, optionLabel?: string) => void;
}

function getDisabledReason(event: EventView) {
  if (event.my_bet_count >= 25) {
    return "Limite de 25 paris atteinte sur cet événement.";
  }

  if (event.is_excluded) {
    return "Vous êtes exclu de ce marché.";
  }

  if (event.status !== "OPEN") {
    return "Les paris sont fermés sur cet événement.";
  }

  return null;
}

export function EventCard({ event, onBet }: EventCardProps) {
  const addSelection = useBetCartStore((state) => state.addSelection);
  const selectedCartEntry = useBetCartStore((state) =>
    state.selections.find((selection) => selection.eventId === event.id),
  );
  const disabledReason = getDisabledReason(event);

  return (
    <Card className="min-w-[300px] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(event.status)}`}>
              {formatEventStatus(event.status)}
            </span>
          </div>

          <Link className="transition-colors hover:text-emerald-400" to={`/events/${event.id}`}>
            <h3 className="mt-3 text-base font-semibold text-zinc-100">{event.title}</h3>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>Clôture {formatEventDate(event.closing_at)}</span>
            <span>{formatTokens(event.total_pool)} tokens</span>
            <span>{event.options.length} issue(s)</span>
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {event.description || "Aucune description fournie pour cet événement."}
          </p>
        </div>

        {event.image_url && (
          <Link className="shrink-0" to={`/events/${event.id}`}>
            <img
              alt=""
              className="h-16 w-16 rounded-lg border border-white/10 object-contain bg-zinc-800 sm:h-20 sm:w-20"
              src={event.image_url}
            />
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {event.options.map((option) => {
          const inTicket = selectedCartEntry?.optionLabel === option.label;

          return (
            <div
              className={cn(
                "flex items-stretch rounded-lg border",
                inTicket ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950",
              )}
              key={option.label}
            >
              <button
                className="flex-1 px-3 py-3 text-left transition hover:bg-zinc-900/80 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!event.can_bet}
                onClick={() => onBet(event, option.label)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-100">{option.label}</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatEventOdds(option.odds)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{option.percentage.toFixed(1)}%</span>
                  <span>{formatTokens(option.pool)}</span>
                </div>
              </button>

              <button
                aria-label={`Ajouter ${option.label} au ticket`}
                className={cn(
                  "m-2 inline-flex w-11 items-center justify-center rounded-lg border text-sm transition",
                  inTicket
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700",
                )}
                disabled={!event.can_bet}
                onClick={() => addSelection(event, option)}
                type="button"
              >
                {inTicket ? <Ticket className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {event.my_bets.length > 0 ? (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-zinc-200">
          {event.my_bet_count} pari(s) déjà posés sur cet événement
        </div>
      ) : null}

      {disabledReason ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
          <div className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span>{disabledReason}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!event.can_bet}
          onClick={() => onBet(event, selectedCartEntry?.optionLabel ?? event.options[0]?.label)}
          type="button"
        >
          Pari rapide
        </button>

        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-zinc-100"
          to={`/events/${event.id}`}
        >
          Voir le marché
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
