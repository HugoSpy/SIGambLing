import type { RequestHandler } from "express";
import { gamificationService } from "../services/gamification.service";
import { jackpotService } from "../services/jackpot.service";
import { AppError } from "../utils/app-error";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authUser = (request as { auth?: { id?: string } }).auth;

  if (!authUser?.id) {
    throw new AppError("Utilisateur non authentifie.", 401);
  }

  return authUser.id;
}

export const getMyGamificationStateController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const gamification = await gamificationService.getState(userId);
    response.json(gamification);
  } catch (error) {
    next(error);
  }
};

export const getMyJackpotStateController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const gamification = await gamificationService.getState(userId);
    response.json(gamification.jackpot);
  } catch (error) {
    next(error);
  }
};

export const getMyLeaderboardController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const scope = request.query.scope === "casino" ? "casino" : "global";
    const rawLimit =
      typeof request.query.limit === "string" ? Number.parseInt(request.query.limit, 10) : undefined;
    const leaderboard = await gamificationService.getLeaderboard(userId, {
      scope,
      limit: Number.isFinite(rawLimit) ? rawLimit : undefined,
    });
    response.json(leaderboard);
  } catch (error) {
    next(error);
  }
};

export const claimDailyRewardController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const reward = await gamificationService.claimDailyReward(userId);
    response.json(reward);
  } catch (error) {
    next(error);
  }
};

export const triggerJackpotPayoutController: RequestHandler = async (request, response, next) => {
  try {
    const winnerUserId = (request.body as { winner_user_id?: string }).winner_user_id;

    if (!winnerUserId) {
      throw new AppError("Aucun gagnant jackpot n'a ete transmis.", 400);
    }

    const result = await jackpotService.triggerGoldEventWinner(winnerUserId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const claimBadgeRewardController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const { badgeType } = request.params as { badgeType: string };

    if (!badgeType || typeof badgeType !== "string" || badgeType.trim().length === 0) {
      throw new AppError("Type de badge invalide.", 400);
    }

    const result = await gamificationService.claimBadgeReward(userId, badgeType);
    response.json(result);
  } catch (error) {
    next(error);
  }
};
