import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Coins, Shield, Sparkles, Waves } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { getErrorMessage, notify } from "../../lib/notifications";
import { soundManager } from "../../lib/casino/soundManager";
import { sounds } from "../../lib/sounds";
import { cn, formatTokens } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import type {
  BlackjackActionResponse,
  BlackjackCard,
  BlackjackCurrentGameResponse,
  BlackjackDealResponse,
  BlackjackGameState,
  BlackjackResult,
  SplitHandDisplay,
  SplitHandResult,
} from "../../types/blackjack";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { WinPopup, useWinPopup } from "../ui/WinPopup";

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RED_SUITS = new Set(["hearts", "diamonds"]);
const QUICK_BETS = [10, 25, 50, 100];
const PIP_ROWS: Record<string, number[]> = {
  "2": [1, 1],
  "3": [1, 1, 1],
  "4": [2, 2],
  "5": [2, 1, 2],
  "6": [2, 2, 2],
  "7": [2, 1, 2, 2],
  "8": [2, 2, 2, 2],
  "9": [2, 2, 1, 2, 2],
  "10": [2, 2, 2, 2, 2],
};

const GAME_STATE_COPY: Record<
  BlackjackGameState,
  { label: string; detail: string; tone: string }
> = {
  BETTING: {
    label: "Mise ouverte",
    detail: "Choisissez votre mise puis lancez la distribution.",
    tone: "text-[var(--brand-emerald-hover)]",
  },
  DEALING: {
    label: "Distribution",
    detail: "Les cartes arrivent sur le tapis.",
    tone: "text-[var(--brand-amber-hover)]",
  },
  PLAYER_TURN: {
    label: "Votre decision",
    detail: "Tirez, restez ou doublez selon votre lecture.",
    tone: "text-[var(--brand-emerald-hover)]",
  },
  DEALER_TURN: {
    label: "Tour du dealer",
    detail: "Le croupier complete sa main avant la resolution.",
    tone: "text-[var(--brand-amber-hover)]",
  },
  GAME_OVER: {
    label: "Manche terminee",
    detail: "Analysez le resultat puis relancez une partie.",
    tone: "text-[var(--fg-primary)]",
  },
};

function isRedSuit(suit: string) {
  return RED_SUITS.has(suit);
}

