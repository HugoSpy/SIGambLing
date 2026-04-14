import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { sounds } from "../../../lib/sounds";
import { cn } from "../../../lib/utils";
import { useAuthStore } from "../../../store/auth-store";
import { Button } from "../../ui/Button";
import { WinPopup, useWinPopup } from "../../ui/WinPopup";
import type { CrashStreamState } from "../../../hooks/useCrashStream";

const MIN_BET = 10;
const MAX_BET = 1_000_000;

interface CrashBetPanelProps {
  stream: CrashStreamState;
  onBet: (amount: number, autoCashout: number | null) => Promise<void>;
  onCashout: () => Promise<void>;
  onBetPlaced: (amount: number, autoCashout: number | null) => void;
}

export function CrashBetPanel({ stream, onBet, onCashout, onBetPlaced }: CrashBetPanelProps) {
  const user = useAuthStore((s) => s.user);
  const balance = user?.balance ?? 0;

  const { status, multiplier, myBet, hash, countdown } = stream;

  const [bet, setBet] = useState(10);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutValue, setAutoCashoutValue] = useState(2.0);
  const [isLoading, setIsLoading] = useState(false);

  const prevStatusRef = useRef<string>("");
  const prevMyBetRef = useRef<CrashStreamState["myBet"]>(null);
  const cashoutTriggeredRef = useRef(false);
  const hasSubmittedRef = useRef<boolean>(false);

  const { popupProps, showWin } = useWinPopup(2500);

  // Detect cashout (manual or auto) for WinPopup + sound
  useEffect(() => {
    const prev = prevMyBetRef.current;
    const cur = myBet;
    prevMyBetRef.current = cur;

    if (!cashoutTriggeredRef.current && prev && !prev.cashedOutAt && cur?.cashedOutAt) {
      cashoutTriggeredRef.current = true;
      const payout = Math.floor(cur.amount * cur.cashedOutAt);
      const netGain = payout - cur.amount;
      sounds.win.play();
      showWin({ multiplier: cur.cashedOutAt, netGain });
    }
  }, [myBet, showWin]);

  // Reset cashout flag on new round
  useEffect(() => {
    if (prevStatusRef.current !== "WAITING" && status === "WAITING") {
      cashoutTriggeredRef.current = false;
      hasSubmittedRef.current = false;
    }
    if (prevStatusRef.current === "RUNNING" && status === "CRASHED" && myBet && !myBet.cashedOutAt) {
      sounds.bombClick.play();
    }
    prevStatusRef.current = status;
  }, [status, myBet]);

  const hasBet = myBet !== null;
  const isCashedOut = hasBet && myBet.cashedOutAt !== null;
  const potentialPayout = hasBet ? Math.floor(myBet.amount * multiplier) : 0;

  const clampBet = (v: number) => Math.max(MIN_BET, Math.min(MAX_BET, Math.round(v)));

  const handleBet = async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsLoading(true);
    try {
      sounds.betButton.play();
      const autoCashout = autoCashoutEnabled ? autoCashoutValue : null;
      await onBet(bet, autoCashout);
      onBetPlaced(bet, autoCashout);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashout = async () => {
    setIsLoading(true);
    try {
      await onCashout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-4 h-full">
      {/* WinPopup */}
      <WinPopup {...popupProps} />

      {/* Back link */}
      <Link
        to="/casino"
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au casino
      </Link>

      {/* Bet input block — visible during WAITING only */}
      <AnimatePresence>
        {status === "WAITING" && !hasBet && (
          <motion.div
            key="bet-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
          >
            {/* Mise */}
            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Mise
              </label>
              <input
                type="number"
                min={MIN_BET}
                max={MAX_BET}
                step={1}
                value={bet}
                onChange={(e) => setBet(clampBet(parseInt(e.target.value) || MIN_BET))}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => setBet((v) => clampBet(Math.floor(v / 2)))}
                  className="flex-1 rounded-md border border-white/10 py-1 text-xs text-zinc-400 hover:border-white/30 hover:text-white transition-colors"
                >
                  ×½
                </button>
                <button
                  onClick={() => setBet((v) => clampBet(v * 2))}
                  className="flex-1 rounded-md border border-white/10 py-1 text-xs text-zinc-400 hover:border-white/30 hover:text-white transition-colors"
                >
                  ×2
                </button>
                <button
                  onClick={() => setBet(clampBet(balance))}
                  className="flex-1 rounded-md border border-white/10 py-1 text-xs text-zinc-400 hover:border-white/30 hover:text-white transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Auto-cashout */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Auto-cashout
                </label>
                <button
                  onClick={() => setAutoCashoutEnabled((v) => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    autoCashoutEnabled ? "bg-emerald-500" : "bg-zinc-700",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      autoCashoutEnabled ? "translate-x-4.5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
              {autoCashoutEnabled && (
                <input
                  type="number"
                  min={1.01}
                  max={1000000}
                  step={0.01}
                  value={autoCashoutValue}
                  onChange={(e) =>
                    setAutoCashoutValue(Math.max(1.01, parseFloat(e.target.value) || 1.01))
                  }
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="ex: 2.00"
                />
              )}
            </div>

            {/* Countdown + hash */}
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Prochain round dans {countdown}s</span>
              <span
                className="font-mono truncate max-w-[100px] cursor-help"
                title={`Hash du round : ${hash}`}
              >
                #{hash.slice(0, 8)}…
              </span>
            </div>

            {/* Parier button */}
            <Button
              onClick={() => void handleBet()}
              disabled={isLoading || bet > balance || bet < MIN_BET}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? "Envoi…" : `Parier ${bet.toLocaleString("fr-FR")} 🪙`}
            </Button>

            {bet > balance && (
              <p className="text-xs text-red-400 text-center">Solde insuffisant</p>
            )}
          </motion.div>
        )}

        {/* Pari placé, en attente du lancement */}
        {status === "WAITING" && hasBet && !isCashedOut && (
          <motion.div
            key="bet-placed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
          >
            <p className="text-emerald-400 font-semibold text-sm">
              Pari placé : {myBet!.amount.toLocaleString("fr-FR")} 🪙
            </p>
            {myBet!.autoCashout && (
              <p className="text-xs text-zinc-400 mt-1">
                Auto-cashout à ×{myBet!.autoCashout.toFixed(2)}
              </p>
            )}
          </motion.div>
        )}

        {/* RUNNING + pari + pas encore cashé */}
        {status === "RUNNING" && hasBet && !isCashedOut && (
          <motion.div
            key="cashout-btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {myBet!.autoCashout && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                Auto à ×{myBet!.autoCashout.toFixed(2)}
              </div>
            )}

            <motion.button
              onClick={() => void handleCashout()}
              disabled={isLoading || isCashedOut}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className={cn(
                "w-full rounded-xl py-4 font-black text-lg text-white",
                "bg-emerald-600 hover:bg-emerald-500 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg shadow-emerald-500/20",
              )}
            >
              <span className="block text-xs font-normal text-emerald-200 mb-0.5">CASHOUT</span>
              +{potentialPayout.toLocaleString("fr-FR")} 🪙
            </motion.button>
          </motion.div>
        )}

        {/* RUNNING + déjà cashé */}
        {status === "RUNNING" && isCashedOut && (
          <motion.div
            key="cashed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
          >
            <p className="text-emerald-400 font-bold text-sm">
              Cashé à ×{myBet!.cashedOutAt!.toFixed(2)}
            </p>
            <p className="text-emerald-300 font-black text-xl mt-1">
              +{(Math.floor(myBet!.amount * myBet!.cashedOutAt!) - myBet!.amount).toLocaleString("fr-FR")} 🪙
            </p>
          </motion.div>
        )}

        {/* CRASHED */}
        {status === "CRASHED" && hasBet && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "rounded-xl border p-4 text-center",
              isCashedOut
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10",
            )}
          >
            {isCashedOut ? (
              <>
                <p className="text-emerald-400 font-bold text-sm">
                  Cashé à ×{myBet!.cashedOutAt!.toFixed(2)}
                </p>
                <p className="text-emerald-300 font-black text-xl mt-1">
                  +{(Math.floor(myBet!.amount * myBet!.cashedOutAt!) - myBet!.amount).toLocaleString("fr-FR")} 🪙
                </p>
              </>
            ) : (
              <>
                <p className="text-red-400 font-bold text-sm">Perdu</p>
                <p className="text-red-300 font-black text-xl mt-1">
                  −{myBet!.amount.toLocaleString("fr-FR")} 🪙
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No bet + not WAITING → waiting for next round */}
      {(status === "RUNNING" || status === "CRASHED") && !hasBet && (
        <p className="text-xs text-zinc-600 text-center mt-2">
          Parie au prochain round
        </p>
      )}
    </div>
  );
}
