import { User, Event, Bet } from '../types';

export const CURRENT_USER_ID = 'user1';

export const mockUsers: User[] = [
  {
    id: 'user1',
    username: 'CryptoKing',
    tokens: 15420,
    rank: 3,
    isAdmin: true,
    badges: ['whale', 'streak', 'lucky'],
    stats: {
      betsPlaced: 247,
      betsWon: 156,
      betsLost: 91,
      winRate: 63.2,
      casinoGains: 3420,
      streak: 7
    }
  },
  {
    id: 'user2',
    username: 'BetMaster',
    tokens: 28750,
    rank: 1,
    badges: ['champion', 'whale', 'veteran'],
    stats: {
      betsPlaced: 412,
      betsWon: 289,
      betsLost: 123,
      winRate: 70.1,
      casinoGains: 8920,
      streak: 12
    }
  },
  {
    id: 'user3',
    username: 'LuckyPlayer',
    tokens: 21350,
    rank: 2,
    badges: ['lucky', 'streak'],
    stats: {
      betsPlaced: 189,
      betsWon: 134,
      betsLost: 55,
      winRate: 70.9,
      casinoGains: 5210,
      streak: 5
    }
  },
  {
    id: 'user4',
    username: 'RiskTaker',
    tokens: 12890,
    rank: 4,
    badges: ['gambler'],
    stats: {
      betsPlaced: 356,
      betsWon: 178,
      betsLost: 178,
      winRate: 50.0,
      casinoGains: 2340,
      streak: 3
    }
  },
  {
    id: 'user5',
    username: 'SmartBettor',
    tokens: 9540,
    rank: 5,
    badges: ['analyst'],
    stats: {
      betsPlaced: 145,
      betsWon: 98,
      betsLost: 47,
      winRate: 67.6,
      casinoGains: 1820,
      streak: 4
    }
  },
  ...Array.from({ length: 45 }, (_, i) => ({
    id: `user${i + 6}`,
    username: `Player${i + 6}`,
    tokens: Math.floor(Math.random() * 8000) + 1000,
    rank: i + 6,
    badges: [],
    stats: {
      betsPlaced: Math.floor(Math.random() * 100) + 10,
      betsWon: Math.floor(Math.random() * 60) + 5,
      betsLost: Math.floor(Math.random() * 60) + 5,
      winRate: Math.random() * 40 + 40,
      casinoGains: Math.floor(Math.random() * 2000),
      streak: Math.floor(Math.random() * 5)
    }
  }))
];

export const mockEvents: Event[] = [
  {
    id: 'event1',
    title: 'Le Bitcoin atteindra-t-il 100k$ d\'ici fin avril 2026 ?',
    description: 'Le Bitcoin doit atteindre ou dépasser 100 000 USD sur une plateforme majeure (Coinbase, Binance, Kraken) avant 23h59 UTC le 30 avril 2026.',
    category: 'Crypto',
    status: 'active',
    createdAt: new Date('2026-04-01'),
    outcomes: [
      { id: 'o1', name: 'Oui', odds: 1.85, totalBets: 12450 },
      { id: 'o2', name: 'Non', odds: 2.10, totalBets: 8920 }
    ]
  },
  {
    id: 'event2',
    title: 'Prochain vainqueur du CS2 Major',
    description: 'Quelle équipe remportera le prochain CS2 Major Championship ?',
    category: 'Esports',
    status: 'active',
    createdAt: new Date('2026-03-28'),
    outcomes: [
      { id: 'o3', name: 'FaZe Clan', odds: 3.20, totalBets: 5420 },
      { id: 'o4', name: 'Natus Vincere', odds: 2.80, totalBets: 6890 },
      { id: 'o5', name: 'G2 Esports', odds: 4.50, totalBets: 3240 },
      { id: 'o6', name: 'Autre', odds: 6.00, totalBets: 2100 }
    ]
  },
  {
    id: 'event3',
    title: 'Va-t-il pleuvoir le 10 avril ?',
    description: 'Y aura-t-il des précipitations mesurables (>1mm) en centre-ville le 10 avril 2026 ?',
    category: 'Météo',
    status: 'active',
    createdAt: new Date('2026-04-02'),
    outcomes: [
      { id: 'o7', name: 'Oui', odds: 2.40, totalBets: 3210 },
      { id: 'o8', name: 'Non', odds: 1.65, totalBets: 5890 }
    ]
  },
  {
    id: 'event4',
    title: 'Moyenne de l\'examen final',
    description: 'Quelle sera la note moyenne des examens finaux du printemps 2026 ?',
    category: 'Académique',
    status: 'active',
    createdAt: new Date('2026-03-25'),
    outcomes: [
      { id: 'o9', name: 'Moins de 70', odds: 4.20, totalBets: 1820 },
      { id: 'o10', name: '70-79', odds: 2.30, totalBets: 4560 },
      { id: 'o11', name: '80-89', odds: 1.95, totalBets: 6340 },
      { id: 'o12', name: '90+', odds: 5.50, totalBets: 1120 }
    ]
  },
  {
    id: 'event5',
    title: 'Élection du conseil étudiant',
    description: 'Qui sera élu(e) prochain(e) Président(e) du Conseil Étudiant ?',
    category: 'Politique',
    status: 'active',
    createdAt: new Date('2026-03-30'),
    outcomes: [
      { id: 'o13', name: 'Candidat A', odds: 1.75, totalBets: 8920 },
      { id: 'o14', name: 'Candidat B', odds: 2.60, totalBets: 5240 },
      { id: 'o15', name: 'Candidat C', odds: 3.80, totalBets: 2890 }
    ]
  },
  {
    id: 'event6',
    title: 'Participation au festival de printemps',
    description: 'Combien de personnes participeront au Festival de Printemps 2026 ?',
    category: 'Événements',
    status: 'resolved',
    createdAt: new Date('2026-03-15'),
    resolvedAt: new Date('2026-03-25'),
    outcomes: [
      { id: 'o16', name: 'Moins de 500', odds: 3.20, totalBets: 2340 },
      { id: 'o17', name: '500-1000', odds: 1.80, totalBets: 7890 },
      { id: 'o18', name: 'Plus de 1000', odds: 2.50, totalBets: 4120 }
    ]
  }
];

