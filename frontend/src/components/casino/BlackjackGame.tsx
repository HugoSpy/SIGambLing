import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Coins, Shield, Sparkles, Waves } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { getErrorMessage, notify } from "../../lib/notifications";
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
    tone: "text-brand-cyan",
  },
  DEALING: {
    label: "Distribution",
    detail: "Les cartes arrivent sur le tapis.",
    tone: "text-amber-300",
  },
  PLAYER_TURN: {
    label: "Votre decision",
    detail: "Tirez, restez ou doublez selon votre lecture.",
    tone: "text-emerald-300",
  },
  DEALER_TURN: {
    label: "Tour du dealer",
    detail: "Le croupier complete sa main avant la resolution.",
    tone: "text-orange-300",
  },
  GAME_OVER: {
    label: "Manche terminee",
    detail: "Analysez le resultat puis relancez une partie.",
    tone: "text-zinc-100",
  },
};

function isRedSuit(suit: string) {
  return RED_SUITS.has(suit);
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
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-black",
          isBlackjack
            ? "text-yellow-400"
            : total > 21
              ? "text-red-400"
              : total === 21
                ? "text-green-400"
                : "text-white",
        )}
      >
        {isBlackjack ? "BLACKJACK" : total > 21 ? `${total} BUST` : total}
      </p>
      {helper ? <p className="mt-1 text-xs text-white/45">{helper}</p> : null}
    </div>
  );
}

