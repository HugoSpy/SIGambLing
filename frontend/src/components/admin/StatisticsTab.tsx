import { useEffect, useState } from "react";
import { Activity, Coins, TrendingUp, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchAdminStatisticsOverview,
  fetchAdminEventsLeaderboard,
  fetchPublicStats,
  type StatisticsOverview,
  type LeaderboardEvent,
  type PublicStats,
} from "../../lib/api";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function StatCard({
  label,
  value,
  subtext,
  subtextColor,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  subtext: string;
  subtextColor: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${iconBg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
          <p className={`mt-2 text-sm ${subtextColor}`}>{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export function StatisticsTab() {
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [overview, lb, pub] = await Promise.all([
          fetchAdminStatisticsOverview(),
          fetchAdminEventsLeaderboard(),
          fetchPublicStats(),
        ]);
        setStats(overview);
        setLeaderboard(lb);
        setPublicStats(pub);
      } catch {
        toast.error("Impossible de charger les statistiques.");
      }
    };

    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, []);

  const dash = "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          label="Total paris (semaine)"
          subtext={
            stats
              ? `${stats.totalBets.percentageChange > 0 ? "+" : ""}${stats.totalBets.percentageChange}% vs semaine dernière`
              : dash
          }
          subtextColor={
            stats ? (stats.totalBets.trend === "up" ? "text-emerald-400" : "text-red-400") : "text-zinc-500"
          }
          value={stats ? stats.totalBets.value.toLocaleString("fr-FR") : dash}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
          label="Utilisateurs actifs"
          subtext={stats ? `${stats.activeUsers.online} en ligne maintenant` : dash}
          subtextColor="text-blue-400"
          value={stats ? stats.activeUsers.total.toLocaleString("fr-FR") : dash}
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-purple-400" />}
          iconBg="bg-purple-500/10"
          label="Volume total"
          subtext="tokens pariés"
          subtextColor="text-zinc-400"
          value={stats ? stats.totalVolume.formatted : dash}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<Coins className="h-5 w-5 text-purple-400" />}
          iconBg="bg-purple-500/10"
          label="Tokens pariés (events)"
          subtext="volume all-time événements"
          subtextColor="text-zinc-400"
          value={publicStats ? formatTokens(publicStats.eventVolume) : dash}
        />
        <StatCard
          icon={<Coins className="h-5 w-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
          label="Tokens pariés (casino)"
          subtext="volume all-time casino"
          subtextColor="text-zinc-400"
          value={publicStats ? formatTokens(publicStats.casinoVolume) : dash}
        />
        <StatCard
          icon={<Coins className="h-5 w-5 text-sky-400" />}
          iconBg="bg-sky-500/10"
          label="Tokens en circulation"
          subtext="solde total des joueurs"
          subtextColor="text-zinc-400"
          value={publicStats ? formatTokens(publicStats.totalTokens) : dash}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-6 text-lg font-bold text-zinc-100">Événements les plus populaires</h2>
        {leaderboard.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            {stats === null ? "Chargement…" : "Aucun événement avec des paris."}
          </p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((event) => (
              <div
                className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"
                key={event.eventId}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800">
                  <span className="text-sm font-bold text-zinc-400">{event.rank}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{event.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {event.betCount} pari{event.betCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-emerald-400">
                    {event.totalVolume.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-zinc-500">tokens</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
