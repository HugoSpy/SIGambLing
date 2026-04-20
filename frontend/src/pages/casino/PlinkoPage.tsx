import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PlinkoBoardSVG } from "../../components/casino/plinko/PlinkoBoardSVG";
import { MinesAutoBetGraph } from "../../components/casino/Mines/MinesAutoBetGraph";
import { WinPopup, useWinPopup } from "../../components/ui/WinPopup";
import { DashboardShell } from "../../components/layout/DashboardShell";
import { useAuthStore } from "../../store/auth-store";
import { useAuthenticatedUser } from "../../hooks/useAuthenticatedUser";
import { LoadingScreen } from "../../components/layout/LoadingScreen";
import { api, logoutRequest } from "../../lib/api";
import { sounds } from "../../lib/sounds";
import { getMultipliers, type RiskLevel } from "../../lib/plinkoMultipliers";
import type { AutoBetRound } from "../../hooks/useMinesAutoBet";

interface PlinkoDropResult {
  path: boolean[];
  slotIndex: number;
  multiplier: number;
  payout: number;
  profit: number;
  newBalance: number;
}

const MIN_BET = 10;

function NumInput({
  label,
  value,
  onChange,
  min,
  placeholder,
  disabled,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
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

export function PlinkoPage() {
  const { data: user } = useAuthenticatedUser();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const userBalance = useAuthStore((s) => s.user?.balance ?? user?.balance ?? 0);

  // Game settings
  const [bet, setBet] = useState(100);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<RiskLevel>("medium");

  // Game state
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPath, setCurrentPath] = useState<boolean[] | null>(null);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ multiplier: number; profit: number } | null>(null);

  // Mode toggle
  const [mode, setMode] = useState<"manual" | "auto">("manual");

  // Auto-bet state
  const [autoBetAmount, setAutoBetAmount] = useState(100);
  const [autoMaxRounds, setAutoMaxRounds] = useState<number | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRoundsDone, setAutoRoundsDone] = useState(0);
  const [autoStartBalance, setAutoStartBalance] = useState(0);
  const [autoHistory, setAutoHistory] = useState<AutoBetRound[]>([]);
  const [pendingAutoNext, setPendingAutoNext] = useState(false);

  // Refs to avoid stale closures in animation callbacks
  const autoRunningRef = useRef(false);
  const autoRoundsDoneRef = useRef(0);
  const autoMaxRoundsRef = useRef<number | null>(null);
  const autoBetAmountRef = useRef(100);
  const rowsRef = useRef(12);
  const riskRef = useRef<RiskLevel>("medium");

  // Keep refs in sync
  useEffect(() => { autoRunningRef.current = autoRunning; }, [autoRunning]);
  useEffect(() => { autoRoundsDoneRef.current = autoRoundsDone; }, [autoRoundsDone]);
  useEffect(() => { autoMaxRoundsRef.current = autoMaxRounds; }, [autoMaxRounds]);
  useEffect(() => { autoBetAmountRef.current = autoBetAmount; }, [autoBetAmount]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { riskRef.current = risk; }, [risk]);

  const multipliers = getMultipliers(rows, risk);

  const { popupProps, showWin } = useWinPopup();

  // Pending result to process after animation
  const pendingResultRef = useRef<PlinkoDropResult | null>(null);

  const dropMutation = useMutation({
    mutationFn: (payload: { betAmount: number; rows: number; risk: RiskLevel }) =>
      api.post<PlinkoDropResult>("/casino/plinko/drop", payload).then((r) => r.data),
    onSuccess: (result) => {
      pendingResultRef.current = result;
      setCurrentPath(result.path);
      setCurrentSlotIndex(result.slotIndex);
      setIsAnimating(true);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erreur lors du drop.";
      toast.error(msg);
      setIsAnimating(false);
      stopAuto();
    },
  });

  const handleAnimationComplete = useCallback(() => {
    const result = pendingResultRef.current;
    if (!result) return;

    setIsAnimating(false);
    updateBalance(result.newBalance);
    setLastResult({ multiplier: result.multiplier, profit: result.profit });

    if (result.profit > 0) {
      sounds.win.play();
      showWin({ multiplier: result.multiplier, netGain: result.profit });
    } else {
      sounds.bombClick.play();
    }

    if (autoRunningRef.current) {
      const done = autoRoundsDoneRef.current + 1;
      autoRoundsDoneRef.current = done;
      setAutoRoundsDone(done);
      setAutoHistory((prev) => [
        ...prev,
        {
          round: done,
          balance: result.newBalance,
          win: result.profit > 0,
          profit: result.profit,
          bet: autoBetAmountRef.current,
        },
      ]);

      const maxR = autoMaxRoundsRef.current;
      if ((maxR !== null && done >= maxR) || result.newBalance < autoBetAmountRef.current) {
        stopAuto();
        return;
      }
      // Schedule next round (slight delay for readability)
      setPendingAutoNext(true);
    }

    pendingResultRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire next auto-bet round when pendingAutoNext becomes true
  useEffect(() => {
    if (!pendingAutoNext) return;
    setPendingAutoNext(false);
    if (!autoRunningRef.current) return;
    setTimeout(() => {
      if (!autoRunningRef.current) return;
      dropMutation.mutate({
        betAmount: autoBetAmountRef.current,
        rows: rowsRef.current,
        risk: riskRef.current,
      });
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoNext]);

  function handleDrop() {
    if (isAnimating || dropMutation.isPending) return;
    sounds.betButton.play();
    dropMutation.mutate({ betAmount: bet, rows, risk });
  }

  function startAuto() {
    autoRunningRef.current = true;
    autoRoundsDoneRef.current = 0;
    setAutoRunning(true);
    setAutoRoundsDone(0);
    setAutoHistory([]);
    setAutoStartBalance(userBalance);
    dropMutation.mutate({
      betAmount: autoBetAmountRef.current,
      rows: rowsRef.current,
      risk: riskRef.current,
    });
  }

  function stopAuto() {
    autoRunningRef.current = false;
    setAutoRunning(false);
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  const showGraph = autoRunning || autoHistory.length > 0;
  const isDropping = isAnimating || dropMutation.isPending;

  if (!user) return <LoadingScreen label="Préparation du Plinko..." />;

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0f1923" }}
      >
        <div className="flex flex-col lg:flex-row gap-4 p-4">
          {/* ── Controls ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-64 shrink-0">
            <div
              className="flex flex-col gap-4 rounded-xl p-4"
              style={{ background: "#172531", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Link
                to="/casino"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
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
                      if (m === "manual" && autoRunning) stopAuto();
                      setMode(m);
                    }}
                    disabled={isDropping}
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

              {mode === "manual" && (
                <>
                  {/* Bet */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-zinc-500">Mise</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={MIN_BET}
                        max={userBalance}
                        value={bet}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && n > 0) setBet(n);
                        }}
                        disabled={isDropping}
                        className="w-full rounded-lg px-3 py-2.5 pr-16 text-sm font-mono text-zinc-100 outline-none transition disabled:opacity-50"
                        style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">tokens</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { label: "×½", fn: () => setBet((v) => Math.max(MIN_BET, Math.floor(v / 2))) },
                        { label: "×2", fn: () => setBet((v) => Math.min(userBalance, v * 2)) },
                        { label: "Max", fn: () => setBet(userBalance) },
                      ].map(({ label, fn }) => (
                        <button
                          key={label}
                          onClick={fn}
                          disabled={isDropping}
                          className="flex-1 rounded-md py-1.5 text-xs font-medium text-zinc-300 transition hover:text-white disabled:opacity-40"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-widest text-zinc-500">Lignes</label>
                      <span className="text-xs font-mono font-bold text-zinc-300">{rows}</span>
                    </div>
                    <input
                      type="range"
                      min={8} max={16} step={1}
                      value={rows}
                      onChange={(e) => setRows(parseInt(e.target.value, 10))}
                      disabled={isDropping}
                      className="w-full accent-emerald-400 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      <span>8</span><span>16</span>
                    </div>
                  </div>

                  {/* Risk */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-zinc-500">Risque</label>
                    <div className="flex gap-1.5">
                      {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRisk(r)}
                          disabled={isDropping}
                          className="flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition disabled:opacity-40"
                          style={{
                            background: risk === r ? "rgba(0,231,1,0.15)" : "rgba(255,255,255,0.06)",
                            border: risk === r ? "1px solid rgba(0,231,1,0.4)" : "1px solid rgba(255,255,255,0.06)",
                            color: risk === r ? "#00e701" : "#a1a1aa",
                          }}
                        >
                          {r === "low" ? "Bas" : r === "medium" ? "Med" : "Haut"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop button */}
                  <button
                    onClick={handleDrop}
                    disabled={isDropping || bet < MIN_BET || bet > userBalance}
                    className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #00e701 0%, #00cc00 100%)",
                      color: "#0a1f0a",
                      boxShadow: isDropping ? "none" : "0 4px 20px rgba(0,231,1,0.3)",
                    }}
                  >
                    {isDropping ? "En cours..." : "Lâcher la balle"}
                  </button>
                </>
              )}

              {mode === "auto" && (
                <>
                  {/* Auto bet amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-zinc-500">Mise de base</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={MIN_BET}
                        max={userBalance}
                        value={autoBetAmount}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && n > 0) setAutoBetAmount(n);
                        }}
                        disabled={autoRunning}
                        className="w-full rounded-lg px-3 py-2.5 pr-16 text-sm font-mono text-zinc-100 outline-none transition disabled:opacity-50"
                        style={{ background: "#0f1923", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">tokens</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { label: "×½", fn: () => setAutoBetAmount((v) => Math.max(MIN_BET, Math.floor(v / 2))) },
                        { label: "×2", fn: () => setAutoBetAmount((v) => Math.min(userBalance, v * 2)) },
                        { label: "Max", fn: () => setAutoBetAmount(userBalance) },
                      ].map(({ label, fn }) => (
                        <button
                          key={label}
                          onClick={fn}
                          disabled={autoRunning}
                          className="flex-1 rounded-md py-1.5 text-xs font-medium text-zinc-300 transition hover:text-white disabled:opacity-40"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-widest text-zinc-500">Lignes</label>
                      <span className="text-xs font-mono font-bold text-zinc-300">{rows}</span>
                    </div>
                    <input
                      type="range"
                      min={8} max={16} step={1}
                      value={rows}
                      onChange={(e) => setRows(parseInt(e.target.value, 10))}
                      disabled={autoRunning}
                      className="w-full accent-emerald-400 disabled:opacity-50"
                    />
                  </div>

                  {/* Risk */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-zinc-500">Risque</label>
                    <div className="flex gap-1.5">
                      {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRisk(r)}
                          disabled={autoRunning}
                          className="flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition disabled:opacity-40"
                          style={{
                            background: risk === r ? "rgba(0,231,1,0.15)" : "rgba(255,255,255,0.06)",
                            border: risk === r ? "1px solid rgba(0,231,1,0.4)" : "1px solid rgba(255,255,255,0.06)",
                            color: risk === r ? "#00e701" : "#a1a1aa",
                          }}
                        >
                          {r === "low" ? "Bas" : r === "medium" ? "Med" : "Haut"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <NumInput
                    label="Nb de rounds (vide = ∞)"
                    value={autoMaxRounds}
                    onChange={setAutoMaxRounds}
                    min={1}
                    placeholder="∞"
                    disabled={autoRunning}
                  />

                  <div className="mt-auto">
                    {!autoRunning ? (
                      <button
                        onClick={startAuto}
                        disabled={autoBetAmount < MIN_BET || autoBetAmount > userBalance}
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
                        onClick={stopAuto}
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
          </div>

          {/* ── Board ─────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Last result badge */}
            <AnimatePresence>
              {lastResult && !isAnimating && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-center gap-3"
                >
                  <span
                    className="rounded-full px-4 py-1.5 text-sm font-mono font-bold"
                    style={{
                      background: lastResult.profit > 0 ? "rgba(0,231,1,0.15)" : "rgba(239,68,68,0.15)",
                      border: `1px solid ${lastResult.profit > 0 ? "rgba(0,231,1,0.4)" : "rgba(239,68,68,0.4)"}`,
                      color: lastResult.profit > 0 ? "#00e701" : "#ef4444",
                    }}
                  >
                    {lastResult.multiplier}× &nbsp;
                    {lastResult.profit > 0 ? "+" : ""}{lastResult.profit.toLocaleString()} tokens
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SVG board */}
            <div className="relative">
              <PlinkoBoardSVG
                rows={rows}
                path={currentPath}
                slotIndex={currentSlotIndex}
                multipliers={multipliers}
                isAnimating={isAnimating}
                onAnimationComplete={handleAnimationComplete}
                onPinBounce={() => sounds.gemmeClick.play()}
              />
              <WinPopup {...popupProps} />
            </div>
          </div>
        </div>

        {/* Auto-bet graph */}
        {showGraph && (
          <div className="px-4 pb-4">
            <MinesAutoBetGraph
              rounds={autoHistory}
              startingBalance={autoStartBalance}
              sessionProfit={userBalance - autoStartBalance}
              roundsPlayed={autoRoundsDone}
              isRunning={autoRunning}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
