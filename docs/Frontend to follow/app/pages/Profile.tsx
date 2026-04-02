import { getCurrentUser, mockBets } from '../data/mockData';
import { User, TrendingUp, Trophy, Target, Flame, Calendar } from 'lucide-react';

const badgeIcons: Record<string, string> = {
  champion: '🏆',
  whale: '🐋',
  veteran: '⭐',
  streak: '🔥',
  lucky: '🍀',
  gambler: '🎲',
  analyst: '📊'
};

const badgeDescriptions: Record<string, string> = {
  champion: 'Atteindre le rang #1',
  whale: 'Avoir plus de 20 000 tokens',
  veteran: 'Placer plus de 400 paris',
  streak: 'Gagner 5+ paris d\'affilée',
  lucky: 'Taux de victoire supérieur à 70%',
  gambler: 'Placer plus de 300 paris',
  analyst: 'Taux de victoire supérieur à 65%'
};

export function Profile() {
  const currentUser = getCurrentUser();
  const userBets = mockBets.filter(b => b.userId === currentUser.id);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-8 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="size-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-4xl font-bold text-white">
              {currentUser.username[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                {currentUser.username}
              </h1>
              <div className="flex items-center gap-4 text-zinc-400">
                <span className="flex items-center gap-2">
                  <Trophy className="size-4" />
                  Rang #{currentUser.rank}
                </span>
                <span className="flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  {currentUser.stats.winRate.toFixed(1)}% de victoires
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-400 mb-1">Solde total</div>
            <div className="text-4xl font-bold text-emerald-500">
              {currentUser.tokens.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-500">tokens</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Stats */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Statistiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Target className="size-4" />
                  <span className="text-xs">Paris placés</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">
                  {currentUser.stats.betsPlaced}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <TrendingUp className="size-4" />
                  <span className="text-xs">Paris gagnés</span>
                </div>
                <div className="text-2xl font-bold text-emerald-500">
                  {currentUser.stats.betsWon}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <User className="size-4" />
                  <span className="text-xs">Paris perdus</span>
                </div>
                <div className="text-2xl font-bold text-red-500">
                  {currentUser.stats.betsLost}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Flame className="size-4" />
                  <span className="text-xs">Série actuelle</span>
                </div>
                <div className="text-2xl font-bold text-orange-500">
                  {currentUser.stats.streak} 🔥
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-4">Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Taux de victoire</span>
                  <span className="font-semibold text-emerald-500">
                    {currentUser.stats.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${currentUser.stats.winRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Gains casino</div>
                  <div className="text-xl font-semibold text-purple-500">
                    +{currentUser.stats.casinoGains}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Meilleure série</div>
                  <div className="text-xl font-semibold text-orange-500">
                    {currentUser.stats.streak} victoires
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bet History */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Historique des paris</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-800">
                {userBets.length > 0 ? (
                  userBets.map((bet) => (
                    <div key={bet.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-zinc-100 mb-1">
                            {bet.eventTitle}
                          </h4>
                          <p className="text-sm text-zinc-400">
                            Pari sur : <span className="text-emerald-500">{bet.outcomeName}</span>
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          bet.status === 'won' ? 'bg-emerald-500/10 text-emerald-500' :
                          bet.status === 'lost' ? 'bg-red-500/10 text-red-500' :
                          'bg-zinc-700 text-zinc-400'
                        }`}>
                          {bet.status === 'won' ? 'Gagné' : bet.status === 'lost' ? 'Perdu' : 'En cours'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Calendar className="size-3" />
                          {bet.placedAt.toLocaleDateString('fr-FR')}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400">
                            Pari : {bet.amount}
                          </span>
                          <span className="text-emerald-500 font-medium">
                            Potentiel : {bet.potentialWin}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500">
                    Aucun pari placé pour le moment
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-4">Badges</h3>
            {currentUser.badges.length > 0 ? (
              <div className="space-y-3">
                {currentUser.badges.map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                  >
                    <span className="text-3xl">{badgeIcons[badge]}</span>
                    <div>
                      <div className="font-medium text-zinc-100 capitalize">
                        {badge}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {badgeDescriptions[badge]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Aucun badge gagné pour le moment</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors">
                Voir les paris actifs
              </button>
              <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                Historique des transactions
              </button>
              <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                Paramètres
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-4">Informations du compte</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Membre depuis</span>
                <span className="text-zinc-100">Jan 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total parié</span>
                <span className="text-emerald-500 font-medium">
                  {(currentUser.stats.betsPlaced * 250).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Achievements</span>
                <span className="text-zinc-100">{currentUser.badges.length}/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}