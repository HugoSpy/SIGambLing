import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, Medal, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { fetchLeaderboard, logoutRequest } from "../lib/api";
import { cn, formatTokens } from "../lib/utils";

const limitSteps = [10, 25, 50] as const;

function formatActivityLabel(value: string | null) {
  if (!value) {
    return "Aucune activité récente";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeaderboardPage() {
  const { data: user } = useAuthenticatedUser();
  const [scope, setScope] = useState<"global" | "casino">("global");
  const [limit, setLimit] = useState<(typeof limitSteps)[number]>(10);
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", scope, limit],
    queryFn: () => fetchLeaderboard(scope, limit),
  });

  const visibleEntries = leaderboard?.entries ?? [];
  const pinnedEntry = useMemo(() => {
    if (!leaderboard?.current_user_entry) {
      return null;
    }

    return visibleEntries.some((entry) => entry.user.id === leaderboard.current_user_entry?.user.id)
      ? null
      : leaderboard.current_user_entry;
  }, [leaderboard?.current_user_entry, visibleEntries]);

  if (!user || isLoading) {
    return <LoadingScreen label="Chargement du classement..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Classement</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Classement sur les 60 derniers jours, avec votre position toujours visible même
              hors top {limit}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={scope === "global" ? "primary" : "secondary"}
              onClick={() => setScope("global")}
            >
              Global
            </Button>
            <Button
              size="sm"
              variant={scope === "casino" ? "primary" : "secondary"}
              onClick={() => setScope("casino")}
            >
              Casino
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card accent="cyan">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Classement</p>
            <p className="mt-3 text-3xl font-bold text-zinc-100">
              {leaderboard?.current_user_entry?.rank ?? "NC"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Votre rang actuel</p>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Volume</p>
            <p className="mt-3 text-3xl font-bold text-zinc-100">
              {formatTokens(leaderboard?.current_user_entry?.total_wagered ?? 0)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Tokens engagés sur 60 jours</p>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Population</p>
            <p className="mt-3 text-3xl font-bold text-zinc-100">
              {formatTokens(leaderboard?.total_ranked_users ?? 0)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Joueurs classés</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Vue</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">
                {scope === "casino" ? "Classement casino" : "Classement global"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {limitSteps.map((step) => (
                <Button
                  key={step}
                  size="sm"
                  variant={limit === step ? "primary" : "secondary"}
                  onClick={() => setLimit(step)}
                >
                  Top {step}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {visibleEntries.map((entry) => (
              <div
                className={cn(
                  "rounded-xl border px-4 py-4 transition",
                  entry.is_current_user
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-950",
                )}
                key={entry.user.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-zinc-100">
                      {entry.rank <= 3 ? (
                        entry.rank === 1 ? (
                          <Crown className="h-5 w-5 text-amber-300" />
                        ) : entry.rank === 2 ? (
                          <Trophy className="h-5 w-5 text-zinc-300" />
                        ) : (
                          <Medal className="h-5 w-5 text-orange-300" />
                        )
                      ) : (
                        `#${entry.rank}`
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{entry.user.pseudo}</p>
                      <p className="text-xs text-zinc-500">
                        Dernière activité {formatActivityLabel(entry.recent_activity_at)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
                    <div>
                      <p>Volume total</p>
                      <p className="mt-1 font-semibold text-zinc-100">
                        {formatTokens(entry.total_wagered)}
                      </p>
                    </div>
                    <div>
                      <p>Événements</p>
                      <p className="mt-1 font-semibold text-zinc-100">
                        {formatTokens(entry.event_wagered)}
                      </p>
                    </div>
                    <div>
                      <p>Casino</p>
                      <p className="mt-1 font-semibold text-zinc-100">
                        {formatTokens(entry.casino_wagered)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {visibleEntries.length === 0 ? (
              <p className="text-sm leading-7 text-zinc-400">
                Aucun volume de jeu n&apos;a encore été enregistré sur cette fenêtre.
              </p>
            ) : null}
          </div>

          {pinnedEntry ? (
            <div className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Votre position</p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    #{pinnedEntry.rank} {pinnedEntry.user.pseudo}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Hors top {limit}, mais toujours épinglé pour suivi.
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  {formatTokens(pinnedEntry.total_wagered)} tokens
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Retour jeu</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">Relancer une session</h2>
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
              to={scope === "casino" ? "/casino" : "/events"}
            >
              {scope === "casino" ? "Ouvrir le casino" : "Voir les marchés"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
