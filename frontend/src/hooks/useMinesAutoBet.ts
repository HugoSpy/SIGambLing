import { useCallback, useRef, useState } from "react";
import { Howl } from "howler";
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

// Dedicated low-volume sounds for auto-bet — do not modify sounds.ts
const autoWinSound = new Howl({ src: ["/win_sound.mp3"], volume: 0.3 });
const autoLossSound = new Howl({ src: ["/bomb_click.mp3"], volume: 0.3 });

export function useMinesAutoBet() {
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [isRunning, setIsRunning] = useState(false);
  const [rounds, setRounds] = useState<AutoBetRound[]>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [startingBalance, setStartingBalance] = useState(0);

  // Refs — mutable loop state that async callbacks read without stale closures
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<AutoBetConfig | null>(null);
  const currentBetRef = useRef(0);
  const roundsPlayedRef = useRef(0);
  const sessionProfitRef = useRef(0);

  const doStop = useCallback((reason: string) => {
    isRunningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);

    const played = roundsPlayedRef.current;
    const profit = sessionProfitRef.current;
    if (played > 0) {
      const sign = profit >= 0 ? "+" : "";
      notify.info(
        `Auto-bet · ${played} round${played > 1 ? "s" : ""} · ${sign}${profit.toLocaleString()} tokens · ${reason}`,
      );
    }
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
            gemCount: cfg.gemCount,
          });

          if (!isRunningRef.current) return;

          updateBalance(data.newBalance);

          if (data.win) {
            autoWinSound.play();
          } else {
            autoLossSound.play();
          }

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

          // Check stop conditions
          if (cfg.maxRounds !== null && roundsPlayedRef.current >= cfg.maxRounds) {
            doStop(`${cfg.maxRounds} rounds atteints`);
            return;
          }
          if (cfg.stopLoss !== null && data.newBalance <= cfg.stopLoss) {
            doStop("Stop loss atteint");
            return;
          }
          if (cfg.takeProfit !== null && sessionProfitRef.current >= cfg.takeProfit) {
            doStop("Take profit atteint");
            return;
          }
          if (data.newBalance < nextBet) {
            doStop("Solde insuffisant pour continuer");
            return;
          }
        } catch (err) {
          notify.error(getErrorMessage(err));
          doStop("Erreur réseau");
          return;
        }

        if (isRunningRef.current) {
          timeoutRef.current = setTimeout(runLoop, 1000);
        }
      }

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
    start,
    stop,
    cleanup,
    clearHistory,
  };
}
