import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Camera, Coins, Flame, Gift, Save, Ticket, Trophy, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useGamificationState } from "../hooks/useGamificationState";
import {
  claimDailyReward,
  fetchCurrentUser,
  logoutRequest,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from "../lib/api";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const [pseudo, setPseudo] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    initialData: storedUser ?? undefined,
  });
  const { data: gamification } = useGamificationState();
  const unlockedBadges = gamification?.badges.filter((badge) => badge.unlocked).length ?? 0;

  useEffect(() => {
    if (user) {
      setUser(user);
      setStatus("authenticated");
      setPseudo(user.pseudo);
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
    toast.success("Session fermée.");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 2MB).");
      event.target.value = "";
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Format non supporté.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);
      const updatedUser = await uploadCurrentUserAvatar(formData);
      commitUser(updatedUser);
      toast.success("Photo de profil mise à jour.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    const nextPseudo = pseudo.trim();

    if (!nextPseudo) {
      toast.error("Le pseudo ne peut pas être vide.");
      return;
    }

    if (nextPseudo === user.pseudo) {
      toast("Aucune modification à enregistrer.");
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await updateCurrentUserProfile({ pseudo: nextPseudo });
      commitUser(updatedUser);
      toast.success("Profil enregistré.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleClaimReward = async () => {
    try {
      setClaimingReward(true);
      const result = await claimDailyReward();
      commitUser(result.user);
      queryClient.setQueryData(["gamification"], result.gamification);
      queryClient.setQueryData(["jackpot"], result.gamification.jackpot);

      if (result.claimed) {
        toast.success(
          `Recompense recuperee: +${formatTokens(result.amount)} tokens`,
        );
      } else {
        toast("Recompense deja recuperée aujourd'hui.");
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setClaimingReward(false);
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
              <Input disabled label="Email" value={user.email} />
              <Button disabled={saving} onClick={() => void handleSave()}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </Card>
        </div>

        {gamification ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <Card className="min-w-[300px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">
                    Recompense quotidienne
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-brand-text">
                    {gamification.daily_reward.claimed_today
                      ? "Recompense recuperée"
                      : `${formatTokens(gamification.daily_reward.next_amount)} tokens a prendre`}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-brand-muted">
                    Jour calculé en UTC. Le prochain reset est prévu après{" "}
                    {new Date(gamification.daily_reward.next_claim_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    .
                  </p>
                </div>
                <Gift className="h-6 w-6 text-brand-cyan" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Base</p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {formatTokens(gamification.daily_reward.base_amount)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Bonus streak</p>
                  <p className="mt-2 font-display text-2xl text-brand-orange">
                    +{formatTokens(gamification.daily_reward.next_streak_bonus)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Badges</p>
                  <p className="mt-2 font-display text-2xl text-brand-text">
                    {unlockedBadges}/{gamification.badges.length}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  disabled={claimingReward || gamification.daily_reward.claimed_today}
                  onClick={() => void handleClaimReward()}
                >
                  <Gift className="mr-2 h-4 w-4" />
                  {claimingReward
                    ? "Validation..."
                    : gamification.daily_reward.claimed_today
                      ? "Deja recuperee"
                      : "Recuperer la recompense"}
                </Button>
                {gamification.daily_reward.next_tier ? (
                  <p className="text-sm text-brand-muted">
                    Prochain tier: {gamification.daily_reward.next_tier.label} a{" "}
                    {gamification.daily_reward.next_tier.minDays} jours pour +
                    {formatTokens(gamification.daily_reward.next_tier.bonus)}.
                  </p>
                ) : (
                  <p className="text-sm text-brand-muted">Tous les tiers de streak sont debloques.</p>
                )}
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                      Tier actuel
                    </p>
                    <p className="mt-2 font-display text-2xl text-brand-text">
                      {gamification.daily_reward.current_tier.label}
                    </p>
                  </div>
                  <Flame className="h-5 w-5 text-brand-orange" />
                </div>
                <p className="mt-3 text-sm text-brand-muted">
                  {gamification.daily_reward.streak_status === "broken"
                    ? "La streak est tombee. Reprenez un claim pour relancer le compteur."
                    : gamification.daily_reward.streak_deadline_at
                      ? `Deadline de streak: ${new Date(
                          gamification.daily_reward.streak_deadline_at,
                        ).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}`
                      : "Claim disponible des l'ouverture du prochain jour UTC."}
                </p>
              </div>
            </Card>

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
                  {formatTokens(gamification.jackpot.current_round.current_pot)}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Tickets</p>
                <p className="mt-2 font-display text-2xl text-brand-text">
                  {gamification.jackpot.current_round.user_tickets}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Chance</p>
                <p className="mt-2 font-display text-2xl text-brand-text">
                  {(gamification.jackpot.current_round.user_chance_bps / 100).toFixed(2)}%
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Dernier gain</p>
                <p className="mt-2 font-display text-2xl text-brand-text">
                  {formatTokens(gamification.jackpot.last_result?.payout_amount ?? 0)}
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
                Aucun badge debloque pour le moment. Votre prochaine recompense et vos premieres
                victoires alimenteront cette section.
              </p>
            )}
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
