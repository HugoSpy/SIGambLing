export interface User {
  id: string;
  username: string;
  tokens: number;
  rank: number;
  isAdmin?: boolean;
  badges: string[];
  stats: {
    betsPlaced: number;
    betsWon: number;
    betsLost: number;
    winRate: number;
    casinoGains: number;
    streak: number;
  };
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'resolved' | 'pending';
  createdAt: Date;
  resolvedAt?: Date;
  outcomes: Outcome[];
}

export interface Outcome {
  id: string;
  name: string;
  odds: number;
  totalBets: number;
}

export interface Bet {
  id: string;
  userId: string;
  eventId: string;
  outcomeId: string;
  amount: number;
  potentialWin: number;
  placedAt: Date;
  status: 'pending' | 'won' | 'lost';
  eventTitle: string;
  outcomeName: string;
}

export interface CasinoHistory {
  id: string;
  userId: string;
  game: 'roulette' | 'blackjack';
  amount: number;
  result: number;
  timestamp: Date;
}
