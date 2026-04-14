import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth-store";

export interface CrashHistoryEntry {
  roundNumber: number;
  crashPoint: number;
}

export interface CrashStreamState {
  status: "WAITING" | "RUNNING" | "CRASHED" | "CONNECTING";
  roundNumber: number;
  hash: string;
  countdown: number;
  startTime: number | null;
  crashPoint: number | null;
  myBet: { amount: number; autoCashout: number | null; cashedOutAt: number | null } | null;
  multiplier: number;
  history: CrashHistoryEntry[];
  // live bets for current round (for social display)
  liveBets: { userId: string; pseudo: string; avatarUrl: string | null; amount: number; cashedOut: boolean; cashedOutAt: number | null; payout: number }[];
}

function calcMultiplier(startTime: number): number {
  const elapsed = Date.now() - startTime;
  return parseFloat(Math.pow(Math.E, 0.00006 * elapsed).toFixed(2));
}

const DEFAULT_STATE: CrashStreamState = {
  status: "CONNECTING",
  roundNumber: 0,
  hash: "",
  countdown: 7,
  startTime: null,
  crashPoint: null,
  myBet: null,
  multiplier: 1.0,
  history: [],
  liveBets: [],
};

export function useCrashStream() {
  const [state, setState] = useState<CrashStreamState>(DEFAULT_STATE);

  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const myBetRef = useRef<CrashStreamState["myBet"]>(null);
  // Tracks the active round number so waiting-countdown ticks (same round) don't reset myBet
  const currentRoundRef = useRef<number>(0);

  // rAF loop — only runs during RUNNING
  const startRaf = useCallback(() => {
    if (rafRef.current !== null) return;

    const tick = () => {
      const st = startTimeRef.current;
      if (st === null) return;
      const m = calcMultiplier(st);
      setState((prev) => ({ ...prev, multiplier: m }));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL as string;

    const socket: Socket = io(baseURL, {
      path: "/socket.io/crash",
      auth: { token },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect_error", () => {
      setState((prev) => ({ ...prev, status: "CONNECTING" }));
    });

    socket.on("state", (data: Record<string, unknown>) => {
      const status = data.status as CrashStreamState["status"];
      const startTime = (data.startTime as number | null) ?? null;
      const incomingRound = (data.roundNumber as number) ?? 0;
      startTimeRef.current = startTime;
      currentRoundRef.current = incomingRound;

      // Restore own bet on reconnect (covers mid-round rejoin)
      if (!myBetRef.current) {
        const myUserId = useAuthStore.getState().user?.id;
        const rawBets = (data.bets as Array<Record<string, unknown>>) ?? [];
        const myBetData = myUserId ? (rawBets.find((b) => b.userId === myUserId) ?? null) : null;
        if (myBetData) {
          myBetRef.current = {
            amount: myBetData.amount as number,
            autoCashout: (myBetData.autoCashout as number | null) ?? null,
            cashedOutAt: (myBetData.cashedOutAt as number | null) ?? null,
          };
        }
      }

      const restoredMyBet = myBetRef.current;
      setState((prev) => ({
        ...prev,
        status,
        roundNumber: incomingRound,
        hash: (data.hash as string) ?? "",
        countdown: (data.countdown as number) ?? 0,
        startTime,
        crashPoint: (data.crashPoint as number | null) ?? null,
        multiplier: startTime ? calcMultiplier(startTime) : 1.0,
        history: (data.history as CrashHistoryEntry[]) ?? [],
        liveBets: (data.bets as CrashStreamState["liveBets"]) ?? [],
        myBet: restoredMyBet ?? prev.myBet,
      }));

      if (status === "RUNNING" && startTime !== null) {
        startRaf();
      }
    });

    socket.on("waiting", (data: Record<string, unknown>) => {
      stopRaf();
      startTimeRef.current = null;
      const incomingRound = (data.roundNumber as number) ?? 0;
      // Only reset myBet and liveBets when a genuinely new round starts.
      // Repeated countdown ticks for the same round must NOT wipe the player's active bet.
      const isNewRound = incomingRound !== currentRoundRef.current;
      if (isNewRound) {
        currentRoundRef.current = incomingRound;
        myBetRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        status: "WAITING",
        roundNumber: incomingRound,
        hash: (data.hash as string) ?? "",
        countdown: (data.countdown as number) ?? 7,
        startTime: null,
        crashPoint: null,
        multiplier: 1.0,
        ...(isNewRound ? { myBet: null, liveBets: [] } : {}),
      }));
    });

    socket.on("running", (data: Record<string, unknown>) => {
      const startTime = data.startTime as number;
      startTimeRef.current = startTime;

      setState((prev) => ({
        ...prev,
        status: "RUNNING",
        startTime,
        multiplier: calcMultiplier(startTime),
      }));

      startRaf();
    });

    socket.on("crashed", (data: Record<string, unknown>) => {
      stopRaf();
      const crashPoint = data.crashPoint as number;
      const bets = (data.bets as CrashStreamState["liveBets"]) ?? [];

      const myUserId = useAuthStore.getState().user?.id;
      const myBetResult = myUserId ? (bets.find((b) => b.userId === myUserId) ?? null) : null;

      if (myBetResult && myBetRef.current) {
        myBetRef.current = {
          ...myBetRef.current,
          cashedOutAt: myBetResult.cashedOutAt,
        };
      }

      setState((prev) => ({
        ...prev,
        status: "CRASHED",
        crashPoint,
        multiplier: crashPoint,
        myBet: myBetRef.current,
        liveBets: bets,
        history: [
          { roundNumber: data.roundNumber as number, crashPoint },
          ...prev.history,
        ].slice(0, 20),
      }));
    });

    socket.on("bet_placed", (data: Record<string, unknown>) => {
      const newBet = {
        userId: data.userId as string,
        pseudo: data.pseudo as string,
        avatarUrl: (data.avatarUrl as string | null) ?? null,
        amount: data.amount as number,
        cashedOut: false,
        cashedOutAt: null,
        payout: 0,
      };

      // Capture own bet — autoCashout not in broadcast (private), will be set via setMyBetOptimistic
      const myUserId = useAuthStore.getState().user?.id;
      const isMyBet = data.userId === myUserId;
      let ownBet: CrashStreamState["myBet"] = null;
      if (isMyBet) {
        ownBet = {
          amount: data.amount as number,
          autoCashout: null, // not broadcast by server — set via setMyBetOptimistic
          cashedOutAt: null,
        };
        myBetRef.current = ownBet;
      }

      setState((prev) => ({
        ...prev,
        liveBets: [...prev.liveBets.filter((b) => b.userId !== newBet.userId), newBet],
        ...(isMyBet ? { myBet: ownBet } : {}),
      }));
    });

    socket.on("player_cashout", (data: Record<string, unknown>) => {
      const userId = data.userId as string;
      const cashedOutAt = data.cashedOutAt as number;

      setState((prev) => ({
        ...prev,
        liveBets: prev.liveBets.map((b) =>
          b.userId === userId
            ? { ...b, cashedOut: true, cashedOutAt, payout: data.payout as number }
            : b,
        ),
      }));

      // Update own bet cashout info
      const myUserId = useAuthStore.getState().user?.id;
      if (userId === myUserId && myBetRef.current) {
        myBetRef.current = { ...myBetRef.current, cashedOutAt };
        setState((prev) => ({ ...prev, myBet: myBetRef.current }));
      }
    });

    socket.on("cashout_confirmed", (data: Record<string, unknown>) => {
      // Targeted confirmation — only received by the player who cashed out
      const cashedOutAt = data.cashedOutAt as number;
      if (myBetRef.current) {
        myBetRef.current = { ...myBetRef.current, cashedOutAt };
        setState((prev) => ({ ...prev, myBet: myBetRef.current }));
      }
    });

    return () => {
      stopRaf();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [startRaf, stopRaf]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const placeBet = useCallback((amount: number, autoCashout?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error("Non connecté au serveur."));
        return;
      }

      const myUserId = useAuthStore.getState().user?.id;

      const onBetPlaced = (data: Record<string, unknown>) => {
        if (data.userId !== myUserId) return; // not our confirmation
        cleanup();
        resolve();
      };
      const onBetError = ({ message }: { message: string }) => {
        cleanup();
        reject(new Error(message));
      };
      const cleanup = () => {
        socket.off("bet_placed", onBetPlaced);
        socket.off("bet_error", onBetError);
      };

      socket.on("bet_placed", onBetPlaced);
      socket.once("bet_error", onBetError);
      socket.emit("bet", { amount, autoCashout: autoCashout ?? null });
    });
  }, []);

  const cashout = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error("Non connecté au serveur."));
        return;
      }

      const onConfirmed = () => {
        cleanup();
        resolve();
      };
      const onError = ({ message }: { message: string }) => {
        cleanup();
        reject(new Error(message));
      };
      const cleanup = () => {
        socket.off("cashout_confirmed", onConfirmed);
        socket.off("cashout_error", onError);
      };

      socket.once("cashout_confirmed", onConfirmed);
      socket.once("cashout_error", onError);
      socket.emit("cashout");
    });
  }, []);

  const setMyBetOptimistic = useCallback(
    (amount: number, autoCashout: number | null) => {
      // Capture before setState so the updater closure reads a stable value
      const bet: CrashStreamState["myBet"] = { amount, autoCashout, cashedOutAt: null };
      myBetRef.current = bet;
      setState((prev) => ({ ...prev, myBet: bet }));
    },
    [],
  );

  return { ...state, setMyBetOptimistic, placeBet, cashout };
}
