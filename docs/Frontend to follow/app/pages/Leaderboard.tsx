import { mockUsers } from '../data/mockData';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

const badgeIcons: Record<string, string> = {
  champion: '🏆',
  whale: '🐋',
  veteran: '⭐',
  streak: '🔥',
  lucky: '🍀',
  gambler: '🎲',
  analyst: '📊'
};

export function Leaderboard() {
  const users = mockUsers.slice(0, 50);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="size-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="size-6 text-zinc-400" />;
    if (rank === 3) return <Award className="size-6 text-orange-700" />;
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Classement</h1>
        <p className="text-zinc-400">Top 50 des joueurs classés par nombre de tokens</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {users.slice(0, 3).map((user, index) => {
          const positions = [1, 0, 2]; // Second place in middle for visual effect
          const actualIndex = positions.indexOf(index);
          const heights = ['h-32', 'h-40', 'h-28'];
          
          return (
            <div
              key={user.id}
              className={`${
                actualIndex === 0 ? 'order-2' : actualIndex === 1 ? 'order-1' : 'order-3'
              }`}
            >
              <div className="text-center mb-3">
                <div className="size-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/30 mx-auto mb-2 flex items-center justify-center text-2xl font-bold text-emerald-500">
                  {user.username[0]}
                </div>
                <div className="font-semibold text-zinc-100">{user.username}</div>
                <div className="text-sm text-zinc-500">
                  {user.stats.winRate.toFixed(1)}% de victoires
                </div>
              </div>
              <div className={`${heights[actualIndex]} bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 rounded-t-xl flex flex-col items-center justify-start pt-4`}>
                <div className="mb-2">{getMedalIcon(user.rank)}</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {user.tokens.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500">tokens</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-800 text-sm font-medium text-zinc-400">
          <div className="col-span-1">Rang</div>
          <div className="col-span-4">Joueur</div>
          <div className="col-span-2 text-right">Tokens</div>
          <div className="col-span-2 text-right hidden md:block">Taux</div>
          <div className="col-span-2 text-right hidden md:block">Paris</div>
          <div className="col-span-1 hidden lg:block">Badges</div>
        </div>

        {/* Leaderboard Rows */}
        <div className="divide-y divide-zinc-800">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors"
            >
              {/* Rank */}
              <div className="col-span-1 flex items-center">
                {user.rank <= 3 ? (
                  <div className="flex items-center">
                    {getMedalIcon(user.rank)}
                  </div>
                ) : (
                  <div className="text-zinc-400 font-medium">#{user.rank}</div>
                )}
              </div>

              {/* Player */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-semibold">
                  {user.username[0]}
                </div>
                <div>
                  <div className="font-medium text-zinc-100">{user.username}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    {user.stats.streak > 0 && (
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="size-3" />
                        {user.stats.streak} série
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tokens */}
              <div className="col-span-2 flex items-center justify-end">
                <div className="text-right">
                  <div className="font-semibold text-emerald-500">
                    {user.tokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">tokens</div>
                </div>
              </div>

              {/* Win Rate */}
              <div className="col-span-2 hidden md:flex items-center justify-end">
                <div className="text-right">
                  <div className="font-medium text-zinc-100">
                    {user.stats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500">victoires</div>
                </div>
              </div>

              {/* Bets */}
              <div className="col-span-2 hidden md:flex items-center justify-end">
                <div className="text-right">
                  <div className="font-medium text-zinc-100">
                    {user.stats.betsPlaced}
                  </div>
                  <div className="text-xs text-emerald-500">
                    {user.stats.betsWon}G {user.stats.betsLost}P
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="col-span-1 hidden lg:flex items-center justify-end gap-1">
                {user.badges.slice(0, 3).map((badge, i) => (
                  <span key={i} className="text-lg" title={badge}>
                    {badgeIcons[badge]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}