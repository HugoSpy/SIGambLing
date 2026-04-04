import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart2, TrendingUp, Users } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../../components/layout/DashboardShell";
import { LoadingScreen } from "../../components/layout/LoadingScreen";
import { useAuthenticatedUser } from "../../hooks/useAuthenticatedUser";
import {
  fetchAdminEventsLeaderboard,
  fetchAdminStatisticsOverview,
  logoutRequest,
  type LeaderboardEvent,
  type StatisticsOverview,
} from "../../lib/api";

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
          <p className="mt-1 text-3xl font-bold text-zinc-100">{value}</p>
          <p className={`mt-2 text-sm ${subtextColor}`}>{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminStatisticsPage() {
  const { data: user, isLoading: userLoading } = useAuthenticatedUser();
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [overview, lb] = await Promise.all([
        fetchAdminStatisticsOverview(),
        fetchAdminEventsLeaderboard(),
      ]);
      setStats(overview);
      setLeaderboard(lb);
    } catch {
      toast.error("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logoutRequest();
  };

  if (userLoading || !user) {
    return <LoadingScreen label="Chargement..." />;
  }

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Panneau d'administration</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gérer les événements, les utilisateurs et voir les statistiques
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800">
          <Link
            className="relative px-4 py-3 text-sm font-medium text-zinc-400 transition hover:text-zinc-100"
            to="/admin/events"
          >
            Événements
          </Link>
          <span className="relative px-4 py-3 text-sm font-medium text-emerald-400">
            Statistiques
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />
          </span>
        </div>

        {loading || !stats ? (
          <div className="py-20 text-center text-zinc-500">Chargement des statistiques…</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
                iconBg="bg-emerald-500/10"
                label="Total paris (semaine)"
                subtext={`${stats.totalBets.percentageChange > 0 ? "+" : ""}${stats.totalBets.percentageChange}% par rapport à la semaine dernière`}
                subtextColor={
                  stats.totalBets.trend === "up" ? "text-emerald-400" : "text-red-400"
                }
                value={stats.totalBets.value.toLocaleString("fr-FR")}
              />
              <StatCard
                icon={<Users className="h-5 w-5 text-blue-400" />}
                iconBg="bg-blue-500/10"
                label="Utilisateurs actifs"
                subtext={`${stats.activeUsers.online} en ligne maintenant`}
                subtextColor="text-blue-400"
                value={stats.activeUsers.total.toLocaleString("fr-FR")}
              />
              <StatCard
                icon={<BarChart2 className="h-5 w-5 text-purple-400" />}
                iconBg="bg-purple-500/10"
                label="Volume total"
                subtext="tokens pariés"
                subtextColor="text-zinc-400"
                value={stats.totalVolume.formatted}
              />
            </div>

           {/* Events Leaderboard */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-6 text-lg font-bold text-zinc-100">
                Événements les plus populaires
              </h2>
              {leaderboard.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Aucun événement avec des paris.
                </p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((event) => (
                    <div
                      key={event.eventId}
                      className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"
                    >
                      <div className="w-8 shrink-0 text-center">
                        <span className="text-xl font-bold text-zinc-500">#{event.rank}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{event.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {event.betCount} pari{event.betCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-bold text-zinc-100">
                          {event.totalVolume.toLocaleString("fr-FR")}
                        </p>
                        <p className="text-xs text-zinc-500">tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