// Génération d'historique de cotes pour les graphiques (comme Polymarket)
export const generateOddsHistory = (eventId: string) => {
  const event = mockEvents.find(e => e.id === eventId);
  if (!event) return {};

  const now = new Date();
  const history: { [outcomeId: string]: { timestamp: Date; odds: number; probability: number }[] } = {};

  event.outcomes.forEach(outcome => {
    const points = [];
    const currentOdds = outcome.odds;
    
    // Générer 30 points d'historique (dernières 30 heures par exemple)
    for (let i = 30; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // i heures avant
      
      // Variation aléatoire autour des cotes actuelles
      const variance = (Math.random() - 0.5) * 0.4; // +/- 20% de variation
      const odds = Math.max(1.1, currentOdds + variance);
      const probability = (1 / odds) * 100;
      
      points.push({
        timestamp,
        odds: Number(odds.toFixed(2)),
        probability: Number(probability.toFixed(1))
      });
    }
    
    history[outcome.id] = points;
  });

  return history;
};

export const mockBets: Bet[] = [
  {
    id: 'bet1',
    userId: 'user1',
    eventId: 'event1',
    outcomeId: 'o1',
    amount: 500,
    potentialWin: 925,
    placedAt: new Date('2026-04-01T10:30:00'),
    status: 'pending',
    eventTitle: 'Le Bitcoin atteindra-t-il 100k$ d\'ici fin avril 2026 ?',
    outcomeName: 'Oui'
  },
  {
    id: 'bet2',
    userId: 'user1',
    eventId: 'event2',
    outcomeId: 'o4',
    amount: 300,
    potentialWin: 840,
    placedAt: new Date('2026-03-29T15:20:00'),
    status: 'pending',
    eventTitle: 'Prochain vainqueur du CS2 Major',
    outcomeName: 'Natus Vincere'
  },
  {
    id: 'bet3',
    userId: 'user1',
    eventId: 'event6',
    outcomeId: 'o17',
    amount: 250,
    potentialWin: 450,
    placedAt: new Date('2026-03-20T09:15:00'),
    status: 'won',
    eventTitle: 'Participation au festival de printemps',
    outcomeName: '500-1000'
  },
  {
    id: 'bet4',
    userId: 'user1',
    eventId: 'event3',
    outcomeId: 'o8',
    amount: 400,
    potentialWin: 660,
    placedAt: new Date('2026-04-02T11:45:00'),
    status: 'pending',
    eventTitle: 'Va-t-il pleuvoir le 10 avril ?',
    outcomeName: 'Non'
  }
];

export const getCurrentUser = () => mockUsers.find(u => u.id === CURRENT_USER_ID)!;