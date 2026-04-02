import { useState, useEffect } from 'react';
import { Event, Outcome } from '../types';
import { X, TrendingUp } from 'lucide-react';
import { getCurrentUser } from '../data/mockData';

interface BetModalProps {
  event: Event;
  outcome: Outcome;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

export function BetModal({ event, outcome, onClose, onConfirm }: BetModalProps) {
  const [amount, setAmount] = useState('');
  const currentUser = getCurrentUser();
  const numAmount = parseFloat(amount) || 0;
  const potentialWin = numAmount * outcome.odds;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleConfirm = () => {
    if (numAmount > 0 && numAmount <= currentUser.tokens) {
      onConfirm(numAmount);
    }
  };

  const quickAmounts = [100, 250, 500, 1000];

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-1">Placer un pari</h3>
            <p className="text-sm text-zinc-400">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Outcome Info */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Pari sur</span>
            <span className="text-emerald-500 font-semibold">{outcome.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Cotes</span>
            <span className="text-xl font-semibold text-emerald-500">
              {outcome.odds.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Montant du pari</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-xl font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              tokens
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-zinc-500">Disponible : {currentUser.tokens.toLocaleString()}</span>
            {numAmount > currentUser.tokens && (
              <span className="text-red-500">Solde insuffisant</span>
            )}
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {quickAmounts.map((quick) => (
            <button
              key={quick}
              onClick={() => setAmount(quick.toString())}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Potential Win */}
        {numAmount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-emerald-500 flex items-center gap-2">
                <TrendingUp className="size-4" />
                Gain potentiel
              </span>
              <span className="text-2xl font-bold text-emerald-500">
                {potentialWin.toFixed(0)} tokens
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={numAmount <= 0 || numAmount > currentUser.tokens}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
          >
            Confirmer le pari
          </button>
        </div>
      </div>
    </div>
  );
}