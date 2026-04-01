import type { RequestHandler } from "express";
import { userService } from "../services/user.service";
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
    const updatedUser = await userService.uploadAvatar(userId, request.file);
    response.json(updatedUser);
  } catch (error) {
    next(error);
  }
};
