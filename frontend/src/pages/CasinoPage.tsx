import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleDot, Coins, Sparkles, Waves } from "lucide-react";
import toast from "react-hot-toast";
import { Link, Navigate, useParams } from "react-router-dom";
import { BlackjackGame } from "../components/casino/BlackjackGame";
import { RouletteGame } from "../components/casino/RouletteGame";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { fetchCurrentUser, logoutRequest } from "../lib/api";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";

type GameTab = "roulette" | "blackjack";

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
    eyebrow: "Pour miser au bruit",
    description:
      "La roue pour celles et ceux qui pensent qu'un plan solide commence par 'on verra bien'.",
    href: "/casino/roulette",
    accentClassName: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    icon: CircleDot,
  },
  {
    id: "blackjack",
    label: "Blackjack",
    eyebrow: "Pour jouer les strateges",
    description:
      "La table pour faire semblant d'avoir une methode, puis blamer le dealer quand elle casse.",
    href: "/casino/blackjack",
    accentClassName: "from-amber-500/20 via-amber-500/5 to-transparent",
    icon: Waves,
  },
];

function isGameTab(value: string | undefined): value is GameTab {
  return value === "roulette" || value === "blackjack";
}

export function CasinoPage() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
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

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan" className="overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_36%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Casino club</p>
                <h1 className="mt-3 font-display text-4xl text-brand-text">
                  {activeGame
                    ? "Choisissez votre table, comme si tout cela etait une decision rationnelle"
                    : "Deux tables. Pas de detour. Pas d'excuse."}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-muted">
                  {activeGame
                    ? "Roulette pour improviser en public, blackjack pour compter jusqu'a 21 avec une confiance discutable. Le hub reste volontairement simple: vous entrez, vous choisissez, vous assumez."
                    : "Le casino se limite enfin a l'essentiel: une roue pour les impulsifs, une table de blackjack pour les faux calculateurs. Le reste du cirque peut attendre."}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const selected = activeGame === tab.id;

                    return (
                      <Link key={tab.id} to={tab.href}>
                        <Button
                          className={cn(
                            "gap-2",
                            selected
                              ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                              : "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800",
                          )}
                          variant={selected ? "primary" : undefined}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Hub</p>
                  <p className="mt-2 text-lg font-semibold text-brand-text">Deux jeux, zero bruit</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Roulette</p>
                  <p className="mt-2 text-lg font-semibold text-brand-text">Chaos rapide et grille lisible</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Blackjack</p>
                  <p className="mt-2 text-lg font-semibold text-brand-text">Lecture nette sans cinema inutile</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {!activeGame ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <Card
                  key={tab.id}
                  className="group relative overflow-hidden border-white/10 bg-zinc-900/95 p-0"
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

                    <div className="grid gap-3 text-sm text-zinc-200 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        Interface nette
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        Parcours mobile
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        Entree directe
                      </div>
                    </div>

                    <div className="mt-auto">
                      <Link to={tab.href}>
                        <Button className="gap-2" size="lg">
                          Ouvrir la table
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}

        {activeGame === "roulette" ? <RouletteGame /> : null}
        {activeGame === "blackjack" ? <BlackjackGame /> : null}

        {!activeGame ? (
          <Card className="border-white/10 bg-zinc-900/95">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">Mode salon</p>
                <h3 className="mt-2 font-display text-2xl text-brand-text">
                  Entrez, choisissez votre vice de la minute, puis changez de table sans casser le rythme
                </h3>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-brand-muted">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Sparkles className="mr-2 inline h-4 w-4 text-brand-cyan" />
                  Navigation casino epuree
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Coins className="mr-2 inline h-4 w-4 text-brand-orange" />
                  Lecture rapide des mises
                </span>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
