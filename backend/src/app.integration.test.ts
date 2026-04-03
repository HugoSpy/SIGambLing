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
const { gamificationService } = require("./services/gamification.service");
const { jackpotService } = require("./services/jackpot.service");
const { userService } = require("./services/user.service");
const { AppError } = require("./utils/app-error");

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

test("POST /events/:id/bet forwards structured odds-conflict details", async () => {
  const token = issueAccessToken();

  stubMethod(eventService, "placeBet", async () => {
    throw new AppError(
      "Les cotes ont evolue. Confirmez le pari pour accepter les nouvelles valeurs.",
      409,
      {
        code: "ODDS_CHANGED",
        bet_type: "SIMPLE",
        changes: [
          {
            event_id: "event-1",
            event_title: "QA launch event",
            chosen_option: "Team A",
            previous_odds: 1.85,
            current_odds: 1.62,
            stake: 25,
            potential_payout_before: 46,
            potential_payout_after: 40,
          },
        ],
        total_potential_payout_before: 46,
        total_potential_payout_after: 40,
      },
    );
  });

  const response = await request
    .post("/events/11111111-1111-1111-1111-111111111111/bet")
    .set("Authorization", `Bearer ${token}`)
    .send({
      chosen_option: "Team A",
      amount: 25,
      expected_odds: 1.85,
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.details.code, "ODDS_CHANGED");
  assert.equal(response.body.details.changes[0].current_odds, 1.62);
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
      claimed_github_bonus: false,
      accept_odds_changes: false,
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
  assert.equal(response.body.claimed_github_bonus, false);
  assert.equal(response.body.accept_odds_changes, false);
});

test("POST /users/me/github-bonus/claim credits the authenticated user once", async () => {
  const token = issueAccessToken();

  stubMethod(userService, "claimGitHubBonus", async (userId: string) => {
    assert.equal(userId, "user-1");

    return {
      amount: 300,
      user: {
        id: "user-1",
        pseudo: "SigmaStudent",
        email: "student@epita.fr",
        balance: 1300,
        role: "user",
        avatar_url: null,
        streak_days: 6,
        claimed_github_bonus: true,
        accept_odds_changes: false,
        last_reward_at: "2026-04-02T12:00:00.000Z",
        created_at: "2026-04-01T12:00:00.000Z",
      },
    };
  });

  const response = await request
    .post("/users/me/github-bonus/claim")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  assert.equal(response.status, 201);
  assert.equal(response.body.amount, 300);
  assert.equal(response.body.user.balance, 1300);
  assert.equal(response.body.user.claimed_github_bonus, true);
});

test("GET /users/me/bets returns active and settled bets for dashboard surfaces", async () => {
  const token = issueAccessToken();

  stubMethod(eventService, "getUserBets", async (userId: string) => {
    assert.equal(userId, "user-1");

    return [
      {
        id: "bet-1",
        user_id: "user-1",
        event_id: "event-1",
        chosen_option: "Team A",
        type: "SIMPLE",
        status: "PENDING",
        stake: 40,
        total_odds: 2.4,
        odds_at_bet: 2.4,
        potential_payout: 96,
        actual_payout: null,
        placed_at: "2026-04-02T12:00:00.000Z",
        resolved_at: null,
        legs: [],
      },
      {
        id: "bet-2",
        user_id: "user-1",
        event_id: null,
        chosen_option: null,
        type: "PARLAY",
        status: "PENDING",
        stake: 25,
        total_odds: 3.8,
        odds_at_bet: null,
        potential_payout: 95,
        actual_payout: null,
        placed_at: "2026-04-02T13:00:00.000Z",
        resolved_at: null,
        legs: [
          {
            id: "leg-1",
            event_id: "event-2",
            chosen_option: "EPITA",
            odds_at_bet: 1.9,
            status: "PENDING",
            event: {
              id: "event-2",
              title: "Qui gagne le derby ?",
              status: "OPEN",
              resolved_option: null,
              closing_at: "2026-04-08T18:00:00.000Z",
              image_url: null,
            },
          },
        ],
      },
    ];
  });

  const response = await request
    .get("/users/me/bets")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.bets.length, 2);
  assert.equal(response.body.bets[0].status, "PENDING");
  assert.equal(response.body.bets[1].type, "PARLAY");
  assert.equal(response.body.bets[1].legs[0].event.title, "Qui gagne le derby ?");
});

