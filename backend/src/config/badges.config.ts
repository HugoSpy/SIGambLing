export type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface BadgeCatalogEntry {
  badgeType: string;
  label: string;
  description: string;
  rarity: BadgeRarity;
}

export const BADGE_REWARDS: Record<BadgeRarity, number> = {
  COMMON: 50,
  RARE: 150,
  EPIC: 400,
  LEGENDARY: 1000,
};

export const BADGE_CATALOG: BadgeCatalogEntry[] = [
  // ─── Existing badges ────────────────────────────────────────────────────────
  {
    badgeType: "first_reward",
    label: "Premier Réflexe",
    description: "T'as réclamé ta première récompense quotidienne. La machine est lancée.",
    rarity: "COMMON",
  },
  {
    badgeType: "streak_3",
    label: "Série en Route",
    description: "3 jours d'affilée. Pas de chance, tu commences à aimer ça.",
    rarity: "COMMON",
  },
  {
    badgeType: "streak_7",
    label: "Feu Continu",
    description: "7 jours sans manquer le check-in. La flamme est réelle.",
    rarity: "RARE",
  },
  {
    badgeType: "daily_grinder",
    label: "Grinder Mythique",
    description: "30 jours de streak. À ce stade, t'es pratiquement intégré au serveur.",
    rarity: "LEGENDARY",
  },
  {
    badgeType: "sharp_bettor",
    label: "Paris en Série",
    description: "5 marchés gagnés. Les cotes te sourient.",
    rarity: "RARE",
  },
  {
    badgeType: "table_hot",
    label: "Table Chaude",
    description: "5 victoires casino validées. Le casino transpire.",
    rarity: "RARE",
  },
  {
    badgeType: "banker_bronze",
    label: "Bankroll Solide",
    description: "5 000 tokens en poche. L'empire commence.",
    rarity: "EPIC",
  },
  {
    badgeType: "market_maker",
    label: "Architecte du Jeu",
    description: "Premier marché créé ou proposé. T'as mis ta pierre à l'édifice.",
    rarity: "COMMON",
  },
  {
    badgeType: "jackpot_hunter",
    label: "Chasseur de Jackpot",
    description: "250 tokens contribués au jackpot. Le destin t'attend.",
    rarity: "RARE",
  },
  // ─── New badges ─────────────────────────────────────────────────────────────
  {
    badgeType: "PARLAY_KING",
    label: "Parlay King",
    description: "Remporter un pari combiné. Quand tout s'aligne en même temps.",
    rarity: "RARE",
  },
  {
    badgeType: "COMEBACK_KID",
    label: "Comeback Kid",
    description: "Remonter d'une balance < 100 tokens à > 500. La résurrection.",
    rarity: "EPIC",
  },
  {
    badgeType: "ALL_IN",
    label: "All In",
    description: "Tout misé sur un seul pari. Le courage ou la folie — difficile à dire.",
    rarity: "RARE",
  },
  {
    badgeType: "CHAT_ADDICT",
    label: "Chat Addict",
    description: "100 messages envoyés dans le chat. Tu alimentes la communauté.",
    rarity: "COMMON",
  },
  {
    badgeType: "LEADERBOARD_TOP3",
    label: "Podium",
    description: "Apparaître dans le top 3 du leaderboard. L'élite te reconnaît.",
    rarity: "LEGENDARY",
  },
];

const BADGE_CATALOG_MAP = new Map(BADGE_CATALOG.map((entry) => [entry.badgeType, entry]));

export function getBadgeConfig(badgeType: string): BadgeCatalogEntry | null {
  return BADGE_CATALOG_MAP.get(badgeType) ?? null;
}

export function getBadgeReward(badgeType: string): number {
  const entry = getBadgeConfig(badgeType);
  if (!entry) return BADGE_REWARDS.COMMON;
  return BADGE_REWARDS[entry.rarity];
}

export function getBadgeRarity(badgeType: string): BadgeRarity {
  return getBadgeConfig(badgeType)?.rarity ?? "COMMON";
}
