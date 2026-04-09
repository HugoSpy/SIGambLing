import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Coins, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useHiloGame } from "../../hooks/useHiloGame";
import { cn, formatTokens } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HiloCard, HiloCardGhost } from "./HiloCard";
import { HiloHistory } from "./HiloHistory";

const QUICK_BETS = [10, 25, 50, 100];

export function HiloGame() {
  const user = useAuthStore((s) => s.user);
  const [bet, setBet] = useState(10);
  const [hoveredAction, setHoveredAction] = useState<"higher" | "lower" | null>(null);

  const {
    phase,
    currentCard,
    multipliers,
    accumulatedMultiplier,
    initialBet,
    history,
    isLoading,
    lastPayout,
    potentialPayout,
    start,
    predict,
    skip,
    cashOut,
    restoreSession,
    reset,
  } = useHiloGame();

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPlaying = phase === "playing";
  const isIdle = phase === "idle";
  const isOver = phase === "win" || phase === "loss";

  const canCashOut = isPlaying && (history.length > 1);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Sidebar ── */}
      <div className="flex flex-col gap-4 lg:w-72 shrink-0">
        <Card className="border-white/10 bg-zinc-900/95 p-5">
          <div className="flex flex-col gap-4">
            <Link to="/casino" className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au casino
            </Link>

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-muted mb-1">Mise initiale</p>
              <input
                type="number"
                min={10}
                max={user?.balance ?? 10}
                step={10}
                value={bet}
                disabled={isPlaying}
                onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-cyan disabled:opacity-50"
              />
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    disabled={isPlaying}
                    onClick={() => setBet(q)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs border transition-colors",
                      bet === q
                        ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                        : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {isIdle && (
              <Button
                onClick={() => start(bet)}
                disabled={isLoading || bet < 10 || (user?.balance ?? 0) < bet}
                className="w-full"
              >
                {isLoading ? "Démarrage..." : "Lancer la partie"}
              </Button>
            )}

            {isOver && (
              <Button onClick={reset} className="w-full">
                Nouvelle partie
              </Button>
            )}

            {isPlaying && (
              <>
                <div className="h-px bg-white/5" />

                {/* Skip */}
                <Button
                  disabled={isLoading}
                  onClick={() => skip()}
                  variant="secondary"
                  className="w-full gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Passer la carte
                </Button>

                <div className="h-px bg-white/5" />

                {/* Higher */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-zinc-400">
                      Supérieure ≥{" "}
                      <span className="text-zinc-200">
                        {multipliers ? `${(multipliers.higherProbability * 100).toFixed(1)}%` : "—"}
                      </span>
                    </p>
                    {multipliers && (
                      <span className="text-xs font-mono text-emerald-400">x{multipliers.higher.toFixed(2)}</span>
                    )}
                  </div>
                  <Button
                    disabled={isLoading}
                    onClick={() => predict("higher")}
                    onMouseEnter={() => setHoveredAction("higher")}
                    onMouseLeave={() => setHoveredAction(null)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Higher
                    {multipliers && (
                      <span className="ml-auto text-xs opacity-80">
                        {formatTokens(Math.floor(initialBet * accumulatedMultiplier * multipliers.higher))} T
                      </span>
                    )}
                  </Button>
                </div>

                {/* Lower */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-zinc-400">
                      Inférieure ≤{" "}
                      <span className="text-zinc-200">
                        {multipliers ? `${(multipliers.lowerProbability * 100).toFixed(1)}%` : "—"}
                      </span>
                    </p>
                    {multipliers && (
                      <span className="text-xs font-mono text-blue-400">x{multipliers.lower.toFixed(2)}</span>
                    )}
                  </div>
                  <Button
                    disabled={isLoading}
                    onClick={() => predict("lower")}
                    onMouseEnter={() => setHoveredAction("lower")}
                    onMouseLeave={() => setHoveredAction(null)}
                    className="w-full bg-blue-600 hover:bg-blue-500 gap-2"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Lower
                    {multipliers && (
                      <span className="ml-auto text-xs opacity-80">
                        {formatTokens(Math.floor(initialBet * accumulatedMultiplier * multipliers.lower))} T
                      </span>
                    )}
                  </Button>
                </div>

                <div className="h-px bg-white/5" />

                {/* Cash out */}
                <div>
                  <Button
                    disabled={isLoading || !canCashOut}
                    onClick={() => cashOut()}
                    variant="secondary"
                    className="w-full gap-2"
                  >
                    <Coins className="h-4 w-4" />
                    Cash Out x{accumulatedMultiplier.toFixed(2)}
                  </Button>
                  {canCashOut && (
                    <p className="mt-1.5 text-center text-xs text-zinc-500">
                      Encaisser {formatTokens(potentialPayout)} tokens
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Main game area ── */}
      <div className="flex flex-col gap-6 flex-1 min-w-0">
        <Card className="border-white/10 bg-zinc-900/95 p-6">
          {/* Card display */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <HiloCardGhost
              label="K"
              sublabel="highest"
              highlight={hoveredAction === "higher"}
            />

            <div className="flex flex-col items-center gap-3">
              {currentCard ? (
                <HiloCard
                  card={currentCard}
                  animateKey={`${currentCard.value}-${currentCard.suit}`}
                  size="lg"
                />
              ) : (
                <div className="w-32 h-48 rounded-xl border border-white/10 bg-zinc-800/40 flex items-center justify-center">
                  <ChevronRight className="h-8 w-8 text-zinc-600" />
                </div>
              )}

              {/* Multiplier badge */}
              <AnimatePresence mode="wait">
                {isPlaying && (
                  <motion.div
                    key={accumulatedMultiplier}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-mono text-emerald-400"
                  >
                    x{accumulatedMultiplier.toFixed(2)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <HiloCardGhost
              label="A"
              sublabel="lowest"
              highlight={hoveredAction === "lower"}
            />
          </div>

          {/* Profit preview */}
          {isPlaying && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-400 mb-1">
                  Profit Higher {multipliers ? `(x${multipliers.higher.toFixed(2)})` : ""}
                </p>
                <p className="text-lg font-mono font-bold text-emerald-400">
                  {multipliers ? `${formatTokens(Math.floor(initialBet * accumulatedMultiplier * multipliers.higher))} T` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-400 mb-1">
                  Profit Lower {multipliers ? `(x${multipliers.lower.toFixed(2)})` : ""}
                </p>
                <p className="text-lg font-mono font-bold text-blue-400">
                  {multipliers ? `${formatTokens(Math.floor(initialBet * accumulatedMultiplier * multipliers.lower))} T` : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Win / Loss overlay */}
          <AnimatePresence>
            {phase === "win" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 mb-4 text-center"
              >
                <p className="text-emerald-400 font-semibold">
                  Cash out réussi — {formatTokens(lastPayout)} tokens encaissés !
                </p>
              </motion.div>
            )}
            {phase === "loss" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4 text-center"
              >
                <p className="text-red-400 font-semibold">Mauvaise prédiction — partie terminée.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {history.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-muted mb-3">Historique</p>
              <HiloHistory entries={history} />
            </div>
          )}

          {/* Idle state hint */}
          {isIdle && (
            <p className="text-center text-sm text-zinc-500">
              Définissez votre mise et lancez la partie pour commencer.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
