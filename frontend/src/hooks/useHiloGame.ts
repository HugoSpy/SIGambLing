import { useState } from "react";
import { api } from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { useAuthStore } from "../store/auth-store";
import type {
  HiloCashOutResponse,
  HiloCard,
  HiloCurrentResponse,
  HiloGamePhase,
  HiloHistoryEntry,
  HiloMultipliers,
  HiloPredictResponse,
  HiloSkipResponse,
  HiloStartResponse,
} from "../types/hilo";

export function useHiloGame() {
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [phase, setPhase] = useState<HiloGamePhase>("idle");
  const [currentCard, setCurrentCard] = useState<HiloCard | null>(null);
  const [multipliers, setMultipliers] = useState<HiloMultipliers | null>(null);
  const [accumulatedMultiplier, setAccumulatedMultiplier] = useState(1.0);
  const [initialBet, setInitialBet] = useState(0);
  const [history, setHistory] = useState<HiloHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<"win" | "loss" | null>(null);
  const [lastPayout, setLastPayout] = useState<number>(0);

  async function start(betAmount: number) {
    setIsLoading(true);
    try {
      const { data } = await api.post<HiloStartResponse>("/casino/hilo/start", { betAmount });
      setCurrentCard(data.currentCard);
      setMultipliers(data.multipliers);
      setAccumulatedMultiplier(1.0);
      setInitialBet(betAmount);
      setHistory([{ card: data.currentCard, multiplier: 1.0 }]);
      setPhase("playing");
      updateBalance(data.balance);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function predict(prediction: "higher" | "lower") {
    if (!currentCard) return;
    setIsLoading(true);
    try {
      const { data } = await api.post<HiloPredictResponse>("/casino/hilo/predict", { prediction });
      setCurrentCard(data.newCard);
      setMultipliers(data.multipliers);
      setAccumulatedMultiplier(data.newMultiplier);

      if (data.correct) {
        setHistory((prev) => [...prev, { card: data.newCard, multiplier: data.newMultiplier }]);
      }

      if (data.gameOver) {
        setPhase("loss");
        setLastResult("loss");
        setLastPayout(0);
        if (data.balance !== undefined) updateBalance(data.balance);
        notify.error("Mauvaise prédiction — mise perdue.");
      }
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function skip() {
    setIsLoading(true);
    try {
      const { data } = await api.post<HiloSkipResponse>("/casino/hilo/skip");
      setCurrentCard(data.newCard);
      setMultipliers(data.multipliers);
      setHistory((prev) => [...prev, { card: data.newCard, multiplier: accumulatedMultiplier }]);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function cashOut() {
    setIsLoading(true);
    try {
      const { data } = await api.post<HiloCashOutResponse>("/casino/hilo/cashout");
      setPhase("win");
      setLastResult("win");
      setLastPayout(data.payout);
      updateBalance(data.balance);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreSession() {
    try {
      const { data } = await api.get<HiloCurrentResponse>("/casino/hilo/current");
      setCurrentCard(data.currentCard);
      setMultipliers(data.multipliers);
      setAccumulatedMultiplier(data.accumulatedMultiplier);
      setInitialBet(data.initialBet);
      setPhase("playing");
    } catch {
      // No active session — stay idle
    }
  }

  function reset() {
    setPhase("idle");
    setCurrentCard(null);
    setMultipliers(null);
    setAccumulatedMultiplier(1.0);
    setInitialBet(0);
    setHistory([]);
    setLastResult(null);
    setLastPayout(0);
  }

  const potentialPayout = Math.floor(initialBet * accumulatedMultiplier);

  return {
    phase,
    currentCard,
    multipliers,
    accumulatedMultiplier,
    initialBet,
    history,
    isLoading,
    lastResult,
    lastPayout,
    potentialPayout,
    start,
    predict,
    skip,
    cashOut,
    restoreSession,
    reset,
  };
}