test("GET /rewards/me returns the authenticated gamification state", async () => {
  const token = issueAccessToken();

  stubMethod(gamificationService, "getState", async (userId: string) => {
    assert.equal(userId, "user-1");

    return {
      daily_reward: {
        day_boundary: "UTC",
        claimed_today: false,
        current_streak: 6,
        streak_status: "claim_available",
        last_claimed_at: "2026-04-02T12:00:00.000Z",
        next_claim_at: "2026-04-03T00:00:00.000Z",
        streak_deadline_at: "2026-04-04T00:00:00.000Z",
        base_amount: 100,
        streak_bonus: 25,
        next_amount: 125,
        next_streak_bonus: 25,
        current_tier: { key: "regular", label: "Argent", minDays: 3, bonus: 25, accent: "sky" },
        next_tier: { key: "committed", label: "Or", minDays: 7, bonus: 75, accent: "amber" },
        tier_progress: { current: 3, target: 4 },
      },
      badges: [
        {
          key: "streak_7",
          name: "Feu continu",
          description: "Serie de 7 jours sans casser le rythme.",
          tone: "orange",
          rarity: "rare",
          icon: "zap",
          unlocked: false,
          unlocked_at: null,
          progress: { current: 6, target: 7, label: "jours" },
        },
      ],
      progress: [],
      jackpot: {
        current_pot: 980,
        contribution_rate_bps: 100,
        total_contributed: 1240,
        user_contribution_total: 64,
        user_contribution_count: 3,
        updated_at: "2026-04-03T10:00:00.000Z",
        last_result: null,
      },
      stats: {
        event_bets: 3,
        event_wins: 2,
        casino_games: 4,
        casino_wins: 1,
        created_markets: 0,
        jackpot_entries: 3,
        jackpot_tickets: 8,
        balance: 1320,
      },
    };
  });

  const response = await request
    .get("/rewards/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.jackpot.user_contribution_count, 3);
  assert.equal(response.body.badges[0].unlocked, false);
});

test("GET /rewards/leaderboard exposes global rankings and pins the current user", async () => {
  const token = issueAccessToken();

  stubMethod(gamificationService, "getLeaderboard", async (userId: string, input?: any) => {
    assert.equal(userId, "user-1");
    assert.equal(input.scope, "global");
    assert.equal(input.limit, 25);

    return {
      scope: "global",
      window_days: 60,
      limit: 25,
      total_ranked_users: 3,
      entries: [
        {
          rank: 1,
          user: { id: "user-2", pseudo: "HighRoller", avatar_url: null },
          total_wagered: 1500,
          casino_wagered: 900,
          event_wagered: 600,
          recent_activity_at: "2026-04-03T08:00:00.000Z",
          is_current_user: false,
        },
        {
          rank: 2,
          user: { id: "user-1", pseudo: "SigmaStudent", avatar_url: null },
          total_wagered: 820,
          casino_wagered: 320,
          event_wagered: 500,
          recent_activity_at: "2026-04-03T07:30:00.000Z",
          is_current_user: true,
        },
      ],
      current_user_entry: {
        rank: 2,
        user: { id: "user-1", pseudo: "SigmaStudent", avatar_url: null },
        total_wagered: 820,
        casino_wagered: 320,
        event_wagered: 500,
        recent_activity_at: "2026-04-03T07:30:00.000Z",
        is_current_user: true,
      },
    };
  });

  const response = await request
    .get("/rewards/leaderboard?scope=global&limit=25")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.scope, "global");
  assert.equal(response.body.entries[1].is_current_user, true);
  assert.equal(response.body.current_user_entry.rank, 2);
});

