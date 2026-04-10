import { AnimatePresence, motion } from "framer-motion";
import type { MinesCellState, MinesGamePhase } from "../../../types/mines";
import { MinesCell } from "./MinesCell";

interface MinesGridProps {
  phase: MinesGamePhase;
  revealedCells: number[];
  minePositions: number[];
  revealingCell: number | null;
  gemsFound: number;
  gemsTotal: number;
  nextMultiplier: number;
  onReveal: (index: number) => void;
}

export function MinesGrid({
  phase,
  revealedCells,
  minePositions,
  revealingCell,
  gemsFound,
  gemsTotal,
  nextMultiplier,
  onReveal,
}: MinesGridProps) {
  const isPlaying = phase === "playing";
  const isOver = phase === "lost" || phase === "won";

  function getCellState(index: number): MinesCellState {
    if (revealedCells.includes(index)) return "gem";
    if (isOver && minePositions.includes(index)) return "mine";
    return "hidden";
  }

  // Stagger index for mine cascade animation (only mines, in order they appear)
  function getMineStaggerIndex(index: number): number {
    return minePositions.indexOf(index);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">
          {isPlaying || isOver ? (
            <>
              <span className="font-semibold text-emerald-400">{gemsFound}</span>
              <span className="text-zinc-500"> / {gemsTotal} gemmes</span>
            </>
          ) : (
            <span className="text-zinc-500">Sélectionnez vos paramètres</span>
          )}
        </span>
        {isPlaying && gemsFound > 0 && (
          <AnimatePresence mode="wait">
            <motion.span
              key={nextMultiplier}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 4, opacity: 0 }}
              className="text-xs text-zinc-400"
            >
              Prochain : <span className="font-mono text-cyan-400">×{nextMultiplier.toFixed(2)}</span>
            </motion.span>
          </AnimatePresence>
        )}
      </div>

      {/* Flash overlay on mine hit */}
      <AnimatePresence>
        {phase === "lost" && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-40 bg-red-500"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Grid */}
      <motion.div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        animate={phase === "lost" ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {Array.from({ length: 25 }, (_, i) => {
          const state = getCellState(i);
          const staggerIdx = state === "mine" ? getMineStaggerIndex(i) : 0;
          const isClickable =
            isPlaying &&
            state === "hidden" &&
            revealingCell === null;
          const isRevealing = revealingCell === i;

          // Wrap mine cells in a motion.div for staggered cascade reveal
          if (isOver && state === "mine") {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: staggerIdx * 0.05 }}
              >
                <MinesCell
                  index={i}
                  state={state}
                  isClickable={false}
                  isRevealing={false}
                  onClick={() => {}}
                />
              </motion.div>
            );
          }

          return (
            <MinesCell
              key={i}
              index={i}
              state={state}
              isClickable={isClickable}
              isRevealing={isRevealing}
              onClick={() => onReveal(i)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
