import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate";
import { crashBetSchema } from "../schemas/casino.schemas";
import { crashSSEService } from "../services/crash-sse.service";
import { crashService } from "../services/crash.service";

export const crashRouter = Router();

function getAuthUserId(request: unknown): string {
  const authUser = (request as { auth?: { id?: string } }).auth;
  if (!authUser?.id) throw new Error("Missing authenticated user");
  return authUser.id;
}

// GET /casino/crash/stream — SSE stream
crashRouter.get("/stream", requireAuth, (req, res) => {
  const userId = getAuthUserId(req);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  crashSSEService.addClient(userId, res);

  // Send current state immediately so the client syncs on connect
  const currentState = crashService.getState();
  res.write(`data: ${JSON.stringify({ type: "state", ...currentState })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    crashSSEService.removeClient(userId);
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
});

// GET /casino/crash/state — current state + history
// NOTE: this route intentionally bypasses the crashDisabled feature flag
// (configured in featureFlags.ts via the "except" list)
crashRouter.get("/state", requireAuth, async (req, res, next) => {
  try {
    const state = crashService.getState();
    const history = await crashService.getHistory(20);
    res.json({ ...state, history });
  } catch (err) {
    next(err);
  }
});

// POST /casino/crash/bet — place a bet (WAITING only)
crashRouter.post("/bet", requireAuth, validateBody(crashBetSchema), async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const { amount, autoCashout } = req.body as { amount: number; autoCashout?: number };
    const result = await crashService.placeBet(userId, amount, autoCashout ?? null);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /casino/crash/cashout — manual cashout (RUNNING only)
crashRouter.post("/cashout", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const result = await crashService.cashout(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