test("GET /rewards/jackpot returns the authenticated jackpot state", async () => {
  const token = issueAccessToken();

  stubMethod(gamificationService, "getState", async () => ({
    jackpot: {
      current_pot: 980,
      contribution_rate_bps: 100,
      total_contributed: 1240,
      user_contribution_total: 64,
      user_contribution_count: 3,
      updated_at: "2026-04-03T10:00:00.000Z",
      last_result: {
        payout_amount: 760,
        won_at: "2026-04-01T00:00:00.000Z",
        winner: {
          id: "user-9",
          pseudo: "SigmaQueen",
        },
      },
    },
  }));

  const response = await request
    .get("/rewards/jackpot")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.last_result.winner.pseudo, "SigmaQueen");
});

test("POST /rewards/jackpot/payout allows admin jackpot triggers", async () => {
  const token = issueAccessToken({ id: "admin-1", email: "admin@epita.fr", role: "admin" });

  stubMethod(jackpotService, "triggerGoldEventWinner", async (winnerUserId: string) => {
    assert.equal(winnerUserId, "user-9");

    return {
      payout_amount: 760,
      won_at: "2026-04-03T10:00:00.000Z",
      winner: {
        id: "user-9",
        pseudo: "SigmaQueen",
      },
    };
  });

  const response = await request
    .post("/rewards/jackpot/payout")
    .set("Authorization", `Bearer ${token}`)
    .send({ winner_user_id: "user-9" });

  assert.equal(response.status, 200);
  assert.equal(response.body.winner.pseudo, "SigmaQueen");
});

test("POST /rewards/daily claims the authenticated daily reward", async () => {
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
        },
      },
    };
  });

  const response = await request
    .post("/rewards/daily")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.amount, 175);
  assert.equal(response.body.user.streak_days, 7);
});

test("GET /users returns admin search results with balance and badges", async () => {
  const token = issueAccessToken({ id: "admin-1", role: "admin" });

  stubMethod(userService, "searchAdminUsers", async (search: string) => {
    assert.equal(search, "lea");

    return [
      {
        id: "user-7",
        pseudo: "lea",
        email: "lea@epita.fr",
        avatar_url: null,
        balance: 1450,
        role: "user",
        streak_days: 4,
        last_reward_at: "2026-04-03T08:00:00.000Z",
        created_at: "2026-03-12T08:00:00.000Z",
        badges: ["sharp_bettor"],
      },
    ];
  });

  const response = await request
    .get("/users")
    .query({ search: "lea" })
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.users[0].balance, 1450);
  assert.deepEqual(response.body.users[0].badges, ["sharp_bettor"]);
});

test("PATCH /users/:id/balance applies an admin balance adjustment", async () => {
  const token = issueAccessToken({ id: "admin-1", role: "admin" });

  stubMethod(
    userService,
    "adjustUserBalance",
    async (adminId: string, userId: string, payload: { amount: number; reason: string }) => {
      assert.equal(adminId, "admin-1");
      assert.equal(userId, "user-7");
      assert.equal(payload.amount, 250);
      assert.equal(payload.reason, "Correction jackpot");

      return {
        id: userId,
        pseudo: "lea",
        email: "lea@epita.fr",
        avatar_url: null,
        balance: 1700,
        role: "user",
        streak_days: 4,
        last_reward_at: "2026-04-03T08:00:00.000Z",
        created_at: "2026-03-12T08:00:00.000Z",
        badges: ["sharp_bettor"],
      };
    },
  );

  const response = await request
    .patch("/users/user-7/balance")
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 250, reason: "Correction jackpot" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.balance, 1700);
});

