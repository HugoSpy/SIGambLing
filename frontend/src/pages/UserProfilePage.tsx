import { useQuery } from "@tanstack/react-query";
import { Award, BarChart2, Coins, ExternalLink, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { fetchUserPublicProfile, logoutRequest, type PinnedBadge } from "../lib/api";
import { formatTokens } from "../lib/utils";
import type { BadgeCatalogRarity } from "../types/gamification";

const RARITY_PILL: Record<BadgeCatalogRarity, string> = {
  COMMON: "text-zinc-400 bg-zinc-800 border-zinc-700",
  RARE: "text-purple-400 bg-purple-900/30 border-purple-700/50",
  EPIC: "text-yellow-400 bg-yellow-900/30 border-yellow-600/50",
  LEGENDARY: "text-amber-300 bg-amber-900/30 border-amber-500/50",
};

const RARITY_LABEL: Record<BadgeCatalogRarity, string> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};

function RankPill({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;
  const isTop10 = rank <= 10;
  const style = isTop3
    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
    : isTop10
    ? "bg-zinc-500/20 text-zinc-300 border-zinc-500/40"
    : "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-bold ${style}`}>
      #{rank}
    </span>
  );
}

function BadgeSlot({ badge }: { badge: PinnedBadge | null }) {
  if (!badge) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-5 text-center">
        <Award className="h-7 w-7 text-zinc-700" />
        <span className="text-xs text-zinc-600">—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">{badge.label}</span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RARITY_PILL[badge.rarity]}`}
        >
          {RARITY_LABEL[badge.rarity]}
        </span>
      </div>
      <p className="text-[11px] text-zinc-500">
        {new Date(badge.unlockedAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: currentUser } = useAuthenticatedUser();

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserPublicProfile(userId!),
    enabled: !!userId,
    retry: false,
  });

  const handleLogout = async () => {
    await logoutRequest();
  };

  if (!currentUser || isLoading) {
    return <LoadingScreen label="Chargement du profil..." />;
  }

  if (isError) {
    const is404 =
      error instanceof Error &&
      "status" in error &&
      (error as { status?: number }).status === 404;
    return (
      <DashboardShell onLogout={handleLogout} user={currentUser}>
        <Card className="text-center py-16">
          <p className="text-4xl font-bold text-zinc-600">{is404 ? "404" : "Erreur"}</p>
          <p className="mt-3 text-zinc-400">
            {is404 ? "Utilisateur introuvable." : "Impossible de charger ce profil."}
          </p>
          <div className="mt-6">
            <Link to="/leaderboard">
              <Button variant="secondary" size="sm">Retour au classement</Button>
            </Link>
          </div>
        </Card>
      </DashboardShell>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser.id === profile.id;

  const initials = profile.pseudo
    .split(/[\s._-]/)
    .filter(Boolean)
    .map((c) => c[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const slots: (PinnedBadge | null)[] = [
    profile.pinnedBadges.find((b) => b.pinnedOrder === 1) ?? null,
    profile.pinnedBadges.find((b) => b.pinnedOrder === 2) ?? null,
    profile.pinnedBadges.find((b) => b.pinnedOrder === 3) ?? null,
  ];

  const winRatePct = Math.round(profile.stats.winRate * 100);

  return (
    <DashboardShell onLogout={handleLogout} user={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <Card accent="cyan">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              {profile.avatarUrl ? (
                <img
                  alt={profile.pseudo}
                  src={profile.avatarUrl}
                  className="h-20 w-20 flex-shrink-0 rounded-full border border-white/10 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.svg";
                  }}
                />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-2xl font-bold text-emerald-400 border border-emerald-500/20">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-zinc-100">{profile.pseudo}</h1>
                  {profile.leaderboardRank !== null && (
                    <RankPill rank={profile.leaderboardRank} />
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-400">{profile.email}</p>
                <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  {formatTokens(profile.balance)} tokens
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <Link to="/profile" className="shrink-0">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Modifier mon profil
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Pinned badges */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-5 w-5 text-brand-orange" />
            <h2 className="text-lg font-semibold text-zinc-100">Badges épinglés</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {slots.map((badge, i) => (
              <BadgeSlot key={i} badge={badge} />
            ))}
          </div>
        </Card>

        {/* Stats */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <BarChart2 className="h-5 w-5 text-brand-cyan" />
            <h2 className="text-lg font-semibold text-zinc-100">Statistiques</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Total paris</p>
              <p className="mt-2 font-display text-2xl text-zinc-100">{profile.stats.totalBets}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Victoires</p>
              <p className="mt-2 font-display text-2xl text-zinc-100">{profile.stats.wonBets}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Winrate</p>
              <p className="mt-2 font-display text-2xl text-zinc-100">{winRatePct}%</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Volume</p>
              <p className="mt-2 font-display text-2xl text-zinc-100">
                {formatTokens(profile.stats.totalVolume)}
              </p>
            </div>
          </div>
        </Card>

        {/* Back link */}
        <div className="flex items-center gap-3">
          <Link to="/leaderboard">
            <Button variant="secondary" size="sm">
              <Trophy className="mr-2 h-4 w-4" />
              Voir le classement
            </Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
