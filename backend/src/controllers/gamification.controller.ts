import type { RequestHandler } from "express";
import { gamificationService } from "../services/gamification.service";
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

export const claimDailyRewardController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const reward = await gamificationService.claimDailyReward(userId);
    response.json(reward);
  } catch (error) {
    next(error);
  }
};
