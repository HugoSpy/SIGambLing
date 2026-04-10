import { useState } from "react";
import { api } from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { useAuthStore } from "../store/auth-store";
import type {
  MinesCashoutResponse,
  MinesCurrentResponse,
  MinesGamePhase,
  MinesRevealResponse,
  MinesStartResponse,
} from "../types/mines";

export function useMinesGame() {
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [phase, setPhase] = useState<MinesGamePhase>("idle");
  const [betAmount, setBetAmount] = useState(0);
  const [minesCount, setMinesCount] = useState(3);
  const [gemsTotal, setGemsTotal] = useState(0);
  const [gemsFound, setGemsFound] = useState(0);
  const [revealedCells, setRevealedCells] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [nextMultiplier, setNextMultiplier] = useState(1);
  const [potentialWin, setPotentialWin] = useState(0);
  const [lastPayout, setLastPayout] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [revealingCell, setRevealingCell] = useState<number | null>(null);

  async function startGame(bet: number, mines: number) {
    setIsLoading(true);
    try {
      const { data } = await api.post<MinesStartResponse>("/casino/mines/start", {
        betAmount: bet,
        minesCount: mines,
      });
      setBetAmount(bet);
      setMinesCount(mines);
      setGemsTotal(data.gemsTotal);
      setGemsFound(0);
      setRevealedCells([]);
      setMinePositions([]);
      setCurrentMultiplier(data.currentMultiplier);
      setNextMultiplier(data.nextMultiplier);
      setPotentialWin(0);
      setLastPayout(0);
      setPhase("playing");
      updateBalance(data.balance);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function revealCell(cellIndex: number) {
    if (phase !== "playing" || isLoading || revealingCell !== null) return;
    if (revealedCells.includes(cellIndex)) return;

    setRevealingCell(cellIndex);
    try {
      const { data } = await api.post<MinesRevealResponse>("/casino/mines/reveal", { cellIndex });

      if (data.result === "gem") {
        setRevealedCells((prev) => [...prev, cellIndex]);
        setGemsFound(data.gemsFound ?? 0);
        setCurrentMultiplier(data.currentMultiplier ?? 1);
        setNextMultiplier(data.nextMultiplier ?? 1);
        setPotentialWin(data.potentialWin ?? 0);
      } else {
        // Mine hit — reveal all mines
        setMinePositions(data.minePositions ?? [cellIndex]);
        setRevealedCells((prev) => [...prev, cellIndex]);
        setPhase("lost");
        if (data.balance !== undefined) updateBalance(data.balance);
      }
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setRevealingCell(null);
    }
  }

  async function cashout() {
    if (phase !== "playing" || isLoading || gemsFound === 0) return;
    setIsLoading(true);
    try {
      const { data } = await api.post<MinesCashoutResponse>("/casino/mines/cashout");
      setMinePositions(data.minePositions);
      setLastPayout(data.payout);
      setPhase("won");
      updateBalance(data.balance);
    } catch (err) {
      notify.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreSession() {
    try {
      const { data } = await api.get<MinesCurrentResponse>("/casino/mines/current");
      setBetAmount(data.betAmount);
      setMinesCount(data.minesCount);
      setGemsTotal(data.gemsTotal);
      setGemsFound(data.gemsFound);
      setRevealedCells(data.revealedCells);
      setMinePositions([]);
      setCurrentMultiplier(data.currentMultiplier);
      setNextMultiplier(data.nextMultiplier);
      setPotentialWin(data.potentialWin);
      setPhase("playing");
    } catch {
      // No active session
    }
  }

  function resetGame() {
    setPhase("idle");
    setRevealedCells([]);
    setMinePositions([]);
    setGemsFound(0);
    setCurrentMultiplier(1);
    setNextMultiplier(1);
    setPotentialWin(0);
    setLastPayout(0);
    setRevealingCell(null);
  }

  return {
    phase,
    betAmount,
    minesCount,
    gemsTotal,
    gemsFound,
    revealedCells,
    minePositions,
    currentMultiplier,
    nextMultiplier,
    potentialWin,
    lastPayout,
    isLoading,
    revealingCell,
    startGame,
    revealCell,
    cashout,
    restoreSession,
    resetGame,
  };
}
