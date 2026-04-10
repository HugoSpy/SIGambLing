import { useState } from "react";
import { api } from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { useAuthStore } from "../store/auth-store";
import type {
  RidetheBusAnswerResponse,
  RidetheBusCard,
  RidetheBusCurrentResponse,
  RidetheBusGamePhase,
  RidetheBusStartResponse,
  Step2Multipliers,
  Step3Multipliers,
} from "../types/ride-the-bus";

export function useRideTheBusGame() {
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [phase, setPhase] = useState<RidetheBusGamePhase>("idle");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [cards, setCards] = useState<RidetheBusCard[]>([]);
  const [betAmount, setBetAmount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [step2Multipliers, setStep2Multipliers] = useState<Step2Multipliers | null>(null);
  const [step3Multipliers, setStep3Multipliers] = useState<Step3Multipliers | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPayout, setLastPayout] = useState(0);
  const [lastResult, setLastResult] = useState<RidetheBusAnswerResponse | null>(null);

  async function start(bet: number) {
    setIsLoading(true);
    try {
      const { data } = await api.post<RidetheBusStartResponse>("/casino/ride-the-bus/start", {
        betAmount: bet,
      });
      setBetAmount(bet);
      setCards([]);
      setCurrentStep(1);
      setCurrentMultiplier(1.0);
      setStep2Multipliers(null);
      setStep3Multipliers(null);
      setLastResult(null);
      setLastPayout(0);
      setPhase("playing");
      updateBalance(data.balance);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function answer(step: 1 | 2 | 3 | 4, ans: string) {
    setIsLoading(true);
    try {
      const { data } = await api.post<RidetheBusAnswerResponse>("/casino/ride-the-bus/answer", {
        step,
        answer: ans,
      });

      setLastResult(data);
      setCards((prev) => [...prev, data.revealedCard]);
      setCurrentMultiplier(data.currentMultiplier);

      if (data.step2Multipliers) setStep2Multipliers(data.step2Multipliers);
      if (data.step3Multipliers) setStep3Multipliers(data.step3Multipliers);

      if (data.gameState === "won") {
        setPhase("won");
        setLastPayout(data.payout ?? 0);
        if (data.balance !== undefined) updateBalance(data.balance);
      } else if (data.gameState === "lost") {
        setPhase("lost");
        setLastPayout(0);
        if (data.balance !== undefined) updateBalance(data.balance);
      } else if (data.nextStep) {
        setCurrentStep(data.nextStep);
      }
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreSession() {
    try {
      const { data } = await api.get<RidetheBusCurrentResponse>("/casino/ride-the-bus/current");
      setCards(data.cards);
      setCurrentStep(data.step);
      setCurrentMultiplier(data.currentMultiplier);
      setBetAmount(data.betAmount);
      if (data.step2Multipliers) setStep2Multipliers(data.step2Multipliers);
      if (data.step3Multipliers) setStep3Multipliers(data.step3Multipliers);
      setPhase("playing");
    } catch {
      // No active session — stay idle
    }
  }

  function reset() {
    setPhase("idle");
    setCurrentStep(1);
    setCards([]);
    setBetAmount(0);
    setCurrentMultiplier(1.0);
    setStep2Multipliers(null);
    setStep3Multipliers(null);
    setLastResult(null);
    setLastPayout(0);
  }

  const potentialWin = Math.floor(betAmount * currentMultiplier);

  return {
    phase,
    currentStep,
    cards,
    betAmount,
    currentMultiplier,
    step2Multipliers,
    step3Multipliers,
    isLoading,
    lastPayout,
    lastResult,
    potentialWin,
    start,
    answer,
    restoreSession,
    reset,
  };
}
