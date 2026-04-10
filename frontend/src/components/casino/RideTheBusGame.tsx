import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Coins,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRideTheBusGame } from "../../hooks/useRideTheBusGame";
import { cn, formatTokens } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HiloCard } from "./HiloCard";
import type { RidetheBusSuit } from "../../types/ride-the-bus";

const QUICK_BETS = [10, 25, 50, 100];

const SUIT_SYMBOLS: Record<RidetheBusSuit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_LABELS: Record<RidetheBusSuit, string> = {
  hearts: "Cœur",
  diamonds: "Carreau",
  clubs: "Trèfle",
  spades: "Pique",
};

const SUITS: RidetheBusSuit[] = ["spades", "hearts", "diamonds", "clubs"];

const STEP_LABELS: Record<number, string> = {
  1: "Quelle est la couleur de la prochaine carte ?",
  2: "Supérieure ou égale, ou inférieure ou égale à la carte précédente ?",
  3: "La prochaine carte sera-t-elle entre les deux (inside) ou en dehors (outside) ?",
  4: "Quelle est la couleur de la prochaine carte ?",
};

function StepDots({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            backgroundColor: i < current ? "rgb(16 185 129)" : i === current - 1 ? "rgb(52 211 153)" : "rgb(63 63 70)",
            scale: i === current - 1 ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
          className="h-2 w-2 rounded-full"
        />
      ))}
    </div>
  );
}

