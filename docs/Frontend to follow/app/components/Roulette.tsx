import { useState } from 'react';
import { getCurrentUser } from '../data/mockData';
import { RotateCw } from 'lucide-react';
import { toast } from 'sonner';

const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

type BetType = {
  type: 'number' | 'color' | 'even-odd' | 'range' | 'dozen';
  value: number | string;
  amount: number;
};

export function Roulette() {
  const currentUser = getCurrentUser();
  const [bets, setBets] = useState<BetType[]>([]);
  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([17, 32, 5, 23, 0, 14, 29, 8, 19, 36]);

  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);

  const placeBet = (type: BetType['type'], value: number | string) => {
    if (totalBet + betAmount > currentUser.tokens) {
      toast.error('Insufficient balance');
      return;
    }
    setBets([...bets, { type, value, amount: betAmount }]);
  };

  const clearBets = () => {
    setBets([]);
  };

  const spin = () => {
    if (bets.length === 0) {
      toast.error('Place at least one bet');
      return;
    }

    setSpinning(true);
    setResult(null);

    // Simulate spin
    setTimeout(() => {
      const spinResult = Math.floor(Math.random() * 37);
      setResult(spinResult);
      setHistory([spinResult, ...history.slice(0, 9)]);
      setSpinning(false);

      // Calculate winnings
      let totalWin = 0;
      bets.forEach(bet => {
        if (bet.type === 'number' && bet.value === spinResult) {
          totalWin += bet.amount * 36;
        } else if (bet.type === 'color') {
          if (
            (bet.value === 'red' && redNumbers.includes(spinResult)) ||
            (bet.value === 'black' && blackNumbers.includes(spinResult))
          ) {
            totalWin += bet.amount * 2;
          }
        } else if (bet.type === 'even-odd') {
          if (
            (bet.value === 'even' && spinResult > 0 && spinResult % 2 === 0) ||
            (bet.value === 'odd' && spinResult % 2 === 1)
          ) {
            totalWin += bet.amount * 2;
          }
        } else if (bet.type === 'range') {
          if (
            (bet.value === '1-18' && spinResult >= 1 && spinResult <= 18) ||
            (bet.value === '19-36' && spinResult >= 19 && spinResult <= 36)
          ) {
            totalWin += bet.amount * 2;
          }
        } else if (bet.type === 'dozen') {
          const dozen = Math.ceil(spinResult / 12);
          if (bet.value === `${dozen}`) {
            totalWin += bet.amount * 3;
          }
        }
      });

      if (totalWin > 0) {
        toast.success(`You won ${totalWin} tokens!`);
      } else {
        toast.error(`You lost ${totalBet} tokens`);
      }

      setBets([]);
    }, 3000);
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return 'bg-emerald-600';
    if (redNumbers.includes(num)) return 'bg-red-600';
    return 'bg-zinc-900';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Betting Table */}
      <div className="lg:col-span-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-base font-semibold text-zinc-100 mb-3">Place Your Bets</h3>

          {/* Number Grid */}
          <div className="mb-4">
            <div className="flex gap-1">
              {/* Zero */}
              <button
                onClick={() => placeBet('number', 0)}
                className="w-10 aspect-square bg-emerald-600 hover:bg-emerald-700 rounded font-bold text-white text-xs transition-colors flex-shrink-0"
              >
                0
              </button>

              {/* Numbers 1-36 */}
              <div className="flex-1 grid grid-cols-12 gap-1">
                {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => placeBet('number', num)}
                    className={`aspect-square ${getNumberColor(num)} hover:opacity-80 rounded font-bold text-white text-xs transition-opacity`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Outside Bets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => placeBet('color', 'red')}
              className="py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Red
            </button>
            <button
              onClick={() => placeBet('color', 'black')}
              className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Black
            </button>
            <button
              onClick={() => placeBet('even-odd', 'even')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Even
            </button>
            <button
              onClick={() => placeBet('even-odd', 'odd')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Odd
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => placeBet('range', '1-18')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              1-18
            </button>
            <button
              onClick={() => placeBet('range', '19-36')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              19-36
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => placeBet('dozen', '1')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              1st 12
            </button>
            <button
              onClick={() => placeBet('dozen', '2')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              2nd 12
            </button>
            <button
              onClick={() => placeBet('dozen', '3')}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              3rd 12
            </button>
          </div>
        </div>
      </div>

      {/* Betting Panel */}
      <div className="space-y-4">
        {/* Bet Amount */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">Bet Amount</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[10, 50, 100, 500].map(amount => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  betAmount === amount
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Current Bets */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">Your Bets</h3>
          {bets.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {bets.map((bet, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-1.5 bg-zinc-800 rounded">
                  <span className="text-zinc-400 text-xs">
                    {bet.type === 'number' ? `#${bet.value}` : String(bet.value)}
                  </span>
                  <span className="text-emerald-500 font-medium text-xs">{bet.amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 mb-3">No bets placed</p>
          )}
          <div className="flex items-center justify-between mb-3 pt-2 border-t border-zinc-800">
            <span className="text-sm text-zinc-400">Total</span>
            <span className="text-lg font-bold text-emerald-500">{totalBet}</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={spin}
              disabled={spinning || bets.length === 0}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw className={`size-4 ${spinning ? 'animate-spin' : ''}`} />
              {spinning ? 'Spinning...' : 'Spin'}
            </button>
            <button
              onClick={clearBets}
              disabled={spinning}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Bets
            </button>
          </div>
        </div>

        {/* Result */}
        {result !== null && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4 text-center">
            <div className="text-xs text-zinc-400 mb-1">Result</div>
            <div className={`text-4xl font-bold mb-1 ${
              result === 0 ? 'text-emerald-500' :
              redNumbers.includes(result) ? 'text-red-500' :
              'text-zinc-100'
            }`}>
              {result}
            </div>
            <div className="text-xs text-zinc-500">
              {result === 0 ? 'Green' : redNumbers.includes(result) ? 'Red' : 'Black'}
              {result > 0 && ` • ${result % 2 === 0 ? 'Even' : 'Odd'}`}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">Last 10 Results</h3>
          <div className="flex gap-1.5 flex-wrap">
            {history.map((num, i) => (
              <div
                key={i}
                className={`size-8 ${getNumberColor(num)} rounded-lg flex items-center justify-center font-bold text-white text-xs`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}