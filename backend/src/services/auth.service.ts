import { UserRole, type User } from "@prisma/client";
import type { Response } from "express";
import { env, isProduction } from "../config/env";
import { prisma } from "./prisma.service";
import { AppError } from "../utils/app-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

interface MicrosoftProfile {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  emails?: Array<{ value: string }>;
  _json: {
    mail?: string;
  };
}

function normalizePseudo(input: string) {
  const fallback = input.split("@")[0] ?? "player";
  const sanitized = fallback.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  return sanitized.length >= 3 ? sanitized : `EPITA${sanitized}`.slice(0, 20);
}

async function ensureUniquePseudo(basePseudo: string) {
  let candidate = basePseudo;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { pseudo: candidate } })) {
    const trimmed = basePseudo.slice(0, Math.max(3, 20 - String(suffix).length));
    candidate = `${trimmed}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function getMicrosoftEmail(profile: MicrosoftProfile) {
  const email =
    profile.emails?.find((entry: { value: string }) => entry.value)?.value ??
    profile.userPrincipalName;

  if (!email) {
    throw new AppError("Le profil Microsoft ne contient pas d'email exploitable.", 400);
  }

  if (!email.toLowerCase().endsWith("@epita.fr")) {
    throw new AppError("Connexion réservée aux emails @epita.fr.", 400);
  }

  return email.toLowerCase();
}

class AuthService {
  async resolveMicrosoftUser(profile: MicrosoftProfile) {
    const email = getMicrosoftEmail(profile);
    const existingUser =
      (await prisma.user.findFirst({
        where: {
          OR: [{ email }, { microsoftId: profile.id }],
        },
      })) ?? null;

    if (existingUser) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          microsoftId: profile.id,
          avatarUrl: profile._json.mail ?? existingUser.avatarUrl,
        },
      });
    }

    const basePseudo = normalizePseudo(profile.displayName ?? email);
    const pseudo = await ensureUniquePseudo(basePseudo);

    return prisma.user.create({
      data: {
        email,
        microsoftId: profile.id,
        pseudo,
        role: UserRole.user,
      },
    });
  }

  buildSession(user: User) {
    return {
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }

  applyRefreshCookie(response: Response, refreshToken: string) {
    response.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/auth",
      domain: env.COOKIE_DOMAIN || undefined,
    });
  }

  clearRefreshCookie(response: Response) {
    response.clearCookie("refresh_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/auth",
      domain: env.COOKIE_DOMAIN || undefined,
    });
  }

  async rotateRefreshToken(token: string) {
    const payload = verifyRefreshToken(token);

    if (payload.tokenType !== "refresh") {
      throw new AppError("Refresh token invalide.", 401);
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

    return {
      user,
      ...this.buildSession(user),
    };
  }

  async invalidateSession(token?: string | null) {
    if (!token) {
      return;
    }

    try {
      const payload = verifyRefreshToken(token);

      await prisma.user.update({
        where: { id: payload.userId },
        data: {
          sessionVersion: {
            increment: 1,
          },
        },
      });
    } catch {
      return;
    }
  }
}

export const authService = new AuthService();