export function RideTheBusGame() {
  const user = useAuthStore((s) => s.user);
  const [bet, setBet] = useState(10);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const cardSize = isMobile ? "sm" : "md";
  const slotW = isMobile ? "w-16" : "w-24";
  const slotH = isMobile ? "h-24" : "h-36";

  const {
    phase,
    currentStep,
    cards,
    betAmount,
    currentMultiplier,
    step2Multipliers,
    step3Multipliers,
    isLoading,
    lastPayout,
    lastResult,
    potentialWin,
    start,
    answer,
    restoreSession,
    reset,
  } = useRideTheBusGame();

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPlaying = phase === "playing";
  const isIdle = phase === "idle";
  const isOver = phase === "won" || phase === "lost";

  // Convert RidetheBusCard to HiloCard format for the shared component
  function toHiloCard(card: { value: number; suit: string }) {
    return { value: card.value, suit: card.suit as "hearts" | "diamonds" | "clubs" | "spades" };
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">
      {/* ── Sidebar ── */}
      <div className="flex flex-col gap-4 lg:w-72 shrink-0">
        <Card className="border-white/10 bg-zinc-900/95 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <Link
              to="/casino"
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au casino
            </Link>

            {/* Bet input */}
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-muted mb-1">
                Mise initiale
              </p>
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
                      "rounded-md px-3 py-1.5 text-xs border transition-colors min-h-[32px]",
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
                {isLoading ? "Démarrage..." : "Prendre le bus"}
              </Button>
            )}

            {isOver && (
              <Button onClick={reset} className="w-full">
                Nouvelle partie
              </Button>
            )}

            {/* In-game stats */}
            {isPlaying && (
              <>
                <div className="h-px bg-white/5" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Mise</span>
                    <span className="font-mono text-zinc-200">{formatTokens(betAmount)} T</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Multiplicateur</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentMultiplier}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-mono font-bold text-emerald-400"
                      >
                        ×{currentMultiplier.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Gain potentiel</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={potentialWin}
                        initial={{ y: -4, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="font-mono font-bold text-emerald-300"
                      >
                        {formatTokens(potentialWin)} T
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">Étape</span>
                  <StepDots current={currentStep} />
                  <span className="text-xs text-zinc-500">{currentStep}/4</span>
                </div>
              </>
            )}

            {/* Result stats */}
            {isOver && (
              <>
                <div className="h-px bg-white/5" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Mise initiale</span>
                    <span className="font-mono text-zinc-200">{formatTokens(betAmount)} T</span>
                  </div>
                  {phase === "won" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Gain</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{formatTokens(lastPayout)} T
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Main game area ── */}
      <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-w-0">
        <Card
          className={cn(
            "border-white/10 bg-zinc-900/95 p-4 sm:p-6 transition-colors duration-500",
            phase === "won" && "border-emerald-500/40",
            phase === "lost" && "border-red-500/40",
          )}
        >
          {/* Cards row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            {cards.map((card, i) => (
              <HiloCard
                key={`${i}-${card.value}-${card.suit}`}
                card={toHiloCard(card)}
                animateKey={`${i}-${card.value}-${card.suit}`}
                size={cardSize}
              />
            ))}

            {/* Hidden next card slot */}
            {isPlaying && cards.length < 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "rounded-xl border-2 border-dashed border-white/20 bg-zinc-800/40 flex items-center justify-center",
                  slotW,
                  slotH,
                )}
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-600" />
              </motion.div>
            )}

            {/* Idle placeholder */}
            {isIdle && (
              <div className="flex gap-2 sm:gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border border-white/10 bg-zinc-800/30 flex items-center justify-center",
                      slotW,
                      slotH,
                    )}
                    style={{ opacity: 1 - i * 0.2 }}
                  >
                    <span className={cn("text-zinc-700", isMobile ? "text-2xl" : "text-3xl")}>🚌</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step info and buttons */}
          <AnimatePresence mode="wait">
            {isPlaying && (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-muted mb-1">
                    Étape {currentStep} / 4
                  </p>
                  <p className="text-sm text-zinc-300">{STEP_LABELS[currentStep]}</p>
                </div>

                {/* Step 1 — Color */}
                {currentStep === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      disabled={isLoading}
                      onClick={() => answer(1, "red")}
                      className="w-full bg-red-700 hover:bg-red-600 gap-2 text-base"
                    >
                      ♥♦ Rouge
                      <span className="ml-auto text-xs opacity-80">×1.95</span>
                    </Button>
                    <Button
                      disabled={isLoading}
                      onClick={() => answer(1, "black")}
                      className="w-full bg-zinc-700 hover:bg-zinc-600 gap-2 text-base"
                    >
                      ♠♣ Noire
                      <span className="ml-auto text-xs opacity-80">×1.95</span>
                    </Button>
                  </div>
                )}

                {/* Step 2 — Higher or equal / Lower or equal */}
                {currentStep === 2 && step2Multipliers && (() => {
                  const refValue = cards[0]?.value ?? 0;
                  const isAce = refValue === 1;
                  const isKing = refValue === 13;
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center text-xs text-zinc-500 px-1">
                        <span>
                          {(step2Multipliers.higherOrEqualProb * 100).toFixed(1)}% de chance
                        </span>
                        <span>
                          {(step2Multipliers.lowerOrEqualProb * 100).toFixed(1)}% de chance
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          disabled={isLoading || isKing}
                          onClick={() => answer(2, "higher_or_equal")}
                          className="w-full bg-emerald-700 hover:bg-emerald-600 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isKing ? "Impossible — le Roi est la plus haute carte" : undefined}
                        >
                          <ArrowUp className="h-4 w-4" />
                          Sup. ou égal
                          <span className="ml-auto text-xs opacity-80">
                            ×{step2Multipliers.higherOrEqual.toFixed(2)}
                          </span>
                        </Button>
                        <Button
                          disabled={isLoading || isAce}
                          onClick={() => answer(2, "lower_or_equal")}
                          className="w-full bg-blue-700 hover:bg-blue-600 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isAce ? "Impossible — l'As est la plus basse carte" : undefined}
                        >
                          <ArrowDown className="h-4 w-4" />
                          Inf. ou égal
                          <span className="ml-auto text-xs opacity-80">
                            ×{step2Multipliers.lowerOrEqual.toFixed(2)}
                          </span>
                        </Button>
                      </div>
                      {cards[0] && (
                        <p className="text-center text-xs text-zinc-500">
                          Carte de référence :{" "}
                          <span className="font-mono text-zinc-300">
                            {cards[0].value === 1
                              ? "A"
                              : cards[0].value === 11
                                ? "J"
                                : cards[0].value === 12
                                  ? "Q"
                                  : cards[0].value === 13
                                    ? "K"
                                    : cards[0].value}
                          </span>
                          {" "}· égalité = victoire pour les deux
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Step 3 — Inside / Outside */}
                {currentStep === 3 && step3Multipliers && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-center text-xs text-zinc-500 px-1">
                      <span>
                        {(step3Multipliers.insideProb * 100).toFixed(1)}% de chance
                      </span>
                      <span>
                        {(step3Multipliers.outsideProb * 100).toFixed(1)}% de chance
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        disabled={isLoading}
                        onClick={() => answer(3, "inside")}
                        className="w-full bg-violet-700 hover:bg-violet-600 gap-2"
                      >
                        ⬥ Inside
                        <span className="ml-auto text-xs opacity-80">
                          ×{step3Multipliers.inside.toFixed(2)}
                        </span>
                      </Button>
                      <Button
                        disabled={isLoading}
                        onClick={() => answer(3, "outside")}
                        className="w-full bg-amber-700 hover:bg-amber-600 gap-2"
                      >
                        ⬦ Outside
                        <span className="ml-auto text-xs opacity-80">
                          ×{step3Multipliers.outside.toFixed(2)}
                        </span>
                      </Button>
                    </div>
                    {cards[0] && cards[1] && (
                      <p className="text-center text-xs text-zinc-500">
                        Intervalle :{" "}
                        <span className="font-mono text-zinc-300">
                          [{Math.min(cards[0].value, cards[1].value)} –{" "}
                          {Math.max(cards[0].value, cards[1].value)}]
                        </span>{" "}
                        · égal = inside
                      </p>
                    )}
                  </div>
                )}

                {/* Step 4 — Suit */}
                {currentStep === 4 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {SUITS.map((suit) => {
                        const isRed = suit === "hearts" || suit === "diamonds";
                        return (
                          <Button
                            key={suit}
                            disabled={isLoading}
                            onClick={() => answer(4, suit)}
                            className={cn(
                              "w-full gap-2 text-base",
                              isRed
                                ? "bg-red-800 hover:bg-red-700"
                                : "bg-zinc-700 hover:bg-zinc-600",
                            )}
                          >
                            <span className="text-lg">{SUIT_SYMBOLS[suit]}</span>
                            {SUIT_LABELS[suit]}
                            <span className="ml-auto text-xs opacity-80">×4</span>
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-center text-xs text-zinc-500">
                      1 chance sur 4 — multiplicateur fixe ×4
                    </p>
                  </div>
                )}

                {/* Potential win preview */}
                {currentStep > 1 && (
                  <div className="flex items-center gap-2 justify-center mt-2">
                    <Coins className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-500">
                      Si correct :{" "}
                      <span className="text-zinc-300 font-mono">
                        {currentStep === 4
                          ? formatTokens(Math.floor(betAmount * currentMultiplier * 4))
                          : formatTokens(potentialWin)}{" "}
                        T
                      </span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Win overlay */}
          <AnimatePresence>
            {phase === "won" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 sm:px-6 py-4 sm:py-5 text-center"
              >
                <p className="text-xl sm:text-2xl font-bold text-emerald-300 mb-1">Bravo !</p>
                <p className="text-sm text-zinc-400 mb-2 sm:mb-3">
                  Multiplicateur final ×{currentMultiplier.toFixed(2)}
                </p>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                  {formatTokens(lastPayout)} tokens
                </p>
              </motion.div>
            )}

            {phase === "lost" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 sm:px-6 py-4 sm:py-5 text-center"
              >
                <p className="text-xl sm:text-2xl font-bold text-red-400 mb-1">Perdu !</p>
                <p className="text-sm text-zinc-400">
                  Mauvaise réponse à l'étape {cards.length} — mise perdue.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle hint */}
          {isIdle && (
            <p className="text-center text-sm text-zinc-500">
              Définissez votre mise et montez dans le bus pour commencer.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
