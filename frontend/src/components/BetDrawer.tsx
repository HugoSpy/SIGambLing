import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { isOddsConflictError, placeEventBet } from "../lib/api";
import { formatEventOdds } from "../lib/event-utils";
import { getErrorMessage, notify } from "../lib/notifications";
import { cn, formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { useBetCartStore } from "../store/bet-cart-store";
import type { OddsConflictDetails, EventView } from "../types/event";
import { OddsChangeModal } from "./OddsChangeModal";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface BetDrawerProps {
  event: EventView | null;
  open: boolean;
  onClose: () => void;
  initialOption?: string | null;
}

export function BetDrawer({ event, open, onClose, initialOption }: BetDrawerProps) {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((state) => state.updateBalance);
  const updateOddsPreference = useAuthStore((state) => state.updateOddsPreference);
  const currentBalance = useAuthStore((state) => state.user?.balance ?? 0);
  const alwaysAcceptOddsChanges = useAuthStore((state) => state.user?.accept_odds_changes ?? false);
  const betCooldowns = useBetCartStore((state) => state.betCooldowns);
  const recordBetCooldown = useBetCartStore((state) => state.recordBetCooldown);
  const [selectedOption, setSelectedOption] = useState("");
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [oddsConflict, setOddsConflict] = useState<OddsConflictDetails | null>(null);
  const [rememberOddsChoice, setRememberOddsChoice] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (event) {
      const fallbackOption = event.options[0]?.label ?? "";
      const nextOption =
        initialOption && event.options.some((option) => option.label === initialOption)
          ? initialOption
          : fallbackOption;

      setSelectedOption(nextOption);
      setAmount(event.min_bet);
    }
  }, [event, initialOption]);

  useEffect(() => {
    if (open) {
      setOddsConflict(null);
      setRememberOddsChoice(false);
    }
  }, [open]);

  const selectedOptionData = useMemo(
    () => event?.options.find((option) => option.label === selectedOption) ?? null,
    [event, selectedOption],
  );
  const potentialReturn = selectedOptionData ? Math.round(selectedOptionData.odds * amount) : 0;
  const quickAmounts = useMemo(() => {
    if (!event) {
      return [];
    }

    return Array.from(new Set([event.min_bet, 25, 50, 100])).sort((left, right) => left - right);
  }, [event]);

  const invalidateBetQueries = async (eventId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["events"] }),
      queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["my-event-bets"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["gamification"] }),
    ]);
  };

  const submitBet = async (options?: {
    acceptAnyOddsChange?: boolean;
    persistAcceptOddsChanges?: boolean;
    expectedOdds?: number;
  }) => {
    if (!event || !selectedOptionData) {
      return;
    }

    try {
      setSubmitting(true);
      const outcome = await placeEventBet(event.id, {
        chosen_option: selectedOption,
        amount,
        expected_odds: options?.expectedOdds ?? selectedOptionData.current_odds,
        accept_any_odds_change: options?.acceptAnyOddsChange ?? alwaysAcceptOddsChanges,
        persist_accept_odds_changes: options?.persistAcceptOddsChanges ?? false,
      });

      if (options?.persistAcceptOddsChanges) {
        updateOddsPreference(true);
      }

      updateBalance(outcome.new_balance);
      recordBetCooldown([event.id]);
      await invalidateBetQueries(event.id);

      notify.success("Pari enregistré.");
      setOddsConflict(null);
      onClose();
    } catch (error) {
      if (isOddsConflictError(error) && error.details) {
        setOddsConflict(error.details);
        await invalidateBetQueries(event.id);
        return;
      }

      notify.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOddsChange = async () => {
    const latestOdds = oddsConflict?.changes[0]?.current_odds;

    await submitBet({
      acceptAnyOddsChange: true,
      persistAcceptOddsChanges: rememberOddsChoice,
      expectedOdds: latestOdds,
    });
  };

  const cooldownRemaining = event
    ? Math.max(0, 30 - Math.floor((Date.now() - (betCooldowns[event.id] ?? 0)) / 1000))
    : 0;
  const onCooldown = cooldownRemaining > 0;

  return (
    <>
      <Modal
        description={
          event
            ? "Choisissez une issue, indiquez votre mise et confirmez votre pari."
            : undefined
        }
        onClose={onClose}
        open={open}
        title={event ? "Placer un pari" : "Placer un pari"}
      >
        {!event ? null : (
          <div className="space-y-5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm font-medium text-zinc-100">{event.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Limite {event.my_bet_count}/25 paris sur cet événement
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {event.options.map((option) => {
                const selected = selectedOption === option.label;

                return (
                  <button
                    className={cn(
                      "rounded-lg border px-4 py-4 text-left transition-colors",
                      selected
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
                    )}
                    key={option.label}
                    onClick={() => setSelectedOption(option.label)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-zinc-100">{option.label}</span>
                      <span className="text-lg font-semibold text-emerald-400">
                        {formatEventOdds(option.odds)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>{option.percentage.toFixed(1)}% de la pool</span>
                      <span>{formatTokens(option.pool)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-200">Montant</span>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 pr-20 text-lg font-semibold text-zinc-100 outline-none transition focus:border-emerald-500"
                    max={event.max_bet ?? undefined}
                    min={event.min_bet}
                    onChange={(inputEvent) => {
                      const raw = inputEvent.target.value.replace(/^0+(?=\d)/, "");
                      const nextAmount = Number(raw);
                      setAmount(Number.isFinite(nextAmount) ? nextAmount : 0);
                    }}
                    type="number"
                    value={amount || ""}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    tokens
                  </span>
                </div>
              </label>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((quickAmount) => (
                  <button
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700"
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount)}
                    type="button"
                  >
                    {quickAmount}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  Disponible : <span className="text-emerald-400">{formatTokens(currentBalance)} tokens</span>
                </span>
                {amount > currentBalance ? <span className="text-red-400">Solde insuffisant</span> : null}
              </div>
              <p className="text-xs text-zinc-500">
                Min {formatTokens(event.min_bet)} - Max{" "}
                {event.max_bet == null ? "illimité" : formatTokens(event.max_bet)}
              </p>
            </div>

            {selectedOptionData ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                    <TrendingUp className="h-4 w-4" />
                    Gain indicatif
                  </span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {formatTokens(potentialReturn)} tokens
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Basé sur la cote actuelle de {formatEventOdds(selectedOptionData.odds)} au moment de
                  la prise de position.
                </p>
              </div>
            ) : null}

            {event.my_bets.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Positions actives</p>
                <div className="mt-3 space-y-2">
                  {event.my_bets.slice(0, 3).map((bet) => (
                    <div
                      className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2"
                      key={bet.id}
                    >
                      <span className="text-sm text-zinc-100">{bet.chosen_option}</span>
                      <span className="text-xs text-zinc-500">{formatTokens(bet.stake)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button className="flex-1" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                disabled={
                  submitting ||
                  onCooldown ||
                  !event.can_bet ||
                  !selectedOption ||
                  !Number.isFinite(amount) ||
                  amount < event.min_bet ||
                  amount > currentBalance ||
                  (event.max_bet != null && amount > event.max_bet)
                }
                onClick={() => void submitBet()}
              >
                {submitting ? "Validation..." : onCooldown ? `Attendre ${cooldownRemaining}s` : "Confirmer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <OddsChangeModal
        details={oddsConflict}
        onClose={() => setOddsConflict(null)}
        onConfirm={() => void confirmOddsChange()}
        onRememberChoiceChange={setRememberOddsChoice}
        open={oddsConflict !== null}
        rememberChoice={rememberOddsChoice}
        submitting={submitting}
      />
    </>
  );
}
