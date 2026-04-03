import type { RequestHandler } from "express";
import { userSearchQuerySchema } from "../schemas/events.schemas";
import { eventService } from "../services/event.service";
import { userService } from "../services/user.service";
import type { UploadedFile } from "../types/upload";
import { AppError } from "../utils/app-error";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authUser = (request as { auth?: { id?: string } }).auth;

  if (!authUser?.id) {
    throw new AppError("Utilisateur non authentifié.", 401);
  }

  return authUser.id;
}

export const getCurrentUserController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const currentUser = await userService.getCurrentUser(userId);
    response.json(currentUser);
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUserController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const updatedUser = await userService.updateCurrentUser(userId, request.body);
    response.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const uploadCurrentUserAvatarController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const requestWithFile = request as typeof request & { file?: UploadedFile };
    const updatedUser = await userService.uploadAvatar(userId, requestWithFile.file);
    response.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const claimCurrentUserGitHubBonusController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const result = await userService.claimGitHubBonus(userId);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listCurrentUserEventBetsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const bets = await eventService.getUserBets(userId);
    response.json({ bets });
  } catch (error) {
    next(error);
  }
};

export const searchUsersController: RequestHandler = async (request, response, next) => {
  try {
    const parsedQuery = userSearchQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      next(parsedQuery.error);
      return;
    }

    const users = await userService.searchAdminUsers(parsedQuery.data.search);
    response.json({ users });
  } catch (error) {
    next(error);
  }
};

export const adjustUserBalanceController: RequestHandler = async (request, response, next) => {
  try {
    const adminId = getAuthenticatedUserId(request);
    const userId = String(request.params.id);
    const user = await userService.adjustUserBalance(adminId, userId, request.body);
    response.json({ user });
  } catch (error) {
    next(error);
  }
};

export const unlockUserBadgeController: RequestHandler = async (request, response, next) => {
  try {
    const adminId = getAuthenticatedUserId(request);
    const userId = String(request.params.id);
    const outcome = await userService.unlockUserBadge(adminId, userId, request.body);
    response.json(outcome);
  } catch (error) {
    next(error);
  }
};

export const listAvailableBadgesController: RequestHandler = async (_request, response, next) => {
  try {
    const badges = userService.listAvailableBadges();
    response.json({ badges });
  } catch (error) {
    next(error);
  }
};
