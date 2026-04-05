import { type ReactNode, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  Dice3,
  LayoutDashboard,
  Medal,
  ShieldCheck,
  Ticket,
  Trophy,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { AuthUser } from "../../types/auth";
import { cn, formatTokens } from "../../lib/utils";
import { useBetCartStore } from "../../store/bet-cart-store";
import { useAuthStore } from "../../store/auth-store";
import { BetCartDrawer } from "../BetCartDrawer";
import { Button } from "../ui/Button";

interface DashboardShellProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

export function DashboardShell({ user, onLogout, children }: DashboardShellProps) {
  const location = useLocation();
  const liveBalance = useAuthStore((state) => state.user?.balance ?? user.balance);
  const cartSelectionsCount = useBetCartStore((state) => state.selections.length);
  const setCartOpen = useBetCartStore((state) => state.setOpen);
  const navLinkClassName =
    "interactive-hover flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm";
  const actionSurfaceClassName =
    "interactive-hover relative inline-flex h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.18)]";
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
  const navItems = useMemo(
    () => [
      { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Événements", icon: TrendingUp, href: "/events" },
      { label: "Classement", icon: Medal, href: "/leaderboard" },
      { label: "Casino", icon: Dice3, href: "/casino" },
      { label: "Jackpot", icon: Trophy, href: "/jackpot" },
      { label: "Profil", icon: UserRound, href: "/profile" },
      ...(user.role === "admin"
        ? [{ label: "Admin", icon: ShieldCheck, href: "/admin/events" }]
        : []),
    ],
    [user.role],
  );
  const activeItem = useMemo(
    () =>
      navItems.find(
        (item) =>
          location.pathname === item.href ||
          (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`)),
      ) ?? navItems[0],
    [location.pathname, navItems],
  );

  return (
    <div className="surface-grid min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-800 bg-zinc-900/95 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-6">
          <Dice3 className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">EPITA</p>
            <h1 className="text-xl font-semibold text-zinc-100">SIGambling</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));

            return (
              <NavLink
                key={item.label}
                className={cn(
                  navLinkClassName,
                  active
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100",
                )}
                to={item.href}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-zinc-800 p-4">
          <button
            className={cn(
              actionSurfaceClassName,
              "w-full justify-between text-left enabled:hover:border-zinc-700 enabled:hover:bg-zinc-800",
            )}
            onClick={() => setCartOpen(true)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-400" />
              Ticket de paris
            </span>
            {cartSelectionsCount > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-zinc-950">
                {cartSelectionsCount}
              </span>
            ) : null}
          </button>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  alt={`Photo de profil de ${user.pseudo}`}
                  className="h-11 w-11 rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "/default-avatar.svg";
                  }}
                  src={user.avatar_url}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{user.pseudo}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-900 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Solde</p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">
                  {formatTokens(liveBalance)}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-900 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Série</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">{user.streak_days} j</p>
              </div>
            </div>

            <Button
              className="mt-4"
              fullWidth
              size="sm"
              variant="secondary"
              onClick={() => void onLogout()}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">SIGambling</p>
              <h2 className="truncate text-lg font-semibold text-zinc-100">{activeItem.label}</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                className={cn(
                  actionSurfaceClassName,
                  "justify-center px-3 enabled:hover:border-zinc-700 enabled:hover:bg-zinc-800",
                )}
                onClick={() => setCartOpen(true)}
                type="button"
              >
                <Ticket className="h-4 w-4" />
                <span className="ml-2 hidden text-sm sm:inline">Ticket</span>
                {cartSelectionsCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-zinc-950">
                    {cartSelectionsCount}
                  </span>
                ) : null}
              </button>

              <div className="hidden h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 shadow-[0_10px_24px_rgba(0,0,0,0.18)] sm:flex">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-zinc-100">
                  {formatTokens(liveBalance)}
                </span>
              </div>

              <div className="flex h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                {user.avatar_url ? (
                  <img
                    alt={`Photo de profil de ${user.pseudo}`}
                    className="h-9 w-9 rounded-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/default-avatar.svg";
                    }}
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="max-w-[160px] truncate text-sm font-medium text-zinc-100">
                    {user.pseudo}
                  </p>
                  <p className="hidden text-xs text-zinc-500 sm:block">{user.email}</p>
                </div>
              </div>

              <Button
                className="hidden sm:inline-flex"
                size="sm"
                variant="secondary"
                onClick={() => void onLogout()}
              >
                Se déconnecter
              </Button>
              <Button className="sm:hidden" size="sm" variant="secondary" onClick={() => void onLogout()}>
                Sortir
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-zinc-900/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className={`grid gap-1 ${user.role === "admin" ? "grid-cols-6" : "grid-cols-5"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));

            return (
              <NavLink
                key={item.label}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[11px] transition-colors",
                  active ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400",
                )}
                to={item.href}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-1 truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <BetCartDrawer />
    </div>
  );
}
