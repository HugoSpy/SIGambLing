import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { mockEvents, generateOddsHistory } from '../data/mockData';
import { BetModal } from '../components/BetModal';
import { Outcome } from '../types';
import { ArrowLeft, Calendar, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function EventDetail() {
  const { id } = useParams();
  const event = mockEvents.find(e => e.id === id);
  const [betModal, setBetModal] = useState<Outcome | null>(null);
  const [selectedOutcomeForChart, setSelectedOutcomeForChart] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <div className="text-center py-16">
          <p className="text-zinc-500">Événement introuvable</p>
          <Link to="/events" className="text-emerald-500 hover:text-emerald-400 mt-4 inline-block">
            ← Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  const totalVolume = event.outcomes.reduce((sum, o) => sum + o.totalBets, 0);
  const oddsHistory = generateOddsHistory(event.id);

  const handleConfirmBet = (amount: number) => {
    toast.success(`Pari placé ! ${amount} tokens sur ${betModal?.name}`);
    setBetModal(null);
  };

  // Préparer les données du graphique
  const prepareChartData = () => {
    if (!selectedOutcomeForChart || !oddsHistory[selectedOutcomeForChart]) {
      // Si aucun outcome sélectionné, montrer tous les outcomes
      const allTimestamps = oddsHistory[event.outcomes[0].id]?.map(point => point.timestamp) || [];
      return allTimestamps.map((timestamp, index) => {
        const dataPoint: any = {
          id: `point-${index}`, // Ajouter un identifiant unique
          time: timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          fullTime: timestamp
        };
        
        event.outcomes.forEach(outcome => {
          const history = oddsHistory[outcome.id];
          if (history && history[index]) {
            dataPoint[outcome.name] = history[index].probability;
          }
        });
        
        return dataPoint;
      });
    } else {
      // Montrer uniquement l'outcome sélectionné
      return oddsHistory[selectedOutcomeForChart].map((point, index) => ({
        id: `point-${index}`, // Ajouter un identifiant unique
        time: point.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        fullTime: point.timestamp,
        Probabilité: point.probability
      }));
    }
  };

  const chartData = prepareChartData();
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Back Button */}
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux événements
      </Link>

      {/* Event Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-medium">
                {event.category}
              </span>
              {event.status === 'resolved' && (
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium">
                  Résolu
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">{event.title}</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{event.description}</p>
          </div>
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-zinc-500" />
            <div>
              <div className="text-xs text-zinc-500">Créé le</div>
              <div className="text-sm font-medium text-zinc-100">
                {event.createdAt.toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-zinc-500" />
            <div>
              <div className="text-xs text-zinc-500">Volume total</div>
              <div className="text-sm font-medium text-emerald-500">
                {totalVolume.toLocaleString()} tokens
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-zinc-500" />
            <div>
              <div className="text-xs text-zinc-500">Issues</div>
              <div className="text-sm font-medium text-zinc-100">
                {event.outcomes.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historique des cotes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100">Historique des probabilités</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedOutcomeForChart(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedOutcomeForChart === null
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Tout
            </button>
            {event.outcomes.map(outcome => (
              <button
                key={outcome.id}
                onClick={() => setSelectedOutcomeForChart(outcome.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedOutcomeForChart === outcome.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {outcome.name}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 11 }}
                domain={[0, 100]}
                label={{ value: 'Probabilité (%)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fafafa',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
              />
              {selectedOutcomeForChart === null ? (
                <>
                  <Legend wrapperStyle={{ color: '#fafafa', fontSize: '12px' }} />
                  {event.outcomes.map((outcome, index) => (
                    <Line
                      key={outcome.id}
                      type="monotone"
                      dataKey={outcome.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="Probabilité"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span>Données en temps réel simulées</span>
          </div>
        </div>
      </div>

      {/* Betting Options */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-zinc-100 mb-3">Placer votre pari</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {event.outcomes.map(outcome => {
            const percentage = (outcome.totalBets / totalVolume) * 100;
            return (
              <div
                key={outcome.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100 mb-0.5">
                      {outcome.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {outcome.totalBets.toLocaleString()} tokens pariés
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-500">
                      {outcome.odds.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Volume Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                    <span>Volume</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setBetModal(outcome)}
                  disabled={event.status === 'resolved'}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium transition-colors"
                >
                  {event.status === 'resolved' ? 'Événement résolu' : 'Parier sur cette issue'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bet Modal */}
      {betModal && (
        <BetModal
          event={event}
          outcome={betModal}
          onClose={() => setBetModal(null)}
          onConfirm={handleConfirmBet}
        />
      )}
    </div>
  );
}