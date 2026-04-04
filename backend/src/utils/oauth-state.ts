import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { env, isProduction } from "../config/env";
import { resolveRefreshCookieSameSite } from "../config/security";
import { AppError } from "./app-error";

const MICROSOFT_OAUTH_STATE_COOKIE = "microsoft_oauth_state";
const MICROSOFT_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MICROSOFT_OAUTH_STATE_TTL_SECONDS = MICROSOFT_OAUTH_STATE_TTL_MS / 1000;

type MicrosoftOAuthStatePayload = {
  purpose: "microsoft_oauth_state";
  nonce: string;
  iat?: number;
  exp?: number;
};

function getMicrosoftOAuthStateCookieOptions() {
  const sameSite = resolveRefreshCookieSameSite({
    frontendUrl: env.FRONTEND_URL,
    apiBaseUrl: env.API_BASE_URL,
    isProduction,
    explicitPolicy: env.COOKIE_SAME_SITE,
  });

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: MICROSOFT_OAUTH_STATE_TTL_MS,
    path: "/auth",
    domain: env.COOKIE_DOMAIN || undefined,
  };
}

export function issueMicrosoftOAuthState(response: Response) {
  const state = jwt.sign(
    {
      purpose: "microsoft_oauth_state",
      nonce: crypto.randomBytes(32).toString("hex"),
    } satisfies MicrosoftOAuthStatePayload,
    env.JWT_SECRET,
    { expiresIn: MICROSOFT_OAUTH_STATE_TTL_SECONDS },
  );

  response.cookie(MICROSOFT_OAUTH_STATE_COOKIE, state, getMicrosoftOAuthStateCookieOptions());
  return state;
}

export function clearMicrosoftOAuthState(response: Response) {
  const sameSite = resolveRefreshCookieSameSite({
    frontendUrl: env.FRONTEND_URL,
    apiBaseUrl: env.API_BASE_URL,
    isProduction,
    explicitPolicy: env.COOKIE_SAME_SITE,
  });

  response.clearCookie(MICROSOFT_OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/auth",
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

export function verifyMicrosoftOAuthState(request: Request) {
  const state = typeof request.query.state === "string" ? request.query.state : undefined;
  const cookieState =
    typeof request.cookies?.[MICROSOFT_OAUTH_STATE_COOKIE] === "string"
      ? request.cookies[MICROSOFT_OAUTH_STATE_COOKIE]
      : undefined;

  if (!state || !cookieState) {
    throw new AppError("Etat OAuth Microsoft manquant.", 403);
  }

  if (state !== cookieState) {
    throw new AppError("Etat OAuth Microsoft invalide.", 403);
  }

  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as MicrosoftOAuthStatePayload;

    if (payload.purpose !== "microsoft_oauth_state" || typeof payload.nonce !== "string" || payload.nonce.length < 32) {
      throw new AppError("Etat OAuth Microsoft invalide.", 403);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Etat OAuth Microsoft invalide ou expiré.", 403);
  }
}