test("POST /users/:id/badges unlocks a manual badge for admins", async () => {
  const token = issueAccessToken({ id: "admin-1", role: "admin" });

  stubMethod(userService, "unlockUserBadge", async (adminId: string, userId: string, payload: any) => {
    assert.equal(adminId, "admin-1");
    assert.equal(userId, "user-7");
    assert.equal(payload.badge_key, "market_maker");

    return {
      user: {
        id: userId,
        pseudo: "lea",
        email: "lea@epita.fr",
        avatar_url: null,
        balance: 1700,
        role: "user",
        streak_days: 4,
        last_reward_at: "2026-04-03T08:00:00.000Z",
        created_at: "2026-03-12T08:00:00.000Z",
        badges: ["sharp_bettor", "market_maker"],
      },
      already_unlocked: false,
    };
  });

  const response = await request
    .post("/users/user-7/badges")
    .set("Authorization", `Bearer ${token}`)
    .send({ badge_key: "market_maker" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.badges, ["sharp_bettor", "market_maker"]);
  assert.equal(response.body.already_unlocked, false);
});

test("GET /users/badges/catalog exposes the manual badge catalog to admins", async () => {
  const token = issueAccessToken({ id: "admin-1", role: "admin" });

  stubMethod(userService, "listAvailableBadges", () => [
    {
      key: "sharp_bettor",
      name: "Paris en serie",
      description: "Decrochez 5 paris gagnants.",
      tone: "emerald",
    },
  ]);

  const response = await request
    .get("/users/badges/catalog")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.badges[0].key, "sharp_bettor");
});

test("PATCH /users/me updates the authenticated profile", async () => {
  const token = issueAccessToken();

  stubMethod(userService, "updateCurrentUser", async (userId: string, payload: any) => {
    assert.equal(userId, "user-1");
    assert.equal(payload.pseudo, "SigmaPrime");
    assert.equal(payload.accept_odds_changes, true);

    return {
      id: "user-1",
      pseudo: "SigmaPrime",
      email: "student@epita.fr",
      balance: 1320,
      role: "user",
      avatar_url: null,
      streak_days: 6,
      accept_odds_changes: true,
      last_reward_at: null,
      created_at: "2026-04-01T12:00:00.000Z",
    };
  });

  const response = await request
    .patch("/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({ pseudo: "SigmaPrime", accept_odds_changes: true });

  assert.equal(response.status, 200);
  assert.equal(response.body.pseudo, "SigmaPrime");
  assert.equal(response.body.accept_odds_changes, true);
});

test("PATCH /users/me returns explicit pseudo validation rules", async () => {
  const token = issueAccessToken();

  const response = await request
    .patch("/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({ pseudo: "x!" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation error");
  assert.deepEqual(response.body.details.fieldErrors.pseudo, [
    "Le pseudo doit contenir au moins 3 caractères.",
    "Le pseudo contient des caractères non autorisés.",
  ]);
});

test("POST /events/proposals submits a proposal without category metadata", async () => {
  const token = issueAccessToken();

  stubMethod(eventService, "createProposal", async (userId: string, payload: any) => {
    assert.equal(userId, "user-1");
    assert.equal(payload.title, "Le prochain live roulette aura-t-il un zero ?");
    assert.equal(payload.description, "Question de demo sans categorie.");
    assert.equal(payload.suggested_date, null);
    assert.equal("category" in payload, false);

    return {
      id: "proposal-1",
      title: payload.title,
      description: payload.description,
      suggested_date: null,
      status: "PENDING",
      created_at: "2026-04-03T10:00:00.000Z",
      reviewed_at: null,
      rejection_reason: null,
      user: {
        id: "user-1",
        pseudo: "SigmaStudent",
        email: "student@epita.fr",
        avatar_url: null,
      },
      reviewer: null,
    };
  });

  const response = await request
    .post("/events/proposals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Le prochain live roulette aura-t-il un zero ?",
      description: "Question de demo sans categorie.",
      suggested_date: null,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.id, "proposal-1");
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
      accept_odds_changes: false,
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
        accept_odds_changes: false,
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
