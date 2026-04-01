import { ArrowRight, Coins, Flame, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { logoutRequest } from "../lib/api";
import { formatTokens } from "../lib/utils";

export function DashboardPage() {
  const { data: user } = useAuthenticatedUser();

  if (!user) {
    return <LoadingScreen label="Chargement de votre espace..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan" className="min-w-[300px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Tableau de bord</p>
          <h1 className="mt-3 font-display text-4xl text-brand-text">Bienvenue {user.pseudo}</h1>
          <p className="mt-4 text-base leading-8 text-brand-muted">
            Votre solde : {formatTokens(user.balance)} tokens. Gardez un oeil sur votre serie
            quotidienne et accedez rapidement aux marches, a la roulette et a votre profil.
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
            <p className="mt-3 text-sm leading-7 text-brand-muted">Pseudo actif : {user.pseudo}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="min-w-[300px]">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Prediction</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text">Marches ouverts</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Consultez les pools actives, prenez une position et suivez les resolutions.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-brand-cyan/35 bg-brand-cyan/10 px-5 py-3 text-sm font-semibold text-brand-text transition hover:scale-[1.02] hover:border-brand-cyan/60 hover:bg-brand-cyan/15"
              to="/events"
            >
              Voir les evenements
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="min-w-[300px]">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Jeu du moment</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text">Roulette europeenne</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Entrez sur la table, placez vos mises et suivez les resultats sans quitter votre
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
              Mettez a jour votre photo, ajustez votre pseudo et gardez votre profil pret pour la
              promo.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-brand-text transition hover:scale-[1.02] hover:border-brand-cyan/45 hover:bg-white/10"
              to="/profile"
            >
              Gerer mon profil
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>

        {user.role === "admin" ? (
          <Card className="min-w-[300px]">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Admin</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text">Piloter les marches</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Creez les nouveaux evenements, fermez les paris et resolvez les resultats depuis le
              panneau d'administration.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-brand-text transition hover:scale-[1.02] hover:border-brand-cyan/45 hover:bg-white/10"
              to="/admin/events"
            >
              Ouvrir le panel admin
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
