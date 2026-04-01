import { type ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Coins, LayoutDashboard, Menu, Sparkles, UserRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { AuthUser } from "../../types/auth";
import { cn, formatTokens } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface DashboardShellProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

const navItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Roulette", icon: Sparkles, href: "/casino" },
  { label: "Profil", icon: UserRound, href: "/profile" },
];

export function DashboardShell({ user, onLogout, children }: DashboardShellProps) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const initials = useMemo(
    () =>
      user.pseudo
        .split(" ")
        .filter(Boolean)
        .map((chunk) => chunk[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user.pseudo],
  );

  return (
    <div className="surface-grid min-h-screen bg-[#0f212e]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] gap-6 p-4 lg:p-8">
        <aside className="glass-panel hidden min-w-[300px] max-w-[320px] flex-col rounded-[32px] p-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cta-gradient text-lg font-display font-bold text-slate-950">
              SG
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">EPITA</p>
              <h1 className="font-display text-2xl text-brand-text">SIGambling</h1>
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Votre espace</p>
            <p className="mt-3 text-lg font-semibold text-brand-text">Bienvenue {user.pseudo}</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Solde</p>
                <p className="mt-2 font-display text-2xl text-brand-text">
                  {formatTokens(user.balance)} tokens
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Serie</p>
                <p className="mt-2 font-display text-2xl text-brand-text">
                  {user.streak_days} jour{user.streak_days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;

              return (
                <NavLink
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all duration-300",
                    active
                      ? "border-brand-cyan/40 bg-brand-cyan/10 text-brand-text"
                      : "border-transparent text-brand-muted hover:border-brand-line hover:bg-white/5 hover:text-brand-text",
                  )}
                  to={item.href}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">Acces prive</p>
            <p className="mt-3 text-sm leading-7 text-brand-muted">
              Salon reserve aux etudiants EPITA avec solde, roulette et profil personnalisable.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="glass-panel rounded-[32px] px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Salle privee</p>
                <h2 className="mt-2 font-display text-3xl text-brand-text">
                  Bienvenue {user.pseudo}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-muted">
                  Retrouvez votre solde, votre profil et toutes vos tables depuis un seul espace.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-line bg-white/5 text-sm font-semibold text-brand-text lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white/5 px-3 py-2">
                  {user.avatar_url ? (
                    <img
                      alt={`Photo de profil de ${user.pseudo}`}
                      className="h-12 w-12 rounded-2xl object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/default-avatar.svg";
                      }}
                      src={user.avatar_url}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/20 font-display text-sm font-bold text-brand-cyan">
                      {initials}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-brand-text">{user.email}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-brand-muted">
                      <Coins className="h-3.5 w-3.5" />
                      <span>{formatTokens(user.balance)} tokens</span>
                    </div>
                  </div>
                </div>

                <Button size="sm" variant="secondary" onClick={() => void onLogout()}>
                  Se deconnecter
                </Button>
              </div>
            </div>
          </header>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        </div>
      </div>

      <Modal
        description="Navigation mobile de votre espace SIGambling."
        onClose={() => setMobileNavOpen(false)}
        open={mobileNavOpen}
        title="Navigation"
      >
        <div className="space-y-3">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              className="block rounded-2xl border border-brand-line px-4 py-3 text-sm text-brand-text transition-all duration-300 hover:border-brand-cyan/40 hover:bg-white/5"
              onClick={() => setMobileNavOpen(false)}
              to={item.href}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </div>
  );
}
