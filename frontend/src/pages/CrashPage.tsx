import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/auth-store";
import { cashoutCrash, placeCrashBet, logoutRequest, ApiError } from "../lib/api";
import { useCrashStream } from "../hooks/useCrashStream";
import { CrashCurve } from "../components/casino/Crash/CrashCurve";
import { CrashBetPanel } from "../components/casino/Crash/CrashBetPanel";
import { CrashPlayerList } from "../components/casino/Crash/CrashPlayerList";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";

// ─── History pill ─────────────────────────────────────────────────────────────

function CrashHistoryPill({ crashPoint }: { crashPoint: number }) {
  const isRed = crashPoint < 2;
  const isYellow = crashPoint >= 2 && crashPoint < 10;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
        isRed
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : isYellow
          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      }`}
    >
      ×{crashPoint.toFixed(2)}
    </motion.div>
  );
}

// ─── Cashout notification pill ────────────────────────────────────────────────

interface CashoutNotif {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
  multiplier: number;
}

function CashoutNotifPill({ notif }: { notif: CashoutNotif }) {
  const initials = notif.pseudo.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="flex items-center gap-1.5 rounded-full bg-zinc-800/90 backdrop-blur-sm
                 border border-white/10 pl-1.5 pr-3 py-1 shadow-lg pointer-events-none"
    >
      {notif.avatarUrl ? (
        <img
          src={notif.avatarUrl}
          alt={notif.pseudo}
          onError={(e) => { e.currentTarget.src = "/default-avatar.svg"; }}
          className="h-4 w-4 rounded-full object-cover"
        />
      ) : (
        <div className="h-4 w-4 rounded-full bg-zinc-600 flex items-center justify-center">
          <span className="text-[7px] font-bold text-zinc-200">{initials}</span>
        </div>
      )}
      <span className="text-xs text-zinc-300 font-medium max-w-[80px] truncate">
        {notif.pseudo}
      </span>
      <span className="text-xs text-zinc-500">cashé à</span>
      <span className="text-xs font-bold text-emerald-400 tabular-nums">
        ×{notif.multiplier.toFixed(2)}
      </span>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CrashPage() {
  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const { setMyBetOptimistic, ...stream } = useCrashStream();

  // ── Curve points ────────────────────────────────────────────────────────────
  const curvePointsRef = useRef<{ t: number; m: number }[]>([]);
  const [curvePoints, setCurvePoints] = useState<{ t: number; m: number }[]>([]);
  const lastFlushRef = useRef(0);

  useEffect(() => {
    if (stream.status === "RUNNING" && stream.startTime !== null) {
      const elapsed = Date.now() - stream.startTime;
      curvePointsRef.current.push({ t: elapsed, m: stream.multiplier });
      const now = Date.now();
      if (now - lastFlushRef.current > 33) {
        lastFlushRef.current = now;
        setCurvePoints([...curvePointsRef.current]);
      }
    } else if (stream.status === "WAITING") {
      curvePointsRef.current = [];
      setCurvePoints([]);
    } else if (stream.status === "CRASHED" && curvePointsRef.current.length > 0) {
      if (stream.crashPoint !== null) {
        const last = curvePointsRef.current[curvePointsRef.current.length - 1];
        if (last && last.m !== stream.crashPoint) {
          curvePointsRef.current.push({ t: last.t + 50, m: stream.crashPoint });
        }
      }
      setCurvePoints([...curvePointsRef.current]);
    }
  }, [stream.status, stream.multiplier, stream.startTime, stream.crashPoint]);

  // ── Cashout notifications ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<CashoutNotif[]>([]);
  const prevLiveBetsRef = useRef(stream.liveBets);
  const notifTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const prev = prevLiveBetsRef.current;
    const curr = stream.liveBets;

    for (const bet of curr) {
      if (bet.cashedOut && bet.cashedOutAt !== null && bet.userId !== user?.id) {
        const prevBet = prev.find((b) => b.userId === bet.userId);
        if (!prevBet?.cashedOut) {
          const id = `${bet.userId}-${Date.now()}`;
          const newNotif: CashoutNotif = {
            id,
            pseudo: bet.pseudo,
            avatarUrl: bet.avatarUrl,
            multiplier: bet.cashedOutAt,
          };

          setNotifications((prev) => [newNotif, ...prev].slice(0, 3));

          const timer = setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            notifTimersRef.current.delete(id);
          }, 2000);
          notifTimersRef.current.set(id, timer);
        }
      }
    }

    prevLiveBetsRef.current = curr;
  }, [stream.liveBets, user?.id]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of notifTimersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleBet = useCallback(
    async (amount: number, autoCashout: number | null) => {
      try {
        await placeCrashBet(amount, autoCashout);
        if (user) updateBalance(user.balance - amount);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Erreur lors du pari.");
        throw err;
      }
    },
    [user, updateBalance],
  );

  const handleCashout = useCallback(async () => {
    try {
      const { payout } = await cashoutCrash();
      if (user) updateBalance(user.balance + payout);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur lors du cashout.");
      throw err;
    }
  }, [user, updateBalance]);

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  if (!user) return <LoadingScreen label="Chargement..." />;

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      {/*
        Desktop layout:
        ┌──────────────────────────┬──────────────────┐
        │  Curve (flex-1)          │  BetPanel (w-80) │
        │  [history pills]         │                  │
        │  [PlayerList]            │                  │
        └──────────────────────────┴──────────────────┘
        Mobile: flex-col (curve → panel → list)
      */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* ── Left column: curve + history + player list ── */}
        <div className="flex flex-col flex-1 gap-3">
          {/* Curve area with notification overlay */}
          <div className="relative min-h-[300px] lg:min-h-[380px]">
            {/* Curve card */}
            <div className="h-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 min-h-[300px] lg:min-h-[380px]">
              <CrashCurve
                status={stream.status}
                multiplier={stream.multiplier}
                crashPoint={stream.crashPoint}
                startTime={stream.startTime}
                countdown={stream.countdown}
                curvePoints={curvePoints}
              />
            </div>

            {/* Cashout notification overlay — absolute on top of curve */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
              <AnimatePresence initial={false}>
                {notifications.map((n) => (
                  <CashoutNotifPill key={n.id} notif={n} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* History pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <AnimatePresence initial={false}>
              {stream.history.map((entry) => (
                <CrashHistoryPill key={entry.roundNumber} crashPoint={entry.crashPoint} />
              ))}
            </AnimatePresence>
          </div>

          {/* Player list */}
          <CrashPlayerList
            bets={stream.liveBets}
            currentUserId={user.id}
            status={stream.status}
            multiplier={stream.multiplier}
          />
        </div>

        {/* ── Right column: bet panel ── */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/95 p-5">
            <CrashBetPanel
              stream={stream}
              onBet={handleBet}
              onCashout={handleCashout}
              onBetPlaced={setMyBetOptimistic}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
