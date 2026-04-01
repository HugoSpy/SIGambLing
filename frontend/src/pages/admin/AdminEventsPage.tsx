import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, ShieldBan, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardShell } from "../../components/layout/DashboardShell";
import { LoadingScreen } from "../../components/layout/LoadingScreen";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useAuthenticatedUser } from "../../hooks/useAuthenticatedUser";
import {
  cancelAdminEvent,
  closeAdminEvent,
  createAdminEvent,
  fetchAdminEvents,
  logoutRequest,
  resolveAdminEvent,
  searchUsers,
  updateAdminEvent,
} from "../../lib/api";
import {
  formatEventCategory,
  formatEventDate,
  formatEventOdds,
  formatEventStatus,
  statusTone,
} from "../../lib/event-utils";
import { formatTokens } from "../../lib/utils";
import type { AdminEventView, EventCategory, EventSearchUser } from "../../types/event";

const categoryOptions: EventCategory[] = ["epita", "sports", "politics", "culture"];

interface EventFormState {
  title: string;
  description: string;
  category: EventCategory;
  image_url: string;
  options_text: string;
  closing_at: string;
  min_bet: string;
  max_bet: string;
}

const emptyFormState: EventFormState = {
  title: "",
  description: "",
  category: "epita",
  image_url: "",
  options_text: "",
  closing_at: "",
  min_bet: "10",
  max_bet: "",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromLocalDate(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function parseOptions(value: string) {
  return value
    .split(/\n|,/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function AdminEventsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthenticatedUser();
  const [editingEvent, setEditingEvent] = useState<AdminEventView | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyFormState);
  const [selectedExcludedUsers, setSelectedExcludedUsers] = useState<EventSearchUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<AdminEventView | null>(null);
  const [resolvedOption, setResolvedOption] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => fetchAdminEvents(),
  });

  const { data: foundUsers } = useQuery({
    queryKey: ["admin-user-search", userSearch],
    queryFn: () => searchUsers(userSearch),
    enabled: userSearch.trim().length >= 2,
  });

  useEffect(() => {
    if (resolveTarget) {
      setResolvedOption(resolveTarget.options[0]?.label ?? "");
    }
  }, [resolveTarget]);

  if (!user || isLoading) {
    return <LoadingScreen label="Chargement du panel admin..." />;
  }

  const resetForm = () => {
    setEditingEvent(null);
    setForm(emptyFormState);
    setSelectedExcludedUsers([]);
    setUserSearch("");
  };

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  const applyEventToForm = (event: AdminEventView) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      image_url: event.image_url ?? "",
      options_text: event.options.map((option) => option.label).join("\n"),
      closing_at: toDateTimeLocalValue(event.closing_at),
      min_bet: String(event.min_bet),
      max_bet: event.max_bet == null ? "" : String(event.max_bet),
    });
    setSelectedExcludedUsers(event.excluded_users);
  };

  const submitForm = async () => {
    const options = parseOptions(form.options_text);

    if (options.length < 2) {
      toast.error("Ajoutez au moins deux options.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        image_url: form.image_url.trim() || null,
        options,
        closing_at: toIsoFromLocalDate(form.closing_at),
        min_bet: Number(form.min_bet),
        max_bet: form.max_bet ? Number(form.max_bet) : null,
        excluded_user_ids: selectedExcludedUsers.map((entry) => entry.id),
      };

      if (editingEvent) {
        await updateAdminEvent(editingEvent.id, payload);
        toast.success("Evenement modifie.");
      } else {
        await createAdminEvent(payload);
        toast.success("Evenement cree.");
      }

      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event"] }),
      ]);
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (key: string, action: () => Promise<unknown>, successMessage: string) => {
    try {
      setActionKey(key);
      await action();
      toast.success(successMessage);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event"] }),
        queryClient.invalidateQueries({ queryKey: ["my-event-bets"] }),
      ]);
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  const selectableUsers = useMemo(() => {
    const selectedIds = new Set(selectedExcludedUsers.map((entry) => entry.id));
    return (foundUsers ?? []).filter((entry) => !selectedIds.has(entry.id));
  }, [foundUsers, selectedExcludedUsers]);

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="orange" className="min-w-[300px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Admin</p>
          <h1 className="mt-3 font-display text-4xl text-brand-text">Gestion des evenements</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-brand-muted">
            Creez les marches, ajustez les exclusions et pilotez le cycle de vie complet jusqu'a la
            resolution ou l'annulation.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="min-w-[300px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">
                  {editingEvent ? "Edition" : "Creation"}
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-text">
                  {editingEvent ? "Modifier un marche" : "Nouveau marche"}
                </h2>
              </div>
              {editingEvent ? (
                <Button size="sm" variant="secondary" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-text">Titre</span>
                <input
                  className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  value={form.title}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-text">Description</span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  value={form.description}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Categorie</span>
                  <select
                    className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value as EventCategory,
                      }))
                    }
                    value={form.category}
                  >
                    {categoryOptions.map((category) => (
                      <option className="bg-[#0f212e]" key={category} value={category}>
                        {formatEventCategory(category)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Image URL</span>
                  <input
                    className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, image_url: event.target.value }))
                    }
                    placeholder="https://..."
                    value={form.image_url}
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-text">Options</span>
                <textarea
                  className="min-h-[130px] w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, options_text: event.target.value }))
                  }
                  placeholder={"Oui\nNon\nOu une option par ligne"}
                  value={form.options_text}
                />
                <p className="text-xs text-brand-muted">Une option par ligne ou separee par des virgules.</p>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Cloture</span>
                  <input
                    className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, closing_at: event.target.value }))
                    }
                    type="datetime-local"
                    value={form.closing_at}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Mise min</span>
                  <input
                    className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, min_bet: event.target.value }))
                    }
                    type="number"
                    value={form.min_bet}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Mise max</span>
                  <input
                    className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, max_bet: event.target.value }))
                    }
                    placeholder="Illimitee"
                    type="number"
                    value={form.max_bet}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Utilisateurs exclus</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white/5 px-4 py-3">
                    <Search className="h-4 w-4 text-brand-muted" />
                    <input
                      className="w-full bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-muted"
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Pseudo ou email"
                      value={userSearch}
                    />
                  </div>
                </label>

                {selectedExcludedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedExcludedUsers.map((entry) => (
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-brand-orange/35 bg-brand-orange/10 px-3 py-1 text-xs text-brand-orangeSoft"
                        key={entry.id}
                        onClick={() =>
                          setSelectedExcludedUsers((current) =>
                            current.filter((userEntry) => userEntry.id !== entry.id),
                          )
                        }
                        type="button"
                      >
                        {entry.pseudo}
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectableUsers.length > 0 ? (
                  <div className="space-y-2 rounded-[20px] border border-white/10 bg-white/5 p-3">
                    {selectableUsers.map((entry) => (
                      <button
                        className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-all duration-300 hover:bg-white/5"
                        key={entry.id}
                        onClick={() => {
                          setSelectedExcludedUsers((current) => [...current, entry]);
                          setUserSearch("");
                        }}
                        type="button"
                      >
                        <div>
                          <p className="text-sm font-medium text-brand-text">{entry.pseudo}</p>
                          <p className="text-xs text-brand-muted">{entry.email}</p>
                        </div>
                        <ShieldBan className="h-4 w-4 text-brand-orange" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button disabled={saving} fullWidth onClick={() => void submitForm()}>
                {saving ? "Enregistrement..." : editingEvent ? "Sauvegarder" : "Creer l'evenement"}
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            {(events ?? []).map((event) => (
              <Card className="min-w-[300px]" key={event.id}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-cyan">
                        {formatEventCategory(event.category)}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${statusTone(event.status)}`}>
                        {formatEventStatus(event.status)}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-3xl text-brand-text">{event.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-brand-muted">
                      {event.description || "Aucune description fournie."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brand-muted">
                      <span>Pool {formatTokens(event.total_pool)}</span>
                      <span>Cloture {formatEventDate(event.closing_at)}</span>
                      <span>{event.bet_count} paris</span>
                    </div>
                    {event.excluded_users.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {event.excluded_users.map((entry) => (
                          <span
                            className="rounded-full border border-brand-orange/35 bg-brand-orange/10 px-3 py-1 text-xs text-brand-orangeSoft"
                            key={entry.id}
                          >
                            {entry.pseudo}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-[230px]">
                    <Button
                      disabled={event.status !== "OPEN"}
                      onClick={() => applyEventToForm(event)}
                      variant="secondary"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editer
                    </Button>
                    <Button
                      disabled={actionKey === `close-${event.id}` || event.status !== "OPEN"}
                      onClick={() =>
                        void runAction(
                          `close-${event.id}`,
                          () => closeAdminEvent(event.id),
                          "Evenement clos.",
                        )
                      }
                      variant="secondary"
                    >
                      Clore
                    </Button>
                    <Button
                      disabled={
                        actionKey === `resolve-${event.id}` ||
                        (event.status !== "OPEN" && event.status !== "CLOSED")
                      }
                      onClick={() => setResolveTarget(event)}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Resoudre
                    </Button>
                    <Button
                      disabled={
                        actionKey === `cancel-${event.id}` ||
                        event.status === "RESOLVED" ||
                        event.status === "CANCELLED"
                      }
                      onClick={() =>
                        void runAction(
                          `cancel-${event.id}`,
                          () => cancelAdminEvent(event.id),
                          "Evenement annule et rembourse.",
                        )
                      }
                      variant="danger"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {event.options.map((option) => (
                    <div
                      className="rounded-[22px] border border-white/10 bg-white/5 p-4"
                      key={option.label}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-brand-text">{option.label}</span>
                        <span className="text-brand-cyan">{formatEventOdds(option.odds)}</span>
                      </div>
                      <p className="mt-2 text-xs text-brand-muted">
                        {option.percentage.toFixed(1)}% - {formatTokens(option.pool)} tokens
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {(events ?? []).length === 0 ? (
              <Card className="min-w-[300px]">
                <p className="text-sm leading-7 text-brand-muted">
                  Aucun evenement admin a afficher pour le moment.
                </p>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        description="Choisissez l'option gagnante avant de distribuer les gains pari-mutuel."
        onClose={() => setResolveTarget(null)}
        open={Boolean(resolveTarget)}
        title={resolveTarget ? `Resoudre ${resolveTarget.title}` : "Resoudre"}
      >
        {!resolveTarget ? null : (
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-text">Option gagnante</span>
              <select
                className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                onChange={(event) => setResolvedOption(event.target.value)}
                value={resolvedOption}
              >
                {resolveTarget.options.map((option) => (
                  <option className="bg-[#0f212e]" key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Button
              disabled={actionKey === `resolve-${resolveTarget.id}` || !resolvedOption}
              fullWidth
              onClick={() =>
                void runAction(
                  `resolve-${resolveTarget.id}`,
                  async () => {
                    await resolveAdminEvent(resolveTarget.id, resolvedOption);
                    setResolveTarget(null);
                  },
                  "Evenement resolu.",
                )
              }
            >
              Confirmer la resolution
            </Button>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
