import type { RequestHandler } from "express";
import { getUserWins, getWinForShare } from "../services/wins.service";
import { sendMessage } from "../services/chat.service";
import { AppError } from "../utils/app-error";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authUser = (request as { auth?: { id?: string } }).auth;
  if (!authUser?.id) {
    throw new AppError("Utilisateur non authentifié.", 401);
  }
  return authUser.id;
}

export const getMyWinsController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);

    const sort = (request.query.sort as string) || "recent";
    if (!["recent", "best_gain", "biggest_bet"].includes(sort)) {
      throw new AppError("Paramètre sort invalide.", 400);
    }

    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(request.query.limit) || 20));
    const offset = (page - 1) * limit;

    const result = await getUserWins(userId, sort as "recent" | "best_gain" | "biggest_bet", limit, offset);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const shareWinController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const { winId, winType } = request.body as { winId: string; winType: "bet" | "casino" };

    const win = await getWinForShare(userId, winId, winType);

    let content: string;
    if (win.source === "roulette") {
      content = `🎰 J'ai gagné ${win.profit} tokens en misant ${win.amount} à la Roulette !`;
    } else if (win.source === "blackjack") {
      content = `🃏 J'ai gagné ${win.profit} tokens en misant ${win.amount} au Blackjack !`;
    } else {
      content = `🏆 J'ai gagné ${win.profit} tokens en pariant ${win.amount} sur ${win.eventTitle ?? "un événement"} !`;
    }

    const authUser = (request as { auth?: { role?: string } }).auth;
    await sendMessage(userId, content, authUser?.role);

    response.json({ success: true, message: content });
  } catch (error) {
    next(error);
  }
};
