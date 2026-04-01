import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Coins, Flame, Save, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  fetchCurrentUser,
  logoutRequest,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from "../lib/api";
import { formatTokens } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import type { AuthUser } from "../types/auth";

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

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    initialData: storedUser ?? undefined,
  });

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
              {user.streak_days} jour{user.streak_days > 1 ? "s" : ""}
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
      </div>
    </DashboardShell>
  );
}
