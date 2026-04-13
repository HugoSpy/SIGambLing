import { useCallback, useRef, useState } from "react";
import { api } from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { useAuthStore } from "../store/auth-store";
import type { AutoBetConfig } from "../types/mines";

export interface AutoBetRound {
  round: number;
  balance: number;
  win: boolean;
  profit: number;
  bet: number;
}

export interface PendingRound {
  cells: number[];
  win: boolean;
  multiplier: number;
  profit: number;
}

export function useMinesAutoBet() {
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [isRunning, setIsRunning] = useState(false);
  const [rounds, setRounds] = useState<AutoBetRound[]>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [startingBalance, setStartingBalance] = useState(0);
  const [pendingRound, setPendingRound] = useState<PendingRound | null>(null);

  // Refs — mutable loop state that async callbacks read without stale closures
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<AutoBetConfig | null>(null);
  const currentBetRef = useRef(0);
  const roundsPlayedRef = useRef(0);
  const sessionProfitRef = useRef(0);
  // Holds the runLoop function so acknowledgeRound can reschedule it
  const loopRef = useRef<(() => Promise<void>) | null>(null);

  const doStop = useCallback((reason: string) => {
    isRunningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);
    // Do NOT clear pendingRound here — let the animation in MinesGame complete first.
    // MinesGame will call clearPendingRound() when it detects isRunning → false.

    const played = roundsPlayedRef.current;
    const profit = sessionProfitRef.current;
    if (played > 0) {
      const sign = profit >= 0 ? "+" : "";
      notify.info(
        `Auto-bet · ${played} round${played > 1 ? "s" : ""} · ${sign}${profit.toLocaleString()} tokens · ${reason}`,
      );
    }
  }, []);

  /**
   * Called by MinesGame after the per-round animation completes.
   * Clears pendingRound and schedules the next loop iteration if still running.
   */
  const acknowledgeRound = useCallback(() => {
    setPendingRound(null);
    if (isRunningRef.current && loopRef.current) {
      timeoutRef.current = setTimeout(loopRef.current, 0);
    }
  }, []);

  /**
   * Called by MinesGame when the auto-bet is stopped mid-animation
   * to discard the current pending round without scheduling next.
   */
  const clearPendingRound = useCallback(() => {
    setPendingRound(null);
  }, []);

  const start = useCallback(
    (config: AutoBetConfig, initialBalance: number) => {
      configRef.current = config;
      currentBetRef.current = config.betAmount;
      roundsPlayedRef.current = 0;
      sessionProfitRef.current = 0;
      isRunningRef.current = true;

      setIsRunning(true);
      setRounds([]);
      setSessionProfit(0);
      setRoundsPlayed(0);
      setCurrentBet(config.betAmount);
      setStartingBalance(initialBalance);
      setPendingRound(null);

      async function runLoop() {
        if (!isRunningRef.current) return;

        const cfg = configRef.current!;
        const bet = currentBetRef.current;
        const balance = useAuthStore.getState().user?.balance ?? 0;

        if (balance < bet) {
          doStop("Solde insuffisant");
          return;
        }

        try {
          const { data } = await api.post<{
            win: boolean;
            payout: number;
            profit: number;
            cells: number[];
            multiplier: number;
            newBalance: number;
          }>("/casino/mines/autobet-round", {
            betAmount: bet,
            minesCount: cfg.minesCount,
            selectedCells: cfg.cellMode === "random" ? "random" : cfg.fixedCells,
          });

          if (!isRunningRef.current) return;

          updateBalance(data.newBalance);

          roundsPlayedRef.current += 1;
          sessionProfitRef.current += data.profit;
          const roundNum = roundsPlayedRef.current;

          setRoundsPlayed(roundNum);
          setSessionProfit(sessionProfitRef.current);

          setRounds((prev) => [
            ...prev,
            {
              round: roundNum,
              balance: data.newBalance,
              win: data.win,
              profit: data.profit,
              bet,
            },
          ]);

          // Compute next-round bet
          let nextBet = bet;
          switch (cfg.strategy) {
            case "flat":
              nextBet = cfg.betAmount;
              break;
            case "martingale":
              nextBet = data.win ? cfg.betAmount : bet * 2;
              break;
            case "anti-martingale":
              nextBet = data.win ? bet * 2 : cfg.betAmount;
              break;
            case "custom":
              if (
                (cfg.customCondition === "win" && data.win) ||
                (cfg.customCondition === "loss" && !data.win)
              ) {
                nextBet = bet * cfg.customMultiplier;
              } else {
                nextBet = cfg.betAmount;
              }
              break;
          }
          nextBet = Math.max(1, Math.min(Math.floor(nextBet), cfg.maxBet));
          currentBetRef.current = nextBet;
          setCurrentBet(nextBet);

          // Check stop conditions — stop BEFORE setting pendingRound so that
          // acknowledgeRound won't re-schedule (isRunningRef is false).
          let shouldStop = false;
          let stopReason = "";
          if (cfg.maxRounds !== null && roundsPlayedRef.current >= cfg.maxRounds) {
            shouldStop = true;
            stopReason = `${cfg.maxRounds} rounds atteints`;
          } else if (cfg.stopLoss !== null && data.newBalance <= cfg.stopLoss) {
            shouldStop = true;
            stopReason = "Stop loss atteint";
          } else if (cfg.takeProfit !== null && sessionProfitRef.current >= cfg.takeProfit) {
            shouldStop = true;
            stopReason = "Take profit atteint";
          } else if (data.newBalance < nextBet) {
            shouldStop = true;
            stopReason = "Solde insuffisant pour continuer";
          }

          if (shouldStop) {
            doStop(stopReason);
            // Still expose pending round so MinesGame can animate the last round.
            // acknowledgeRound will be a no-op (isRunningRef=false).
          }

          // Always expose the round data for MinesGame to animate.
          setPendingRound({
            cells: data.cells,
            win: data.win,
            multiplier: data.multiplier,
            profit: data.profit,
          });

        } catch (err) {
          notify.error(getErrorMessage(err));
          doStop("Erreur réseau");
        }
      }

      loopRef.current = runLoop;
      // Start first round immediately
      timeoutRef.current = setTimeout(runLoop, 0);
    },
    [doStop, updateBalance],
  );

  const stop = useCallback(() => {
    doStop("Arrêt manuel");
  }, [doStop]);

  /** Call on unmount or when switching back to manual to kill the loop silently. */
  const cleanup = useCallback(() => {
    isRunningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);
    setPendingRound(null);
  }, []);

  const clearHistory = useCallback(() => {
    setRounds([]);
    setSessionProfit(0);
    setRoundsPlayed(0);
  }, []);

  return {
    isRunning,
    rounds,
    sessionProfit,
    roundsPlayed,
    currentBet,
    startingBalance,
    pendingRound,
    start,
    stop,
    cleanup,
    clearHistory,
    acknowledgeRound,
    clearPendingRound,
  };
}
