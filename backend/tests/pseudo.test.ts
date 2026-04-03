import test from "node:test";
import assert from "node:assert/strict";
import { gamificationService } from "../src/services/gamification.service";
import { userService } from "../src/services/user.service";
import { prisma } from "../src/lib/prisma";
import { buildPseudoFromEpitaEmail, ensureUniquePseudo } from "../src/utils/pseudo";

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

test("buildPseudoFromEpitaEmail capitalizes hyphenated first names", () => {
  assert.equal(buildPseudoFromEpitaEmail("jean-pierre.dupont@epita.fr"), "JeanPierreDupont");
});

test("ensureUniquePseudo appends deterministic numeric suffixes", async () => {
  const existingPseudos = new Set(["JeanPierreDupont", "JeanPierreDupont2"]);

  const pseudo = await ensureUniquePseudo("JeanPierreDupont", async (candidate) =>
    existingPseudos.has(candidate),
  );

  assert.equal(pseudo, "JeanPierreDupont3");
});

test("updateCurrentUser keeps manual pseudo edits intact", async () => {
  const createdAt = new Date("2026-04-01T12:00:00.000Z");
  const restores = [
    stubProperty(prisma.user, "findUnique", async () => ({
      id: "user-1",
      email: "jean-pierre.dupont@epita.fr",
      pseudo: "JeanPierreDupont",
      avatarUrl: null,
      balance: 1000,
      role: "user",
      streakDays: 2,
      acceptOddsChanges: false,
      lastRewardAt: null,
      createdAt,
      updatedAt: createdAt,
      isBanned: false,
      sessionVersion: 0,
      microsoftId: "ms-1",
    })) as never,
    stubProperty(prisma.user, "findFirst", async () => null) as never,
    stubProperty(prisma.user, "update", async ({ data }: { data: { pseudo: string } }) => ({
      id: "user-1",
      email: "jean-pierre.dupont@epita.fr",
      pseudo: data.pseudo,
      avatarUrl: null,
      balance: 1000,
      role: "user",
      streakDays: 2,
      acceptOddsChanges: false,
      lastRewardAt: null,
      createdAt,
      updatedAt: createdAt,
    })) as never,
    stubProperty(gamificationService, "synchronizeUserBadges", async () => undefined) as never,
  ];

  try {
    const updatedUser = await userService.updateCurrentUser("user-1", {
      pseudo: "MonPseudoLibre",
    });

    assert.equal(updatedUser.pseudo, "MonPseudoLibre");
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});
