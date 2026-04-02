import { useState } from 'react';
import { Dice1, Spade } from 'lucide-react';
import { Roulette } from '../components/Roulette';
import { Blackjack } from '../components/Blackjack';

export function Casino() {
  const [activeGame, setActiveGame] = useState<'roulette' | 'blackjack'>('roulette');

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Casino</h1>
        <p className="text-sm text-zinc-400">Tentez votre chance à nos jeux de casino</p>
      </div>

      {/* Game Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveGame('roulette')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeGame === 'roulette'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Dice1 className="size-4" />
          Roulette
        </button>
        <button
          onClick={() => setActiveGame('blackjack')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeGame === 'blackjack'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Spade className="size-4" />
          Blackjack
        </button>
      </div>

      {/* Game Content */}
      {activeGame === 'roulette' ? <Roulette /> : <Blackjack />}
    </div>
  );
}