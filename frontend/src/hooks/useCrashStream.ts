import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/auth-store";
import { getCrashState } from "../lib/api";

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

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const myBetRef = useRef<CrashStreamState["myBet"]>(null);

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

  const handleEvent = useCallback(
    (event: Record<string, unknown>) => {
      const type = event.type as string;

      if (type === "state") {
        // Initial hydration on connect
        const status = event.status as CrashStreamState["status"];
        const startTime = (event.startTime as number | null) ?? null;
        startTimeRef.current = startTime;

        setState((prev) => ({
          ...prev,
          status,
          roundNumber: (event.roundNumber as number) ?? 0,
          hash: (event.hash as string) ?? "",
          countdown: (event.countdown as number) ?? 0,
          startTime,
          crashPoint: (event.crashPoint as number | null) ?? null,
          multiplier: startTime ? calcMultiplier(startTime) : 1.0,
          history: (event.history as CrashHistoryEntry[]) ?? [],
          liveBets: (event.bets as CrashStreamState["liveBets"]) ?? [],
        }));

        if (status === "RUNNING" && startTime !== null) {
          startRaf();
        }
        return;
      }

      if (type === "waiting") {
        stopRaf();
        startTimeRef.current = null;
        myBetRef.current = null;

        setState((prev) => ({
          ...prev,
          status: "WAITING",
          roundNumber: (event.roundNumber as number) ?? prev.roundNumber,
          hash: (event.hash as string) ?? "",
          countdown: (event.countdown as number) ?? 7,
          startTime: null,
          crashPoint: null,
          multiplier: 1.0,
          myBet: null,
          liveBets: [],
        }));
        return;
      }

      if (type === "running") {
        const startTime = event.startTime as number;
        startTimeRef.current = startTime;

        setState((prev) => ({
          ...prev,
          status: "RUNNING",
          startTime,
          multiplier: calcMultiplier(startTime),
        }));

        startRaf();
        return;
      }

      if (type === "crashed") {
        stopRaf();
        const crashPoint = event.crashPoint as number;
        const bets = (event.bets as CrashStreamState["liveBets"]) ?? [];

        // Find our bet in the results
        const myUserId = useAuthStore.getState().user?.id;
        const myBetResult = myUserId
          ? bets.find((b) => b.userId === myUserId) ?? null
          : null;

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
            { roundNumber: event.roundNumber as number, crashPoint },
            ...prev.history,
          ].slice(0, 20),
        }));
        return;
      }

      if (type === "bet_placed") {
        const newBet = {
          userId: event.userId as string,
          pseudo: event.pseudo as string,
          avatarUrl: (event.avatarUrl as string | null) ?? null,
          amount: event.amount as number,
          cashedOut: false,
          cashedOutAt: null,
          payout: 0,
        };
        setState((prev) => ({
          ...prev,
          liveBets: [...prev.liveBets.filter((b) => b.userId !== newBet.userId), newBet],
        }));

        // Track our own bet
        const myUserId = useAuthStore.getState().user?.id;
        if (event.userId === myUserId) {
          myBetRef.current = {
            amount: event.amount as number,
            autoCashout: (event.autoCashout as number | null) ?? null,
            cashedOutAt: null,
          };
          setState((prev) => ({
            ...prev,
            myBet: myBetRef.current,
          }));
        }
        return;
      }

      if (type === "player_cashout") {
        const userId = event.userId as string;
        const cashedOutAt = event.multiplier as number;

        setState((prev) => ({
          ...prev,
          liveBets: prev.liveBets.map((b) =>
            b.userId === userId
              ? { ...b, cashedOut: true, cashedOutAt, payout: event.payout as number }
              : b,
          ),
        }));

        // Update our own bet cashout info
        const myUserId = useAuthStore.getState().user?.id;
        if (userId === myUserId && myBetRef.current) {
          myBetRef.current = { ...myBetRef.current, cashedOutAt };
          setState((prev) => ({
            ...prev,
            myBet: myBetRef.current,
          }));
        }
        return;
      }

      if (type === "cashout_confirmed") {
        // Server-side confirmation of our own cashout
        const cashedOutAt = event.multiplier as number;
        if (myBetRef.current) {
          myBetRef.current = { ...myBetRef.current, cashedOutAt };
          setState((prev) => ({
            ...prev,
            myBet: myBetRef.current,
          }));
        }
        return;
      }
    },
    [startRaf, stopRaf],
  );

  const connect = useCallback(async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL as string;
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${baseURL}/casino/crash/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferRef.current += decoder.decode(value, { stream: true });
        const parts = bufferRef.current.split("\n\n");
        bufferRef.current = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line || line.startsWith(":")) continue;
          if (line.startsWith("data:")) {
            const json = line.slice("data:".length).trim();
            try {
              handleEvent(JSON.parse(json) as Record<string, unknown>);
            } catch {
              // ignore malformed
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Reconnect after 3 s on unexpected disconnect
      setTimeout(() => void connect(), 3000);
    }
  }, [handleEvent]);

  // Hydrate from REST on mount (handles mid-round join)
  useEffect(() => {
    void (async () => {
      try {
        const data = await getCrashState();
        const startTime = data.startTime ?? null;
        startTimeRef.current = startTime;

        if (data.status === "RUNNING" && startTime !== null) {
          // Restore own bet if present
          const myUserId = useAuthStore.getState().user?.id;
          const myBetData = myUserId
            ? (data.bets ?? []).find((b: { userId: string }) => b.userId === myUserId)
            : null;

          if (myBetData) {
            myBetRef.current = {
              amount: myBetData.amount,
              autoCashout: myBetData.autoCashout ?? null,
              cashedOutAt: myBetData.cashedOutAt ?? null,
            };
          }

          setState((prev) => ({
            ...prev,
            status: "RUNNING",
            roundNumber: data.roundNumber ?? 0,
            hash: data.hash ?? "",
            startTime,
            multiplier: calcMultiplier(startTime),
            history: data.history ?? [],
            liveBets: data.bets ?? [],
            myBet: myBetRef.current,
          }));

          startRaf();
        } else if (data.status === "WAITING") {
          setState((prev) => ({
            ...prev,
            status: "WAITING",
            roundNumber: data.roundNumber ?? 0,
            hash: data.hash ?? "",
            countdown: data.countdown ?? 7,
            history: data.history ?? [],
            liveBets: data.bets ?? [],
          }));
        } else if (data.status === "CRASHED") {
          setState((prev) => ({
            ...prev,
            status: "CRASHED",
            roundNumber: data.roundNumber ?? 0,
            crashPoint: data.crashPoint ?? null,
            multiplier: data.crashPoint ?? 1.0,
            history: data.history ?? [],
            liveBets: data.bets ?? [],
          }));
        }
      } catch {
        // silently fail — SSE will hydrate
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void connect();
    return () => {
      stopRaf();
      abortRef.current?.abort();
      readerRef.current?.cancel().catch(() => {});
    };
  }, [connect, stopRaf]);

  return state;
}
