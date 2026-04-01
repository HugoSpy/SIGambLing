import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../config/env";
import type { TokenPayload } from "../types/auth";

function buildPayload(user: User, tokenType: TokenPayload["tokenType"]): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    tokenType,
  };
}

export function signAccessToken(user: User) {
  return jwt.sign(buildPayload(user, "access"), env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(user: User) {
  return jwt.sign(buildPayload(user, "refresh"), env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
