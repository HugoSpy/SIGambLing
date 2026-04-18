import { type ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Coins,
  Crown,
  Dice3,
  Gift,
  LayoutDashboard,
  Medal,
  MessageSquare,
  MoreHorizontal,
  ShieldCheck,
  Ticket,
  Trophy,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  const [moreOpen, setMoreOpen] = useState(false);
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

  const moreItems: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href?: string;
    action?: () => void;
  }> = [
    { label: "Historique", icon: Clock, href: "/history" },
    { label: "Classement", icon: Medal, href: "/leaderboard" },
    { label: "Mes Wins", icon: Crown, href: "/wins" },
    { label: "Jackpot", icon: Trophy, href: "/jackpot" },
    { label: "Profil", icon: UserRound, href: "/profile" },
    { label: "Chat", icon: MessageSquare, action: () => { setChatOpen(!chatOpen); setMoreOpen(false); } },
    { label: "Ticket", icon: Ticket, action: () => { setCartOpen(true); setMoreOpen(false); } },
    ...(user.role === "admin" || user.role === "validator"
      ? [{ label: "Admin", icon: ShieldCheck, href: "/admin/events" }]
      : []),
  ];

  return (
    <div className="surface-grid min-h-dvh bg-[var(--bg)] text-[var(--fg-primary)]">
      {/* ── Sidebar desktop ─────────────────────────────────── */}
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

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[var(--ink-700)]/80 bg-[var(--bg)]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            {/* Titre page active */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">SIGambling</p>
              <h2 className="truncate text-base font-semibold text-[var(--fg-primary)] leading-tight">
                {activeItem.label}
              </h2>
            </div>

            {/* Balance + avatar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--ink-700)] bg-[var(--surface-1)] px-3 py-1.5">
                <Coins className="h-3.5 w-3.5 text-[var(--brand-emerald-hover)]" />
                <span className="text-sm font-semibold text-[var(--fg-primary)] numeric">
                  {formatTokens(liveBalance)}
                </span>
              </div>

              <Link to="/profile">
                {user.avatar_url ? (
                  <img
                    alt={user.pseudo}
                    className="h-8 w-8 rounded-full object-cover border border-[var(--ink-700)]"
                    onError={(e) => { e.currentTarget.src = "/default-avatar.svg"; }}
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-emerald-soft)] text-xs font-bold text-[var(--brand-emerald-hover)]">
                    {initials}
                  </div>
                )}
              </Link>
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

      {/* ── Bottom nav mobile ────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--ink-700)] bg-[var(--surface-1)]/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 px-2 pt-1 pb-1">
          {[
            { label: "Accueil", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Événements", icon: TrendingUp, href: "/events" },
            { label: "Casino", icon: Dice3, href: "/casino" },
            { label: "Récompense", icon: Gift, href: "/rewards" },
          ].map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href + "/"));
            const isReward = item.href === "/rewards";
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 rounded-[var(--radius-sm)] text-[10px] transition-colors",
                  active
                    ? "text-[var(--brand-emerald-hover)]"
                    : "text-[var(--fg-muted)]"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {isReward && rewardAvailable && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--brand-emerald)] ring-1 ring-[var(--surface-1)] animate-pulse" />
                  )}
                </span>
                <span className="leading-tight truncate max-w-[52px] text-center">{item.label}</span>
              </NavLink>
            );
          })}

          {/* Bouton Plus */}
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 rounded-[var(--radius-sm)] text-[10px] transition-colors relative",
              moreOpen ? "text-[var(--brand-emerald-hover)]" : "text-[var(--fg-muted)]"
            )}
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Plus</span>
            {(unreadCount > 0 || pendingProposalsCount > 0) && (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Drawer "Plus" ────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-[var(--radius-xl)] border-t border-[var(--ink-700)] bg-[var(--surface-1)] lg:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) {
                  setMoreOpen(false);
                }
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing">
                <div className="h-1 w-10 rounded-full bg-[var(--ink-700)]" />
              </div>

              <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href
                    ? location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                    : false;
                  const hasChat = item.label === "Chat" && unreadCount > 0;
                  const hasAdmin = item.label === "Admin" && pendingProposalsCount > 0;
                  const hasTicket = item.label === "Ticket" && cartSelectionsCount > 0;
                  const hasProfile = item.label === "Profil" && unclaimedBadges > 0;

                  const content = (
                    <div className={cn(
                      "flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border p-3 text-xs transition-colors",
                      isActive
                        ? "border-[var(--brand-emerald-line)] bg-[var(--brand-emerald-soft)] text-[var(--brand-emerald-hover)]"
                        : "border-[var(--ink-700)] bg-[var(--surface-2)] text-[var(--fg-secondary)]"
                    )}>
                      <span className="relative">
                        <Icon className="h-5 w-5" />
                        {(hasChat || hasAdmin || hasTicket || hasProfile) && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-[var(--surface-1)]" />
                        )}
                      </span>
                      <span className="font-medium">{item.label}</span>
                      {hasTicket && cartSelectionsCount > 0 && (
                        <span className="text-[10px] text-[var(--brand-emerald-hover)]">
                          {cartSelectionsCount} séléction{cartSelectionsCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  );

                  if (item.href) {
                    return (
                      <NavLink key={item.label} to={item.href} onClick={() => setMoreOpen(false)}>
                        {content}
                      </NavLink>
                    );
                  }
                  return (
                    <button key={item.label} type="button" onClick={item.action}>
                      {content}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
