import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { soundManager } from "../../lib/casino/soundManager";
import { cn, formatTokens } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import type {
  BlackjackActionResponse,
  BlackjackCard,
  BlackjackDealResponse,
  BlackjackGameState,
  BlackjackResult,
} from "../../types/blackjack";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RED_SUITS = new Set(["hearts", "diamonds"]);

function isRedSuit(suit: string) {
  return RED_SUITS.has(suit);
}

function PlayingCard({
  card,
  hidden = false,
  index = 0,
}: {
  card?: BlackjackCard;
  hidden?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      className={cn(
        "relative flex h-[120px] w-[80px] flex-shrink-0 select-none flex-col rounded-xl border shadow-lg",
        hidden
          ? "border-blue-400/30 bg-gradient-to-br from-blue-800 to-red-800"
          : "border-gray-200/20 bg-white",
      )}
      initial={{ opacity: 0, y: -40, rotateY: -90 }}
      style={{ transformStyle: "preserve-3d" }}
      transition={{ duration: 0.45, delay: index * 0.12, ease: "easeOut" }}
    >
      {hidden ? (
        <div className="flex h-full items-center justify-center">
          <div className="grid grid-cols-3 gap-0.5 opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-white/60" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "absolute left-1 top-1 flex flex-col items-center leading-none",
              isRedSuit(card?.suit ?? "") ? "text-red-600" : "text-gray-900",
            )}
          >
            <span className="text-sm font-bold">{card?.rank}</span>
            <span className="text-xs">{SUIT_SYMBOLS[card?.suit ?? ""]}</span>
          </div>
          <div
            className={cn(
              "flex flex-1 items-center justify-center text-3xl font-bold",
              isRedSuit(card?.suit ?? "") ? "text-red-600" : "text-gray-900",
            )}
          >
            {SUIT_SYMBOLS[card?.suit ?? ""]}
          </div>
          <div
            className={cn(
              "absolute bottom-1 right-1 flex rotate-180 flex-col items-center leading-none",
              isRedSuit(card?.suit ?? "") ? "text-red-600" : "text-gray-900",
            )}
          >
            <span className="text-sm font-bold">{card?.rank}</span>
            <span className="text-xs">{SUIT_SYMBOLS[card?.suit ?? ""]}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

function HandTotal({
  total,
  isBlackjack,
}: {
  total: number;
  isBlackjack?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-sm font-bold",
        isBlackjack
          ? "bg-yellow-500/20 text-yellow-400"
          : total > 21
            ? "bg-red-500/20 text-red-400"
            : total === 21
              ? "bg-green-500/20 text-green-400"
              : "bg-white/10 text-white",
      )}
    >
      {isBlackjack ? "BLACKJACK" : total > 21 ? `${total} BUST` : total}
    </span>
  );
}

function ResultOverlay({ result }: { result: BlackjackResult }) {
  const config: Record<BlackjackResult, { text: string; className: string }> = {
    win: { text: "VOUS GAGNEZ !", className: "text-green-400" },
    blackjack: { text: "BLACKJACK !", className: "text-yellow-400" },
    loss: { text: "PERDU", className: "text-red-400" },
    bust: { text: "BUST !", className: "text-red-500" },
    push: { text: "ÉGALITÉ", className: "text-gray-300" },
  };
  const { text, className } = config[result];

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.35 }}
    >
      <motion.p
        animate={result === "bust" || result === "loss" ? { x: [0, -6, 6, -6, 6, 0] } : { scale: [1, 1.08, 1] }}
        className={cn("font-display text-5xl font-black tracking-wide drop-shadow-xl", className)}
        transition={{ duration: 0.5 }}
      >
        {text}
      </motion.p>
    </motion.div>
  );
}

function calcHandTotal(hand: BlackjackCard[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      aces++;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }
  for (let i = 0; i < aces; i++) {
    total = total + 11 <= 21 ? total + 11 : total + 1;
  }
  return total;
}

