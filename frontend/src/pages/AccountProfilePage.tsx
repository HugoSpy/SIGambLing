import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Camera, Coins, Flame, LayoutPanelLeft, Save, Trophy, UserRound } from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useGamificationState } from "../hooks/useGamificationState";
import {
  ApiError,
  fetchCurrentUser,
  logoutRequest,
  resetChatPreferences,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from "../lib/api";
import { getErrorMessage, notify } from "../lib/notifications";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import { useChatStore } from "../store/chat-store";
import type { AuthUser } from "../types/auth";
import type { GamificationBadge } from "../types/gamification";

const BADGE_STYLES: Record<GamificationBadge["tone"], string> = {
  cyan: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
  orange: "border-brand-orange/30 bg-brand-orange/10 text-brand-orange",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  violet: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

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
        <Card accent="cyan" className="min-w-[300px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Profil</p>
          <h1 className="mt-3 font-display text-4xl text-brand-text">Votre espace personnel</h1>
          <p className="mt-4 text-base leading-8 text-brand-muted">
            Mettez à jour votre photo, gardez un pseudo propre et retrouvez vos informations en un
            coup d&apos;œil.
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
              {gamification?.daily_reward.current_streak ?? user.streak_days} jour
              {(gamification?.daily_reward.current_streak ?? user.streak_days) > 1 ? "s" : ""}
            </p>
          </Card>

          <Card className="min-w-[300px]">
            <UserRound className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Pseudo</p>
            <p className="mt-2 font-display text-3xl text-brand-text">{user.pseudo}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="min-w-[300px]">
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

          <Card className="min-w-[300px]">
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
            <Card className="min-w-[300px]">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Progression</p>
              <div className="mt-5 space-y-4">
                {gamification.progress.map((item) => {
                  const percentage =
                    item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 100;

                  return (
                    <div className="space-y-2" key={item.key}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-brand-text">{item.label}</span>
                        <span className="text-brand-muted">
                          {item.current}/{item.target}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-brand-cyan transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-brand-muted">{item.reward}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : null}

        {gamification ? (
          <Card className="min-w-[300px]">
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
          <Card className="min-w-[300px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Badges</p>
                <h2 className="mt-3 font-display text-3xl text-brand-text">Vitrine live</h2>
              </div>
              <Award className="h-6 w-6 text-brand-orange" />
            </div>

            {gamification.badges.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {gamification.badges.map((badge) => (
                  <div
                    className={`rounded-[22px] border p-4 ${
                      badge.unlocked
                        ? BADGE_STYLES[badge.tone]
                        : "border-white/10 bg-white/5 text-brand-text"
                    }`}
                    key={badge.key}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                        {badge.rarity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-white/80">{badge.description}</p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-white/60">
                        <span>Progression</span>
                        <span>
                          {badge.progress.current}/{badge.progress.target} {badge.progress.label}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${badge.unlocked ? "bg-current" : "bg-white/30"}`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((badge.progress.current / badge.progress.target) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/60">
                      {badge.unlocked && badge.unlocked_at
                        ? new Date(badge.unlocked_at).toLocaleDateString("fr-FR")
                        : "verrouille"}
                    </p>
                  </div>
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
      </div>
    </DashboardShell>
  );
}
