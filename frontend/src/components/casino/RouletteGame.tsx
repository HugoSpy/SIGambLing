import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Coins, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { soundManager } from "../../lib/casino/soundManager";
import { getErrorMessage, notify } from "../../lib/notifications";
import { createBet, resolveRound } from "../../lib/casino/rouletteUtils";
import { formatTokens } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import type {
  BetType,
  RouletteBet,
  RouletteResult,
  RouletteSpinAnimationRequest,
  RouletteSpinResponse,
} from "../../types/roulette";
import { Card } from "../ui/Card";
import { BettingGrid } from "./BettingGrid";
import { RouletteControls } from "./RouletteControls";
import { RouletteHistory } from "./RouletteHistory";
import { RouletteStats } from "./RouletteStats";
import { RouletteWheel } from "./RouletteWheel";
import { Button } from "../ui/Button";

export function RouletteGame() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateBalance = useAuthStore((state) => state.updateBalance);

  const [phase, setPhase] = useState<"idle" | "betting" | "spinning" | "resolving" | "payout">(
    "idle",
  );
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [lastBets, setLastBets] = useState<RouletteBet[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [history, setHistory] = useState<RouletteResult[]>([]);
  const [spinRequest, setSpinRequest] = useState<RouletteSpinAnimationRequest | null>(null);
  const [pendingResponse, setPendingResponse] = useState<RouletteSpinResponse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const pendingTimeoutsRef = useRef<number[]>([]);

  const baseBalance = user?.balance ?? 0;
  const totalBet = useMemo(() => bets.reduce((sum, bet) => sum + bet.amount, 0), [bets]);
  const availableBalance = Math.max(0, baseBalance - totalBet);
  const maxPotentialWin = useMemo(() => bets.reduce((sum, bet) => sum + bet.potentialWin, 0), [bets]);
  const lastResult = history[0] ?? null;
  const phaseLabel =
    phase === "spinning"
      ? "Rotation en cours"
      : phase === "resolving"
        ? "Résultat confirmé"
        : phase === "payout"
          ? "Paiement terminé"
          : bets.length > 0
            ? "Mises prêtes"
            : "En attente";

  useEffect(() => {
    soundManager.preload();
  }, []);

  useEffect(() => {
    const timeouts = pendingTimeoutsRef.current;
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handlePlaceBet = useCallback(
    (betType: BetType) => {
      if (phase === "spinning" || phase === "resolving") {
        return;
      }

      if (betAmount < 1) {
        notify.error(`Mise minimale : 1 token. Vous avez entré ${betAmount} token${betAmount <= 1 ? "" : "s"}.`);
        return;
      }

      if (betAmount > availableBalance) {
        notify.error(`Solde insuffisant. Solde disponible : ${availableBalance} tokens, mise demandée : ${betAmount} tokens.`);
        return;
      }

      setBets((currentBets) => [...currentBets, createBet(betType, betAmount)]);
      setPhase("betting");
      soundManager.play("chip");
    },
    [availableBalance, betAmount, phase],
  );

  const handleClearBets = useCallback(() => {
    if (phase === "spinning" || phase === "resolving") {
      return;
    }

    setBets([]);
    setPhase("idle");
    soundManager.play("click");
  }, [phase]);

  const handleSpin = useCallback(async () => {
    if (phase !== "betting") {
      return;
    }

    if (bets.length === 0) {
      notify.error("Place au moins un pari avant de lancer la roue.");
      return;
    }

    setLastBets([...bets]);
    setPhase("spinning");
    soundManager.play("spin");

    try {
      const response = await api.post<RouletteSpinResponse>("/casino/roulette/spin", {
        bets: bets.map((bet) => ({
          type: bet.type,
          amount: bet.amount,
        })),
      });

      const nextResponse = response.data;
      const nextSpinRequest = {
        spinId: `${nextResponse.game_id}_${Date.now()}`,
        resultNumber: nextResponse.result_number,
      } satisfies RouletteSpinAnimationRequest;

      setPendingResponse(nextResponse);
      setSpinRequest(nextSpinRequest);
    } catch (error) {
      setPhase(bets.length > 0 ? "betting" : "idle");
      notify.error(getErrorMessage(error, "Erreur lors du lancer de la roue. Vérifiez votre solde et réessayez."));
    }
  }, [bets, phase]);

  const handleRebet = useCallback(() => {
    if (lastBets.length === 0) return;
    const total = lastBets.reduce((sum, b) => sum + b.amount, 0);
    let newBets: RouletteBet[];
    if (total <= baseBalance) {
      newBets = lastBets.map((b) => createBet(b.type, b.amount));
    } else {
      const factor = baseBalance / total;
      newBets = lastBets
        .map((b) => createBet(b.type, Math.floor(b.amount * factor)))
        .filter((b) => b.amount > 0);
    }
    setBets(newBets);
    if (newBets.length > 0) {
      setPhase("betting");
    }
  }, [lastBets, baseBalance]);

  const handleDoubleBets = useCallback(() => {
    if (bets.length === 0) return;
    if (totalBet * 2 > baseBalance) {
      const factor = Math.floor(baseBalance / totalBet);
      if (factor <= 1) return;
      setBets(bets.map((b) => createBet(b.type, b.amount * factor)));
    } else {
      setBets(bets.map((b) => createBet(b.type, b.amount * 2)));
    }
  }, [bets, totalBet, baseBalance]);

  const handleHalveBets = useCallback(() => {
    if (bets.length === 0) return;
    const newBets = bets
      .map((b) => createBet(b.type, Math.floor(b.amount / 2)))
      .filter((b) => b.amount > 0);
    setBets(newBets);
    if (newBets.length === 0) {
      setPhase("idle");
    }
  }, [bets]);

  const handleSpinComplete = useCallback(
    (spinId: string) => {
      if (!spinRequest || !pendingResponse || spinRequest.spinId !== spinId) {
        return;
      }

      setPhase("resolving");

      const roundResult = resolveRound(bets, pendingResponse.result_number);
      const authoritativeResult: RouletteResult = {
        ...roundResult,
        color: pendingResponse.result_color,
        totalPayout: pendingResponse.payout,
        timestamp: new Date().toISOString(),
      };

      updateBalance(pendingResponse.new_balance);
      void queryClient.invalidateQueries({ queryKey: ["gamification"] });
      void queryClient.invalidateQueries({ queryKey: ["jackpot"] });
      setHistory((currentHistory) => [authoritativeResult, ...currentHistory].slice(0, 40));

      if (pendingResponse.payout > 0) {
        soundManager.play("win");
        notify.success(`Gain valide : +${formatTokens(pendingResponse.payout)} tokens`);
        if (navigator.vibrate) {
          navigator.vibrate([60, 40, 90]);
        }
      } else {
        soundManager.play("lose");
        notify.info("Aucun gain sur ce tour.");
      }

      setSpinRequest(null);
      setPendingResponse(null);

      // Clear any leftover timeouts from a previous round
      pendingTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      pendingTimeoutsRef.current = [];

      // Stage 1 (~1s): clear bets from the table
      const t1 = window.setTimeout(() => {
        setBets([]);
        // Stage 2 (+300ms): re-enable the table and controls
        const t2 = window.setTimeout(() => {
          setPhase("idle");
        }, 300);
        pendingTimeoutsRef.current.push(t2);
      }, 1000);
      pendingTimeoutsRef.current.push(t1);
    },
    [bets, pendingResponse, queryClient, spinRequest, updateBalance],
  );

  const handleToggleSound = useCallback(() => {
    soundManager.toggle();
    setSoundEnabled(soundManager.isEnabled());
  }, []);

  return (
    <div className="space-y-6">
      <Card accent="cyan">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link to="/casino">
              <Button className="gap-2" size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Retour au casino
              </Button>
            </Link>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-brand-cyan">Salon casino</p>
            <h1 className="mt-3 font-display text-2xl md:text-4xl text-brand-text">Roulette Européenne</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-muted">
              Mise minimum : 10 tokens • Gain maximum : 35:1
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
              <Sparkles className="h-5 w-5 text-brand-orange" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Table</p>
                <p className="text-sm font-semibold text-brand-text">{phaseLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
              <Coins className="h-5 w-5 text-brand-cyan" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Solde</p>
                <p className="text-sm font-semibold text-brand-text">
                  {formatTokens(availableBalance)} tokens
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6 xl:order-1">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-2xl text-brand-orange">Roue principale</h2>
                </div>
                {lastResult ? (
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-text">
                    Dernier numéro :{" "}
                    <span className="font-display text-brand-orange">{lastResult.number}</span>
                  </div>
                ) : null}
              </div>

              <RouletteWheel onSpinComplete={handleSpinComplete} spinRequest={spinRequest} />
            </div>
          </Card>

          <BettingGrid
            bets={bets}
            disabled={phase === "spinning" || phase === "resolving"}
            onPlaceBet={handlePlaceBet}
          />
        </div>

        <div className="order-first space-y-6 xl:order-2">
          <RouletteControls
            balance={availableBalance}
            betAmount={betAmount}
            disabled={phase === "spinning" || phase === "resolving"}
            hasLastBets={lastBets.length > 0}
            maxPotentialWin={maxPotentialWin}
            onBetAmountChange={setBetAmount}
            onClearBets={handleClearBets}
            onDoubleBets={handleDoubleBets}
            onHalveBets={handleHalveBets}
            onRebet={handleRebet}
            onSpin={() => void handleSpin()}
            onToggleSound={handleToggleSound}
            phase={phase}
            soundEnabled={soundEnabled}
            totalBet={totalBet}
          />
          <RouletteHistory history={history} />
          <RouletteStats history={history} />
        </div>
      </div>
    </div>
  );
}
