import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { useMinesGame } from "../../hooks/useMinesGame";
import { useMinesAutoBet } from "../../hooks/useMinesAutoBet";
import { sounds } from "../../lib/sounds";
import { MinesGrid } from "./Mines/MinesGrid";
import { MinesSidebar } from "./Mines/MinesSidebar";
import { MinesAutoBetGraph } from "./Mines/MinesAutoBetGraph";
import { WinPopup, useWinPopup } from "../ui/WinPopup";
import type { AutoBetConfig } from "../../types/mines";

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
  } = useMinesGame();

  const autoBet = useMinesAutoBet();

  const [bet, setBet] = useState(100);
  const [mines, setMines] = useState(3);
  const { popupProps, showWin } = useWinPopup();
  const prevPhaseRef = useRef<string>("");
  const prevRevealedLengthRef = useRef<number>(0);

  useEffect(() => {
    restoreSession();
    // Cleanup auto-bet loop on unmount
    return () => {
      autoBet.cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevPhaseRef.current !== "lost" && phase === "lost") {
      sounds.bombClick.play();
    }
    if (prevPhaseRef.current !== "won" && phase === "won") {
      showWin({ multiplier: currentMultiplier, netGain: lastPayout - betAmount });
    }
    prevPhaseRef.current = phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && revealedCells.length === prevRevealedLengthRef.current + 1) {
      sounds.gemmeClick.play();
    }
    prevRevealedLengthRef.current = revealedCells.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCells]);

  function handleStart() {
    sounds.betButton.play();
    startGame(bet, mines);
  }

  function handleMinesChange(v: number) {
    if (phase !== "playing") setMines(v);
  }

  function handleAutoBetStart(config: AutoBetConfig) {
    autoBet.start(config, userBalance);
  }

  function handleAutoBetStop() {
    autoBet.stop();
  }

  function handleSwitchToManual() {
    autoBet.cleanup();
    autoBet.clearHistory();
  }

  const showGraph = autoBet.isRunning || autoBet.rounds.length > 0;

  return (
    <div
      className="min-h-screen w-full rounded-2xl overflow-hidden"
      style={{ background: "#0f1923" }}
    >
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
            autoBetRunning={autoBet.isRunning}
            onAutoBetStart={handleAutoBetStart}
            onAutoBetStop={handleAutoBetStop}
            onSwitchToManual={handleSwitchToManual}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 flex items-start">
          <div className="relative w-full max-w-lg mx-auto">
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
            <WinPopup {...popupProps} />
          </div>
        </div>
      </div>

      {/* Auto-bet live graph — shown during and after a session, cleared on manual switch */}
      {showGraph && (
        <div className="px-4 pb-4">
          <MinesAutoBetGraph
            rounds={autoBet.rounds}
            startingBalance={autoBet.startingBalance}
            sessionProfit={autoBet.sessionProfit}
            roundsPlayed={autoBet.roundsPlayed}
            isRunning={autoBet.isRunning}
          />
        </div>
      )}
    </div>
  );
}
