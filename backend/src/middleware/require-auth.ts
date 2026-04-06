import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Access token manquant.", 401);
    }

    const token = authorization.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    if (payload.tokenType !== "access") {
      throw new AppError("Access token invalide.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable ou banni.", 401);
    }

    if (user.sessionVersion !== payload.sessionVersion) {
      throw new AppError("Session expirée, reconnecte-toi.", 401);
    }

    const authPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
    (request as { auth?: typeof authPayload }).auth = authPayload;
    request.user = authPayload;

    // Fire-and-forget — update lastSeenAt without blocking the request
    prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});

    next();
  } catch (error) {
    next(error);
  }
};
