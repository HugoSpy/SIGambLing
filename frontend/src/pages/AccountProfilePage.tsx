import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Camera, Check, Coins, Flame, LayoutPanelLeft, Pin, Save, Shield, Trophy, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { BadgeCard } from "../components/ui/BadgeCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useGamificationState } from "../hooks/useGamificationState";
import {
  ApiError,
  claimBadgeReward,
  fetchCurrentUser,
  fetchUserPublicProfile,
  logoutRequest,
  resetChatPreferences,
  updateCurrentUserProfile,
  updatePinnedBadges,
  uploadCurrentUserAvatar,
} from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { useChatStore } from "../store/chat-store";
import type { AuthUser } from "../types/auth";
import type { GamificationBadge } from "../types/gamification";

const RARITY_COLOR: Record<string, string> = {
  COMMON: "text-zinc-500",
  RARE: "text-purple-400",
  EPIC: "text-yellow-400",
  LEGENDARY: "text-amber-300",
};

function SortableSlotItem({
  id,
  badgeKey,
  allBadges,
  onRemove,
}: {
  id: string;
  badgeKey: string | null;
  allBadges: GamificationBadge[];
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const badge = badgeKey ? allBadges.find((b) => b.key === badgeKey) : null;
  const slotNum = parseInt(id, 10) + 1;

  if (!badge) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-4 text-center cursor-grab"
      >
        <span className="text-xs font-semibold text-zinc-600">Slot {slotNum}</span>
        <Award className="h-5 w-5 text-zinc-700" />
        <span className="text-[11px] text-zinc-700">Vide</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative flex min-h-[80px] cursor-grab flex-col gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3"
    >
      <div className="flex items-center gap-2 pr-5">
        <Award className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-xs font-semibold leading-tight text-zinc-100">{badge.name}</span>
      </div>
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${RARITY_COLOR[badge.catalog_rarity]}`}
      >
        {badge.catalog_rarity}
      </span>
      <button
        className="absolute right-2 top-2 rounded-full p-0.5 text-zinc-500 hover:text-zinc-300"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label="Retirer ce badge"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface PinnedBadgesEditorProps {
  userId: string;
  unlockedBadges: GamificationBadge[];
}

function PinnedBadgesEditor({ userId, unlockedBadges }: PinnedBadgesEditorProps) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserPublicProfile(userId),
  });

  useEffect(() => {
    if (profile) {
      const initial: (string | null)[] = [null, null, null];
      for (const b of profile.pinnedBadges) {
        if (b.pinnedOrder !== null && b.pinnedOrder >= 1 && b.pinnedOrder <= 3) {
          initial[b.pinnedOrder - 1] = b.badgeType;
        }
      }
      setSlots(initial);
    }
  }, [profile]);

  const sensors = useSensors(useSensor(PointerSensor));

  function getInitialSlots(p: typeof profile) {
    const initial: (string | null)[] = [null, null, null];
    if (!p) return initial;
    for (const b of p.pinnedBadges) {
      if (b.pinnedOrder !== null && b.pinnedOrder >= 1 && b.pinnedOrder <= 3) {
        initial[b.pinnedOrder - 1] = b.badgeType;
      }
    }
    return initial;
  }

  const isDirty =
    profile !== undefined &&
    JSON.stringify(slots) !== JSON.stringify(getInitialSlots(profile));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id), 10);
      const newIndex = parseInt(String(over.id), 10);
      setSlots((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  }

  function handleBadgeClick(badgeKey: string) {
    if (slots.includes(badgeKey)) {
      setSlots((prev) => prev.map((s) => (s === badgeKey ? null : s)));
    } else {
      const emptyIndex = slots.findIndex((s) => s === null);
      if (emptyIndex === -1) {
        toast("3 badges maximum épinglés.", { icon: "⚠️" });
        return;
      }
      setSlots((prev) => {
        const next = [...prev];
        next[emptyIndex] = badgeKey;
        return next;
      });
    }
  }

  async function handleSave() {
    const payload = slots
      .map((badgeType, i) => (badgeType ? { badgeType, order: i + 1 } : null))
      .filter((x): x is { badgeType: string; order: number } => x !== null);
    try {
      setSaving(true);
      await updatePinnedBadges(payload);
      await queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
      notify.success("Profil public mis à jour.");
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Profil public</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text">Badges épinglés</h2>
        </div>
        <Pin className="h-6 w-6 text-brand-orange" />
      </div>

      <p className="mt-2 text-sm leading-6 text-brand-muted">
        Jusqu'à 3 badges visibles sur votre profil public. Glissez pour réordonner.
      </p>

      <div className="mt-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={["0", "1", "2"]} strategy={horizontalListSortingStrategy}>
            <div className="grid grid-cols-3 gap-3">
              {slots.map((badgeKey, i) => (
                <SortableSlotItem
                  key={String(i)}
                  id={String(i)}
                  badgeKey={badgeKey}
                  allBadges={unlockedBadges}
                  onRemove={() =>
                    setSlots((prev) => {
                      const next = [...prev];
                      next[i] = null;
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-brand-muted">
          Vos badges débloqués
        </p>
        {unlockedBadges.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unlockedBadges.map((badge) => {
              const isPinned = slots.includes(badge.key);
              return (
                <button
                  key={badge.key}
                  onClick={() => handleBadgeClick(badge.key)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isPinned
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <Award
                    className={`h-5 w-5 shrink-0 ${isPinned ? "text-emerald-400" : "text-zinc-600"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{badge.name}</p>
                    <p className={`text-[11px] uppercase tracking-wider ${RARITY_COLOR[badge.catalog_rarity]}`}>
                      {badge.catalog_rarity}
                    </p>
                  </div>
                  {isPinned && <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">Aucun badge débloqué pour le moment.</p>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button disabled={!isDirty || saving} onClick={() => void handleSave()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </Card>
  );
}

const pseudoRules = [
  {
    label: "Entre 3 et 24 caracteres",
    test: (value: string) => value.length >= 3 && value.length <= 24,
  },
  {
    label: "Lettres, chiffres, point, tiret ou underscore uniquement",
    test: (value: string) => /^[A-Za-z0-9._-]+$/.test(value),
  },
] as const;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const triggerChatReset = useChatStore((state) => state.triggerReset);
  const [pseudo, setPseudo] = useState("");
  const [alwaysAcceptOddsChanges, setAlwaysAcceptOddsChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resettingChat, setResettingChat] = useState(false);
  const [claimingBadge, setClaimingBadge] = useState<string | null>(null);
  const updateBalance = useAuthStore((state) => state.updateBalance);
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    initialData: storedUser ?? undefined,
  });
  const { data: gamification } = useGamificationState();
  const unlockedBadges = gamification?.badges.filter((badge) => badge.unlocked).length ?? 0;
  const trimmedPseudo = pseudo.trim();
  const pseudoRuleChecks = pseudoRules.map((rule) => ({
    label: rule.label,
    valid: rule.test(trimmedPseudo),
  }));

  useEffect(() => {
    if (user) {
      setUser(user);
      setStatus("authenticated");
      setPseudo(user.pseudo);
      setAlwaysAcceptOddsChanges(user.accept_odds_changes);
    }
  }, [setStatus, setUser, user]);

  if (!user) {
    return <LoadingScreen label="Chargement de votre profil..." />;
  }

  const commitUser = (nextUser: AuthUser) => {
    setUser(nextUser);
    queryClient.setQueryData(["me"], nextUser);
  };

  const handleClaimBadge = async (badge: GamificationBadge) => {
    if (claimingBadge) return;
    setClaimingBadge(badge.key);
    try {
      const result = await claimBadgeReward(badge.key);
      updateBalance(result.newBalance);
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
      toast.success(`+${formatTokens(result.reward)} tokens`, {
        icon: "🪙",
        style: {
          background: "#052e16",
          color: "#86efac",
          border: "1px solid #166534",
          fontWeight: "600",
        },
        duration: 4000,
      });
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setClaimingBadge(null);
    }
  };

  const handleLogout = async () => {
    await logoutRequest();
    notify.success("Session fermée.");
  };

  const handleResetChat = async () => {
    try {
      setResettingChat(true);
      await resetChatPreferences();
      // Clear chat panel fields from stored user so DashboardShell passes null initialPrefs
      if (user) {
        const updated: AuthUser = {
          ...user,
          chat_panel_width: null,
          chat_panel_height: null,
          chat_panel_x: null,
          chat_panel_y: null,
          chat_zoom: null,
        };
        commitUser(updated);
      }
      triggerChatReset();
      notify.success("Préférences du chat réinitialisées.");
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setResettingChat(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify.error("Fichier trop volumineux (max 2MB).");
      event.target.value = "";
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify.error("Format non supporté.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);
      const updatedUser = await uploadCurrentUserAvatar(formData);
      commitUser(updatedUser);
      notify.success("Photo de profil mise à jour.");
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    const nextPseudo = trimmedPseudo;

    if (!nextPseudo) {
      notify.error("Le pseudo ne peut pas être vide.");
      return;
    }

    if (nextPseudo === user.pseudo && alwaysAcceptOddsChanges === user.accept_odds_changes) {
      notify.info("Aucune modification à enregistrer.");
      return;
    }

    const failingRule = pseudoRuleChecks.find((rule) => !rule.valid);

    if (failingRule) {
      notify.error(failingRule.label);
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await updateCurrentUserProfile({
        pseudo: nextPseudo === user.pseudo ? undefined : nextPseudo,
        accept_odds_changes:
          alwaysAcceptOddsChanges === user.accept_odds_changes ? undefined : alwaysAcceptOddsChanges,
      });
      commitUser(updatedUser);
      notify.success("Profil enregistré.");
    } catch (error) {
      if (error instanceof ApiError) {
        const pseudoErrors =
          typeof error.details === "object" && error.details !== null && "fieldErrors" in error.details
            ? (error.details as { fieldErrors?: { pseudo?: string[] } }).fieldErrors?.pseudo
            : undefined;

        if (pseudoErrors && pseudoErrors.length > 0) {
          notify.error(pseudoErrors.join(" "));
          return;
        }
      }

      notify.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Profil</p>
          <h1 className="mt-3 font-display text-2xl sm:text-4xl text-brand-text">Votre espace personnel</h1>
          <p className="mt-4 text-base leading-8 text-brand-muted">
            Mettez à jour votre photo, gardez un pseudo propre et retrouvez vos informations en un
            coup d&apos;œil.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="min-w-0">
            <Coins className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Solde</p>
            <p className="mt-2 font-display text-3xl text-brand-text">
              {formatTokens(user.balance)} tokens
            </p>
          </Card>

          <Card className="min-w-0">
            <Flame className="h-5 w-5 text-brand-orange" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">
              Streak quotidien
            </p>
            <p className="mt-2 font-display text-3xl text-brand-text">
              {gamification?.daily_reward.current_streak ?? user.streak_days} jour
              {(gamification?.daily_reward.current_streak ?? user.streak_days) > 1 ? "s" : ""}
            </p>
          </Card>

          <Card className="min-w-0">
            <UserRound className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Pseudo</p>
            <p className="mt-2 font-display text-3xl text-brand-text">{user.pseudo}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="min-w-0">
            <div className="flex flex-col items-start gap-6">
              <img
                alt={`Photo de profil de ${user.pseudo}`}
                className="h-32 w-32 rounded-full border border-white/10 object-cover"
                onError={(event) => {
                  event.currentTarget.src = "/default-avatar.svg";
                }}
                src={user.avatar_url || "/default-avatar.svg"}
              />

              <div className="space-y-3">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {uploading ? "Envoi en cours..." : "Changer la photo"}
                </Button>
                <p className="text-sm leading-7 text-brand-muted">JPG, PNG ou WEBP • Max 2MB</p>
              </div>
            </div>
          </Card>

          <Card className="min-w-0">
            <div className="space-y-5">
              <Input label="Pseudo" onChange={(event) => setPseudo(event.target.value)} value={pseudo} />
              <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                  Regles du pseudo
                </p>
                <div className="mt-3 space-y-2">
                  {pseudoRuleChecks.map((rule) => (
                    <p
                      className={`text-sm ${rule.valid ? "text-emerald-300" : "text-brand-muted"}`}
                      key={rule.label}
                    >
                      {rule.valid ? "OK" : "A faire"} · {rule.label}
                    </p>
                  ))}
                </div>
              </div>
              <Input disabled label="Email" value={user.email} />
              <label className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-text">
                <input
                  checked={alwaysAcceptOddsChanges}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/20 text-emerald-500"
                  onChange={(event) => setAlwaysAcceptOddsChanges(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Toujours accepter les changements de cotes quand un pari est valide avec une
                  nouvelle valeur.
                </span>
              </label>
              <Button disabled={saving} onClick={() => void handleSave()}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                disabled={resettingChat}
                variant="secondary"
                onClick={() => void handleResetChat()}
              >
                <LayoutPanelLeft className="mr-2 h-4 w-4" />
                {resettingChat ? "Réinitialisation..." : "Réinitialiser le chat"}
              </Button>
            </div>
          </Card>
        </div>

        {gamification ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">

            <Card className="min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Rang</p>
                  <h2 className="mt-3 font-display text-3xl text-brand-text">
                    {gamification.daily_reward.current_tier.label}
                  </h2>
                </div>
                <Shield className="h-6 w-6 text-brand-orange" />
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Score</p>
                    <p className="mt-1 font-display text-xl text-brand-text">
                      {gamification.daily_reward.rank_score}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Coef mise</p>
                    <p className="mt-1 font-display text-xl text-brand-text">
                      x{gamification.daily_reward.wager_coef}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Streak</p>
                    <p className="mt-1 font-display text-xl text-brand-text">
                      {gamification.daily_reward.current_streak} jours
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Misé (7j)</p>
                    <p className="mt-1 font-display text-xl text-brand-text">
                      {formatTokens(gamification.daily_reward.wager_7d)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-brand-text">
                      {gamification.daily_reward.next_tier
                        ? `Prochain : ${gamification.daily_reward.next_tier.label}`
                        : "Rang maximal atteint"}
                    </span>
                    <span className="text-brand-muted">
                      {gamification.daily_reward.tier_progress.current}/
                      {gamification.daily_reward.tier_progress.target}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-orange transition-all"
                      style={{
                        width: `${gamification.daily_reward.tier_progress.target > 0 ? Math.min(100, Math.round((gamification.daily_reward.tier_progress.current / gamification.daily_reward.tier_progress.target) * 100)) : 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-brand-muted">
                    Bonus actuel : +{gamification.daily_reward.current_tier.bonus} tokens/jour
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {gamification ? (
          <Card className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Jackpot</p>
                <h2 className="mt-3 font-display text-3xl text-brand-text">Participation casino</h2>
              </div>
              <Trophy className="h-6 w-6 text-brand-orange" />
            </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Pot live</p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {formatTokens(Math.round(gamification.jackpot.current_pot))}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Vos apports</p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {formatTokens(Math.round(gamification.jackpot.user_contribution_total))}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                    Contributions
                  </p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {gamification.jackpot.user_contribution_count}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Dernier gain</p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                  {formatTokens(Math.round(gamification.jackpot.last_result?.payout_amount ?? 0))}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {gamification ? (
          <Card className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Badges</p>
                <h2 className="mt-3 font-display text-3xl text-brand-text">Mes Badges</h2>
              </div>
              <Award className="h-6 w-6 text-brand-orange" />
            </div>

            {gamification.badges.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {gamification.badges.map((badge) => (
                  <BadgeCard
                    key={badge.key}
                    badge={badge}
                    onClaim={handleClaimBadge}
                    claiming={claimingBadge === badge.key}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-brand-muted">
                Aucun badge débloqué pour le moment. Votre prochaine récompense et vos premières
                victoires alimenteront cette section.
              </p>
            )}
          </Card>
        ) : null}

        {gamification && user ? (
          <PinnedBadgesEditor
            userId={user.id}
            unlockedBadges={gamification.badges.filter((b) => b.unlocked)}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}
