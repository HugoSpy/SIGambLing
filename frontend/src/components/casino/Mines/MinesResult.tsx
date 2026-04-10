import { AnimatePresence, motion } from "framer-motion";
import type { MinesGamePhase } from "../../../types/mines";

interface MinesResultProps {
  phase: MinesGamePhase;
  payout: number;
  betAmount: number;
  multiplier: number;
  onPlayAgain: () => void;
}

export function MinesResult({ phase, payout, betAmount, multiplier, onPlayAgain }: MinesResultProps) {
  const isWon = phase === "won";
  const isLost = phase === "lost";
  const isVisible = isWon || isLost;

  const profit = payout - betAmount;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center gap-6 rounded-2xl p-8 text-center shadow-2xl"
            style={{
              background: isWon
                ? "linear-gradient(145deg, #0d2e1a 0%, #071a0f 100%)"
                : "linear-gradient(145deg, #2e0d0d 0%, #1a0707 100%)",
              border: isWon ? "1px solid rgba(0,231,1,0.3)" : "1px solid rgba(255,68,68,0.3)",
              minWidth: 320,
              boxShadow: isWon
                ? "0 0 60px rgba(0,231,1,0.15)"
                : "0 0 60px rgba(255,68,68,0.15)",
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.4, delay: 0.1, ease: "backOut" }}
              className="text-5xl"
            >
              {isWon ? "💎" : "💣"}
            </motion.div>

            {/* Title */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xs uppercase tracking-[0.3em] font-medium"
                style={{ color: isWon ? "#00e701" : "#ff4444" }}
              >
                {isWon ? "Cashout réussi" : "Mine touchée"}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-1 font-display text-3xl font-bold"
                style={{ color: isWon ? "#00ff88" : "#ff6666" }}
              >
                {isWon ? "Victoire !" : "Perdu"}
              </motion.p>
            </div>

            {/* Stats */}
            <div className="w-full rounded-xl p-4 space-y-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {isWon && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Multiplicateur</span>
                    <span className="font-mono text-cyan-400">×{multiplier.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Gain</span>
                    <motion.span
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="font-mono font-bold text-emerald-400"
                    >
                      +{profit.toLocaleString()} tokens
                    </motion.span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/5 pt-2 mt-2">
                    <span className="text-zinc-400">Total encaissé</span>
                    <span className="font-mono font-bold text-zinc-100">
                      {payout.toLocaleString()} tokens
                    </span>
                  </div>
                </>
              )}
              {isLost && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Mise perdue</span>
                  <span className="font-mono font-bold text-red-400">
                    -{betAmount.toLocaleString()} tokens
                  </span>
                </div>
              )}
            </div>

            {/* Play again */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={onPlayAgain}
              className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95"
              style={{
                background: isWon
                  ? "linear-gradient(135deg, #00e701 0%, #00cc00 100%)"
                  : "linear-gradient(135deg, #1e3a5f 0%, #152a47 100%)",
                color: isWon ? "#0a1f0a" : "#93c5fd",
                border: isWon ? "none" : "1px solid rgba(59,130,246,0.3)",
              }}
            >
              Nouvelle partie
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
