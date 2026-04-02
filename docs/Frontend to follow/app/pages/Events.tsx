import { useState } from 'react';
import { mockEvents } from '../data/mockData';
import { EventCard } from '../components/EventCard';
import { BetModal } from '../components/BetModal';
import { Event, Outcome } from '../types';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';

export function Events() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [betModal, setBetModal] = useState<{ event: Event; outcome: Outcome } | null>(null);

  const categories = ['all', ...new Set(mockEvents.map(e => e.category))];
  const statuses = ['all', 'active', 'resolved'];

  const filteredEvents = mockEvents.filter(event => {
    if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && event.status !== selectedStatus) return false;
    return true;
  });

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

  const translateCategory = (cat: string) => {
    const translations: { [key: string]: string } = {
      'all': 'Tout',
      'Crypto': 'Crypto',
      'Esports': 'Esports',
      'Weather': 'Météo',
      'Météo': 'Météo',
      'Academic': 'Académique',
      'Académique': 'Académique',
      'Politics': 'Politique',
      'Politique': 'Politique',
      'Events': 'Événements',
      'Événements': 'Événements'
    };
    return translations[cat] || cat;
  };

  const translateStatus = (status: string) => {
    const translations: { [key: string]: string } = {
      'all': 'Tout',
      'active': 'Actif',
      'resolved': 'Résolu'
    };
    return translations[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Événements</h1>
        <p className="text-zinc-400">Parcourez et pariez sur les événements actifs</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="size-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-400">Filtres</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {translateCategory(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Statut</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {translateStatus(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-zinc-400">
        {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} affiché{filteredEvents.length !== 1 ? 's' : ''}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onQuickBet={(outcomeId) => handleQuickBet(event, outcomeId)}
          />
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500">Aucun événement trouvé avec ces filtres</p>
        </div>
      )}

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