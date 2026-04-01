import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { placeEventBet } from "../lib/api";
import { formatEventOdds } from "../lib/event-utils";
import { cn, formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import type { EventView } from "../types/event";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface BetDrawerProps {
  event: EventView | null;
  open: boolean;
  onClose: () => void;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

function calculateProjectedOdd(event: EventView, optionLabel: string, amount: number) {
  const option = event.options.find((entry) => entry.label === optionLabel);

  if (!option || amount <= 0) {
    return null;
  }

  return (event.total_pool + amount) / (option.pool + amount);
}

export function BetDrawer({ event, open, onClose }: BetDrawerProps) {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((state) => state.updateBalance);
  const [selectedOption, setSelectedOption] = useState("");
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setSelectedOption(event.options[0]?.label ?? "");
      setAmount(event.min_bet);
    }
  }, [event]);

  const projectedOdd = useMemo(() => {
    if (!event) {
      return null;
    }

    return calculateProjectedOdd(event, selectedOption, amount);
  }, [amount, event, selectedOption]);

  const potentialReturn = projectedOdd ? Math.round(projectedOdd * amount) : 0;

  const submitBet = async () => {
    if (!event) {
      return;
    }

    try {
      setSubmitting(true);
      const outcome = await placeEventBet(event.id, {
        chosen_option: selectedOption,
        amount,
      });

      updateBalance(outcome.new_balance);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event", event.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-event-bets"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);

      toast.success("Pari enregistre.");
      onClose();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      description={
        event
          ? "Choisissez votre option, indiquez votre mise et confirmez votre position."
          : undefined
      }
      onClose={onClose}
      open={open}
      title={event ? `Parier sur ${event.title}` : "Parier"}
    >
      {!event ? null : event.my_bet ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-brand-cyan/20 bg-brand-cyan/10 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Votre position</p>
            <p className="mt-3 text-lg font-semibold text-brand-text">{event.my_bet.chosen_option}</p>
            <p className="mt-2 text-sm text-brand-muted">
              {formatTokens(event.my_bet.amount)} tokens - snapshot {formatEventOdds(event.my_bet.odd_at_bet)}
            </p>
          </div>
          <p className="text-sm leading-7 text-brand-muted">
            Un seul pari est autorise par evenement. Votre mise actuelle reste visible dans le
            detail de l'evenement.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {event.options.map((option) => {
              const selected = selectedOption === option.label;

              return (
                <button
                  className={cn(
                    "rounded-[24px] border px-4 py-4 text-left transition-all duration-300",
                    selected
                      ? "border-brand-cyan/45 bg-brand-cyan/10"
                      : "border-white/10 bg-white/5 hover:border-brand-line hover:bg-white/10",
                  )}
                  key={option.label}
                  onClick={() => setSelectedOption(option.label)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-brand-text">{option.label}</span>
                    <span className="text-sm text-brand-cyan">{formatEventOdds(option.odds)}</span>
                  </div>
                  <p className="mt-2 text-xs text-brand-muted">
                    {option.percentage.toFixed(1)}% de la pool - {formatTokens(option.pool)} tokens
                  </p>
                </button>
              );
            })}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-text">Montant</span>
            <input
              className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
              max={event.max_bet ?? undefined}
              min={event.min_bet}
              onChange={(inputEvent) => {
                const nextAmount = Number(inputEvent.target.value);
                setAmount(Number.isFinite(nextAmount) ? nextAmount : 0);
              }}
              type="number"
              value={amount}
            />
            <p className="text-xs text-brand-muted">
              Min {formatTokens(event.min_bet)} - Max{" "}
              {event.max_bet == null ? "illimite" : formatTokens(event.max_bet)}
            </p>
          </label>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">Apercu</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-brand-muted">Cote projetee</p>
                <p className="mt-1 font-display text-2xl text-brand-text">
                  {formatEventOdds(projectedOdd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-muted">Retour indicatif</p>
                <p className="mt-1 font-display text-2xl text-brand-text">
                  {formatTokens(potentialReturn)} tokens
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-brand-muted">
              Le gain final est calcule a la resolution selon la pool finale. Cet apercu sert de
              repere au moment de la prise de position.
            </p>
          </div>

          <Button
            disabled={
              submitting ||
              !selectedOption ||
              !Number.isFinite(amount) ||
              amount < event.min_bet ||
              (event.max_bet != null && amount > event.max_bet)
            }
            fullWidth
            onClick={() => void submitBet()}
          >
            {submitting ? "Enregistrement..." : "Confirmer le pari"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