function getBlackjackRankValue(rank: string): number {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function CardCenter({ card }: { card?: BlackjackCard }) {
  if (!card) {
    return null;
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const tone = isRedSuit(card.suit) ? "text-red-600" : "text-gray-900";

  if (card.rank === "A") {
    return (
      <div className={cn("flex flex-1 items-center justify-center text-4xl font-bold", tone)}>
        {suitSymbol}
      </div>
    );
  }

  if (["J", "Q", "K"].includes(card.rank)) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2">
        <span className={cn("text-4xl font-black tracking-tight", tone)}>{card.rank}</span>
        <span className={cn("text-2xl", tone)}>{suitSymbol}</span>
      </div>
    );
  }

  const rows = PIP_ROWS[card.rank];
  if (!rows) {
    return (
      <div className={cn("flex flex-1 items-center justify-center text-3xl font-bold", tone)}>
        {suitSymbol}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col justify-center px-3 py-4">
      <div className="flex flex-1 flex-col justify-between">
        {rows.map((count, rowIndex) => (
          <div
            key={`${card.rank}-${rowIndex}`}
            className={cn(
              "flex items-center",
              count === 1 ? "justify-center" : "justify-between",
              tone,
            )}
          >
            {Array.from({ length: count }).map((_, pipIndex) => (
              <span key={`${card.rank}-${rowIndex}-${pipIndex}`} className="text-lg leading-none">
                {suitSymbol}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { y: -120, opacity: 0, scale: 0.6, rotateY: 90 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

function PlayingCard({
  card,
  hidden = false,
}: {
  card?: BlackjackCard;
  hidden?: boolean;
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative flex h-[90px] w-[60px] flex-shrink-0 select-none flex-col rounded-xl border shadow-lg sm:h-[120px] sm:w-[80px]",
        hidden
          ? "border-[var(--brand-emerald-line)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]"
          : "border-[var(--ink-700)] bg-white",
      )}
      style={{ transformStyle: "preserve-3d" }}
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
          <CardCenter card={card} />
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
  label,
  total,
  isBlackjack,
  helper,
}: {
  label: string;
  total: number;
  isBlackjack?: boolean;
  helper?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2 text-right">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-black",
          isBlackjack
            ? "text-[var(--jackpot)]"
            : total > 21
              ? "text-[var(--loss)]"
              : total === 21
                ? "text-[var(--win)]"
                : "text-[var(--fg-primary)]",
        )}
      >
        {isBlackjack ? "BLACKJACK" : total > 21 ? `${total} BUST` : total}
      </p>
      {helper ? <p className="mt-1 text-xs text-[var(--fg-muted)]">{helper}</p> : null}
    </div>
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
      total += parseInt(card.rank, 10);
    }
  }
  for (let i = 0; i < aces; i++) {
    total = total + 11 <= 21 ? total + 11 : total + 1;
  }
  return total;
}


function SplitHandsArea({
  splitHands,
  currentSplitHand,
  gameState,
  isDisabled,
  canDouble,
  onHit,
  onStand,
  onDouble,
}: {
  splitHands: SplitHandDisplay[];
  currentSplitHand: 0 | 1;
  gameState: BlackjackGameState;
  isDisabled: boolean;
  canDouble: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {splitHands.map((hand, i) => {
          const isActive = i === currentSplitHand && gameState === "PLAYER_TURN";
          return (
            <div
              key={i}
              className={cn(
                "rounded-[var(--radius-lg)] border border-[var(--ink-700)] bg-[var(--surface-2)] p-3 transition-all duration-300",
                isActive ? "ring-2 ring-[var(--brand-emerald)]" : hand.done ? "opacity-60" : "",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--fg-muted)]">
                    Main {i + 1}
                    {isActive ? (
                      <span className="animate-pulse text-[var(--brand-emerald)]">▶</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 border-[var(--brand-amber)] bg-[var(--brand-amber-soft)] px-2 text-xs font-bold text-[var(--brand-amber-hover)]">
                    {formatTokens(hand.bet)}
                  </div>
                  <HandTotal label="Total" total={hand.total} />
                </div>
              </div>
              <div className="flex min-h-[70px] flex-wrap gap-2 sm:min-h-[100px]">
                <AnimatePresence mode="popLayout">
                  {hand.hand.map((card, ci) => (
                    <PlayingCard
                      key={`split-${i}-${ci}-${card.rank}-${card.suit}`}
                      card={card}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {gameState === "PLAYER_TURN" ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <p className="w-full text-center text-xs text-[var(--fg-muted)]">
            Jouez la Main {currentSplitHand + 1}
          </p>
          <Button
            aria-label="Tirer une carte"
            disabled={isDisabled}
            onClick={onHit}
          >
            Tirer
          </Button>
          <Button
            aria-label="Rester avec la main actuelle"
            variant="secondary"
            disabled={isDisabled}
            onClick={onStand}
          >
            Rester
          </Button>
          <Button
            aria-label="Doubler la mise et tirer une carte"
            variant="secondary"
            disabled={isDisabled || !canDouble}
            onClick={onDouble}
          >
            Doubler
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function BlackjackGame() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateBalance = useAuthStore((state) => state.updateBalance);

  const [gameState, setGameState] = useState<BlackjackGameState>("BETTING");
  const [bet, setBet] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<BlackjackCard[]>([]);
  const [dealerUpcard, setDealerUpcard] = useState<BlackjackCard | null>(null);
  const [dealerHandFinal, setDealerHandFinal] = useState<BlackjackCard[] | null>(null);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [dealerTotal, setDealerTotal] = useState(0);
  const [result, setResult] = useState<BlackjackResult | null>(null);
  const [payout, setPayout] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insurancePayout, setInsurancePayout] = useState(0);
  const [insuranceAvailable, setInsuranceAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { popupProps, showWin } = useWinPopup();
  // Split state
  const [splitHands, setSplitHands] = useState<SplitHandDisplay[] | null>(null);
  const [currentSplitHand, setCurrentSplitHand] = useState<0 | 1>(0);
  const [splitResults, setSplitResults] = useState<SplitHandResult[] | null>(null);
  // Progressive deal animation state
  const [isDealing, setIsDealing] = useState(false);
  const [visiblePlayerCards, setVisiblePlayerCards] = useState<BlackjackCard[]>([]);
  const [visibleDealerCards, setVisibleDealerCards] = useState<BlackjackCard[]>([]);
  const [dealerHiddenDealt, setDealerHiddenDealt] = useState(false);
  const [hasPlayedBefore, setHasPlayedBefore] = useState(false);

  const balance = user?.balance ?? 0;
  const isPlaying = gameState === "PLAYER_TURN";
  const isSplitActive = splitHands !== null;
  const insuranceCost = currentBet > 0 ? Math.max(1, Math.floor(currentBet / 2)) : 0;

  const splitActiveHand = isSplitActive ? (splitHands[currentSplitHand] ?? null) : null;
  const canDouble = isPlaying && (
    isSplitActive
      ? splitActiveHand?.hand.length === 2 && balance >= (splitActiveHand?.bet ?? 0)
      : playerHand.length === 2 && balance >= currentBet
  );
  const canInsure = isPlaying && !isSplitActive && insuranceAvailable && insuranceCost > 0 && balance >= insuranceCost;
  const canSplit =
    isPlaying &&
    !isSplitActive &&
    playerHand.length === 2 &&
    playerHand[0] !== undefined &&
    playerHand[1] !== undefined &&
    getBlackjackRankValue(playerHand[0].rank) === getBlackjackRankValue(playerHand[1].rank) &&
    balance >= currentBet;
  const isDisabled = loading || gameState === "DEALING" || gameState === "DEALER_TURN";
  const canAdjustBet = !loading && (gameState === "BETTING" || gameState === "GAME_OVER");

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
        setInsuranceBet(response.insurance_bet ?? 0);
        setInsurancePayout(response.insurance_payout ?? 0);
        setInsuranceAvailable(false);

        if (response.new_balance !== undefined) {
          updateBalance(response.new_balance);
          void queryClient.invalidateQueries({ queryKey: ["gamification"] });
          void queryClient.invalidateQueries({ queryKey: ["jackpot"] });
        }

        setGameState("GAME_OVER");

        const resPayout = response.payout ?? 0;
        if (finalResult === "blackjack" || finalResult === "win") {
          soundManager.play("win");
          const multiplier = currentBet > 0 ? resPayout / currentBet : 1;
          showWin({ multiplier, netGain: resPayout - currentBet });
        } else {
          soundManager.play("lose");
        }
      }
    },
    [playerHand, queryClient, updateBalance, currentBet, showWin],
  );

  const handleSplitResponse = useCallback(
    (data: BlackjackActionResponse) => {
      if (data.status === "split_playing") {
        setSplitHands(data.split_hands ?? null);
        setCurrentSplitHand((data.current_split_hand as 0 | 1) ?? 0);
        if (data.new_balance !== undefined) {
          updateBalance(data.new_balance);
          void queryClient.invalidateQueries({ queryKey: ["gamification"] });
          void queryClient.invalidateQueries({ queryKey: ["jackpot"] });
        }
      } else if (data.status === "resolved" && data.split_results) {
        setSplitResults(data.split_results);
        setSplitHands(null);
        setDealerHandFinal(data.dealer_hand_final ?? []);
        setDealerTotal(data.dealer_total ?? 0);
        setPayout(data.payout ?? 0);
        if (data.new_balance !== undefined) {
          updateBalance(data.new_balance);
          void queryClient.invalidateQueries({ queryKey: ["gamification"] });
          void queryClient.invalidateQueries({ queryKey: ["jackpot"] });
        }
        setGameState("GAME_OVER");
        const hasWin = data.split_results.some((r) => r.result === "win");
        soundManager.play(hasWin ? "win" : "lose");
        const totalPayout = data.payout ?? 0;
        const totalBet = data.split_results.reduce((s, r) => s + r.bet, 0);
        const netGain = totalPayout - totalBet;
        if (netGain > 0) {
          showWin({ multiplier: totalBet > 0 ? totalPayout / totalBet : 1, netGain });
        }
      }
    },
    [updateBalance, queryClient, showWin],
  );

  const dealCardsProgressively = useCallback(
    (playerCards: BlackjackCard[], upcard: BlackjackCard) => {
      const DEAL_INTERVAL_MS = 350;
      const queue: Array<"player" | "dealer" | "dealer-hidden"> = [
        "player",
        "dealer",
        "player",
        "dealer-hidden",
      ];

      setIsDealing(true);
      setVisiblePlayerCards([]);
      setVisibleDealerCards([]);
      setDealerHiddenDealt(false);

      let playerIdx = 0;

      queue.forEach((target, index) => {
        setTimeout(() => {
          if (target === "player") {
            const card = playerCards[playerIdx++];
            if (card) {
              setVisiblePlayerCards((prev) => [...prev, card]);
              if (index === 0) {
                // Step 1: player card 1 arrives
                sounds.cardDistributed.play();
              } else {
                // Step 3: player card 2 arrives + dealer card 1 reveals simultaneously
                sounds.cardReveal.play();
                sounds.cardDistributed.play();
              }
            }
          } else if (target === "dealer") {
            // Step 2: dealer card 1 arrives + player card 1 reveals simultaneously
            setVisibleDealerCards([upcard]);
            sounds.cardReveal.play();
            sounds.cardDistributed.play();
          } else {
            // Step 4: player card 2 reveals, dealer hidden card arrives (no sound for hidden)
            setDealerHiddenDealt(true);
            sounds.cardReveal.play();
          }
          if (index === queue.length - 1) {
            setIsDealing(false);
          }
        }, index * DEAL_INTERVAL_MS);
      });
    },
    [],
  );

  // Dealer-turn sounds: fires when the full dealer hand is revealed at game resolution
  useEffect(() => {
    if (!dealerHandFinal || dealerHandFinal.length === 0) return;
    // Index 1 = the hidden card that was face-down — now revealed
    if (dealerHandFinal.length >= 2) {
      sounds.cardReveal.play();
    }
    // Index 2+ = extra cards the dealer drew during their turn
    for (let i = 2; i < dealerHandFinal.length; i++) {
      sounds.cardDistributed.play();
      sounds.cardReveal.play();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerHandFinal]);

  const handleBet = useCallback(async () => {
    if (!bet || bet < 1) {
      notify.error("La mise minimum est de 1 token.");
      return;
    }
    if (bet > balance) {
      notify.error(`Solde insuffisant : vous avez ${balance} token${balance <= 1 ? "" : "s"} mais vous misez ${bet}.`);
      return;
    }

    setLoading(true);
    setGameState("DEALING");
    setHasPlayedBefore(true);
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
      setInsuranceBet(data.insurance_bet ?? 0);
      setInsurancePayout(data.insurance_payout ?? 0);

      if (data.status === "resolved") {
        const upcard = data.dealer_upcard ?? data.dealer_hand_final?.[0] ?? null;
        setDealerUpcard(upcard);
        resolveGame(data);
      } else {
        const upcard = data.dealer_upcard ?? null;
        setDealerUpcard(upcard);
        setDealerTotal(data.dealer_visible_total ?? 0);
        setInsuranceAvailable(data.insurance_available ?? false);
        setGameState("PLAYER_TURN");
        soundManager.play("click");
        if (upcard) {
          dealCardsProgressively(data.player_hand, upcard);
        }
      }
    } catch (error) {
      setGameState("BETTING");
      notify.error(getErrorMessage(error, "Impossible de distribuer les cartes. Réessayez."));
    } finally {
      setLoading(false);
    }
  }, [bet, balance, resolveGame]);

  const handleHit = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/hit", {
        game_id: gameId,
      });
      const data = response.data;

      if (data.status === "split_playing" || (data.status === "resolved" && data.split_results)) {
        handleSplitResponse(data);
        return;
      }

      if (data.player_hand) {
        setPlayerHand(data.player_hand);
        setPlayerTotal(data.player_total ?? calcHandTotal(data.player_hand));
      }
      setInsuranceBet(data.insurance_bet ?? insuranceBet);
      setInsurancePayout(data.insurance_payout ?? 0);
      setInsuranceAvailable(data.insurance_available ?? false);

      if (data.status === "resolved") {
        resolveGame(data);
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Impossible de tirer une carte. Réessayez."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, resolveGame, handleSplitResponse]);

  const handleStand = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    if (!isSplitActive) {
      setGameState("DEALER_TURN");
    }
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/stand", {
        game_id: gameId,
      });
      const data = response.data;

      if (data.status === "split_playing" || (data.status === "resolved" && data.split_results)) {
        handleSplitResponse(data);
        return;
      }

      setInsuranceBet(data.insurance_bet ?? insuranceBet);
      setInsurancePayout(data.insurance_payout ?? 0);
      setInsuranceAvailable(data.insurance_available ?? false);
      resolveGame(data);
    } catch (error) {
      if (!isSplitActive) setGameState("PLAYER_TURN");
      notify.error(getErrorMessage(error, "Impossible de rester. Réessayez."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, resolveGame, handleSplitResponse, isSplitActive]);

  const handleDouble = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    if (!isSplitActive) {
      setGameState("DEALER_TURN");
    }
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/double", {
        game_id: gameId,
      });
      const data = response.data;

      if (data.status === "split_playing" || (data.status === "resolved" && data.split_results)) {
        handleSplitResponse(data);
        return;
      }

      if ((data.player_hand?.length ?? playerHand.length) > playerHand.length) {
        setCurrentBet((prev) => prev * 2);
      }
      setInsuranceBet(data.insurance_bet ?? insuranceBet);
      setInsurancePayout(data.insurance_payout ?? 0);
      setInsuranceAvailable(data.insurance_available ?? false);
      resolveGame(data);
    } catch (error) {
      if (!isSplitActive) setGameState("PLAYER_TURN");
      notify.error(getErrorMessage(error, "Impossible de doubler. Vérifiez votre solde."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, playerHand.length, resolveGame, handleSplitResponse, isSplitActive]);

  const handleInsurance = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/insurance", {
        game_id: gameId,
      });
      const data = response.data;

      setInsuranceBet(data.insurance_bet ?? insuranceCost);
      setInsurancePayout(data.insurance_payout ?? 0);
      setInsuranceAvailable(data.insurance_available ?? false);

      if (data.new_balance !== undefined) {
        updateBalance(data.new_balance);
        void queryClient.invalidateQueries({ queryKey: ["gamification"] });
        void queryClient.invalidateQueries({ queryKey: ["jackpot"] });
      }

      if (data.status === "resolved") {
        resolveGame(data);
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Impossible de prendre l'assurance."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceCost, queryClient, resolveGame, updateBalance]);

  const handleDeclineInsurance = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/decline-insurance", {
        game_id: gameId,
      });
      const data = response.data;

      setInsuranceAvailable(false);

      if (data.status === "resolved") {
        resolveGame(data);
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Erreur lors du refus d'assurance."));
    } finally {
      setLoading(false);
    }
  }, [gameId, resolveGame]);

  const handleSplit = useCallback(async () => {
    if (!gameId) return;

    setLoading(true);
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/split", {
        game_id: gameId,
      });
      const data = response.data;

      if (data.status === "split_playing" || (data.status === "resolved" && data.split_results)) {
        handleSplitResponse(data);
      } else if (data.status === "resolved") {
        resolveGame(data);
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Impossible de splitter."));
    } finally {
      setLoading(false);
    }
  }, [gameId, handleSplitResponse, resolveGame]);

  const handleNewGame = useCallback(() => {
    setGameState("BETTING");
    setGameId(null);
    setPlayerHand([]);
    setDealerUpcard(null);
    setDealerHandFinal(null);
    setResult(null);
    setPayout(0);
    setCurrentBet(0);
    setInsuranceBet(0);
    setInsurancePayout(0);
    setInsuranceAvailable(false);
    setPlayerTotal(0);
    setDealerTotal(0);
    setSplitHands(null);
    setCurrentSplitHand(0);
    setSplitResults(null);
    setIsDealing(false);
    setVisiblePlayerCards([]);
    setVisibleDealerCards([]);
    setDealerHiddenDealt(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<BlackjackCurrentGameResponse | null>("/casino/blackjack/current")
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        if (data) {
          setGameId(data.game_id);
          setPlayerHand(data.player_hand);
          setPlayerTotal(data.player_total);
          setDealerUpcard(data.dealer_upcard);
          setDealerTotal(data.dealer_visible_total);
          setCurrentBet(data.bet);
          setBet(data.initial_bet);
          setInsuranceBet(data.insurance_bet);
          setInsuranceAvailable(data.insurance_available);
          setGameState("PLAYER_TURN");
          if (data.split_hands) {
            setSplitHands(data.split_hands);
            setCurrentSplitHand((data.current_split_hand as 0 | 1) ?? 0);
          }
        }
      })
      .catch(() => {
        // réseau injoignable ou erreur serveur : on affiche simplement l'écran de mise
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const playerIsBlackjack = playerTotal === 21 && playerHand.length === 2;
  const dealerDisplayHand = dealerHandFinal ?? (dealerUpcard ? [dealerUpcard] : []);
  const showHiddenCard = gameState !== "GAME_OVER" && gameState !== "DEALER_TURN";
  const stateCopy = GAME_STATE_COPY[gameState];
  const resultText =
    splitResults
      ? `Main 1: ${splitResults[0]?.result ?? ""} / Main 2: ${splitResults[1]?.result ?? ""}`
      : result === "blackjack"
        ? "Blackjack naturel"
        : result === "win"
          ? "Victoire"
          : result === "push"
            ? "Egalite"
            : result === "bust"
              ? "Bust"
              : result === "loss"
                ? "Defaite"
                : "En attente";
  const playerHandBorderClass = (() => {
    if (gameState !== "GAME_OVER") return "border-[var(--ink-700)]";
    if (splitResults) {
      const splitTotalBet = splitResults.reduce((s, r) => s + r.bet, 0);
      const splitNet = payout - splitTotalBet;
      return splitNet > 0 ? "border-[var(--brand-emerald)]" : splitNet === 0 ? "border-[var(--brand-amber)]" : "border-[var(--brand-red)]";
    }
    if (result === "win" || result === "blackjack") return "border-[var(--brand-emerald)]";
    if (result === "push") return "border-[var(--brand-amber)]";
    return "border-[var(--brand-red)]";
  })();

  if (isCheckingSession) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[var(--fg-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link to="/casino">
        <Button className="gap-2" size="sm" variant="secondary">
          <ArrowLeft className="h-4 w-4" />
          Retour au casino
        </Button>
      </Link>
      <Card accent="cyan" className="min-w-0 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-emerald)]">Salon casino</p>
            <h1 className="mt-1 font-display text-2xl text-[var(--fg-primary)]">Blackjack</h1>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2">
              <Coins className="h-4 w-4 text-[var(--brand-emerald)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Solde</p>
                <p className="text-sm font-semibold text-[var(--fg-primary)]">
                  {formatTokens(balance)} tokens
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2">
              <Sparkles className="h-4 w-4 text-[var(--brand-amber-hover)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Etat</p>
                <p className={cn("text-sm font-semibold", stateCopy.tone)}>{stateCopy.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2">
              <Shield className="h-4 w-4 text-[var(--brand-emerald-hover)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--fg-muted)]">Resultat</p>
                <p className="text-sm font-semibold text-[var(--fg-primary)]">{resultText}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] min-h-0">
        <div className="relative overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--ink-700)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-panel)] sm:p-5 xl:flex xl:flex-col">
          <div className="grid gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--ink-700)] bg-[var(--surface-2)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--fg-muted)]">
                    Dealer
                  </p>
                  <p className="mt-2 text-sm text-[var(--fg-secondary)]">Main visible et resolution finale.</p>
                </div>
                {dealerDisplayHand.length > 0 ? (
                  <HandTotal
                    helper={gameState === "GAME_OVER" ? "Total final" : "Carte visible"}
                    label="Total dealer"
                    total={
                      gameState === "GAME_OVER"
                        ? dealerTotal
                        : dealerUpcard
                          ? calcHandTotal([dealerUpcard])
                          : 0
                    }
                  />
                ) : null}
              </div>
              <div className="flex min-h-[70px] flex-wrap gap-2 sm:min-h-[100px] sm:gap-3">
                <AnimatePresence mode="popLayout">
                  {(isDealing ? visibleDealerCards : dealerDisplayHand).map((card, index) => (
                    <PlayingCard
                      key={`dealer-${index}-${card.rank}-${card.suit}`}
                      card={card}
                    />
                  ))}
                  {(isDealing ? dealerHiddenDealt : showHiddenCard) && dealerUpcard ? (
                    <PlayingCard key="dealer-hidden" hidden />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {isSplitActive ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--ink-700)] bg-[var(--surface-2)] p-3">
                <SplitHandsArea
                  canDouble={canDouble}
                  currentSplitHand={currentSplitHand}
                  gameState={gameState}
                  isDisabled={isDisabled}
                  onDouble={() => void handleDouble()}
                  onHit={() => void handleHit()}
                  onStand={() => void handleStand()}
                  splitHands={splitHands}
                />
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-2)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--fg-muted)]">
                      Joueur
                    </p>
                    <p className="mt-2 text-sm text-[var(--fg-secondary)]">{stateCopy.detail}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentBet > 0 && gameState !== "BETTING" ? (
                      <div className="flex min-h-10 min-w-10 items-center justify-center rounded-full border-2 border-[var(--brand-amber)] bg-[var(--brand-amber-soft)] px-2 text-xs font-bold text-[var(--brand-amber-hover)] shadow-lg">
                        {formatTokens(currentBet)}
                      </div>
                    ) : null}
                    {playerHand.length > 0 ? (
                      <HandTotal
                        helper={playerHand.length > 0 ? `${playerHand.length} carte(s)` : undefined}
                        isBlackjack={playerIsBlackjack}
                        label="Total joueur"
                        total={playerTotal}
                      />
                    ) : null}
                    {gameState === "PLAYER_TURN" ? (
                      <span className="animate-pulse rounded-full bg-[var(--brand-emerald-soft)] px-3 py-1 text-xs text-[var(--brand-emerald-hover)]">
                        Votre tour
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={cn("flex min-h-[70px] flex-wrap gap-2 rounded-xl border p-2 transition-colors duration-500 sm:min-h-[100px] sm:gap-3", playerHandBorderClass)}>
                  <AnimatePresence mode="popLayout">
                    {(isDealing ? visiblePlayerCards : playerHand).map((card, index) => (
                      <PlayingCard
                        key={`player-${index}-${card.rank}-${card.suit}`}
                        card={card}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {gameState === "PLAYER_TURN" ? (
                  <div
                    className="mt-3 flex flex-wrap justify-center gap-1.5 pb-1 sm:mt-4 sm:gap-2 transition-opacity duration-200"
                    style={{
                      opacity: isDealing ? 0.4 : 1,
                      pointerEvents: isDealing ? "none" : "auto",
                    }}
                  >
                    {canInsure && dealerUpcard?.rank === "A" ? (
                      <>
                        <p className="w-full text-center text-xs text-[var(--brand-amber-hover)]">
                          Le dealer montre un As — souhaitez-vous prendre l'assurance ?
                        </p>
                        <Button
                          aria-label="Prendre l'assurance"
                          disabled={isDisabled}
                          onClick={() => void handleInsurance()}
                        >
                          Assurance ({insuranceCost})
                        </Button>
                        <Button
                          aria-label="Refuser l'assurance"
                          variant="secondary"
                          disabled={isDisabled}
                          onClick={() => void handleDeclineInsurance()}
                        >
                          Refuser
                        </Button>
                      </>
                    ) : (
                      <>
                        {canSplit ? (
                          <Button
                            aria-label="Splitter la main en deux"
                            disabled={isDisabled}
                            onClick={() => void handleSplit()}
                          >
                            Split
                          </Button>
                        ) : null}
                        <Button
                          aria-label="Tirer une carte"
                          disabled={isDisabled}
                          onClick={() => void handleHit()}
                        >
                          Tirer
                        </Button>
                        <Button
                          aria-label="Rester avec la main actuelle"
                          variant="secondary"
                          disabled={isDisabled}
                          onClick={() => void handleStand()}
                        >
                          Rester
                        </Button>
                        <Button
                          aria-label="Doubler la mise et tirer une carte"
                          variant="secondary"
                          disabled={isDisabled || !canDouble}
                          onClick={() => void handleDouble()}
                        >
                          Doubler
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <WinPopup {...popupProps} />
        </div>

        <div className="flex flex-col gap-3">
          <Card className="min-w-0 p-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--fg-muted)]">Mise courante</p>
                <p className="mt-1 font-display text-xl text-[var(--fg-primary)]">
                  {formatTokens(
                    gameState === "BETTING" || gameState === "GAME_OVER" ? bet : currentBet || bet,
                  )}
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--fg-muted)]">Payout</p>
                <p className="mt-1 font-display text-xl text-[var(--fg-primary)]">
                  {payout > 0 ? `+${formatTokens(payout)}` : "0"}
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-3 py-2 sm:col-span-2 xl:col-span-1">
                <div className="flex items-start gap-2">
                  <Waves className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-emerald)]" />
                  <p className="text-xs leading-5 text-[var(--fg-muted)]">
                    Dealer tire sur 16 ou moins • Assurance = 50% de la mise sur As visible • Split disponible sur deux cartes de même valeur
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="min-w-0 p-4">
            {(gameState === "BETTING" || gameState === "GAME_OVER") ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--fg-muted)]">Votre mise</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      aria-label="Diviser la mise par 2"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ink-700)] bg-[var(--surface-2)] text-sm font-bold text-[var(--fg-primary)] transition-all hover:border-[var(--brand-emerald-line)] hover:bg-[var(--surface-1)] disabled:opacity-40"
                      disabled={!canAdjustBet || !bet || bet <= 1}
                      onClick={() => { if (bet && bet > 1) setBet(Math.max(1, Math.floor(bet / 2))); }}
                      type="button"
                    >
                      ÷2
                    </button>
                    <input
                      aria-label="Montant de la mise"
                      className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--ink-700)] bg-[var(--surface-2)] px-4 text-center text-base font-semibold text-[var(--fg-primary)] focus:border-[var(--brand-emerald-line)] focus:outline-none"
                      disabled={!canAdjustBet}
                      max={balance}
                      min={1}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/^0+(?=\d)/, "");
                        if (raw === "") { setBet(null); return; }
                        const value = parseInt(raw, 10);
                        if (!Number.isNaN(value)) {
                          setBet(Math.min(Math.max(1, value), balance));
                        }
                      }}
                      type="number"
                      value={bet ?? ""}
                    />
                    <button
                      aria-label="Doubler la mise"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ink-700)] bg-[var(--surface-2)] text-sm font-bold text-[var(--fg-primary)] transition-all hover:border-[var(--brand-emerald-line)] hover:bg-[var(--surface-1)] disabled:opacity-40"
                      disabled={!canAdjustBet}
                      onClick={() => setBet(bet ? Math.min(bet * 2, balance) : 1)}
                      type="button"
                    >
                      ×2
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_BETS.map((amount) => (
                    <button
                      key={amount}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm font-semibold transition",
                        bet === amount
                          ? "border-[var(--brand-amber)] bg-[var(--brand-amber-soft)] text-[var(--brand-amber-hover)]"
                          : "border-[var(--ink-700)] bg-[var(--surface-2)] text-[var(--fg-primary)] hover:border-[var(--brand-emerald-line)] hover:bg-[var(--surface-1)]",
                      )}
                      disabled={!canAdjustBet || amount > balance}
                      onClick={() => setBet(Math.min(amount, balance))}
                      type="button"
                    >
                      {formatTokens(amount)}
                    </button>
                  ))}
                  <button
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-semibold transition",
                      bet === balance
                        ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] text-[var(--brand-red-hover)]"
                        : "border-[var(--brand-red-soft)] bg-[var(--brand-red-soft)] text-[var(--brand-red-hover)] hover:border-[var(--brand-red)]",
                    )}
                    disabled={!canAdjustBet || balance < 1}
                    onClick={() => setBet(balance)}
                    type="button"
                  >
                    All-in
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3">
              {(gameState === "BETTING" || gameState === "GAME_OVER") ? (
                <Button
                  aria-label="Parier et démarrer la partie"
                  className="flex-1 gap-2"
                  disabled={isDisabled || !bet || bet < 1 || bet > balance}
                  onClick={() => {
                    if (gameState === "GAME_OVER") {
                      sounds.cardShuffle.play();
                      handleNewGame();
                      void handleBet();
                    } else if (hasPlayedBefore) {
                      sounds.cardShuffle.play();
                      void handleBet();
                    } else {
                      sounds.betButton.play();
                      void handleBet();
                    }
                  }}
                  size="lg"
                >
                  Distribuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}

            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
