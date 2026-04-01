import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BlackjackGame } from "../components/casino/BlackjackGame";
import { RouletteGame } from "../components/casino/RouletteGame";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { fetchCurrentUser, logoutRequest } from "../lib/api";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";

type GameTab = "roulette" | "blackjack";

const TABS: { id: GameTab; label: string }[] = [
  { id: "roulette", label: "Roulette" },
  { id: "blackjack", label: "Blackjack" },
];

export function CasinoPage() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const [activeTab, setActiveTab] = useState<GameTab>("roulette");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    initialData: storedUser ?? undefined,
  });

  useEffect(() => {
    if (user) {
      setUser(user);
      setStatus("authenticated");
    }
  }, [setStatus, setUser, user]);

  if (!user) {
    return <LoadingScreen label="Préparation de la table..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        {/* Sélecteur de jeu */}
        <div className="flex gap-2 rounded-2xl border border-brand-line bg-white/5 p-1.5 backdrop-blur-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-brand-cyan/20 text-brand-cyan shadow-sm"
                  : "text-brand-muted hover:text-brand-text",
              )}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "roulette" ? <RouletteGame /> : <BlackjackGame />}
      </div>
    </DashboardShell>
  );
}
