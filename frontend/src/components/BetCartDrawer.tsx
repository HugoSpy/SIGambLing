import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Ticket, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  placeParlayBet,
  placeSimpleBets,
} from "../lib/api";
import { formatEventCategory, formatEventDate, formatEventOdds } from "../lib/event-utils";
import { cn, formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { useBetCartStore } from "../store/bet-cart-store";
import { Button } from "./ui/Button";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

export function BetCartDrawer() {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((state) => state.updateBalance);
  const open = useBetCartStore((state) => state.open);
  const mode = useBetCartStore((state) => state.mode);
  const parlayStake = useBetCartStore((state) => state.parlayStake);
  const selections = useBetCartStore((state) => state.selections);
  const setOpen = useBetCartStore((state) => state.setOpen);
  const setMode = useBetCartStore((state) => state.setMode);
  const setParlayStake = useBetCartStore((state) => state.setParlayStake);
  const setSimpleStake = useBetCartStore((state) => state.setSimpleStake);
  const removeSelection = useBetCartStore((state) => state.removeSelection);
  const clear = useBetCartStore((state) => state.clear);
  const [submitting, setSubmitting] = useState(false);

  const totalSimpleStake = useMemo(
    () =>
      selections.reduce(
        (sum, selection) => sum + Math.max(selection.simpleStake || 0, selection.minBet),
        0,
      ),
    [selections],
  );

  const totalParlayOdds = useMemo(
    () => selections.reduce((product, selection) => product * selection.odds, 1),
    [selections],
  );

  const submitSimple = async () => {
    try {
      setSubmitting(true);
      const outcome = await placeSimpleBets({
        bets: selections.map((selection) => ({
          eventId: selection.eventId,
          chosenOption: selection.optionLabel,
          amount: selection.simpleStake,
        })),
      });

      updateBalance(outcome.new_balance);
      clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event"] }),
        queryClient.invalidateQueries({ queryKey: ["my-event-bets"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["gamification"] }),
      ]);

      toast.success(`${outcome.bets.length} pari(s) enregistres.`);
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitParlay = async () => {
    try {
      setSubmitting(true);
      const outcome = await placeParlayBet({
        legs: selections.map((selection) => ({
          eventId: selection.eventId,
          chosenOption: selection.optionLabel,
        })),
        stake: parlayStake,
      });

      updateBalance(outcome.new_balance);
      clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event"] }),
        queryClient.invalidateQueries({ queryKey: ["my-event-bets"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["gamification"] }),
      ]);

      toast.success("Combine enregistre.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const parlayDisabled =
    selections.length < 2 ||
    !Number.isFinite(parlayStake) ||
    parlayStake < 5 ||
    parlayStake > 500;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Fermer le panier"
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            type="button"
          />
          <motion.aside
            className="fixed inset-x-4 top-4 z-50 mx-auto w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            initial={{ y: -80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Panier</p>
                <h2 className="mt-2 font-display text-3xl text-zinc-100">
                  Ticket de paris
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {selections.length} selection{selections.length > 1 ? "s" : ""} en attente
                </p>
              </div>
              <button
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-100 transition hover:bg-zinc-700"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              <button
                className={cn(
                  "rounded-md px-4 py-2 text-sm transition",
                  mode === "simple"
                    ? "bg-emerald-500/10 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-100",
                )}
                onClick={() => setMode("simple")}
                type="button"
              >
                Simple
              </button>
              <button
                className={cn(
                  "rounded-md px-4 py-2 text-sm transition",
                  mode === "parlay"
                    ? "bg-amber-500/10 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-100",
                )}
                onClick={() => setMode("parlay")}
                type="button"
              >
                Combine
              </button>
            </div>

            {selections.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
                Ajoutez des issues depuis les cartes evenement pour remplir votre ticket.
              </div>
            ) : (
              <>
                <div className="mt-6 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                  {selections.map((selection) => (
                    <div
                      className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                      key={selection.eventId}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-cyan">
                            {formatEventCategory(selection.category)}
                          </p>
                          <p className="mt-2 text-base font-semibold text-brand-text">
                            {selection.eventTitle}
                          </p>
                          <p className="mt-2 text-sm text-brand-muted">
                            {selection.optionLabel} · {formatEventOdds(selection.odds)}
                          </p>
                          <p className="mt-1 text-xs text-brand-muted">
                            Cloture {formatEventDate(selection.closingAt)}
                          </p>
                        </div>
                        <button
                          className="rounded-2xl border border-white/10 bg-white/5 p-2 text-brand-muted transition hover:text-red-200"
                          onClick={() => removeSelection(selection.eventId)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {mode === "simple" ? (
                        <label className="mt-4 block space-y-2">
                          <span className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                            Mise
                          </span>
                          <input
                            className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                            max={selection.maxBet ?? undefined}
                            min={selection.minBet}
                            onChange={(event) =>
                              setSimpleStake(
                                selection.eventId,
                                Number.isFinite(Number(event.target.value))
                                  ? Number(event.target.value)
                                  : selection.minBet,
                              )
                            }
                            type="number"
                            value={selection.simpleStake}
                          />
                          <p className="text-xs text-brand-muted">
                            Min {formatTokens(selection.minBet)} · Max{" "}
                            {selection.maxBet == null ? "illimite" : formatTokens(selection.maxBet)}
                          </p>
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  {mode === "simple" ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                            Mise totale
                          </p>
                          <p className="mt-2 font-display text-3xl text-brand-text">
                            {formatTokens(totalSimpleStake)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                            Potentiel cumule
                          </p>
                          <p className="mt-2 font-display text-3xl text-brand-text">
                            {formatTokens(
                              selections.reduce(
                                (sum, selection) =>
                                  sum + Math.floor(selection.simpleStake * selection.odds),
                                0,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="mt-5"
                        disabled={
                          submitting ||
                          selections.some(
                            (selection) =>
                              !Number.isFinite(selection.simpleStake) ||
                              selection.simpleStake < selection.minBet ||
                              (selection.maxBet != null &&
                                selection.simpleStake > selection.maxBet),
                          )
                        }
                        fullWidth
                        onClick={() => void submitSimple()}
                      >
                        {submitting ? "Validation..." : "Valider les paris simples"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <label className="block space-y-2">
                        <span className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                          Mise combinee
                        </span>
                        <input
                          className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                          max={500}
                          min={5}
                          onChange={(event) =>
                            setParlayStake(
                              Number.isFinite(Number(event.target.value))
                                ? Number(event.target.value)
                                : 5,
                            )
                          }
                          type="number"
                          value={parlayStake}
                        />
                      </label>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                            Cote totale
                          </p>
                          <p className="mt-2 font-display text-3xl text-brand-orangeSoft">
                            {formatEventOdds(totalParlayOdds)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                            Gain potentiel
                          </p>
                          <p className="mt-2 font-display text-3xl text-brand-text">
                            {formatTokens(Math.floor(parlayStake * totalParlayOdds))}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="mt-5"
                        disabled={submitting || parlayDisabled}
                        fullWidth
                        onClick={() => void submitParlay()}
                      >
                        {submitting ? "Validation..." : "Valider le combine"}
                      </Button>
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    className="inline-flex items-center gap-2 text-sm text-brand-muted transition hover:text-brand-text"
                    onClick={() => clear()}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Vider le panier
                  </button>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-brand-cyan">
                    <Ticket className="h-4 w-4" />
                    Ticket actif
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
