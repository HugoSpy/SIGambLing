import test from "node:test";
import assert from "node:assert/strict";
import type { User } from "@prisma/client";
import { authService } from "../src/services/auth.service";
import { prisma } from "../src/services/prisma.service";
import { signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../src/utils/jwt";
import { AppError } from "../src/utils/app-error";

function stubProperty<T extends object, K extends keyof T>(
  target: T,
  key: K,
  replacement: T[K],
) {
  const original = target[key];
  target[key] = replacement;

  return () => {
    target[key] = original;
  };
}

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-04-03T12:00:00.000Z");

  return {
    id: "user-1",
    email: "student@epita.fr",
    microsoftId: "ms-1",
    pseudo: "SigmaStudent",
    avatarUrl: null,
    balance: 1000,
    role: "user",
    isBanned: false,
    sessionVersion: 0,
    lastRewardAt: null,
    streakDays: 0,
    acceptOddsChanges: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("rotateRefreshToken makes refresh tokens single-use by bumping sessionVersion", async () => {
  const state = {
    user: createUser(),
  };

  const restores = [
    stubProperty(prisma.user, "findUnique", async () => state.user) as never,
    stubProperty(
      prisma.user,
      "updateMany",
      async ({
        where,
      }: {
        where: { id: string; sessionVersion: number };
      }) => {
        if (where.id !== state.user.id || where.sessionVersion !== state.user.sessionVersion) {
          return { count: 0 };
        }

        state.user = createUser({
          ...state.user,
          sessionVersion: state.user.sessionVersion + 1,
        });

        return { count: 1 };
      },
    ) as never,
  ];

  try {
    const initialRefreshToken = signRefreshToken(state.user);
    const firstRotation = await authService.rotateRefreshToken(initialRefreshToken);

    assert.equal(firstRotation.user.sessionVersion, 1);

    const rotatedRefreshPayload = verifyRefreshToken(firstRotation.refreshToken);
    const rotatedAccessPayload = verifyAccessToken(firstRotation.accessToken);

    assert.equal(rotatedRefreshPayload.sessionVersion, 1);
    assert.equal(rotatedAccessPayload.sessionVersion, 1);

    await assert.rejects(
      authService.rotateRefreshToken(initialRefreshToken),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 401 &&
        error.message === "Session expirée, reconnecte-toi.",
    );
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});

test("invalidateSession only revokes the currently active refresh token generation", async () => {
  const state = {
    user: createUser({
      sessionVersion: 2,
    }),
  };

  const restores = [
    stubProperty(
      prisma.user,
      "updateMany",
      async ({
        where,
      }: {
        where: { id: string; sessionVersion: number };
      }) => {
        if (where.id !== state.user.id || where.sessionVersion !== state.user.sessionVersion) {
          return { count: 0 };
        }

        state.user = createUser({
          ...state.user,
          sessionVersion: state.user.sessionVersion + 1,
        });

        return { count: 1 };
      },
    ) as never,
  ];

  try {
    const staleToken = signRefreshToken(
      createUser({
        id: state.user.id,
        sessionVersion: 1,
      }),
    );
    const currentToken = signRefreshToken(state.user);

    await authService.invalidateSession(staleToken);
    assert.equal(state.user.sessionVersion, 2);

    await authService.invalidateSession(currentToken);
    assert.equal(state.user.sessionVersion, 3);
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});
