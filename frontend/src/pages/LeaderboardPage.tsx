import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { fetchLeaderboard, logoutRequest } from "../lib/api";
import type {
  AnyLeaderboardView,
  BalanceEntry,
  LeaderboardApiTab,
  VolumeEntry,
  WinrateEntry,
} from "../types/gamification";
import { cn, formatTokens } from "../lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type PageTab = "balance" | "volume" | "winrate";
type WinrateScope = "global" | "casino";
const limitSteps = [10, 25, 50] as const;

function toApiTab(tab: PageTab, winrateScope: WinrateScope): LeaderboardApiTab {
  if (tab === "winrate") return winrateScope === "global" ? "winrate_global" : "winrate_casino";
  return tab;
}

// ─── Rank delta badge ─────────────────────────────────────────────────────────

function RankDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) return <span className="ml-1 text-xs text-yellow-400">—</span>;
  if (delta > 0) return <span className="ml-1 text-xs text-emerald-400">▲+{delta}</span>;
  return <span className="ml-1 text-xs text-red-400">▼{delta}</span>;
}

// ─── Rank cell ────────────────────────────────────────────────────────────────

function RankCell({ rank, delta }: { rank: number; delta: number | null }) {
  const icon =
    rank === 1 ? (
      <Crown className="h-5 w-5 text-amber-300" />
    ) : rank === 2 ? (
      <Trophy className="h-5 w-5 text-zinc-300" />
    ) : rank === 3 ? (
      <Medal className="h-5 w-5 text-orange-300" />
    ) : null;

  return (
    <div className="flex h-11 w-14 shrink-0 items-center gap-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-zinc-100">
        {icon ?? `#${rank}`}
      </div>
      <RankDeltaBadge delta={delta} />
    </div>
  );
}

// ─── Value cells by tab ───────────────────────────────────────────────────────

function BalanceValue({ entry }: { entry: BalanceEntry }) {
  return (
    <p className="text-sm font-semibold text-zinc-100">
      {formatTokens(entry.balance)} tokens
    </p>
  );
}

function VolumeValue({ entry }: { entry: VolumeEntry }) {
  return (
    <div className="text-right text-sm">
      <p className="font-semibold text-zinc-100">{formatTokens(entry.total_tokens)} tokens</p>
      <p className="text-xs text-zinc-500">{entry.total_bets} paris</p>
    </div>
  );
}

function WinrateValue({ entry }: { entry: WinrateEntry }) {
  return (
    <div className="text-right text-sm">
      <p className="font-semibold text-zinc-100">{entry.winrate.toFixed(1)}%</p>
      <p className="text-xs text-zinc-500">{entry.total_games} parties</p>
    </div>
  );
}

// ─── Generic entry row ────────────────────────────────────────────────────────

type AnyEntry = BalanceEntry | VolumeEntry | WinrateEntry;

function EntryRow({
  entry,
  tab,
  isCurrentUser,
}: {
  entry: AnyEntry;
  tab: PageTab;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3 transition",
        isCurrentUser
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-zinc-800 bg-zinc-950",
      )}
    >
      <div className="flex items-center gap-3">
        <RankCell rank={entry.rank} delta={entry.rank_delta} />
        <Link
          to={`/profile/${entry.user.id}`}
          className="text-sm font-semibold text-zinc-100 transition-colors hover:text-emerald-400"
        >
          {entry.user.pseudo}
        </Link>
      </div>

      <div>
        {tab === "balance" && <BalanceValue entry={entry as BalanceEntry} />}
        {tab === "volume" && <VolumeValue entry={entry as VolumeEntry} />}
        {tab === "winrate" && <WinrateValue entry={entry as WinrateEntry} />}
      </div>
    </div>
  );
}

// ─── Current user stat cards ──────────────────────────────────────────────────

