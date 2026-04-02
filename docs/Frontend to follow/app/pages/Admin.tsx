import { useState } from 'react';
import { mockEvents, mockUsers } from '../data/mockData';
import { Check, X, TrendingUp, Users, Activity, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function Admin() {
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'analytics'>('events');
  const pendingEvents = mockEvents.filter(e => e.status === 'pending');
  const activeEvents = mockEvents.filter(e => e.status === 'active');

  const handleApproveEvent = (eventId: string) => {
    toast.success('Événement approuvé et publié');
  };

  const handleRejectEvent = (eventId: string) => {
    toast.error('Événement rejeté');
  };

  const handleBanUser = (userId: string) => {
    toast.success('Utilisateur banni');
  };

  const handleResetTokens = (userId: string) => {
    toast.success('Tokens de l\'utilisateur réinitialisés à 1000');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Panneau d'administration</h1>
        <p className="text-zinc-400">Gérer les événements, les utilisateurs et voir les statistiques</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'events'
              ? 'text-emerald-500'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Événements
          {activeTab === 'events' && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-emerald-500'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Utilisateurs
          {activeTab === 'users' && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'analytics'
              ? 'text-emerald-500'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Statistiques
          {activeTab === 'analytics' && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />
          )}
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Pending Events */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              Événements en attente ({pendingEvents.length})
            </h2>
            {pendingEvents.length > 0 ? (
              <div className="space-y-4">
                {pendingEvents.map(event => {
                  const totalVolume = event.outcomes.reduce((sum, o) => sum + o.totalBets, 0);
                  return (
                    <div
                      key={event.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-sm font-medium">
                              En attente de validation
                            </span>
                            <span className="px-2 py-1 bg-zinc-800 rounded text-xs">
                              {event.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                            {event.title}
                          </h3>
                          <p className="text-zinc-400 text-sm mb-3">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span>Créé le : {event.createdAt.toLocaleDateString('fr-FR')}</span>
                            <span>{event.outcomes.length} issues</span>
                          </div>
                        </div>
                      </div>

                      {/* Outcomes Preview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {event.outcomes.map(outcome => (
                          <div key={outcome.id} className="p-3 bg-zinc-800 rounded-lg">
                            <div className="text-sm text-zinc-400 mb-1">{outcome.name}</div>
                            <div className="text-lg font-semibold text-emerald-500">
                              {outcome.odds.toFixed(2)}x
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveEvent(event.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
                        >
                          <Check className="size-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleRejectEvent(event.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                        >
                          <X className="size-4" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-500">Aucun événement en attente</p>
              </div>
            )}
          </div>

          {/* Active Events */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              Événements actifs ({activeEvents.length})
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-800">
                {activeEvents.map(event => {
                  const totalVolume = event.outcomes.reduce((sum, o) => sum + o.totalBets, 0);
                  return (
                    <div key={event.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-zinc-100 mb-1">{event.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-zinc-500">
                            <span>{event.category}</span>
                            <span>•</span>
                            <span>{totalVolume.toLocaleString()} tokens</span>
                            <span>•</span>
                            <span>{event.outcomes.length} issues</span>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors">
                          Gérer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-4">Gestion des utilisateurs</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {mockUsers.slice(0, 20).map(user => (
                <div key={user.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-semibold">
                        {user.username[0]}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-100 flex items-center gap-2">
                          {user.username}
                          {user.isAdmin && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded text-xs font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500">
                          Rang #{user.rank} • {user.tokens.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetTokens(user.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors"
                      >
                        <RotateCcw className="size-3" />
                        Réinitialiser
                      </button>
                      <button
                        onClick={() => handleBanUser(user.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded text-sm font-medium transition-colors"
                      >
                        <Ban className="size-3" />
                        Bannir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Bets */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="size-6 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Total paris</div>
                <div className="text-2xl font-bold text-zinc-100">12 847</div>
              </div>
            </div>
            <div className="text-sm text-emerald-500">+23% par rapport à la semaine dernière</div>
          </div>

          {/* Active Users */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="size-6 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Utilisateurs actifs</div>
                <div className="text-2xl font-bold text-zinc-100">58</div>
              </div>
            </div>
            <div className="text-sm text-blue-500">4 en ligne maintenant</div>
          </div>

          {/* Total Volume */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="size-6 text-purple-500" />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Volume total</div>
                <div className="text-2xl font-bold text-zinc-100">2.4M</div>
              </div>
            </div>
            <div className="text-sm text-purple-500">tokens pariés</div>
          </div>

          {/* Popular Events */}
          <div className="md:col-span-2 lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-4">Événements les plus populaires</h3>
            <div className="space-y-3">
              {mockEvents.slice(0, 5).map((event, index) => {
                const totalVolume = event.outcomes.reduce((sum, o) => sum + o.totalBets, 0);
                return (
                  <div key={event.id} className="flex items-center gap-4">
                    <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">{event.title}</div>
                      <div className="text-sm text-zinc-500">{event.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-500">
                        {totalVolume.toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500">tokens</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}