import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Share2, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { api, logoutRequest } from "../lib/api";
import { formatTokens } from "../lib/utils";

interface WinEntry {
  id: string;
  type: "bet" | "casino";
  source: string;
  amount: number;
  payout: number;
  profit: number;
  date: string;
  detail: string;
}

interface WinsResponse {
  wins: WinEntry[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

type WinSort = "recent" | "best_gain" | "biggest_bet";

const sortOptions: { label: string; value: WinSort }[] = [
  { label: "Récents", value: "recent" },
  { label: "Meilleur gain", value: "best_gain" },
  { label: "Plus gros pari", value: "biggest_bet" },
];

function sourceIcon(source: string) {
  if (source === "Roulette") return "🎰";
  if (source === "Blackjack") return "🃏";
  return "🏆";
}

function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function WinsPage() {
  const { data: user } = useAuthenticatedUser();
  const [sort, setSort] = useState<WinSort>("recent");
  const [allWins, setAllWins] = useState<WinEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const shareTimers = useRef(new Map<string, number>());
  const [, forceRender] = useState(0);

  const { isLoading } = useQuery({
    queryKey: ["my-wins", sort],
    queryFn: async () => {
      const response = await api.get<WinsResponse>("/users/me/wins", {
        params: { sort, page: 1, limit: 20 },
      });
      setAllWins(response.data.wins);
      setHasMore(response.data.hasMore);
      setTotal(response.data.total);
      setNextPage(2);
      return response.data;
    },
  });

  const totalLoaded = allWins.length;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || totalLoaded >= 100) return;
    setLoadingMore(true);
    try {
      const response = await api.get<WinsResponse>("/users/me/wins", {
        params: { sort, page: nextPage, limit: 20 },
      });
      setAllWins((prev) => [...prev, ...response.data.wins]);
      setHasMore(response.data.hasMore);
      setTotal(response.data.total);
      setNextPage((p) => p + 1);
    } catch {
      toast.error("Erreur lors du chargement.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, totalLoaded, sort, nextPage]);

  const shareWin = useCallback(
    async (win: WinEntry) => {
      const now = Date.now();
      const lastShare = shareTimers.current.get(win.id);
      if (lastShare && now - lastShare < 60_000) {
        toast.error("Tu peux partager une victoire par minute.");
        return;
      }

      try {
        await api.post("/chat/share-win", {
          winId: win.id,
          winType: win.type,
        });
        shareTimers.current.set(win.id, now);
        forceRender((n) => n + 1);
        toast.success("Victoire partagée dans le chat !");
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 429) {
          toast.error("Tu peux partager une victoire par minute.");
        } else {
          toast.error("Erreur lors du partage.");
        }
      }
    },
    [],
  );

  function isShareDisabled(winId: string) {
    const lastShare = shareTimers.current.get(winId);
    return !!lastShare && Date.now() - lastShare < 60_000;
  }

  if (!user) return <LoadingScreen label="Chargement..." />;

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Mes Wins</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Retrouvez toutes vos victoires — paris et casino.
          </p>
        </div>

        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  sort === opt.value
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                }`}
                type="button"
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-zinc-500">{total} victoire{total !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Chargement...</p>
          ) : allWins.length === 0 ? (
            <div className="py-10 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Aucune victoire pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allWins.map((win, index) => (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index < 20 ? index * 0.03 : 0 }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 sm:grid sm:grid-cols-[180px_1fr_1fr_1fr_48px] sm:flex-none sm:gap-0"
                >
                  <span className="flex flex-1 items-center gap-2 font-semibold text-zinc-100 sm:flex-none">
                    <span className="text-lg">{sourceIcon(win.source)}</span>
                    {win.source}
                  </span>
                  <span className="text-sm text-gray-400">Mise : {formatTokens(win.amount)}</span>
                  <span className="text-sm font-semibold text-emerald-400">+{formatTokens(win.profit)}</span>
                  <span className="text-sm text-gray-500">{formatRelativeDate(win.date)}</span>
                  <div className="flex justify-end">
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isShareDisabled(win.id)}
                    title="Partager dans le chat"
                    type="button"
                    onClick={() => shareWin(win)}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Load more / limit message */}
          {allWins.length > 0 && (
            <div className="mt-4 text-center">
              {totalLoaded >= 100 ? (
                <p className="text-xs text-zinc-500">Limite de 100 victoires atteinte.</p>
              ) : hasMore ? (
                <button
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={loadingMore}
                  type="button"
                  onClick={loadMore}
                >
                  {loadingMore ? "Chargement..." : "Charger plus"}
                </button>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
