const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");

process.env.NODE_ENV = "test";

const { createApp } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./lib/prisma");
const { authService } = require("./services/auth.service");
const { eventService } = require("./services/event.service");
const { rouletteService } = require("./services/roulette.service");
const { blackjackService } = require("./services/blackjack.service");
const { userService } = require("./services/user.service");
const { gamificationService } = require("./services/gamification.service");

const app = createApp();
const request = supertest(app);

const restoreCallbacks: Array<() => void> = [];
const authUsers = new Map<
  string,
  {
    id: string;
    email: string;
    role: "user" | "admin" | "validator";
    sessionVersion: number;
    isBanned: boolean;
  }
>();

function stubMethod<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  replacement: T[K],
) {
  const original = target[key];
  target[key] = replacement;
  restoreCallbacks.push(() => {
    target[key] = original;
  });
}

function issueAccessToken(
  user: Partial<{
    id: string;
    email: string;
    role: "user" | "admin" | "validator";
    sessionVersion: number;
    isBanned: boolean;
  }> = {},
) {
  const authUser = {
    id: user.id ?? "user-1",
    email: user.email ?? "student@epita.fr",
    role: user.role ?? "user",
    sessionVersion: user.sessionVersion ?? 0,
    isBanned: user.isBanned ?? false,
  };

  authUsers.set(authUser.id, authUser);

  return jwt.sign(
    {
      userId: authUser.id,
      email: authUser.email,
      role: authUser.role,
      sessionVersion: authUser.sessionVersion,
      tokenType: "access",
    },
    env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

test.beforeEach(() => {
  authUsers.clear();
  stubMethod(prisma.user, "findUnique", async ({ where }: { where: { id: string } }) => {
    return authUsers.get(where.id) ?? null;
  });
});

test.afterEach(() => {
  while (restoreCallbacks.length > 0) {
    const restore = restoreCallbacks.pop();
    restore?.();
  }
});

test("POST /auth/refresh rotates the refresh token and returns a new access token", async () => {
  stubMethod(authService, "rotateRefreshToken", async (token: string) => {
    assert.equal(token, "old-refresh-token");

    return {
      user: { id: "user-1" },
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
    };
  });

  stubMethod(authService, "applyRefreshCookie", (response: any, refreshToken: string) => {
    response.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      path: "/auth",
    });
  });

  const response = await request
    .post("/auth/refresh")
    .set("Cookie", "refresh_token=old-refresh-token")
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.access_token, "next-access-token");
  assert.equal(response.body.refresh_token, "next-refresh-token");
  assert.match(response.headers["set-cookie"][0], /refresh_token=next-refresh-token/);
});

test("POST /auth/logout invalidates the session and clears the refresh cookie", async () => {
  let invalidatedToken: string | null = null;

  stubMethod(authService, "invalidateSession", async (token?: string | null) => {
    invalidatedToken = token ?? null;
  });

  stubMethod(authService, "clearRefreshCookie", (response: any) => {
    response.clearCookie("refresh_token", { path: "/auth" });
  });

  const response = await request
    .post("/auth/logout")
    .set("Cookie", "refresh_token=logout-refresh-token")
    .send({});

  assert.equal(response.status, 200);
  assert.equal(invalidatedToken, "logout-refresh-token");
  assert.equal(response.body.message, "Logged out successfully");
  assert.match(response.headers["set-cookie"][0], /refresh_token=;/);
});

test("GET /events returns the authenticated user's open event feed", async () => {
  const token = issueAccessToken();

  stubMethod(eventService, "listOpenEvents", async (userId: string) => {
    assert.equal(userId, "user-1");

    return [
      {
        id: "event-1",
        title: "QA launch event",
        category: "epita",
        status: "active",
        can_bet: true,
      },
    ];
  });

  const response = await request
    .get("/events")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.events[0].id, "event-1");
});