function getResultConfig(result: BlackjackResult) {
  const config: Record<
    BlackjackResult,
    { badge: string; title: string; detail: string; className: string; surfaceClassName: string }
  > = {
    win: {
      badge: "Victoire",
      title: "La table vous rend enfin quelque chose.",
      detail: "Votre main bat celle du dealer. Vous pouvez relancer sans perdre le fil.",
      className: "text-green-300",
      surfaceClassName: "border-green-500/30 bg-green-500/10",
    },
    blackjack: {
      badge: "Blackjack",
      title: "21 en deux cartes, difficile de faire plus clair.",
      detail: "Paiement maximise et recapitulatif visible sans masquer la table.",
      className: "text-yellow-300",
      surfaceClassName: "border-yellow-500/30 bg-yellow-500/10",
    },
    loss: {
      badge: "Defaite",
      title: "Le dealer prend la manche. Quelle surprise.",
      detail: "Lisez les totaux, ajustez la mise, puis relancez quand vous voulez.",
      className: "text-red-300",
      surfaceClassName: "border-red-500/30 bg-red-500/10",
    },
    bust: {
      badge: "Bust",
      title: "Vous avez force une carte de trop.",
      detail: "Le recap reste visible pour comprendre la manche avant la suivante.",
      className: "text-red-300",
      surfaceClassName: "border-red-500/30 bg-red-500/10",
    },
    push: {
      badge: "Egalite",
      title: "Personne ne brille, personne ne tombe.",
      detail: "La manche se termine a egalite. Vous pouvez repartir immediatement.",
      className: "text-slate-200",
      surfaceClassName: "border-white/15 bg-white/5",
    },
  };

  return config[result];
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
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insurancePayout, setInsurancePayout] = useState(0);
  const [insuranceAvailable, setInsuranceAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const balance = user?.balance ?? 0;
  const isPlaying = gameState === "PLAYER_TURN";
  const insuranceCost = currentBet > 0 ? Math.max(1, Math.floor(currentBet / 2)) : 0;
  const canDouble = isPlaying && playerHand.length === 2 && balance >= currentBet;
  const canInsure = isPlaying && insuranceAvailable && insuranceCost > 0 && balance >= insuranceCost;
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
      notify.error("La mise minimum est de 1 token.");
      return;
    }
    if (bet > balance) {
      notify.error("Solde insuffisant.");
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
      setInsuranceBet(data.insurance_bet ?? 0);
      setInsurancePayout(data.insurance_payout ?? 0);

      if (data.status === "resolved") {
        setDealerUpcard(data.dealer_upcard ?? data.dealer_hand_final?.[0] ?? null);
        resolveGame(data);
      } else {
        setDealerUpcard(data.dealer_upcard ?? null);
        setDealerTotal(data.dealer_visible_total ?? 0);
        setInsuranceAvailable(data.insurance_available ?? false);
        setGameState("PLAYER_TURN");
        soundManager.play("click");
      }
    } catch (error) {
      setGameState("BETTING");
      notify.error(getErrorMessage(error, "Erreur lors de la distribution."));
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
      notify.error(getErrorMessage(error, "Erreur."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, resolveGame]);

  const handleStand = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    setGameState("DEALER_TURN");
    soundManager.play("click");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/stand", {
        game_id: gameId,
      });
      setInsuranceBet(response.data.insurance_bet ?? insuranceBet);
      setInsurancePayout(response.data.insurance_payout ?? 0);
      setInsuranceAvailable(response.data.insurance_available ?? false);
      resolveGame(response.data);
    } catch (error) {
      setGameState("PLAYER_TURN");
      notify.error(getErrorMessage(error, "Erreur."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, resolveGame]);

  const handleDouble = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    setGameState("DEALER_TURN");
    soundManager.play("chip");

    try {
      const response = await api.post<BlackjackActionResponse>("/casino/blackjack/double", {
        game_id: gameId,
      });
      if ((response.data.player_hand?.length ?? playerHand.length) > playerHand.length) {
        setCurrentBet((prev) => prev * 2);
      }
      setInsuranceBet(response.data.insurance_bet ?? insuranceBet);
      setInsurancePayout(response.data.insurance_payout ?? 0);
      setInsuranceAvailable(response.data.insurance_available ?? false);
      resolveGame(response.data);
    } catch (error) {
      setGameState("PLAYER_TURN");
      notify.error(getErrorMessage(error, "Erreur."));
    } finally {
      setLoading(false);
    }
  }, [gameId, insuranceBet, playerHand.length, resolveGame]);

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
  }, []);

  const playerIsBlackjack = playerTotal === 21 && playerHand.length === 2;
  const dealerDisplayHand = dealerHandFinal ?? (dealerUpcard ? [dealerUpcard] : []);
  const showHiddenCard = gameState !== "GAME_OVER" && gameState !== "DEALER_TURN";
  const stateCopy = GAME_STATE_COPY[gameState];
  const resultText =
    result === "blackjack"
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
  const resultConfig = result ? getResultConfig(result) : null;
  return (
    <div className="flex flex-col gap-3">
      <Link to="/casino">
        <Button className="gap-2" size="sm" variant="secondary">
          <ArrowLeft className="h-4 w-4" />
          Retour au casino
        </Button>
      </Link>
      <Card accent="cyan" className="min-w-[300px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Salon casino</p>
            <h1 className="mt-1 font-display text-2xl text-brand-text">Blackjack</h1>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-3 py-2">
              <Coins className="h-4 w-4 text-brand-cyan" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Solde</p>
                <p className="text-sm font-semibold text-brand-text">
                  {formatTokens(balance)} tokens
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-3 py-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Etat</p>
                <p className={cn("text-sm font-semibold", stateCopy.tone)}>{stateCopy.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-3 py-2">
              <Shield className="h-4 w-4 text-emerald-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Resultat</p>
                <p className="text-sm font-semibold text-brand-text">{resultText}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:h-[calc(100vh-18rem)] min-h-0">
        <div
          className="relative overflow-hidden rounded-[36px] border border-amber-200/20 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-5 xl:flex xl:flex-col xl:h-full"
          style={{
            background:
              "radial-gradient(circle at top, rgba(40,123,88,0.88), rgba(10,50,32,0.98) 62%)",
          }}
        >
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute left-6 top-6 rounded-full border border-white/10 bg-black/15 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-white/55">
            Table principale
          </div>

          <div className="grid gap-3 pt-10 xl:flex-1 xl:min-h-0 xl:content-start">
            <div className="rounded-[28px] border border-white/10 bg-black/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    Dealer
                  </p>
                  <p className="mt-2 text-sm text-white/70">Main visible et resolution finale.</p>
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
              <div className="flex min-h-[100px] flex-wrap gap-3">
                <AnimatePresence mode="popLayout">
                  {dealerDisplayHand.map((card, index) => (
                    <PlayingCard
                      key={`dealer-${index}-${card.rank}-${card.suit}`}
                      card={card}
                      index={index}
                    />
                  ))}
                  {showHiddenCard && dealerUpcard ? (
                    <PlayingCard key="dealer-hidden" hidden index={dealerDisplayHand.length} />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    Joueur
                  </p>
                  <p className="mt-2 text-sm text-white/70">{stateCopy.detail}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {playerHand.length > 0 ? (
                    <HandTotal
                      helper={playerHand.length > 0 ? `${playerHand.length} carte(s)` : undefined}
                      isBlackjack={playerIsBlackjack}
                      label="Total joueur"
                      total={playerTotal}
                    />
                  ) : null}
                  {gameState === "PLAYER_TURN" ? (
                    <span className="animate-pulse rounded-full bg-brand-cyan/20 px-3 py-1 text-xs text-brand-cyan">
                      Votre tour
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex min-h-[100px] flex-wrap gap-3">
                <AnimatePresence mode="popLayout">
                  {playerHand.map((card, index) => (
                    <PlayingCard
                      key={`player-${index}-${card.rank}-${card.suit}`}
                      card={card}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {currentBet > 0 && gameState !== "BETTING" ? (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex min-h-14 min-w-14 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-900/75 px-3 text-sm font-bold text-amber-100 shadow-lg">
                {formatTokens(currentBet)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 xl:h-full xl:overflow-y-auto">
          <Card className="min-w-[300px] p-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Mise courante</p>
                <p className="mt-1 font-display text-xl text-brand-text">
                  {formatTokens(
                    gameState === "BETTING" || gameState === "GAME_OVER" ? bet : currentBet || bet,
                  )}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Payout</p>
                <p className="mt-1 font-display text-xl text-brand-text">
                  {payout > 0 ? `+${formatTokens(payout)}` : "0"}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Assurance</p>
                <p className="mt-1 font-display text-xl text-brand-text">
                  {insuranceBet > 0 ? formatTokens(insuranceBet) : "0"}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  {insurancePayout > 0
                    ? `Retour ${formatTokens(insurancePayout)}`
                    : insuranceAvailable
                      ? `Cout ${formatTokens(insuranceCost)}`
                      : "Inactive"}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 sm:col-span-2 xl:col-span-1">
                <div className="flex items-start gap-2">
                  <Waves className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                  <p className="text-xs leading-5 text-brand-muted">
                    Dealer tire sur 16 ou moins • Assurance = 50% de la mise sur As visible
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="min-w-[300px] p-4">
            {gameState === "GAME_OVER" && result && resultConfig ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mb-3 rounded-[24px] border px-3 py-3",
                  resultConfig.surfaceClassName,
                )}
                initial={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={cn("text-xs uppercase tracking-[0.28em]", resultConfig.className)}>
                      {resultConfig.badge}
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-brand-text">
                      {resultConfig.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">{resultConfig.detail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center sm:min-w-[160px]">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Payout</p>
                    <p className={cn("mt-1 text-xl font-black", payout > 0 ? "text-green-300" : "text-brand-text")}>
                      {payout > 0 ? `+${formatTokens(payout)}` : "0"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                      Votre total final
                    </p>
                    <p className="mt-1 text-lg font-black text-brand-text">{playerTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                      Total dealer
                    </p>
                    <p className="mt-1 text-lg font-black text-brand-text">{dealerTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                      Assurance
                    </p>
                    <p className="mt-1 text-lg font-black text-brand-text">
                      {insuranceBet > 0
                        ? insurancePayout > 0
                          ? `Cout ${formatTokens(insuranceBet)} • Retour ${formatTokens(insurancePayout)}`
                          : `Cout ${formatTokens(insuranceBet)} • Non declenchee`
                        : "Aucune assurance prise"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {(gameState === "BETTING" || gameState === "GAME_OVER") ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-muted">Votre mise</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      aria-label="Diviser la mise par 2"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-white/5 text-sm font-bold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/10 disabled:opacity-40"
                      disabled={!canAdjustBet}
                      onClick={() => setBet((prev) => Math.max(1, Math.floor(prev / 2)))}
                      type="button"
                    >
                      ÷2
                    </button>
                    <input
                      aria-label="Montant de la mise"
                      className="h-11 w-full rounded-2xl border border-brand-line bg-white/5 px-4 text-center text-sm font-semibold text-brand-text focus:border-brand-cyan/40 focus:outline-none"
                      disabled={!canAdjustBet}
                      max={balance}
                      min={1}
                      onChange={(event) => {
                        const value = parseInt(event.target.value, 10);
                        if (!Number.isNaN(value)) {
                          setBet(Math.min(Math.max(1, value), balance));
                        }
                      }}
                      type="number"
                      value={bet}
                    />
                    <button
                      aria-label="Doubler la mise"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-white/5 text-sm font-bold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/10 disabled:opacity-40"
                      disabled={!canAdjustBet}
                      onClick={() => setBet((prev) => Math.min(prev * 2, balance))}
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
                          ? "border-amber-300 bg-amber-300 text-zinc-950"
                          : "border-white/10 bg-white/5 text-brand-text hover:border-brand-cyan/45 hover:bg-white/10",
                      )}
                      disabled={!canAdjustBet || amount > balance}
                      onClick={() => setBet(Math.min(amount, balance))}
                      type="button"
                    >
                      {formatTokens(amount)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3">
              {(gameState === "BETTING" || gameState === "GAME_OVER") ? (
                <Button
                  aria-label="Parier et démarrer la partie"
                  className="flex-1 gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  disabled={isDisabled || bet < 1 || bet > balance}
                  onClick={() => {
                    if (gameState === "GAME_OVER") {
                      handleNewGame();
                    } else {
                      void handleBet();
                    }
                  }}
                  size="lg"
                >
                  {gameState === "GAME_OVER" ? "Nouvelle partie" : "Distribuer"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}

              {gameState === "PLAYER_TURN" ? (
                <>
                  <Button
                    aria-label="Prendre l'assurance"
                    className="flex-1 bg-teal-100 text-zinc-950 hover:bg-white"
                    disabled={isDisabled || !canInsure}
                    onClick={() => void handleInsurance()}
                  >
                    Assurance
                  </Button>
                  <Button
                    aria-label="Tirer une carte"
                    className="flex-1 bg-sky-500 text-zinc-950 hover:bg-sky-400"
                    disabled={isDisabled}
                    onClick={() => void handleHit()}
                  >
                    Tirer
                  </Button>
                  <Button
                    aria-label="Rester avec la main actuelle"
                    className="flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400"
                    disabled={isDisabled}
                    onClick={() => void handleStand()}
                  >
                    Rester
                  </Button>
                  <Button
                    aria-label="Doubler la mise et tirer une carte"
                    className="flex-1 bg-zinc-100 text-zinc-950 hover:bg-white"
                    disabled={isDisabled || !canDouble}
                    onClick={() => void handleDouble()}
                  >
                    Doubler
                  </Button>
                </>
              ) : null}

              {(gameState === "DEALING" || gameState === "DEALER_TURN") ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="animate-pulse text-sm text-brand-muted">
                    {gameState === "DEALING" ? "Distribution en cours..." : "Le dealer joue..."}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
