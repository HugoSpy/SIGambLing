import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bus, CircleDot, Coins, Sparkles, TrendingUp, Waves, Bomb } from "lucide-react";
import toast from "react-hot-toast";
import { Link, Navigate, useParams } from "react-router-dom";
import { BlackjackGame } from "../components/casino/BlackjackGame";
import { HiloGame } from "../components/casino/HiloGame";
import { MinesGame } from "../components/casino/MinesGame";
import { RideTheBusGame } from "../components/casino/RideTheBusGame";
import { RouletteGame } from "../components/casino/RouletteGame";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { fetchCurrentUser, logoutRequest } from "../lib/api";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";

type GameTab = "roulette" | "blackjack" | "hilo" | "ride-the-bus" | "mines" | "crash";

const TABS: {
  id: GameTab;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
  accentClassName: string;
  icon: typeof CircleDot;
}[] = [
    {
      id: "roulette",
      label: "Roulette",
      eyebrow: "Rythme direct",
      description: "Un tour, une lecture nette, un acces immediat aux mises et au resultat.",
      href: "/casino/roulette",
      accentClassName: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      icon: CircleDot,
    },
    {
      id: "blackjack",
      label: "Blackjack",
      eyebrow: "Decision rapide",
      description: "Une table claire pour suivre la manche, centrer le payout et enchainer sans friction.",
      href: "/casino/blackjack",
      accentClassName: "from-amber-500/20 via-amber-500/5 to-transparent",
      icon: Waves,
    },
    {
      id: "hilo",
      label: "HiLo",
      eyebrow: "Tension croissante",
      description: "Carte par carte, multipliez votre mise en prédisant la suivante. Encaissez avant de perdre.",
      href: "/casino/hilo",
      accentClassName: "from-violet-500/20 via-violet-500/5 to-transparent",
      icon: Sparkles,
    },
    {
      id: "ride-the-bus",
      label: "Ride the Bus",
      eyebrow: "Tout ou rien",
      description: "4 questions, 4 bonnes réponses pour tout gagner. Une seule erreur et tout est perdu.",
      href: "/casino/ride-the-bus",
      accentClassName: "from-rose-500/20 via-rose-500/5 to-transparent",
      icon: Bus,
    },
    {
      id: "mines",
      label: "Mines",
      eyebrow: "Volatilité variable",
      description: "Évitez les mines, encaissez quand vous voulez. Plus vous avancez, plus ça paie.",
      href: "/casino/mines",
      accentClassName: "from-cyan-500/20 via-cyan-500/5 to-transparent",
      icon: Bomb,
    },
    {
      id: "crash",
      label: "Crash",
      eyebrow: "Tension exponentielle",
      description: "Le multiplicateur monte. Cashoutez avant le crash. Plus vous attendez, plus vous gagnez — ou perdez tout.",
      href: "/casino/crash",
      accentClassName: "from-orange-500/20 via-orange-500/5 to-transparent",
      icon: TrendingUp,
    },
  ];

function isGameTab(value: string | undefined): value is GameTab {
  return (
    value === "roulette" ||
    value === "blackjack" ||
    value === "hilo" ||
    value === "ride-the-bus" ||
    value === "mines" ||
    value === "crash"
  );
}

export function CasinoPage() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const rouletteDisabled = useAuthStore((state) => state.rouletteDisabled);
  const blackjackDisabled = useAuthStore((state) => state.blackjackDisabled);
  const minesDisabled = useAuthStore((state) => state.minesDisabled);
  const crashDisabled = useAuthStore((state) => state.crashDisabled);
  const { game } = useParams<{ game?: string }>();
  const activeGame = isGameTab(game) ? game : null;

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

  if (game && !activeGame) {
    return <Navigate replace to="/casino" />;
  }

  const isAdmin = user.role === "admin";

  // If a disabled game is accessed directly via URL, redirect to /casino
  if (activeGame === "roulette" && rouletteDisabled && !isAdmin) {
    return <Navigate replace to="/casino" />;
  }
  if (activeGame === "blackjack" && blackjackDisabled && !isAdmin) {
    return <Navigate replace to="/casino" />;
  }
  if (activeGame === "mines" && minesDisabled && !isAdmin) {
    return <Navigate replace to="/casino" />;
  }
  // hilo and ride-the-bus have no feature flag yet — no redirect needed

  const isGameDisabled = (id: GameTab) =>
    (id === "roulette" && rouletteDisabled && !isAdmin) ||
    (id === "blackjack" && blackjackDisabled && !isAdmin) ||
    (id === "mines" && minesDisabled && !isAdmin) ||
    (id === "crash" && crashDisabled && !isAdmin);

  const disabledLabel: Record<GameTab, string> = {
    roulette: "Roulette temporairement indisponible",
    blackjack: "Blackjack temporairement indisponible",
    hilo: "HiLo temporairement indisponible",
    "ride-the-bus": "Ride the Bus temporairement indisponible",
    mines: "Mines temporairement indisponible",
    crash: "Crash temporairement indisponible",
  };

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">


        {!activeGame ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const disabled = isGameDisabled(tab.id);

              return (
                <Card
                  key={tab.id}
                  className={cn(
                    "group relative overflow-hidden border-white/10 bg-zinc-900/95 p-0",
                    disabled && "opacity-60",
                  )}
                >
                  <div
                    className={cn("absolute inset-0 bg-gradient-to-br opacity-100", tab.accentClassName)}
                  />
                  <div className="relative flex h-full flex-col gap-6 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">
                          {tab.eyebrow}
                        </p>
                        <h2 className="mt-3 font-display text-3xl text-brand-text">{tab.label}</h2>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <Icon className="h-6 w-6 text-zinc-100" />
                      </div>
                    </div>

                    <p className="max-w-xl text-sm leading-7 text-brand-muted">{tab.description}</p>

                    {tab.id === "ride-the-bus" && (
                      <p className="text-xs text-orange-400 mt-1">
                        ⚡ Volatilité extrême · Multiplicateur max : ×1 331
                      </p>
                    )}
                    {tab.id === "mines" && (
                      <p className="text-xs text-cyan-400 mt-1">
                        ⚡ Volatilité variable · Jusqu'à ×5 140 000 (12-13 mines)
                      </p>
                    )}

                    <div className="mt-auto">
                      {disabled ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                          {disabledLabel[tab.id]}
                        </div>
                      ) : (
                        <Link to={tab.href}>
                          <Button className="gap-2" size="lg">
                            Ouvrir la table
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}

        {activeGame === "roulette" ? <RouletteGame /> : null}
        {activeGame === "blackjack" ? <BlackjackGame /> : null}
        {activeGame === "hilo" ? <HiloGame /> : null}
        {activeGame === "ride-the-bus" ? <RideTheBusGame /> : null}
        {activeGame === "mines" ? <MinesGame /> : null}

        {!activeGame ? (
          <Card className="border-white/10 bg-zinc-900/95">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">Mode salon</p>
                <h3 className="mt-2 font-display text-2xl text-brand-text">
                  Pour les moins chanceux d'entre vous qui galèrent à gagner sur des évènements live...
                </h3>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
