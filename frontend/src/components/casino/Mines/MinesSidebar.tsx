import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { MinesGamePhase } from "../../../types/mines";

interface MinesSidebarProps {
  phase: MinesGamePhase;
  bet: number;
  onBetChange: (v: number) => void;
  minesCount: number;
  onMinesCountChange: (v: number) => void;
  userBalance: number;
  currentMultiplier: number;
  nextMultiplier: number;
  potentialWin: number;
  gemsFound: number;
  isLoading: boolean;
  onStart: () => void;
  onCashout: () => void;
}

const QUICK_MINES = [1, 3, 5, 10, 24];

export function MinesSidebar({
  phase,
  bet,
  onBetChange,
  minesCount,
  onMinesCountChange,
  userBalance,
  currentMultiplier,
  nextMultiplier,
  potentialWin,
  gemsFound,
  isLoading,
  onStart,
  onCashout,
}: MinesSidebarProps) {
  const isPlaying = phase === "playing";
  const isIdle = phase === "idle";
  const isOver = phase === "won" || phase === "lost";
  const canCashout = isPlaying && gemsFound > 0 && !isLoading && potentialWin > bet;

  function handleBetInput(raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0) onBetChange(n);
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-4"
      style={{ background: "#172531", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Retour au casino */}
      <Link to="/casino" className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au casino
      </Link>

      {/* Bet input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-zinc-500">Mise</label>
        <div className="relative">
          <input
            type="number"
            min={1}
            max={userBalance}
            value={bet}
            onChange={(e) => handleBetInput(e.target.value)}
            disabled={isPlaying}
            className="w-full rounded-lg px-3 py-2.5 pr-16 text-sm font-mono text-zinc-100 outline-none transition
              disabled:opacity-50"
            style={{
              background: "#0f1923",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">tokens</span>
        </div>
        {/* Quick bet buttons */}
        <div className="flex gap-1.5">
          {[
            { label: "×½", fn: () => onBetChange(Math.max(1, Math.floor(bet / 2))) },
            { label: "×2", fn: () => onBetChange(Math.min(userBalance, bet * 2)) },
            { label: "Max", fn: () => onBetChange(userBalance) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              disabled={isPlaying}
              className="flex-1 rounded-md py-1.5 text-xs font-medium text-zinc-300 transition
                hover:text-white disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mines count selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-zinc-500">Mines</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={24}
            value={minesCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1 && v <= 24) onMinesCountChange(v);
            }}
            disabled={isPlaying}
            className="w-16 rounded-lg px-2 py-2 text-center text-sm font-mono text-zinc-100 outline-none
              disabled:opacity-50"
            style={{
              background: "#0f1923",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <span className="text-xs text-zinc-500">/ 24 max · {25 - minesCount} gemmes</span>
        </div>
        {/* Quick mines shortcuts */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_MINES.map((m) => (
            <button
              key={m}
              onClick={() => onMinesCountChange(m)}
              disabled={isPlaying}
              className="rounded-md px-2.5 py-1 text-xs font-mono transition disabled:opacity-40"
              style={{
                background: minesCount === m ? "rgba(0,231,1,0.15)" : "rgba(255,255,255,0.06)",
                border: minesCount === m ? "1px solid rgba(0,231,1,0.4)" : "1px solid rgba(255,255,255,0.06)",
                color: minesCount === m ? "#00e701" : "#a1a1aa",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Multiplier display */}
      {isPlaying && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Multiplicateur</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentMultiplier}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-lg font-bold text-emerald-400"
              >
                ×{currentMultiplier.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          {gemsFound > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Prochain</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={nextMultiplier}
                  initial={{ y: -4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-mono text-sm text-cyan-400"
                >
                  ×{nextMultiplier.toFixed(2)}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
          {gemsFound > 0 && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "rgba(0,231,1,0.08)", border: "1px solid rgba(0,231,1,0.15)" }}
            >
              <span className="text-xs text-zinc-400">Gain potentiel</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={potentialWin}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-mono text-sm font-bold text-emerald-400"
                >
                  {potentialWin.toLocaleString()} tokens
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {/* Cashout button — only when playing with ≥1 gem */}
        <AnimatePresence>
          {canCashout && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={onCashout}
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #00e701 0%, #00cc00 100%)",
                color: "#0a1f0a",
                boxShadow: "0 4px 20px rgba(0,231,1,0.3)",
              }}
            >
              Cashout {potentialWin.toLocaleString()} tokens
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bet / New game button */}
        {(isIdle || isOver) && (
          <button
            onClick={onStart}
            disabled={isLoading || bet < 1 || bet > userBalance}
            className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #00e701 0%, #00cc00 100%)",
              color: "#0a1f0a",
            }}
          >
            {isLoading ? "..." : "Lancer la mise"}
          </button>
        )}

        {/* Greyed out during play (no button — cashout is shown above) */}
        {isPlaying && !canCashout && (
          <button
            disabled
            className="w-full rounded-xl py-3 text-sm font-bold opacity-40"
            style={{ background: "#1a2c38", color: "#4a7a4a" }}
          >
            Révélez une gemme pour encaisser
          </button>
        )}
      </div>
    </div>
  );
}
