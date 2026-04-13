import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { AutoBetConfig, AutoBetStrategy, MinesGamePhase } from "../../../types/mines";

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
  autoBetRunning: boolean;
  onAutoBetStart: (config: AutoBetConfig) => void;
  onAutoBetStop: () => void;
  onSwitchToManual?: () => void;
}

const QUICK_MINES = [1, 3, 5, 10, 24];

const STRATEGY_LABELS: Record<AutoBetStrategy, string> = {
  flat: "Flat bet",
  martingale: "Martingale (×2 perte)",
  "anti-martingale": "Anti-martingale (×2 gain)",
  custom: "Custom",
};

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          placeholder={placeholder ?? ""}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") { onChange(null); return; }
            const n = parseInt(raw, 10);
            if (!isNaN(n)) onChange(n);
          }}
          className="w-full rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 outline-none transition disabled:opacity-50"
          style={{
            background: "#0f1923",
            border: "1px solid rgba(255,255,255,0.08)",
            paddingRight: suffix ? "3.5rem" : undefined,
          }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

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
  autoBetRunning,
  onAutoBetStart,
  onAutoBetStop,
  onSwitchToManual,
}: MinesSidebarProps) {
  const isPlaying = phase === "playing";
  const isIdle = phase === "idle";
  const isOver = phase === "won" || phase === "lost";
  const canCashout = isPlaying && gemsFound > 0 && !isLoading && potentialWin > bet;

  // ── Mode toggle ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"manual" | "auto">("manual");

  // ── Auto-bet config state ────────────────────────────────────────────────────
  const [autoBet, setAutoBet] = useState(bet || 100);
  const [autoMines, setAutoMines] = useState(minesCount || 3);
  const [cellMode, setCellMode] = useState<"random" | "fixed">("random");
  const [fixedCells, setFixedCells] = useState<number[]>([]);
  const [gemCount, setGemCount] = useState(1);
  const [strategy, setStrategy] = useState<AutoBetStrategy>("flat");
  const [customMultiplier, setCustomMultiplier] = useState(1.5);
  const [customCondition, setCustomCondition] = useState<"win" | "loss">("loss");
  const [maxBet, setMaxBet] = useState<number | null>(null);
  const [maxRounds, setMaxRounds] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);

  const maxGemCount = Math.max(1, 25 - autoMines - 1);

  function handleBetInput(raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0) onBetChange(n);
  }

  function toggleFixedCell(idx: number) {
    setFixedCells((prev) =>
      prev.includes(idx) ? prev.filter((c) => c !== idx) : [...prev, idx],
    );
  }

  function handleAutoBetMinesChange(v: number) {
    setAutoMines(v);
    setGemCount((g) => Math.min(g, Math.max(1, 25 - v - 1)));
    setFixedCells([]);
  }

  function handleStart() {
    const config: AutoBetConfig = {
      betAmount: autoBet,
      minesCount: autoMines,
      cellMode,
      fixedCells: cellMode === "fixed" ? fixedCells : [],
      gemCount: Math.min(gemCount, maxGemCount),
      strategy,
      customMultiplier,
      customCondition,
      maxBet: maxBet ?? userBalance,
      maxRounds,
      stopLoss,
      takeProfit,
    };
    onAutoBetStart(config);
  }

  // ── Shared bet input (manual mode) ──────────────────────────────────────────
  const manualBetControls = (
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
          className="w-full rounded-lg px-3 py-2.5 pr-16 text-sm font-mono text-zinc-100 outline-none transition disabled:opacity-50"
          style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">tokens</span>
      </div>
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
            className="flex-1 rounded-md py-1.5 text-xs font-medium text-zinc-300 transition hover:text-white disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const manualMinesControls = (
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
          className="w-16 rounded-lg px-2 py-2 text-center text-sm font-mono text-zinc-100 outline-none disabled:opacity-50"
          style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <span className="text-xs text-zinc-500">/ 24 max · {25 - minesCount} gemmes</span>
      </div>
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
  );

  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-4"
      style={{ background: "#172531", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Retour au casino */}
      <Link
        to="/casino"
        className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au casino
      </Link>

      {/* Mode toggle */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {(["manual", "auto"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (m === "manual" && mode !== "manual") onSwitchToManual?.();
              setMode(m);
            }}
            disabled={isPlaying || autoBetRunning}
            className="flex-1 py-1.5 text-xs font-semibold transition disabled:opacity-40"
            style={{
              background: mode === m ? "rgba(0,231,1,0.15)" : "transparent",
              color: mode === m ? "#00e701" : "#71717a",
              borderRight: m === "manual" ? "1px solid rgba(255,255,255,0.08)" : undefined,
            }}
          >
            {m === "manual" ? "Manuel" : "Auto"}
          </button>
        ))}
      </div>

      {/* ──────────── MANUAL MODE ──────────── */}
      {mode === "manual" && (
        <>
          {manualBetControls}
          {manualMinesControls}

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
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2"
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
        </>
      )}

      {/* ──────────── AUTO MODE ──────────── */}
      {mode === "auto" && (
        <>
          {/* Mise de base */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Mise de base</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={userBalance}
                value={autoBet}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n > 0) setAutoBet(n);
                }}
                disabled={autoBetRunning}
                className="w-full rounded-lg px-3 py-2.5 pr-16 text-sm font-mono text-zinc-100 outline-none transition disabled:opacity-50"
                style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">tokens</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "×½", fn: () => setAutoBet((v) => Math.max(1, Math.floor(v / 2))) },
                { label: "×2", fn: () => setAutoBet((v) => Math.min(userBalance, v * 2)) },
                { label: "Max", fn: () => setAutoBet(userBalance) },
              ].map(({ label, fn }) => (
                <button
                  key={label}
                  onClick={fn}
                  disabled={autoBetRunning}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium text-zinc-300 transition hover:text-white disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mines */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Mines</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={24}
                value={autoMines}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 24) handleAutoBetMinesChange(v);
                }}
                disabled={autoBetRunning}
                className="w-16 rounded-lg px-2 py-2 text-center text-sm font-mono text-zinc-100 outline-none disabled:opacity-50"
                style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <span className="text-xs text-zinc-500">/ 24 max · {25 - autoMines} gemmes</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MINES.map((m) => (
                <button
                  key={m}
                  onClick={() => handleAutoBetMinesChange(m)}
                  disabled={autoBetRunning}
                  className="rounded-md px-2.5 py-1 text-xs font-mono transition disabled:opacity-40"
                  style={{
                    background: autoMines === m ? "rgba(0,231,1,0.15)" : "rgba(255,255,255,0.06)",
                    border: autoMines === m ? "1px solid rgba(0,231,1,0.4)" : "1px solid rgba(255,255,255,0.06)",
                    color: autoMines === m ? "#00e701" : "#a1a1aa",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Cell mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Cases</label>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {(["random", "fixed"] as const).map((cm) => (
                <button
                  key={cm}
                  onClick={() => setCellMode(cm)}
                  disabled={autoBetRunning}
                  className="flex-1 py-1.5 text-xs font-medium transition disabled:opacity-40"
                  style={{
                    background: cellMode === cm ? "rgba(0,231,1,0.12)" : "transparent",
                    color: cellMode === cm ? "#00e701" : "#71717a",
                    borderRight: cm === "random" ? "1px solid rgba(255,255,255,0.08)" : undefined,
                  }}
                >
                  {cm === "random" ? "Aléatoire" : "Fixe"}
                </button>
              ))}
            </div>

            {/* Fixed cells 5×5 mini grid */}
            {cellMode === "fixed" && (
              <div className="grid grid-cols-5 gap-1 mt-1">
                {Array.from({ length: 25 }, (_, i) => {
                  const selected = fixedCells.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleFixedCell(i)}
                      disabled={autoBetRunning}
                      className="aspect-square rounded-md text-[10px] font-mono transition disabled:opacity-40"
                      style={{
                        background: selected ? "rgba(0,231,1,0.2)" : "rgba(255,255,255,0.05)",
                        border: selected
                          ? "1px solid rgba(0,231,1,0.5)"
                          : "1px solid rgba(255,255,255,0.06)",
                        color: selected ? "#00e701" : "#52525b",
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gem count slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Gemmes</label>
              <span className="text-xs font-mono text-emerald-400">{gemCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={maxGemCount}
              value={Math.min(gemCount, maxGemCount)}
              onChange={(e) => setGemCount(Number(e.target.value))}
              disabled={autoBetRunning}
              className="w-full accent-emerald-500 disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>1</span>
              <span>{maxGemCount}</span>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Bet strategy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Stratégie</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as AutoBetStrategy)}
              disabled={autoBetRunning}
              className="w-full rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition disabled:opacity-50"
              style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {(Object.keys(STRATEGY_LABELS) as AutoBetStrategy[]).map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_LABELS[s]}
                </option>
              ))}
            </select>

            {strategy === "custom" && (
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500">Multiplicateur</label>
                  <input
                    type="number"
                    min={1.01}
                    step={0.01}
                    value={customMultiplier}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!isNaN(n) && n > 1) setCustomMultiplier(n);
                    }}
                    disabled={autoBetRunning}
                    className="w-full rounded-lg px-2 py-1.5 text-sm font-mono text-zinc-100 outline-none disabled:opacity-50 mt-1"
                    style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500">Condition</label>
                  <select
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value as "win" | "loss")}
                    disabled={autoBetRunning}
                    className="w-full rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none disabled:opacity-50 mt-1"
                    style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <option value="loss">Sur perte</option>
                    <option value="win">Sur gain</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Max bet cap */}
          <NumInput
            label="Mise max"
            value={maxBet}
            onChange={setMaxBet}
            min={1}
            max={userBalance}
            placeholder="Illimitée"
            disabled={autoBetRunning}
            suffix="tokens"
          />

          <div className="h-px bg-white/5" />

          {/* Stop conditions */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Conditions d'arrêt</label>
            <NumInput
              label="Nb de rounds (vide = infini)"
              value={maxRounds}
              onChange={setMaxRounds}
              min={1}
              placeholder="∞"
              disabled={autoBetRunning}
            />
            <NumInput
              label="Stop loss (balance min)"
              value={stopLoss}
              onChange={setStopLoss}
              min={0}
              placeholder="Désactivé"
              disabled={autoBetRunning}
              suffix="tokens"
            />
            <NumInput
              label="Take profit (gain de session)"
              value={takeProfit}
              onChange={setTakeProfit}
              min={1}
              placeholder="Désactivé"
              disabled={autoBetRunning}
              suffix="tokens"
            />
          </div>

          {/* Start / Stop button */}
          <div className="mt-auto">
            {!autoBetRunning ? (
              <button
                onClick={handleStart}
                disabled={
                  autoBet < 1 ||
                  autoBet > userBalance ||
                  (cellMode === "fixed" && fixedCells.length === 0)
                }
                className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #00e701 0%, #00cc00 100%)",
                  color: "#0a1f0a",
                  boxShadow: "0 4px 16px rgba(0,231,1,0.25)",
                }}
              >
                Démarrer Auto
              </button>
            ) : (
              <button
                onClick={onAutoBetStop}
                className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                }}
              >
                Arrêter Auto
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
