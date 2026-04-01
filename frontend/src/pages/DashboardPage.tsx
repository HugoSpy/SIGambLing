import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Coins, Flame, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { fetchCurrentUser, logoutRequest } from "../lib/api";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";

export function DashboardPage() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);

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
    return <LoadingScreen label="Chargement de votre espace..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan" className="min-w-[300px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Tableau de bord</p>
          <h1 className="mt-3 font-display text-4xl text-brand-text">Bienvenue {user.pseudo}</h1>
          <p className="mt-4 text-base leading-8 text-brand-muted">
            Votre solde : {formatTokens(user.balance)} tokens. Gardez un œil sur votre série
            quotidienne et accédez rapidement à la roulette ou à votre profil.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="min-w-[300px]">
            <Coins className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Solde</p>
            <p className="mt-2 font-display text-3xl text-brand-text">
              {formatTokens(user.balance)} tokens
            </p>
          </Card>

          <Card className="min-w-[300px]">
            <Flame className="h-5 w-5 text-brand-orange" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">
              Streak quotidien
            </p>
            <p className="mt-2 font-display text-3xl text-brand-text">
              {user.streak_days} jour{user.streak_days > 1 ? "s" : ""}
            </p>
          </Card>

          <Card className="min-w-[300px]">
            <UserRound className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Compte</p>
            <p className="mt-2 font-display text-2xl text-brand-text">{user.email}</p>
            <p className="mt-3 text-sm leading-7 text-brand-muted">
              Pseudo actif : {user.pseudo}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="min-w-[300px]">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Jeu du moment</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text">Roulette Européenne</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Entrez sur la table, placez vos mises et suivez les résultats sans quitter votre
              salon personnel.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-brand-cyan/35 bg-brand-cyan/10 px-5 py-3 text-sm font-semibold text-brand-text transition hover:scale-[1.02] hover:border-brand-cyan/60 hover:bg-brand-cyan/15"
              to="/casino"
            >
              Ouvrir la roulette
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="min-w-[300px]">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Profil</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text">Personnalisez votre compte</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Mettez à jour votre photo, ajustez votre pseudo et gardez votre profil prêt pour la
              promo.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-brand-text transition hover:scale-[1.02] hover:border-brand-cyan/45 hover:bg-white/10"
              to="/profile"
            >
              Gérer mon profil
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