function StatCards({
  data,
  tab,
}: {
  data: AnyLeaderboardView | undefined;
  tab: PageTab;
}) {
  const entry = data?.current_user_entry;

  const valueLabel =
    tab === "balance"
      ? "Votre solde"
      : tab === "volume"
        ? "Tokens misés (tout temps)"
        : "Votre winrate";

  const valueDisplay = () => {
    if (!entry) return "—";
    if (tab === "balance") return `${formatTokens((entry as BalanceEntry).balance)} T`;
    if (tab === "volume") return `${formatTokens((entry as VolumeEntry).total_tokens)} T`;
    return `${(entry as WinrateEntry).winrate.toFixed(1)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card accent="cyan">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Classement</p>
        <p className="mt-3 text-3xl font-bold text-zinc-100">
          {entry?.rank ?? "NC"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Votre rang actuel</p>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{valueLabel}</p>
        <p className="mt-3 text-3xl font-bold text-zinc-100">{valueDisplay()}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {tab === "winrate" && entry
            ? `${(entry as WinrateEntry).total_games} parties jouées`
            : tab === "volume" && entry
              ? `${(entry as VolumeEntry).total_bets} paris`
              : ""}
        </p>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Population</p>
        <p className="mt-3 text-3xl font-bold text-zinc-100">
          {formatTokens(data?.total_ranked_users ?? 0)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Joueurs classés</p>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { data: user } = useAuthenticatedUser();
  const [activeTab, setActiveTab] = useState<PageTab>("balance");
  const [winrateScope, setWinrateScope] = useState<WinrateScope>("global");
  const [limit, setLimit] = useState<(typeof limitSteps)[number]>(10);

  const apiTab = toApiTab(activeTab, winrateScope);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", apiTab, limit],
    queryFn: () => fetchLeaderboard(apiTab, limit),
  });

  if (!user || isLoading) {
    return <LoadingScreen label="Chargement du classement..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  const visibleEntries = (leaderboard?.entries ?? []).slice(0, limit);
  const pinnedEntry = (() => {
    const cur = leaderboard?.current_user_entry;
    if (!cur) return null;
    return visibleEntries.some((e) => e.user.id === cur.user.id) ? null : cur;
  })();

  const tabs: { id: PageTab; label: string }[] = [
    { id: "balance", label: "Balance" },
    { id: "volume", label: "Volume" },
    { id: "winrate", label: "Winrate" },
  ];

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        {/* Header + tab bar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Classement</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Votre position toujours visible même hors top {limit}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={activeTab === t.id ? "primary" : "secondary"}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <StatCards data={leaderboard} tab={activeTab} />

        {/* Main list */}
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Vue</p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-100">
                  {activeTab === "balance" && "Classement balance"}
                  {activeTab === "volume" && "Classement volume"}
                  {activeTab === "winrate" &&
                    (winrateScope === "global" ? "Winrate global" : "Winrate casino")}
                </h2>
              </div>

              {/* Winrate sub-toggle */}
              {activeTab === "winrate" && (
                <div className="flex gap-1 rounded-lg border border-zinc-700 p-1">
                  <button
                    className={cn(
                      "rounded px-3 py-1 text-xs font-medium transition",
                      winrateScope === "global"
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200",
                    )}
                    onClick={() => setWinrateScope("global")}
                  >
                    Global
                  </button>
                  <button
                    className={cn(
                      "rounded px-3 py-1 text-xs font-medium transition",
                      winrateScope === "casino"
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200",
                    )}
                    onClick={() => setWinrateScope("casino")}
                  >
                    Casino
                  </button>
                </div>
              )}
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

          {activeTab === "winrate" && (
            <p className="mt-2 text-xs text-zinc-500">
              Minimum 10 parties pour apparaître dans ce classement.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {visibleEntries.map((entry) => (
              <EntryRow
                key={entry.user.id}
                entry={entry}
                tab={activeTab}
                isCurrentUser={entry.is_current_user}
              />
            ))}

            {visibleEntries.length === 0 && (
              <p className="text-sm leading-7 text-zinc-400">
                Aucune donnée disponible pour ce classement.
              </p>
            )}
          </div>

          {/* Pinned current user outside top N */}
          {pinnedEntry && (
            <div className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Votre position</p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    #{pinnedEntry.rank}{" "}
                    <RankDeltaBadge delta={pinnedEntry.rank_delta} />
                    {pinnedEntry.user.pseudo}
                  </p>
                </div>
                <div className="text-sm font-semibold text-zinc-100">
                  {activeTab === "balance" && `${formatTokens((pinnedEntry as BalanceEntry).balance)} tokens`}
                  {activeTab === "volume" && `${formatTokens((pinnedEntry as VolumeEntry).total_tokens)} tokens · ${(pinnedEntry as VolumeEntry).total_bets} paris`}
                  {activeTab === "winrate" && `${(pinnedEntry as WinrateEntry).winrate.toFixed(1)}% · ${(pinnedEntry as WinrateEntry).total_games} parties`}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