export function BlackjackGame() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateBalance = useAuthStore((state) => state.updateBalance);

  const [gameState, setGameState] = useState<BlackjackGameState>("BETTING");
  const [bet, setBet] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<BlackjackCard[]>([]);
  const [dealerUpcard, setDealerUpcard] = useState<BlackjackCard | null>(null);
  const [dealerHandFinal, setDealerHandFinal] = useState<BlackjackCard[] | null>(null);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [dealerTotal, setDealerTotal] = useState(0);
  const [result, setResult] = useState<BlackjackResult | null>(null);
  const [payout, setPayout] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [loading, setLoading] = useState(false);

  const balance = user?.balance ?? 0;
  const isPlaying = gameState === "PLAYER_TURN";
  const canDouble = isPlaying && playerHand.length === 2 && balance >= currentBet;
  const isDisabled = loading || gameState === "DEALING" || gameState === "DEALER_TURN";

  const resolveGame = useCallback(
    (response: BlackjackDealResponse | BlackjackActionResponse) => {
      if (response.status === "resolved") {
        const finalPlayerHand = response.player_hand ?? playerHand;
        const finalDealerHand = response.dealer_hand_final ?? [];
        const finalResult = (response.result as BlackjackResult) ?? "loss";

        setPlayerHand(finalPlayerHand);
        setPlayerTotal(response.player_total ?? calcHandTotal(finalPlayerHand));
        setDealerHandFinal(finalDealerHand);
        setDealerTotal(response.dealer_total ?? calcHandTotal(finalDealerHand));
        setResult(finalResult);
        setPayout(response.payout ?? 0);

        if (response.new_balance !== undefined) {
          updateBalance(response.new_balance);
          void queryClient.invalidateQueries({ queryKey: ["gamification"] });
        }

        setGameState("GAME_OVER");

        if (finalResult === "blackjack" || finalResult === "win") {
          soundManager.play("win");
        } else {
          soundManager.play("lose");
        }
      }
    },
    [playerHand, queryClient, updateBalance],
  );

  const handleBet = useCallback(async () => {
    if (bet < 1) {
      toast.error("La mise minimum est de 1 token.");
      return;
    }
    if (bet > balance) {
      toast.error("Solde insuffisant.");
      return;
    }

    setLoading(true);
    setGameState("DEALING");
    setResult(null);
    setDealerHandFinal(null);
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackDealResponse>("/casino/blackjack/deal", { bet });
      const data = response.data;

      setGameId(data.game_id);
      setPlayerHand(data.player_hand);
      setPlayerTotal(data.player_total);
      setCurrentBet(bet);

      if (data.status === "resolved") {
        setDealerUpcard(data.dealer_upcard ?? data.dealer_hand_final?.[0] ?? null);
        resolveGame(data);
      } else {
        setDealerUpcard(data.dealer_upcard!);
        setDealerTotal(data.dealer_visible_total ?? 0);
        setGameState("PLAYER_TURN");
        soundManager.play("click");
      }
    } catch (error) {
      setGameState("BETTING");
      toast.error(error instanceof Error ? error.message : "Erreur lors de la distribution.");
    } finally {
      setLoading(false);
    }
  }, [bet, balance, resolveGame]);

  const handleHit = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/hit", {
        game_id: gameId,
      });
      const data = response.data;

      if (data.player_hand) {
        setPlayerHand(data.player_hand);
        setPlayerTotal(data.player_total ?? calcHandTotal(data.player_hand));
      }

      if (data.status === "resolved") {
        resolveGame(data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [gameId, resolveGame]);

  const handleStand = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setGameState("DEALER_TURN");
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/stand", {
        game_id: gameId,
      });
      resolveGame(response.data);
    } catch (error) {
      setGameState("PLAYER_TURN");
      toast.error(error instanceof Error ? error.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [gameId, resolveGame]);

  const handleDouble = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setGameState("DEALER_TURN");
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/double", {
        game_id: gameId,
      });
      setCurrentBet((prev) => prev * 2);
      resolveGame(response.data);
    } catch (error) {
      setGameState("PLAYER_TURN");
      toast.error(error instanceof Error ? error.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [gameId, resolveGame]);

  const handleNewGame = useCallback(() => {
    setGameState("BETTING");
    setGameId(null);
    setPlayerHand([]);
    setDealerUpcard(null);
    setDealerHandFinal(null);
    setResult(null);
    setPayout(0);
    setCurrentBet(0);
    setPlayerTotal(0);
    setDealerTotal(0);
  }, []);

  const playerIsBlackjack = playerTotal === 21 && playerHand.length === 2;
  const dealerDisplayHand = dealerHandFinal ?? (dealerUpcard ? [dealerUpcard] : []);
  const showHiddenCard = gameState !== "GAME_OVER" && gameState !== "DEALER_TURN";

  return (
    <div className="space-y-6">
      <Card accent="cyan" className="min-w-[300px]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Salon casino</p>
            <h1 className="mt-3 font-display text-4xl text-brand-text">Blackjack</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-muted">
              Blackjack paie 3:2 • Dealer tire sur 16 ou moins • Double down disponible
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <Coins className="h-5 w-5 text-brand-cyan" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Solde</p>
              <p className="text-sm font-semibold text-brand-text">
                {formatTokens(balance)} tokens
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Table de jeu */}
      <div
        className="relative overflow-hidden rounded-[32px] border-8 p-8"
        style={{
          background: "radial-gradient(ellipse at center, #1a5a3a 0%, #0d3f27 100%)",
          borderColor: "#8b4513",
          borderRadius: "200px / 100px",
          boxShadow: "inset 0 0 50px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Zone dealer */}
        <div className="mb-8 min-h-[160px]">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              DEALER
            </p>
            {dealerDisplayHand.length > 0 && (
              <HandTotal
                total={
                  gameState === "GAME_OVER"
                    ? dealerTotal
                    : dealerUpcard
                      ? calcHandTotal([dealerUpcard])
                      : 0
                }
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {dealerDisplayHand.map((card, i) => (
                <PlayingCard key={`dealer-${i}-${card.rank}-${card.suit}`} card={card} index={i} />
              ))}
              {showHiddenCard && dealerUpcard && (
                <PlayingCard key="dealer-hidden" hidden index={dealerDisplayHand.length} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Zone joueur */}
        <div className="min-h-[160px]">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              JOUEUR
            </p>
            {playerHand.length > 0 && (
              <HandTotal isBlackjack={playerIsBlackjack} total={playerTotal} />
            )}
            {gameState === "PLAYER_TURN" && (
              <span className="animate-pulse rounded-full bg-brand-cyan/20 px-2 py-0.5 text-xs text-brand-cyan">
                Votre tour
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {playerHand.map((card, i) => (
                <PlayingCard key={`player-${i}-${card.rank}-${card.suit}`} card={card} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Mise en jeu */}
        {currentBet > 0 && gameState !== "BETTING" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400 bg-yellow-900/80 text-xs font-bold text-yellow-300 shadow-lg">
              {formatTokens(currentBet)}
            </div>
          </div>
        )}

        {/* Overlay résultat */}
        <AnimatePresence>
          {gameState === "GAME_OVER" && result && <ResultOverlay result={result} />}
        </AnimatePresence>
      </div>

      {/* Panneau de contrôle */}
      <Card className="min-w-[300px]">
        {gameState === "GAME_OVER" && result && payout > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3"
            initial={{ opacity: 0, y: -10 }}
          >
            <span className="text-sm font-bold text-green-400">
              +{formatTokens(payout)} tokens
            </span>
          </motion.div>
        )}

        {/* Contrôles de mise */}
        {(gameState === "BETTING" || gameState === "GAME_OVER") && (
          <div className="mb-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-muted">Votre mise</p>
            <div className="flex items-center gap-3">
              <button
                aria-label="Diviser la mise par 2"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-white/5 text-sm font-bold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/10 disabled:opacity-40"
                disabled={isDisabled}
                onClick={() => setBet((prev) => Math.max(1, Math.floor(prev / 2)))}
                type="button"
              >
                ÷2
              </button>
              <input
                aria-label="Montant de la mise"
                className="h-10 w-full rounded-2xl border border-brand-line bg-white/5 px-4 text-center text-sm font-semibold text-brand-text focus:border-brand-cyan/40 focus:outline-none"
                disabled={isDisabled}
                max={balance}
                min={1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setBet(Math.min(Math.max(1, v), balance));
                }}
                type="number"
                value={bet}
              />
              <button
                aria-label="Doubler la mise"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-white/5 text-sm font-bold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/10 disabled:opacity-40"
                disabled={isDisabled}
                onClick={() => setBet((prev) => Math.min(prev * 2, balance))}
                type="button"
              >
                ×2
              </button>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-wrap gap-3">
          {/* Phase de mise */}
          {(gameState === "BETTING" || gameState === "GAME_OVER") && (
            <Button
              aria-label="Parier et démarrer la partie"
              className="flex-1 bg-green-600 text-white hover:bg-green-500"
              disabled={isDisabled || bet < 1 || bet > balance}
              onClick={() => {
                if (gameState === "GAME_OVER") {
                  handleNewGame();
                } else {
                  void handleBet();
                }
              }}
            >
              {gameState === "GAME_OVER" ? "NOUVELLE PARTIE" : "PARIER"}
            </Button>
          )}

          {/* Phase de jeu */}
          {gameState === "PLAYER_TURN" && (
            <>
              <Button
                aria-label="Tirer une carte"
                className="flex-1 bg-blue-600 text-white hover:bg-blue-500"
                disabled={isDisabled}
                onClick={() => void handleHit()}
              >
                TIRER
              </Button>
              <Button
                aria-label="Rester avec la main actuelle"
                className="flex-1 bg-orange-500 text-white hover:bg-orange-400"
                disabled={isDisabled}
                onClick={() => void handleStand()}
              >
                RESTER
              </Button>
              <Button
                aria-label="Double down — doubler la mise et tirer une carte"
                className="flex-1 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40"
                disabled={isDisabled || !canDouble}
                onClick={() => void handleDouble()}
              >
                DOUBLER
              </Button>
            </>
          )}

          {/* Phase dealer / dealing */}
          {(gameState === "DEALING" || gameState === "DEALER_TURN") && (
            <div className="flex flex-1 items-center justify-center py-2">
              <span className="animate-pulse text-sm text-brand-muted">
                {gameState === "DEALING" ? "Distribution en cours..." : "Le dealer joue..."}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
