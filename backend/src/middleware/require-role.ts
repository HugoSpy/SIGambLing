import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";

export function requireRole(roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    const authUser = (request as { auth?: { role?: UserRole } }).auth;

    if (!authUser) {
      next(new AppError("Authentification requise.", 401));
      return;
    }

    if (!authUser.role || !roles.includes(authUser.role)) {
      next(new AppError("Permissions insuffisantes.", 403));
      return;
    }

    next();
  };
}
