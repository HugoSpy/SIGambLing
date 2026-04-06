import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate";
import {
  addChatClient,
  getBanStatus,
  getHistory,
  removeChatClient,
  sendMessage,
} from "../services/chat.service";
import { AppError } from "../utils/app-error";

export const chatRouter = Router();

const messageSchema = z.object({
  content: z.string().min(1).max(300).trim(),
});

// GET /chat/history — last 50 messages
chatRouter.get("/history", requireAuth, async (_req, res, next) => {
  try {
    const messages = await getHistory();
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// GET /chat/ban-status — current user's ban record (or null)
chatRouter.get("/ban-status", requireAuth, async (req, res, next) => {
  try {
    const ban = await getBanStatus(req.user!.id);
    res.json(ban ?? null);
  } catch (err) {
    next(err);
  }
});

// POST /chat/message — send a message
chatRouter.post("/message", requireAuth, validateBody(messageSchema), async (req, res, next) => {
  try {
    const message = await sendMessage(req.user!.id, req.body.content as string, req.user!.role);
    res.status(201).json(message);
  } catch (err) {
    if (err instanceof AppError) {
      const body: Record<string, unknown> = { message: err.message };
      if (err.details) Object.assign(body, err.details);
      res.status(err.statusCode).json(body);
      return;
    }
    next(err);
  }
});

// GET /chat/stream — SSE endpoint
chatRouter.get("/stream", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  // Send initial heartbeat so the client knows the connection is open
  res.write(": connected\n\n");

  addChatClient(res);

  // Heartbeat every 15 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    removeChatClient(res);
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
});
