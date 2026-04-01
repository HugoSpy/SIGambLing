const now = new Date();
const day = 24 * 60 * 60 * 1000;
const addDays = (count) => new Date(now.getTime() + count * day).toISOString();

export const seedUsers = [
  {
    id: "user_demo",
    email: "demo@sigambling.dev",
    password: "password123",
    username: "NovaRook",
    avatar: "NR",
    role: "user",
    tokens: 1380,
    level: 7,
    dateInscription: "2026-02-04T09:30:00.000Z",
    lastDailyReward: "2026-03-30T08:00:00.000Z",
    badges: ["Paris en serie", "Gagnant du mois"],
    stats: { eventWins: 9, eventLosses: 4, gamesPlayed: 12, gamesWon: 6, totalWon: 1120, totalLost: 540, eventsCreated: 1, dailyClaims: 4 },
  },
  {
    id: "user_admin",
    email: "admin@sigambling.dev",
    password: "admin12345",
    username: "HouseMaster",
    avatar: "HM",
    role: "admin",
    tokens: 2430,
    level: 14,
    dateInscription: "2026-01-14T09:30:00.000Z",
    lastDailyReward: "2026-03-31T08:00:00.000Z",
    badges: ["Admin", "Banquier bronze", "Architecte du jeu"],
    stats: { eventWins: 14, eventLosses: 7, gamesPlayed: 18, gamesWon: 10, totalWon: 2140, totalLost: 1030, eventsCreated: 4, dailyClaims: 9 },
  },
  {
    id: "user_2",
    email: "claire@sigambling.dev",
    password: "password123",
    username: "ClaireSpin",
    avatar: "CS",
    role: "user",
    tokens: 1920,
    level: 11,
    dateInscription: "2026-01-24T09:30:00.000Z",
    lastDailyReward: "2026-03-31T08:00:00.000Z",
    badges: ["Roulette lover", "Top 3"],
    stats: { eventWins: 11, eventLosses: 6, gamesPlayed: 15, gamesWon: 8, totalWon: 1680, totalLost: 860, eventsCreated: 2, dailyClaims: 6 },
  },
];

export const seedEvents = [
  {
    id: "event_champions_final",
    title: "Finale Champions League 2026",
    description: "Qui remportera la finale europeenne de fin de saison ?",
    category: "sports",
    dateStart: addDays(-1),
    dateEnd: addDays(5),
    status: "active",
    outcomes: [{ label: "Equipe A", odds: 1.85 }, { label: "Match nul", odds: 3.2 }, { label: "Equipe B", odds: 2.6 }],
  },
  {
    id: "event_election_city",
    title: "Election municipale de Paris",
    description: "Quel bloc arrivera en tete du scrutin ?",
    category: "politics",
    dateStart: addDays(0),
    dateEnd: addDays(7),
    status: "active",
    outcomes: [{ label: "Coalition alpha", odds: 2.2 }, { label: "Coalition beta", odds: 1.9 }, { label: "Autre", odds: 4.1 }],
  },
  {
    id: "event_music_awards",
    title: "Ceremonie Music Awards",
    description: "Quel artiste remportera l'album de l'annee ?",
    category: "culture",
    dateStart: addDays(1),
    dateEnd: addDays(9),
    status: "active",
    outcomes: [{ label: "Helix Sound", odds: 2.1 }, { label: "Nova Wave", odds: 1.7 }, { label: "Aurora Tape", odds: 3.9 }],
  },
  {
    id: "event_pending_stream",
    title: "Createur du mois sur StreamSphere",
    description: "Evenement propose par la communaute, en attente de validation.",
    category: "other",
    dateStart: addDays(0),
    dateEnd: addDays(4),
    status: "pending",
    createdBy: "user_demo",
    outcomes: [{ label: "LinaByte", odds: 2.4 }, { label: "KiroPlay", odds: 1.8 }, { label: "MaxRift", odds: 4.8 }],
  },
];

export const seedBets = [
  { id: "bet_1", userId: "user_demo", eventId: "event_champions_final", amount: 80, outcomeChoice: "Equipe A", status: "pending", timestamp: now.toISOString() },
  { id: "bet_2", userId: "user_2", eventId: "event_election_city", amount: 120, outcomeChoice: "Coalition beta", status: "pending", timestamp: now.toISOString() },
];
