import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../../lib/utils";
import type { CrashStreamState } from "../../../hooks/useCrashStream";

type LiveBet = CrashStreamState["liveBets"][number];

interface CrashPlayerListProps {
  bets: LiveBet[];
  currentUserId: string | null;
  status: CrashStreamState["status"];
  multiplier: number;
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  bet: LiveBet;
  isCurrentUser: boolean;
  status: CrashStreamState["status"];
  multiplier: number;
  entryDelay: number;
}

function CrashPlayerRow({ bet, isCurrentUser, status, multiplier, entryDelay }: RowProps) {
  const [flashBg, setFlashBg] = useState<"green" | "red" | null>(null);
  const prevCashedRef = useRef(bet.cashedOut);
  const prevStatusRef = useRef(status);

  // Flash green on cashout
  useEffect(() => {
    if (!prevCashedRef.current && bet.cashedOut) {
      setFlashBg("green");
      const t = setTimeout(() => setFlashBg(null), 600);
      prevCashedRef.current = true;
      return () => clearTimeout(t);
    }
    prevCashedRef.current = bet.cashedOut;
  }, [bet.cashedOut]);

  // Flash red when round crashes and this bet wasn't cashed out
  useEffect(() => {
    if (prevStatusRef.current !== "CRASHED" && status === "CRASHED" && !bet.cashedOut) {
      setFlashBg("red");
      const t = setTimeout(() => setFlashBg(null), 900);
      prevStatusRef.current = status;
      return () => clearTimeout(t);
    }
    prevStatusRef.current = status;
  }, [status, bet.cashedOut]);

  // Gain value
  let gainValue: number | null = null;
  if (bet.cashedOut) {
    gainValue = bet.payout - bet.amount;
  } else if (status === "RUNNING") {
    gainValue = Math.floor(bet.amount * multiplier) - bet.amount;
  }

  const initials = bet.pseudo.slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor:
          flashBg === "green"
            ? "rgba(34,197,94,0.18)"
            : flashBg === "red"
            ? "rgba(239,68,68,0.15)"
            : isCurrentUser
            ? "rgba(63,63,70,0.5)"
            : "transparent",
      }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        opacity: { delay: entryDelay, duration: 0.18 },
        y: { delay: entryDelay, duration: 0.18 },
        backgroundColor: { duration: 0.25 },
        layout: { duration: 0.2 },
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg min-w-0"
    >
      {/* Avatar + pseudo */}
      <Link
        to={`/profile/${bet.userId}`}
        className="flex items-center gap-1.5 flex-1 min-w-0 group"
      >
        {bet.avatarUrl ? (
          <img
            src={bet.avatarUrl}
            alt={bet.pseudo}
            onError={(e) => { e.currentTarget.src = "/default-avatar.svg"; }}
            className="h-5 w-5 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-zinc-300">{initials}</span>
          </div>
        )}
        <span
          className={cn(
            "text-xs truncate group-hover:text-white transition-colors",
            isCurrentUser ? "text-zinc-200 font-semibold" : "text-zinc-400",
          )}
        >
          {bet.pseudo}
        </span>
      </Link>

      {/* Mise */}
      <span className="text-xs text-zinc-400 tabular-nums w-16 text-right shrink-0">
        {bet.amount.toLocaleString("fr-FR")}
      </span>

      {/* Cashout */}
      <div className="w-16 text-right shrink-0">
        {bet.cashedOut && bet.cashedOutAt !== null ? (
          <span className="text-xs font-bold text-emerald-400 tabular-nums">
            ×{bet.cashedOutAt.toFixed(2)}
          </span>
        ) : status === "CRASHED" && !bet.cashedOut ? (
          <span className="text-xs">💥</span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </div>

      {/* Gain */}
      <div className="hidden sm:block w-16 text-right shrink-0">
        {bet.cashedOut ? (
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">
            +{gainValue!.toLocaleString("fr-FR")}
          </span>
        ) : status === "CRASHED" && !bet.cashedOut ? (
          <span className="text-xs text-red-400 tabular-nums">
            −{bet.amount.toLocaleString("fr-FR")}
          </span>
        ) : gainValue !== null ? (
          <span className="text-xs text-zinc-500 tabular-nums">
            {gainValue >= 0 ? "+" : ""}
            {gainValue.toLocaleString("fr-FR")}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CrashPlayerList({ bets, currentUserId, status, multiplier }: CrashPlayerListProps) {
  // Sort: cashed out first (by cashedOutAt desc), then active by amount desc
  const sorted = [...bets].sort((a, b) => {
    if (a.cashedOut !== b.cashedOut) return a.cashedOut ? -1 : 1;
    if (a.cashedOut && b.cashedOut) {
      return (b.cashedOutAt ?? 0) - (a.cashedOutAt ?? 0);
    }
    return b.amount - a.amount;
  });

  return (
    <div className="flex flex-col rounded-xl border border-white/8 bg-zinc-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
        <span className="text-xs font-semibold text-zinc-300">Joueurs</span>
        <span className="text-xs text-zinc-600 tabular-nums">({bets.length})</span>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-white/4">
        <span className="flex-1 text-[10px] uppercase tracking-wider text-zinc-600">Joueur</span>
        <span className="w-16 text-right text-[10px] uppercase tracking-wider text-zinc-600">Mise</span>
        <span className="w-16 text-right text-[10px] uppercase tracking-wider text-zinc-600">Cashout</span>
        <span className="hidden sm:block w-16 text-right text-[10px] uppercase tracking-wider text-zinc-600">Gain</span>
      </div>

      {/* Rows */}
      {bets.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-zinc-600">
          {status === "WAITING" ? "En attente de parieurs..." : "Aucun parieur ce round."}
        </div>
      ) : (
        <LayoutGroup>
          <div className="overflow-y-auto max-h-[260px] flex flex-col py-1">
            <AnimatePresence initial={false}>
              {sorted.map((bet, i) => (
                <CrashPlayerRow
                  key={bet.userId}
                  bet={bet}
                  isCurrentUser={bet.userId === currentUserId}
                  status={status}
                  multiplier={multiplier}
                  entryDelay={Math.min(i * 0.04, 0.3)}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
