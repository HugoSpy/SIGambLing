import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import * as robinHoodService from "../services/robin-hood.service";
import { AppError } from "../utils/app-error";

export const robinHoodRouter = Router();

robinHoodRouter.get("/current", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const event = await robinHoodService.getCurrentEvent();
    if (!event) {
      res.json(null);
      return;
    }

    const myVote = event.votes.find((v) => v.voterId === userId)?.targetId ?? null;
    const { votes: _votes, ...rest } = event;
    res.json({ ...rest, myVote });
  } catch (err) {
    next(err);
  }
});

robinHoodRouter.get("/candidates", requireAuth, async (_req, res, next) => {
  try {
    const candidates = await robinHoodService.getRobinHoodCandidates();
    res.json(candidates);
  } catch (err) {
    next(err);
  }
});

robinHoodRouter.post("/vote", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { targetId } = req.body as { targetId?: string };
    if (!targetId) throw new AppError("targetId requis.", 400);

    const event = await robinHoodService.getCurrentEvent();
    if (!event || event.status !== "VOTE") {
      throw new AppError("Aucun vote en cours.", 400);
    }

    await robinHoodService.castVote(event.id, userId, targetId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

robinHoodRouter.get("/history", requireAuth, async (_req, res, next) => {
  try {
    const history = await robinHoodService.getHistory();
    res.json(history);
  } catch (err) {
    next(err);
  }
});
