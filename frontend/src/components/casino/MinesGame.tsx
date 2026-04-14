import { useCallback, useEffect, useRef, useState } from "react";
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

  // ── Auto-bet cell selection state (lifted from sidebar) ──────────────────────
  const [autoCellMode, setAutoCellMode] = useState<"random" | "fixed">("fixed");
  const [autoFixedCells, setAutoFixedCells] = useState<number[]>([]);

  // ── Auto-bet grid animation state ────────────────────────────────────────────
  const [autoRevealedCells, setAutoRevealedCells] = useState<number[]>([]);
  const [autoMineCell, setAutoMineCell] = useState<number | null>(null);

  // ── Auto-bet WinPopup (managed independently from manual useWinPopup) ────────
  const [autoPopupVisible, setAutoPopupVisible] = useState(false);
  const [autoPopupParams, setAutoPopupParams] = useState({ multiplier: 1, netGain: 0 });

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const abortAnimationRef = useRef(false);
  const autoRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRunningRef = useRef(false);
  const prevPhaseRef = useRef<string>("");
  const prevRevealedLengthRef = useRef<number>(0);

  // ── Manual WinPopup ──────────────────────────────────────────────────────────
  const { popupProps, showWin } = useWinPopup();

  // ── Computed ─────────────────────────────────────────────────────────────────
  // Auto-select mode: sidebar is in Fixe mode, autobet not yet running, no manual game active
  const isAutoSelectMode =
    autoCellMode === "fixed" && !autoBet.isRunning && phase === "idle";

  // ── Initialisation ───────────────────────────────────────────────────────────
  useEffect(() => {
    restoreSession();
    return () => {
      autoBet.cleanup();
      if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
      if (autoPopupTimerRef.current) clearTimeout(autoPopupTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Manual game phase effects ─────────────────────────────────────────────────
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

  // ── Auto-bet: abort animation when isRunning goes false ──────────────────────
  useEffect(() => {
    if (wasRunningRef.current && !autoBet.isRunning) {
      // Session stopped — abort any in-flight animation
      abortAnimationRef.current = true;
      if (autoRevealTimerRef.current) {
        clearTimeout(autoRevealTimerRef.current);
        autoRevealTimerRef.current = null;
      }
      setAutoRevealedCells([]);
      setAutoMineCell(null);
      autoBet.clearPendingRound();
    }
    wasRunningRef.current = autoBet.isRunning;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBet.isRunning]);

  // ── Auto-bet: animate each round when pendingRound arrives ───────────────────
  const triggerAutoPopup = useCallback((multiplier: number, profit: number) => {
    if (profit <= 0) return;
    // Dismiss current (triggers exit animation), then show new after 250ms
    setAutoPopupVisible(false);
    if (autoPopupTimerRef.current) clearTimeout(autoPopupTimerRef.current);
    autoPopupTimerRef.current = setTimeout(() => {
      setAutoPopupParams({ multiplier, netGain: profit });
      setAutoPopupVisible(true);
      sounds.win.play();
      autoPopupTimerRef.current = setTimeout(() => setAutoPopupVisible(false), 2200);
    }, 250);
  }, []);

  useEffect(() => {
    if (!autoBet.pendingRound) return;

    const { cells, win, multiplier, profit } = autoBet.pendingRound;
    abortAnimationRef.current = false;

    // On win: all cells are gems. On loss: cells[0..n-2] are gems, cells[n-1] is the mine.
    const gemCells = win ? cells : cells.slice(0, -1);
    const mineCell = win ? null : (cells.length > 0 ? cells[cells.length - 1] : null);

    let idx = 0;

    function revealNext() {
      if (abortAnimationRef.current) return;

      if (idx < gemCells.length) {
        const cell = gemCells[idx];
        setAutoRevealedCells((prev) => [...prev, cell]);
        sounds.gemmeClick.play();
        idx++;
        autoRevealTimerRef.current = setTimeout(revealNext, 30);
      } else {
        // All gems revealed — show mine if loss, popup if win
        if (mineCell !== null) {
          setAutoMineCell(mineCell);
          sounds.bombClick.play();
        } else {
          triggerAutoPopup(multiplier, profit);
        }

        // Reset grid then acknowledge (triggers next round)
        autoRevealTimerRef.current = setTimeout(() => {
          if (abortAnimationRef.current) return;
          setAutoRevealedCells([]);
          setAutoMineCell(null);
          autoBet.acknowledgeRound();
        }, 400);
      }
    }

    // Reset display state before starting animation
    setAutoRevealedCells([]);
    setAutoMineCell(null);
    autoRevealTimerRef.current = setTimeout(revealNext, 0);

    return () => {
      if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBet.pendingRound]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleStart() {
    sounds.betButton.play();
    startGame(bet, mines);
  }

  function handleMinesChange(v: number) {
    if (phase !== "playing") setMines(v);
  }

  function handleAutoBetStart(config: AutoBetConfig) {
    abortAnimationRef.current = false;
    setAutoRevealedCells([]);
    setAutoMineCell(null);
    setAutoPopupVisible(false);
    autoBet.start(config, userBalance);
  }

  function handleAutoBetStop() {
    autoBet.stop();
  }

  function handleSwitchToManual() {
    autoBet.cleanup();
    autoBet.clearHistory();
    setAutoCellMode("random");
    setAutoFixedCells([]);
    setAutoRevealedCells([]);
    setAutoMineCell(null);
    setAutoPopupVisible(false);
    if (autoPopupTimerRef.current) clearTimeout(autoPopupTimerRef.current);
  }

  function handleAutoSelectCell(i: number) {
    if (!isAutoSelectMode) return;
    setAutoFixedCells((prev) =>
      prev.includes(i) ? prev.filter((c) => c !== i) : [...prev, i],
    );
  }

  // ── Popup props: manual vs auto-bet ─────────────────────────────────────────
  const activePopupProps = autoBet.isRunning || autoPopupVisible
    ? {
        multiplier: autoPopupParams.multiplier,
        netGain: autoPopupParams.netGain,
        visible: autoPopupVisible,
      }
    : popupProps;

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
            autoCellMode={autoCellMode}
            onAutoCellModeChange={setAutoCellMode}
            autoFixedCells={autoFixedCells}
            onResetAutoFixedCells={() => setAutoFixedCells([])}
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
              autoSelectMode={isAutoSelectMode}
              selectedAutoFixedCells={autoFixedCells}
              onAutoSelectCell={handleAutoSelectCell}
              isAutoBetRunning={autoBet.isRunning}
              autoRevealedCells={autoRevealedCells}
              autoMineCell={autoMineCell}
            />
            <WinPopup {...activePopupProps} />
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
