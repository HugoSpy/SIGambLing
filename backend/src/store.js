import { createGameEngine } from "./gameEngine.js";
import { seedBets, seedEvents, seedUsers } from "./mockData.js";

const DAILY_REWARD = 100;

const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function ensure(condition, message, status = 400) {
  if (!condition) {
    fail(status, message);
  }
}

function sameDay(dateA, dateB) {
  return new Date(dateA).toISOString().slice(0, 10) === new Date(dateB).toISOString().slice(0, 10);
}

function buildChallenges(user) {
  return [
    { id: "daily_login", title: "Connexion du jour", description: "Recuperer la recompense quotidienne.", progress: Math.min(user.stats.dailyClaims, 1), goal: 1, reward: 50 },
    { id: "bet_once", title: "Prendre position", description: "Placer au moins un pari sur un evenement actif.", progress: Math.min(user.stats.eventWins + user.stats.eventLosses, 1), goal: 1, reward: 75 },
    { id: "casino_week", title: "Casino run", description: "Jouer cinq parties de casino cette semaine.", progress: Math.min(user.stats.gamesPlayed, 5), goal: 5, reward: 120 },
  ];
}

function normalizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    tokens: user.tokens,
    level: user.level,
    dateInscription: user.dateInscription,
    badges: [...user.badges],
    stats: { ...user.stats },
    challenges: buildChallenges(user),
  };
}

function updateBadges(user) {
  const badges = new Set(user.badges);
  if (user.stats.eventWins >= 5) badges.add("Paris en serie");
  if (user.tokens >= 2000) badges.add("Banquier bronze");
  if (user.stats.gamesWon >= 5) badges.add("Table chaude");
  if (user.stats.eventsCreated >= 1) badges.add("Architecte du jeu");
  user.badges = [...badges];
  user.level = Math.max(1, 1 + Math.floor((user.stats.eventWins + user.stats.gamesWon) / 2));
}

