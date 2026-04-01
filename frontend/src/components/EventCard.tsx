import { ArrowRight, Lock, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { formatEventCategory, formatEventDate, formatEventOdds, formatEventStatus, statusTone } from "../lib/event-utils";
import { cn, formatTokens } from "../lib/utils";
import type { EventView } from "../types/event";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface EventCardProps {
  event: EventView;
  onBet: (event: EventView) => void;
}

function getDisabledReason(event: EventView) {
  if (event.my_bet) {
    return "Votre pari est deja enregistre.";
  }

  if (event.is_excluded) {
    return "Vous etes exclu de ce marche.";
  }

  if (event.status !== "OPEN") {
    return "Les paris sont fermes sur cet evenement.";
  }

  return null;
}

export function EventCard({ event, onBet }: EventCardProps) {
  const disabledReason = getDisabledReason(event);

  return (
    <Card className="min-w-[300px] overflow-hidden p-0">
      <div className="relative border-b border-white/10 p-6">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background: event.image_url
              ? `linear-gradient(180deg, rgba(7,19,33,0.2), rgba(7,19,33,0.95)), url(${event.image_url}) center/cover`
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

          <h3 className="mt-4 font-display text-2xl text-brand-text">{event.title}</h3>
          <p className="mt-3 text-sm leading-7 text-brand-muted">
            {event.description || "Aucune description fournie pour cet evenement."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-brand-muted">
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-brand-orange" />
              Pool {formatTokens(event.total_pool)}
            </span>
            <span>Cloture {formatEventDate(event.closing_at)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {event.options.map((option) => (
          <div className="space-y-2" key={option.label}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-brand-text">{option.label}</span>
              <span className="text-brand-cyan">{formatEventOdds(option.odds)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-cta-gradient"
                style={{ width: `${Math.max(option.percentage, option.pool > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span>{option.percentage.toFixed(1)}%</span>
              <span>{formatTokens(option.pool)} tokens</span>
            </div>
          </div>
        ))}

        {event.my_bet ? (
          <div className="rounded-[22px] border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm text-brand-text">
            Pari actif: {event.my_bet.chosen_option} - {formatTokens(event.my_bet.amount)} tokens
          </div>
        ) : null}

        {disabledReason ? (
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted">
            <div className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>{disabledReason}</span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button disabled={!event.can_bet} fullWidth onClick={() => onBet(event)}>
            Parier
          </Button>
          <Link
            className={cn(
              "glass-panel inline-flex flex-1 items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-brand-text transition-all duration-300 hover:scale-[1.02] hover:border-brand-cyan/40",
            )}
            to={`/events/${event.id}`}
          >
            Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
