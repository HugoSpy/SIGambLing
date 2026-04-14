import crypto, { createHash } from "crypto";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";

// ─── Timing constants ─────────────────────────────────────────────────────────

const WAITING_DURATION_MS = 7000;
const CRASHED_DISPLAY_MS = 3000;

// ─── RNG ──────────────────────────────────────────────────────────────────────

function generateCrashData(maxMultiplier = 1000000): { crashPoint: number; seed: string; hash: string } {
  const seed = crypto.randomBytes(8).toString("hex");
  const hash = createHash("sha256").update(seed).digest("hex");
  const h = parseInt(hash.slice(0, 8), 16);
  const e = Math.pow(2, 32);
  const raw = (e / (e - h)) * 0.97;
  const crashPoint = Math.min(parseFloat(Math.max(1.0, raw).toFixed(2)), maxMultiplier);
  return { crashPoint, seed, hash };
}

function getMultiplierAtTime(elapsedMs: number): number {
  return parseFloat(Math.pow(Math.E, 0.00006 * elapsedMs).toFixed(2));
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BetState {
  userId: string;
  pseudo: string;
  avatarUrl: string | null;
  amount: number;
  autoCashout: number | null;
  cashedOut: boolean;
  cashedOutAt: number | null;
  payout: number;
}

interface CrashGameState {
  status: "WAITING" | "RUNNING" | "CRASHED";
  roundId: string | null;
  roundNumber: number;
  crashPoint: number;
  hash: string;
  startTime: number | null;
  bets: Map<string, BetState>;
  lastCrashPoint: number | null;
}

const state: CrashGameState = {
  status: "CRASHED",
  roundId: null,
  roundNumber: 0,
  crashPoint: 1.0,
  hash: "",
  startTime: null,
  bets: new Map(),
  lastCrashPoint: null,
};

// ─── Socket.io ────────────────────────────────────────────────────────────────

let io: SocketIOServer;

// userId → socket, for targeted emits (cashout_confirmed)
const userSockets = new Map<string, Socket>();

export function initCrashSocket(server: http.Server): void {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    path: "/socket.io/crash",
  });

  // Auth + feature-flag middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("unauthorized"));

      const payload = verifyAccessToken(token);
      if (payload.tokenType !== "access") return next(new Error("unauthorized"));

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          pseudo: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          sessionVersion: true,
        },
      });

      if (!user || user.isBanned) return next(new Error("unauthorized"));
      if (user.sessionVersion !== payload.sessionVersion) return next(new Error("unauthorized"));

      // crashDisabled feature flag — admins bypass
      if (user.role !== "admin") {
        const crashConfig = await prisma.siteConfig.findUnique({ where: { key: "crashDisabled" } });
        if (crashConfig?.value === "true") return next(new Error("crashDisabled"));
      }

      socket.data.userId = user.id;
      socket.data.pseudo = user.pseudo;
      socket.data.avatarUrl = user.avatarUrl;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    userSockets.set(userId, socket);

    // Send full current state to the newly connected client
    socket.emit("state", await crashService.getPublicState());

    socket.on("bet", async (data: { amount?: number; autoCashout?: number }) => {
      try {
        const amount = data?.amount;
        const autoCashout = data?.autoCashout ?? null;

        if (typeof amount !== "number" || amount < 10 || amount > 1_000_000) {
          socket.emit("bet_error", { message: "Montant invalide (min 10, max 1 000 000)." });
          return;
        }
        if (autoCashout !== null && (typeof autoCashout !== "number" || autoCashout < 1.01)) {
          socket.emit("bet_error", { message: "Auto-cashout invalide (min 1.01)." });
          return;
        }

        await crashService.placeBet(userId, amount, autoCashout);
      } catch (err) {
        const message = err instanceof AppError ? err.message : "Erreur lors du pari.";
        socket.emit("bet_error", { message });
      }
    });

    socket.on("cashout", async () => {
      try {
        await crashService.cashout(userId);
      } catch (err) {
        const message = err instanceof AppError ? err.message : "Erreur lors du cashout.";
        socket.emit("cashout_error", { message });
      }
    });

    socket.on("disconnect", () => {
      userSockets.delete(userId);
    });
  });
}

// ─── Service ──────────────────────────────────────────────────────────────────