export function createStore() {
  const state = {
    users: clone(seedUsers),
    events: clone(seedEvents),
    bets: clone(seedBets),
    blackjackSessions: new Map(),
  };

  const getUser = (userId) => state.users.find((entry) => entry.id === userId) || fail(404, "Utilisateur introuvable.");
  const getEvent = (eventId) => state.events.find((entry) => entry.id === eventId) || fail(404, "Evenement introuvable.");
  const helpers = { getUser, ensure, normalizeUser, updateBadges, createId, fail };
  const playGame = createGameEngine(state, helpers);

  function authenticate({ identifier, password }) {
    ensure(identifier && password, "Identifiants incomplets.");
    const user = state.users.find((entry) => (entry.email.toLowerCase() === identifier.toLowerCase() || entry.username.toLowerCase() === identifier.toLowerCase()) && entry.password === password);
    if (!user) fail(401, "Email, username ou mot de passe invalide.");
    return normalizeUser(user);
  }

  function register({ username, email, password }) {
    ensure(username?.trim(), "Le username est requis.");
    ensure(email?.trim(), "L'email est requis.");
    ensure(password?.length >= 8, "Le mot de passe doit contenir au moins 8 caracteres.");
    ensure(!state.users.some((user) => user.username.toLowerCase() === username.trim().toLowerCase()), "Ce username est deja utilise.");
    ensure(!state.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase()), "Cet email est deja utilise.");

    const user = {
      id: createId("user"),
      email: email.trim(),
      password,
      username: username.trim(),
      avatar: username.trim().slice(0, 2).toUpperCase(),
      role: "user",
      tokens: 100,
      level: 1,
      dateInscription: new Date().toISOString(),
      lastDailyReward: null,
      badges: ["Nouveau souffle"],
      stats: { eventWins: 0, eventLosses: 0, gamesPlayed: 0, gamesWon: 0, totalWon: 0, totalLost: 0, eventsCreated: 0, dailyClaims: 0 },
    };

    state.users.push(user);
    return normalizeUser(user);
  }

  function claimDailyReward(userId) {
    const user = getUser(userId);
    const now = new Date();
    if (user.lastDailyReward && sameDay(user.lastDailyReward, now)) {
      return { claimed: false, reward: 0, user: normalizeUser(user) };
    }

    user.tokens += DAILY_REWARD;
    user.lastDailyReward = now.toISOString();
    user.stats.dailyClaims += 1;
    user.stats.totalWon += DAILY_REWARD;
    updateBadges(user);
    return { claimed: true, reward: DAILY_REWARD, user: normalizeUser(user) };
  }

  function getEvents({ status = "active", category = "all" } = {}) {
    return state.events.filter((event) => (status === "all" || event.status === status) && (category === "all" || event.category === category));
  }

  function createEvent({ userId, title, description, category, dateEnd, outcomes }) {
    const user = getUser(userId);
    ensure(title?.trim(), "Le titre est requis.");
    ensure(Array.isArray(outcomes) && outcomes.filter(Boolean).length >= 2, "Deux issues minimum sont requises.");

    const event = {
      id: createId("event"),
      title: title.trim(),
      description: description?.trim() || "Proposition communautaire en attente de validation manuelle.",
      category: category || "other",
      dateStart: new Date().toISOString(),
      dateEnd: dateEnd ? new Date(dateEnd).toISOString() : null,
      status: "pending",
      createdBy: user.id,
      outcomes: outcomes.filter(Boolean).map((label, index) => ({ label: label.trim(), odds: Number((1.8 + index * 0.55).toFixed(2)) })),
    };

    state.events.push(event);
    user.stats.eventsCreated += 1;
    updateBadges(user);
    return { event, message: "Evenement soumis. Il reste en attente de validation." };
  }

  function placeBet({ userId, eventId, amount, outcomeChoice }) {
    const user = getUser(userId);
    const event = getEvent(eventId);
    const numericAmount = Number(amount);
    ensure(event.status === "active", "Cet evenement n'accepte plus de paris.");
    ensure(numericAmount > 0, "Le montant du pari doit etre positif.");
    ensure(user.tokens >= numericAmount, "Solde insuffisant.");
    ensure(event.outcomes.some((item) => item.label === outcomeChoice), "Issue selectionnee invalide.");

    user.tokens -= numericAmount;
    user.stats.totalLost += numericAmount;
    state.bets.push({ id: createId("bet"), userId, eventId, amount: numericAmount, outcomeChoice, status: "pending", timestamp: new Date().toISOString() });
    return { message: `Pari enregistre sur "${outcomeChoice}" pour ${numericAmount} tokens.`, user: normalizeUser(user) };
  }

  function resolveEvent(eventId, winningOutcome) {
    const event = getEvent(eventId);
    ensure(event.outcomes.some((item) => item.label === winningOutcome), "Outcome gagnant invalide.");
    if (event.status === "pending") event.status = "active";
    ensure(event.status === "active", "Evenement deja resolu.");

    const relatedBets = state.bets.filter((bet) => bet.eventId === eventId && bet.status === "pending");
    for (const bet of relatedBets) {
      const user = getUser(bet.userId);
      const outcome = event.outcomes.find((item) => item.label === bet.outcomeChoice);
      if (bet.outcomeChoice === winningOutcome) {
        const payout = Math.round(bet.amount * outcome.odds);
        user.tokens += payout;
        user.stats.totalWon += payout;
        user.stats.eventWins += 1;
        bet.status = "won";
      } else {
        user.stats.eventLosses += 1;
        bet.status = "lost";
      }
      updateBadges(user);
    }

    event.status = "resolved";
    event.winningOutcome = winningOutcome;
    return { event, resolvedBets: relatedBets.length, message: `Evenement resolu. Outcome gagnant: ${winningOutcome}.` };
  }

  function getLeaderboard() {
    return state.users.slice().sort((left, right) => right.tokens - left.tokens).map((user, index) => ({ ...normalizeUser(user), position: index + 1 }));
  }

  return {
    authenticate,
    register,
    getProfile(userId) {
      return normalizeUser(getUser(userId));
    },
    claimDailyReward,
    getEvents,
    createEvent,
    placeBet,
    resolveEvent,
    getLeaderboard,
    playGame,
  };
}
