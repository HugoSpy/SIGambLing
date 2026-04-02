import { Event } from '../types';
import { Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

interface EventCardProps {
  event: Event;
  onQuickBet?: (outcomeId: string) => void;
}

export function EventCard({ event, onQuickBet }: EventCardProps) {
  const totalVolume = event.outcomes.reduce((sum, o) => sum + o.totalBets, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <Link to={`/events/${event.id}`} className="hover:text-emerald-500 transition-colors">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">{event.title}</h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
              {event.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {event.createdAt.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              {totalVolume.toLocaleString()} tokens
            </span>
          </div>
        </div>
        {event.status === 'resolved' && (
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium">
            Résolu
          </span>
        )}
      </div>

      {/* Outcomes */}
      <div className="grid grid-cols-2 gap-2">
        {event.outcomes.map((outcome) => (
          <button
            key={outcome.id}
            onClick={() => onQuickBet?.(outcome.id)}
            disabled={event.status === 'resolved'}
            className={`p-2 rounded-lg border transition-colors ${
              event.status === 'resolved'
                ? 'border-zinc-800 bg-zinc-800/50 cursor-not-allowed'
                : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50'
            }`}
          >
            <div className="text-xs text-zinc-400 mb-0.5">{outcome.name}</div>
            <div className="text-lg font-semibold text-emerald-500">
              {outcome.odds.toFixed(2)}x
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}