import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { formatEventOdds } from "../lib/event-utils";
import { cn, formatTokens } from "../lib/utils";
import type { EventBetView, EventView } from "../types/event";

interface ActiveEventBetsListProps {
  bets: EventBetView[];
  emptyMessage: string;
  events?: EventView[];
  maxItems?: number;
  fallbackLinkTarget: string;
}

function resolveTargetEvent(bet: EventBetView, events?: EventView[]) {
  if (bet.event_id) {
    return events?.find((event) => event.id === bet.event_id) ?? null;
  }

  return bet.legs[0]?.event ?? null;
}

export function ActiveEventBetsList({
  bets,
  emptyMessage,
  events,
  maxItems,
  fallbackLinkTarget,
}: ActiveEventBetsListProps) {
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
  const visibleBets = maxItems ? bets.slice(0, maxItems) : bets;

  const toggleExpandBet = (id: string) =>
    setExpandedBets((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  if (visibleBets.length === 0) {
    return <p className="text-sm leading-7 text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {visibleBets.map((bet) => {
        const targetEvent = resolveTargetEvent(bet, events);
        const linkTarget = targetEvent ? `/events/${targetEvent.id}` : fallbackLinkTarget;
        const isParlay = bet.type === "PARLAY" && bet.legs.length > 0;
        const isExpanded = expandedBets.has(bet.id);
        const betTitle = isParlay ? `Combine ${bet.legs.length} selections` : targetEvent?.title ?? "Pari simple";
        const betLabel = isParlay ? `${bet.legs.length} selections` : bet.chosen_option ?? "Selection";

        return (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950" key={bet.id}>
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100">{betTitle}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>{betLabel}</span>
                  <span>{formatTokens(bet.stake)} engages</span>
                  <span>{formatTokens(bet.potential_payout)} potentiels</span>
                  <span>Cote {formatEventOdds(isParlay ? bet.total_odds : bet.odds_at_bet)}</span>
                </div>
              </div>

              {isParlay ? (
                <button
                  aria-expanded={isExpanded}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                  onClick={() => toggleExpandBet(bet.id)}
                  type="button"
                >
                  <span>{isExpanded ? "Masquer" : "Voir le detail"}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100"
                  to={linkTarget}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {isParlay ? (
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                    <ul className="space-y-2">
                      {bet.legs.map((leg, index) => (
                        <li
                          className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs"
                          key={leg.id}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-zinc-200">
                              {index + 1}. {leg.event.title}
                            </p>
                            <p className="mt-0.5 text-zinc-500">{leg.chosen_option}</p>
                          </div>
                          <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 font-semibold text-emerald-400">
                            {formatEventOdds(leg.odds_at_bet)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 grid gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-zinc-300 sm:grid-cols-3">
                      <div>
                        <p className="text-zinc-500">Cote combinee</p>
                        <p className="mt-1 font-semibold text-emerald-300">
                          {formatEventOdds(bet.total_odds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Mise</p>
                        <p className="mt-1 font-semibold text-zinc-100">{formatTokens(bet.stake)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Gain potentiel</p>
                        <p className="mt-1 font-semibold text-zinc-100">
                          {formatTokens(bet.potential_payout)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