test("POST /events/bets submits a simple multi-event bet cart", async () => {
  const token = issueAccessToken();

  stubMethod(eventService, "placeSimpleBets", async (userId: string, payload: any) => {
    assert.equal(userId, "user-1");
    assert.equal(payload.bets.length, 2);

    return {
      bets: [
        {
          id: "bet-1",
          event_id: "event-1",
          chosen_option: "Team A",
          stake: 25,
        },
      ],
      new_balance: 975,
    };
  });

  const response = await request
    .post("/events/bets")
    .set("Authorization", `Bearer ${token}`)
    .send({
      bets: [
        { eventId: "11111111-1111-1111-1111-111111111111", chosenOption: "Team A", amount: 25 },
        { eventId: "22222222-2222-2222-2222-222222222222", chosenOption: "Team B", amount: 15 },
      ],
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.new_balance, 975);
});

test("POST /admin/events/:id/resolve rejects non-admin users before the service layer", async () => {
  const token = issueAccessToken({ id: "user-2", role: "user" });

  const response = await request
    .post("/admin/events/11111111-1111-1111-1111-111111111111/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ resolved_option: "Team A" });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Permissions insuffisantes.");
});

test("POST /admin/events/:id/resolve allows admin settlement flows", async () => {
  const token = issueAccessToken({ id: "admin-1", email: "admin@epita.fr", role: "admin" });

  stubMethod(eventService, "resolveEvent", async (userId: string, eventId: string, option: string) => {
    assert.equal(userId, "admin-1");
    assert.equal(eventId, "11111111-1111-1111-1111-111111111111");
    assert.equal(option, "Team A");

    return {
      id: eventId,
      status: "resolved",
      resolved_option: option,
    };
  });

  const response = await request
    .post("/admin/events/11111111-1111-1111-1111-111111111111/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ resolved_option: "Team A" });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "resolved");
});

test("POST /casino/roulette/spin returns a stable casino payload for authenticated users", async () => {
  const token = issueAccessToken();

  stubMethod(rouletteService, "spin", async (userId: string, bets: any[]) => {
    assert.equal(userId, "user-1");
    assert.equal(bets.length, 1);

    return {
      game_id: "roulette-1",
      result_number: 7,
      result_color: "red",
      result: "win",
      bet_amount: 20,
      payout: 40,
      new_balance: 1040,
      winning_bets: ["red"],
    };
  });

  const response = await request
    .post("/casino/roulette/spin")
    .set("Authorization", `Bearer ${token}`)
    .send({
      bets: [{ type: "red", amount: 20 }],
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.result_number, 7);
  assert.equal(response.body.new_balance, 1040);
});

test("POST /casino/blackjack/deal starts an authenticated blackjack session", async () => {
  const token = issueAccessToken();

  stubMethod(blackjackService, "deal", async (userId: string, bet: number) => {
    assert.equal(userId, "user-1");
    assert.equal(bet, 50);

    return {
      game_id: "blackjack-1",
      player_total: 18,
      dealer_visible_total: 10,
      status: "playing",
      new_balance: 950,
    };
  });

  const response = await request
    .post("/casino/blackjack/deal")
    .set("Authorization", `Bearer ${token}`)
    .send({ bet: 50 });

  assert.equal(response.status, 200);
  assert.equal(response.body.game_id, "blackjack-1");
  assert.equal(response.body.status, "playing");
});

test("GET /users/me exposes profile and streak data for gamification surfaces", async () => {
  const token = issueAccessToken();

  stubMethod(userService, "getCurrentUser", async (userId: string) => {
    assert.equal(userId, "user-1");

    return {
      id: "user-1",
      pseudo: "SigmaStudent",
      email: "student@epita.fr",
      balance: 1320,
      role: "user",
      avatar_url: null,
      streak_days: 6,
      last_reward_at: "2026-04-02T12:00:00.000Z",
      created_at: "2026-04-01T12:00:00.000Z",
    };
  });

  const response = await request
    .get("/users/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.streak_days, 6);
  assert.equal(response.body.balance, 1320);
});

test("PATCH /users/me updates the authenticated profile", async () => {
  const token = issueAccessToken();

  stubMethod(userService, "updateCurrentUser", async (userId: string, payload: any) => {
    assert.equal(userId, "user-1");
    assert.equal(payload.pseudo, "SigmaPrime");

    return {
      id: "user-1",
      pseudo: "SigmaPrime",
      email: "student@epita.fr",
      balance: 1320,
      role: "user",
      avatar_url: null,
      streak_days: 6,
      last_reward_at: null,
      created_at: "2026-04-01T12:00:00.000Z",
    };
  });

  const response = await request
    .patch("/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({ pseudo: "SigmaPrime" });

  assert.equal(response.status, 200);
  assert.equal(response.body.pseudo, "SigmaPrime");
});

test("POST /users/me/avatar accepts an avatar upload on the authenticated profile route", async () => {
  const token = issueAccessToken();

  stubMethod(userService, "uploadAvatar", async (userId: string, file?: { mimetype: string }) => {
    assert.equal(userId, "user-1");
    assert.equal(file?.mimetype, "image/png");

    return {
      id: "user-1",
      pseudo: "SigmaStudent",
      email: "student@epita.fr",
      balance: 1320,
      role: "user",
      avatar_url: "https://cdn.sigambling.test/avatars/user-1.webp?v=1",
      streak_days: 6,
      last_reward_at: null,
      created_at: "2026-04-01T12:00:00.000Z",
    };
  });

  const response = await request
    .post("/users/me/avatar")
    .set("Authorization", `Bearer ${token}`)
    .attach("avatar", Buffer.from("fake-png"), {
      filename: "avatar.png",
      contentType: "image/png",
    });

  assert.equal(response.status, 200);
  assert.match(response.body.avatar_url, /avatars\/user-1\.webp/);
});

test("GET /rewards/me exposes the authenticated gamification state", async () => {
  const token = issueAccessToken();

  stubMethod(gamificationService, "getState", async (userId: string) => {
    assert.equal(userId, "user-1");

    return {
      daily_reward: {
        claimed_today: false,
        current_streak: 6,
        next_amount: 175,
      },
      badges: [
        {
          key: "streak_3",
          name: "Serie en route",
        },
      ],
      progress: [
        {
          key: "daily_claim",
          completed: false,
        },
      ],
      stats: {
        event_bets: 3,
        event_wins: 1,
        casino_games: 2,
        casino_wins: 1,
        created_markets: 1,
        balance: 1320,
      },
    };
  });

  const response = await request
    .get("/rewards/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.daily_reward.current_streak, 6);
  assert.equal(response.body.stats.casino_games, 2);
  assert.equal(response.body.badges[0].key, "streak_3");
});

test("POST /rewards/daily claims the daily reward and returns refreshed gamification state", async () => {
  const token = issueAccessToken();

  stubMethod(gamificationService, "claimDailyReward", async (userId: string) => {
    assert.equal(userId, "user-1");

    return {
      claimed: true,
      amount: 175,
      base_amount: 100,
      streak_bonus: 75,
      user: {
        id: "user-1",
        pseudo: "SigmaStudent",
        email: "student@epita.fr",
        balance: 1495,
        role: "user",
        avatar_url: null,
        streak_days: 7,
        last_reward_at: "2026-04-03T08:00:00.000Z",
        created_at: "2026-04-01T12:00:00.000Z",
      },
      gamification: {
        daily_reward: {
          claimed_today: true,
          current_streak: 7,
          next_amount: 250,
        },
        badges: [
          {
            key: "streak_7",
            name: "Feu continu",
          },
        ],
        progress: [
          {
            key: "daily_claim",
            completed: true,
          },
        ],
        stats: {
          event_bets: 3,
          event_wins: 1,
          casino_games: 2,
          casino_wins: 1,
          created_markets: 1,
          balance: 1495,
        },
      },
    };
  });

  const response = await request
    .post("/rewards/daily")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.claimed, true);
  assert.equal(response.body.amount, 175);
  assert.equal(response.body.user.streak_days, 7);
  assert.equal(response.body.gamification.daily_reward.claimed_today, true);
  assert.equal(response.body.gamification.badges[0].key, "streak_7");
});
