import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { useMinesGame } from "../../hooks/useMinesGame";
import { MinesGrid } from "./Mines/MinesGrid";
import { MinesSidebar } from "./Mines/MinesSidebar";
import { MinesResult } from "./Mines/MinesResult";
import type { MinesGamePhase } from "../../types/mines";

// Délai avant l'apparition du modal pour laisser la cascade de mines s'animer
const MODAL_DELAY_WON = 900;  // cashout : laisser les mines se révéler
const MODAL_DELAY_LOST = 600; // mine touchée : flash + cascade avant modal

export function MinesGame() {
  const user = useAuthStore((s) => s.user);
  const userBalance = user?.balance ?? 0;

  const {
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
  } = useMinesGame();

  const [bet, setBet] = useState(100);
  const [mines, setMines] = useState(3);
  // Phase affichée dans le modal — retardée pour laisser la grille s'animer
  const [modalPhase, setModalPhase] = useState<MinesGamePhase>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === "won" || phase === "lost") {
      const delay = phase === "won" ? MODAL_DELAY_WON : MODAL_DELAY_LOST;
      timerRef.current = setTimeout(() => setModalPhase(phase), delay);
    } else {
      // Réinitialisation immédiate (nouvelle partie)
      setModalPhase(phase);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase]);

  function handleStart() {
    startGame(bet, mines);
  }

  function handleMinesChange(v: number) {
    if (phase !== "playing") setMines(v);
  }

  function handleReset() {
    setModalPhase("idle");
    resetGame();
  }

  return (
    <div
      className="min-h-screen w-full rounded-2xl overflow-hidden"
      style={{ background: "#0f1923" }}
    >
      <MinesResult
        phase={modalPhase}
        payout={lastPayout}
        betAmount={betAmount}
        multiplier={currentMultiplier}
        onPlayAgain={handleReset}
      />

      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <MinesSidebar
            phase={phase}
            bet={bet}
            onBetChange={setBet}
            minesCount={phase === "playing" ? minesCount : mines}
            onMinesCountChange={handleMinesChange}
            userBalance={userBalance}
            currentMultiplier={currentMultiplier}
            nextMultiplier={nextMultiplier}
            potentialWin={potentialWin}
            gemsFound={gemsFound}
            isLoading={isLoading}
            onStart={handleStart}
            onCashout={cashout}
            onReset={handleReset}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 flex items-start">
          <div className="w-full max-w-lg mx-auto">
            <MinesGrid
              phase={phase}
              revealedCells={revealedCells}
              minePositions={minePositions}
              revealingCell={revealingCell}
              gemsFound={gemsFound}
              gemsTotal={phase === "playing" ? gemsTotal : 25 - mines}
              nextMultiplier={nextMultiplier}
              onReveal={revealCell}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
