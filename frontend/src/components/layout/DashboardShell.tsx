import { type ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock,
  Coins,
  Crown,
  Dice3,
  Gift,
  LayoutDashboard,
  Medal,
  MessageSquare,
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
import { ThemeToggle } from "../ui/ThemeToggle";
import { useGamificationState } from "../../hooks/useGamificationState";
import { fetchAdminProposals } from "../../lib/api";
import { ChatPanel } from "../chat/ChatPanel";
import { useChatStore } from "../../store/chat-store";

interface DashboardShellProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

export function DashboardShell({ user, onLogout, children }: DashboardShellProps) {
  const location = useLocation();
  const { isOpen: chatOpen, setOpen: setChatOpen, unreadCount, unreadMentions, resetKey } = useChatStore();
  const liveBalance = useAuthStore((state) => state.user?.balance ?? user.balance);
  const cartSelectionsCount = useBetCartStore((state) => state.selections.length);
  const setCartOpen = useBetCartStore((state) => state.setOpen);
  const { data: gamificationData } = useGamificationState();
  const rewardAvailable = gamificationData != null && !gamificationData.daily_reward.claimed_today;
  const unclaimedBadges = gamificationData?.badges.filter(
    (b) => b.unlocked && b.claimed_at === null,
  ).length ?? 0;
  const { data: adminProposals } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: () => fetchAdminProposals(),
    enabled: user.role === "admin" || user.role === "validator",
  });
  const pendingProposalsCount = (adminProposals ?? []).filter((p) => p.status === "PENDING").length;
  const navLinkClassName =
    "interactive-hover flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm";
  const actionSurfaceClassName =
    "interactive-hover relative inline-flex h-11 items-center gap-3 rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] px-4 text-sm text-[var(--fg-primary)] shadow-[var(--shadow-card)]";
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
      { label: "Historique", icon: Clock, href: "/history" },
      { label: "Classement", icon: Medal, href: "/leaderboard" },
      { label: "Casino", icon: Dice3, href: "/casino" },
      { label: "Mes Wins", icon: Crown, href: "/wins" },
      { label: "Jackpot", icon: Trophy, href: "/jackpot" },
      { label: "Récompense", icon: Gift, href: "/rewards" },
      { label: "Profil", icon: UserRound, href: "/profile" },
      ...(user.role === "admin" || user.role === "validator"
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
    <div className="surface-grid min-h-dvh bg-[var(--bg)] text-[var(--fg-primary)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--ink-700)] bg-[var(--surface-1)]/95 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--ink-700)] px-6">
          <Dice3 className="h-8 w-8 text-[var(--brand-emerald)]" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">EPITA</p>
            <h1 className="text-xl font-semibold text-[var(--fg-primary)]">SIGambling</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));
            const isReward = item.href === "/rewards";
            const isProfile = item.href === "/profile";
            const isAdmin = item.href === "/admin/events";

            return (
              <NavLink
                key={item.label}
                className={cn(
                  navLinkClassName,
                  active
                    ? "border-[var(--brand-emerald-line)] bg-[var(--brand-emerald-soft)] text-[var(--brand-emerald-hover)]"
                    : "border-transparent text-[var(--fg-secondary)] hover:border-[var(--ink-700)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]",
                )}
                to={item.href}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {(isReward && rewardAvailable) || (isProfile && unclaimedBadges > 0) ? (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--brand-emerald)] ring-2 ring-[var(--surface-1)] animate-pulse" />
                  ) : null}
                </span>
                <span>{item.label}</span>
                {isAdmin && pendingProposalsCount > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingProposalsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[var(--ink-700)] p-4">
          <button
            className={cn(
              actionSurfaceClassName,
              "w-full justify-between text-left enabled:hover:border-[var(--ink-700)] enabled:hover:bg-[var(--surface-2)]",
              chatOpen && "border-[var(--brand-emerald-line)] bg-[var(--brand-emerald-soft)] text-[var(--brand-emerald-hover)]",
            )}
            onClick={() => setChatOpen(!chatOpen)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[var(--brand-emerald-hover)]" />
              Chat
            </span>
            {unreadCount > 0 && (
              <span
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                  unreadMentions > 0
                    ? "bg-yellow-400 text-black"
                    : "bg-red-500 text-black"
                }`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            className={cn(
              actionSurfaceClassName,
              "w-full justify-between text-left enabled:hover:border-[var(--ink-700)] enabled:hover:bg-[var(--surface-2)]",
            )}
            onClick={() => setCartOpen(true)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[var(--brand-emerald-hover)]" />
              Ticket de paris
            </span>
            {cartSelectionsCount > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--brand-emerald)] px-2 py-0.5 text-[11px] font-bold text-[var(--fg-inverse)]">
                {cartSelectionsCount}
              </span>
            ) : null}
          </button>

          <div className="rounded-xl border border-[var(--ink-700)] bg-[var(--bg)] px-4 py-3">
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
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-emerald-soft)] text-sm font-bold text-[var(--brand-emerald-hover)]">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--fg-primary)]">{user.pseudo}</p>
                <p className="truncate text-xs text-[var(--fg-muted)]">{user.email}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">Solde</p>
                <p className="mt-1 text-sm font-semibold text-[var(--brand-emerald-hover)]">
                  {formatTokens(liveBalance)}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">Série</p>
                <p className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">{user.streak_days} j</p>
              </div>
            </div>

            <div className="mt-4">
              <ThemeToggle />
            </div>

            <Button
              className="mt-2"
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
        <header className="sticky top-0 z-30 border-b border-[var(--ink-700)]/80 bg-[var(--bg)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">SIGambling</p>
              <h2 className="truncate text-lg font-semibold text-[var(--fg-primary)]">{activeItem.label}</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                className={cn(
                  actionSurfaceClassName,
                  "justify-center px-3 enabled:hover:border-[var(--ink-700)] enabled:hover:bg-[var(--surface-2)]",
                )}
                onClick={() => setCartOpen(true)}
                type="button"
              >
                <Ticket className="h-4 w-4" />
                <span className="ml-2 hidden text-sm sm:inline">Ticket</span>
                {cartSelectionsCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-emerald)] px-1.5 text-[10px] font-bold text-[var(--fg-inverse)]">
                    {cartSelectionsCount}
                  </span>
                ) : null}
              </button>

              <div className="hidden h-11 items-center gap-2 rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] px-4 shadow-[var(--shadow-card)] sm:flex">
                <Coins className="h-4 w-4 text-[var(--brand-emerald-hover)]" />
                <span className="text-sm font-medium text-[var(--fg-primary)]">
                  {formatTokens(liveBalance)}
                </span>
              </div>

              <div className="flex h-11 items-center gap-3 rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] px-3 shadow-[var(--shadow-card)]">
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-emerald-soft)] text-xs font-bold text-[var(--brand-emerald-hover)]">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="max-w-[160px] truncate text-sm font-medium text-[var(--fg-primary)]">
                    {user.pseudo}
                  </p>
                  <p className="hidden text-xs text-[var(--fg-muted)] sm:block">{user.email}</p>
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

        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 lg:px-8 lg:pb-8">
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

      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--ink-700)] bg-[var(--surface-1)]/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex overflow-x-auto gap-1 px-2 pt-2 pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));
            const isReward = item.href === "/rewards";
            const isProfile = item.href === "/profile";
            const isAdmin = item.href === "/admin/events";

            return (
              <NavLink
                key={item.label}
                className={cn(
                  "flex-none flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[10px] min-w-[56px] transition-colors",
                  active ? "bg-[var(--brand-emerald-soft)] text-[var(--brand-emerald-hover)]" : "text-[var(--fg-secondary)]",
                )}
                to={item.href}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {(isReward && rewardAvailable) || (isProfile && unclaimedBadges > 0) ? (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--brand-emerald)] ring-2 ring-[var(--surface-1)] animate-pulse" />
                  ) : null}
                  {isAdmin && pendingProposalsCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {pendingProposalsCount}
                    </span>
                  )}
                </span>
                <span className="mt-1 max-w-[52px] truncate text-center leading-tight">{item.label}</span>
              </NavLink>
            );
          })}

          {/* Chat button in mobile nav */}
          <button
            className={cn(
              "relative flex-none flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[10px] min-w-[56px] transition-colors",
              chatOpen ? "bg-[var(--brand-emerald-soft)] text-[var(--brand-emerald-hover)]" : "text-[var(--fg-secondary)]",
            )}
            onClick={() => setChatOpen(!chatOpen)}
            type="button"
          >
            <span className="relative">
              <MessageSquare className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium ${
                    unreadMentions > 0
                      ? "bg-yellow-400 text-black"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="mt-1">Chat</span>
          </button>
        </div>
      </nav>

      <BetCartDrawer />
      <ChatPanel
        key={resetKey}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        initialPrefs={{
          width:  user.chat_panel_width,
          height: user.chat_panel_height,
          x:      user.chat_panel_x,
          y:      user.chat_panel_y,
          zoom:   user.chat_zoom,
        }}
      />
    </div>
  );
}