class CrashService {
  // ── Public API ──────────────────────────────────────────────────────────────

  async getPublicState() {
    const bets = [...state.bets.values()].map((b) => ({
      userId: b.userId,
      pseudo: b.pseudo,
      avatarUrl: b.avatarUrl,
      amount: b.amount,
      // autoCashout intentionally omitted — private per player
      cashedOut: b.cashedOut,
      cashedOutAt: b.cashedOutAt,
      payout: b.payout,
    }));

    const history = await this.getHistory(20);

    return {
      status: state.status,
      roundNumber: state.roundNumber,
      hash: state.hash,
      startTime: state.startTime,
      lastCrashPoint: state.lastCrashPoint,
      bets,
      history,
      // crashPoint revealed only after crash
      ...(state.status === "CRASHED" ? { crashPoint: state.crashPoint } : {}),
    };
  }

  async getHistory(n = 20) {
    return prisma.crashRound.findMany({
      where: { status: "CRASHED" },
      orderBy: { roundNumber: "desc" },
      take: n,
      select: { roundNumber: true, crashPoint: true, hash: true, createdAt: true },
    });
  }

  async placeBet(userId: string, amount: number, autoCashout: number | null): Promise<{ success: true; amount: number }> {
    if (state.status !== "WAITING") {
      throw new AppError("Les paris ne sont acceptés que pendant la phase d'attente.", 400);
    }
    if (state.roundId === null) {
      throw new AppError("Round non initialisé.", 500);
    }
    if (state.bets.has(userId)) {
      throw new AppError("Tu as déjà parié sur ce round.", 409);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, pseudo: true, avatarUrl: true },
    });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < amount) throw new AppError("Solde insuffisant.", 400);

    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    await prisma.crashBet.create({
      data: {
        roundId: state.roundId,
        userId,
        amount,
        autoCashout,
      },
    });

    state.bets.set(userId, {
      userId,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
      amount,
      autoCashout,
      cashedOut: false,
      cashedOutAt: null,
      payout: 0,
    });

    // autoCashout NOT broadcast — private per player
    io?.emit("bet_placed", {
      userId,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
      amount,
    });

    return { success: true, amount };
  }

  async cashout(userId: string): Promise<{ payout: number; multiplier: number }> {
    if (state.status !== "RUNNING") {
      throw new AppError("Le cashout n'est possible que pendant la phase active.", 400);
    }

    const bet = state.bets.get(userId);
    if (!bet) throw new AppError("Aucun pari trouvé pour ce round.", 404);
    if (bet.cashedOut) throw new AppError("Tu as déjà cashouté.", 409);

    const elapsed = Date.now() - (state.startTime ?? Date.now());
    const multiplier = getMultiplierAtTime(elapsed);

    await this._processCashout(userId, multiplier);

    return { payout: bet.payout, multiplier };
  }

  // ── Internal cashout (shared by manual + auto) ──────────────────────────────

  private async _processCashout(userId: string, multiplier: number): Promise<void> {
    const bet = state.bets.get(userId);
    if (!bet || bet.cashedOut) return;

    // Mark synchronously before any await to prevent race conditions
    bet.cashedOut = true;
    bet.cashedOutAt = multiplier;
    const payout = Math.floor(bet.amount * multiplier);
    bet.payout = payout;

    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });

    if (state.roundId) {
      await prisma.crashBet.update({
        where: { roundId_userId: { roundId: state.roundId, userId } },
        data: { cashedOutAt: multiplier, payout },
      });
    }

    // Targeted emit — only to the player who cashed out
    userSockets.get(userId)?.emit("cashout_confirmed", { cashedOutAt: multiplier, payout });

    // Broadcast to all players
    io?.emit("player_cashout", {
      userId,
      pseudo: bet.pseudo,
      cashedOutAt: multiplier,
      payout,
    });
  }

  // ── Game loop ────────────────────────────────────────────────────────────────

  async startGameLoop(): Promise<void> {
    logger.info("[Crash] Game loop starting");
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await this._runWaitingPhase();
        await this._runRunningPhase();
        await this._runCrashedPhase();
      } catch (error) {
        logger.error("[Crash] Error in game loop, recovering in 3s", { error });
        await this._sleep(3000);
      }
    }
  }

  private async _runWaitingPhase(): Promise<void> {
    const { crashPoint, seed, hash } = generateCrashData();

    const round = await prisma.crashRound.create({
      data: { crashPoint, seed, hash, status: "WAITING" },
    });

    state.status = "WAITING";
    state.roundId = round.id;
    state.roundNumber = round.roundNumber;
    state.crashPoint = crashPoint;
    state.hash = hash;
    state.startTime = null;
    state.bets.clear();

    io?.emit("waiting", {
      roundNumber: state.roundNumber,
      hash: state.hash,
      countdown: Math.ceil(WAITING_DURATION_MS / 1000),
    });

    const endTime = Date.now() + WAITING_DURATION_MS;

    while (Date.now() < endTime) {
      const remaining = endTime - Date.now();
      await this._sleep(Math.min(1000, remaining));
      const countdown = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      io?.emit("waiting", {
        roundNumber: state.roundNumber,
        hash: state.hash,
        countdown,
      });
    }
  }

  private async _runRunningPhase(): Promise<void> {
    await prisma.crashRound.update({
      where: { id: state.roundId! },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    state.status = "RUNNING";
    state.startTime = Date.now();

    io?.emit("running", { startTime: state.startTime });

    // Time (ms) until multiplier reaches crashPoint: t = ln(crashPoint) / 0.00006
    const crashTimeMs = Math.max(0, Math.ceil(Math.log(state.crashPoint) / 0.00006));

    await new Promise<void>((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(autocashoutInterval);
        resolve();
      };

      const crashTimeout = setTimeout(done, crashTimeMs);

      const autocashoutInterval = setInterval(async () => {
        if (state.status !== "RUNNING" || state.startTime === null) {
          clearTimeout(crashTimeout);
          done();
          return;
        }

        const elapsed = Date.now() - state.startTime;
        const currentMultiplier = getMultiplierAtTime(elapsed);

        for (const [userId, bet] of state.bets) {
          if (!bet.cashedOut && bet.autoCashout !== null && currentMultiplier >= bet.autoCashout) {
            try {
              await this._processCashout(userId, bet.autoCashout);
            } catch (err) {
              logger.error("[Crash] Auto-cashout error", { userId, error: err });
            }
          }
        }
      }, 50);
    });
  }

  private async _runCrashedPhase(): Promise<void> {
    state.status = "CRASHED";
    state.lastCrashPoint = state.crashPoint;

    const crashedAt = new Date();
    const allBets = [...state.bets.values()];

    await prisma.crashRound.update({
      where: { id: state.roundId! },
      data: { status: "CRASHED", crashedAt },
    });

    // Record CasinoGame + gamification for each bettor
    for (const bet of allBets) {
      try {
        await prisma.casinoGame.create({
          data: {
            userId: bet.userId,
            gameType: "crash",
            betAmount: bet.amount,
            result: bet.cashedOut ? "win" : "loss",
            payout: bet.payout,
            gameData: {
              roundId: state.roundId,
              roundNumber: state.roundNumber,
              crashPoint: state.crashPoint,
              cashedOutAt: bet.cashedOutAt,
            },
          },
        });
        await gamificationService.synchronizeUserBadges(bet.userId);
        await gamificationService.triggerLeaderboardTop3(bet.userId);
      } catch (err) {
        logger.error("[Crash] Error recording casino game", { userId: bet.userId, error: err });
      }
    }

    // Jackpot contribution (1% of each wager = 100 bps)
    for (const bet of allBets) {
      try {
        await jackpotService.recordCasinoContribution(bet.userId, bet.amount, "crash");
      } catch (err) {
        logger.error("[Crash] Jackpot contribution error", { userId: bet.userId, error: err });
      }
    }

    io?.emit("crashed", {
      crashPoint: state.crashPoint,
      bets: allBets.map((b) => ({
        userId: b.userId,
        pseudo: b.pseudo,
        avatarUrl: b.avatarUrl,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashedOutAt: b.cashedOutAt,
        payout: b.payout,
      })),
    });

    io?.emit("round_result", {
      roundNumber: state.roundNumber,
      crashPoint: state.crashPoint,
    });

    await this._sleep(CRASHED_DISPLAY_MS);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const crashService = new CrashService();
