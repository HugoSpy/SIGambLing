import { useState } from 'react';
import { getCurrentUser } from '../data/mockData';
import { toast } from 'sonner';

type Card = {
  suit: string;
  value: string;
  numValue: number;
};

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getCardValue = (value: string, currentTotal: number): number => {
  if (value === 'A') {
    return currentTotal + 11 > 21 ? 1 : 11;
  }
  if (['J', 'Q', 'K'].includes(value)) return 10;
  return parseInt(value);
};

const calculateHandValue = (hand: Card[]): number => {
  let total = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card.value === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value);
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
};

const drawCard = (): Card => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const value = values[Math.floor(Math.random() * values.length)];
  return {
    suit,
    value,
    numValue: getCardValue(value, 0)
  };
};

export function Blackjack() {
  const currentUser = getCurrentUser();
  const [betAmount, setBetAmount] = useState(100);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'ended'>('betting');
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [result, setResult] = useState<string>('');

  const playerTotal = calculateHandValue(playerHand);
  const dealerTotal = calculateHandValue(dealerHand);

  const startGame = () => {
    if (betAmount > currentUser.tokens) {
      toast.error('Insufficient balance');
      return;
    }

    const newPlayerHand = [drawCard(), drawCard()];
    const newDealerHand = [drawCard(), drawCard()];

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setGameState('playing');
    setResult('');

    // Check for blackjack
    const pTotal = calculateHandValue(newPlayerHand);
    const dTotal = calculateHandValue(newDealerHand);

    if (pTotal === 21) {
      if (dTotal === 21) {
        endGame('Push! Both have Blackjack');
      } else {
        endGame(`Blackjack! You win ${Math.floor(betAmount * 2.5)} tokens`);
      }
    }
  };

  const hit = () => {
    const newHand = [...playerHand, drawCard()];
    setPlayerHand(newHand);

    const total = calculateHandValue(newHand);
    if (total > 21) {
      endGame(`Bust! You lose ${betAmount} tokens`);
    } else if (total === 21) {
      dealerPlay(newHand);
    }
  };

  const stand = () => {
    dealerPlay(playerHand);
  };

  const double = () => {
    if (betAmount * 2 > currentUser.tokens) {
      toast.error('Insufficient balance to double');
      return;
    }

    setBetAmount(betAmount * 2);
    const newHand = [...playerHand, drawCard()];
    setPlayerHand(newHand);

    const total = calculateHandValue(newHand);
    if (total > 21) {
      endGame(`Bust! You lose ${betAmount * 2} tokens`);
    } else {
      dealerPlay(newHand);
    }
  };

  const dealerPlay = (finalPlayerHand: Card[]) => {
    setGameState('dealer');
    let newDealerHand = [...dealerHand];

    const playDealer = () => {
      let total = calculateHandValue(newDealerHand);
      
      while (total < 17) {
        newDealerHand = [...newDealerHand, drawCard()];
        total = calculateHandValue(newDealerHand);
      }

      setDealerHand(newDealerHand);

      const playerFinal = calculateHandValue(finalPlayerHand);
      const dealerFinal = total;

      if (dealerFinal > 21) {
        endGame(`Dealer busts! You win ${betAmount * 2} tokens`);
      } else if (playerFinal > dealerFinal) {
        endGame(`You win ${betAmount * 2} tokens!`);
      } else if (playerFinal < dealerFinal) {
        endGame(`Dealer wins! You lose ${betAmount} tokens`);
      } else {
        endGame('Push! Bet returned');
      }
    };

    setTimeout(playDealer, 1000);
  };

  const endGame = (message: string) => {
    setResult(message);
    setGameState('ended');
    if (message.includes('win')) {
      toast.success(message);
    } else if (message.includes('lose') || message.includes('bust') || message.includes('Dealer wins')) {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  const reset = () => {
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setResult('');
  };

  const CardComponent = ({ card, hidden }: { card: Card; hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    if (hidden) {
      return (
        <div className="w-14 h-20 bg-emerald-600 rounded-lg border-2 border-emerald-500 flex items-center justify-center">
          <div className="text-xl text-emerald-900">?</div>
        </div>
      );
    }

    return (
      <div className="w-14 h-20 bg-white rounded-lg border-2 border-zinc-300 p-1.5 flex flex-col justify-between">
        <div className={`text-left ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          <div className="text-base font-bold leading-none">{card.value}</div>
          <div className="text-lg leading-none">{card.suit}</div>
        </div>
        <div className={`text-right ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          <div className="text-lg leading-none">{card.suit}</div>
          <div className="text-base font-bold leading-none">{card.value}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {/* Dealer Hand */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-zinc-100">Dealer</h3>
            <div className="text-lg font-bold text-zinc-100">
              {gameState === 'playing' ? '?' : dealerTotal}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {dealerHand.map((card, i) => (
              <CardComponent
                key={i}
                card={card}
                hidden={gameState === 'playing' && i === 1}
              />
            ))}
          </div>
        </div>

        {/* Player Hand */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-zinc-100">You</h3>
            <div className={`text-lg font-bold ${
              playerTotal > 21 ? 'text-red-500' :
              playerTotal === 21 ? 'text-emerald-500' :
              'text-zinc-100'
            }`}>
              {playerTotal}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {playerHand.map((card, i) => (
              <CardComponent key={i} card={card} />
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
            <p className="text-base font-semibold text-emerald-500">{result}</p>
          </div>
        )}

        {/* Actions */}
        {gameState === 'betting' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bet Amount</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[50, 100, 250, 500].map(amount => (
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
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={startGame}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-base transition-colors"
            >
              Deal Cards
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={hit}
              className="py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-colors"
            >
              Hit
            </button>
            <button
              onClick={stand}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Stand
            </button>
            <button
              onClick={double}
              disabled={playerHand.length !== 2}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 rounded-lg text-sm font-semibold transition-colors"
            >
              Double
            </button>
          </div>
        )}

        {gameState === 'dealer' && (
          <div className="text-center py-3">
            <p className="text-sm text-zinc-400">Dealer is playing...</p>
          </div>
        )}

        {gameState === 'ended' && (
          <button
            onClick={reset}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition-colors"
          >
            New Game
          </button>
        )}

        {/* Balance Display */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-sm text-zinc-400">Current Balance</span>
          <span className="text-lg font-bold text-emerald-500">
            {currentUser.tokens.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}