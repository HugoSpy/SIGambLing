import { useState } from 'react';
import { getCurrentUser, mockEvents, mockUsers } from '../data/mockData';
import { EventCard } from '../components/EventCard';
import { BetModal } from '../components/BetModal';
import { Event, Outcome } from '../types';
import { Gift, TrendingUp, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export function Dashboard() {
  const currentUser = getCurrentUser();
  const activeEvents = mockEvents.filter(e => e.status === 'active').slice(0, 6);
  const topUsers = mockUsers.slice(0, 5);

  const [betModal, setBetModal] = useState<{ event: Event; outcome: Outcome } | null>(null);

  const handleQuickBet = (event: Event, outcomeId: string) => {
    const outcome = event.outcomes.find(o => o.id === outcomeId);
    if (outcome) {
      setBetModal({ event, outcome });
    }
  };

  const handleConfirmBet = (amount: number) => {
    toast.success(`Pari placé ! ${amount} tokens sur ${betModal?.outcome.name}`);
    setBetModal(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Welcome Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">
          Bienvenue, {currentUser.username}
        </h1>
        <p className="text-sm text-zinc-400">Voici ce qui se passe dans votre communauté de paris</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Balance */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-zinc-400">Solde de tokens</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-500 mb-0.5">
            {currentUser.tokens.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500">
            +2,340 cette semaine
          </div>
        </div>

        {/* Rank */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-zinc-400">Votre rang</span>
            <Trophy className="size-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-500 mb-0.5">
            #{currentUser.rank}
          </div>
          <div className="text-xs text-zinc-500">
            Top 10% de tous les utilisateurs
          </div>
        </div>

        {/* Daily Reward */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-zinc-400">Récompense quotidienne</span>
            <Gift className="size-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-500 mb-0.5">
            Disponible
          </div>
          <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
            Récupérer 100 tokens →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Events */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-zinc-100">Événements actifs</h2>
            <a href="/events" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium">
              Voir tout →
            </a>
          </div>
          <div className="space-y-3">
            {activeEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onQuickBet={(outcomeId) => handleQuickBet(event, outcomeId)}
              />
            ))}
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-zinc-100">Top joueurs</h2>
            <a href="/leaderboard" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium">
              Voir tout →
            </a>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
            {topUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                  index === 2 ? 'bg-orange-700/20 text-orange-700' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  #{user.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{user.username}</div>
                  <div className="text-xs text-zinc-500">
                    {user.stats.winRate.toFixed(1)}% de victoires
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-500">
                    {user.tokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">tokens</div>
                </div>
              </div>
            ))}
          </div>

          {/* Your Stats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mt-3">
            <h3 className="text-sm font-semibold text-zinc-100 mb-2">Vos statistiques</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Paris placés</span>
                <span className="font-medium text-zinc-100">{currentUser.stats.betsPlaced}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Taux de victoire</span>
                <span className="font-medium text-emerald-500">{currentUser.stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Série actuelle</span>
                <span className="font-medium text-orange-500">{currentUser.stats.streak} 🔥</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Gains casino</span>
                <span className="font-medium text-purple-500">+{currentUser.stats.casinoGains}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bet Modal */}
      {betModal && (
        <BetModal
          event={betModal.event}
          outcome={betModal.outcome}
          onClose={() => setBetModal(null)}
          onConfirm={handleConfirmBet}
        />
      )}
    </div>
  );
}