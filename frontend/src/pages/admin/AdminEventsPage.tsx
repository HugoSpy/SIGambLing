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
  adjustAdminUserBalance,
  fetchAdminBadgeCatalog,
  cancelAdminEvent,
  closeAdminEvent,
  createAdminEvent,
  fetchAdminEvents,
  fetchAdminProposals,
  logoutRequest,
  rejectAdminProposal,
  resolveAdminEvent,
  searchUsers,
  unlockAdminUserBadge,
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
import type {
  AdminBadgeCatalogItem,
  AdminUserLookup,
  AdminEventView,
  EventCategory,
  EventProposalView,
  EventSearchUser,
} from "../../types/event";

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

function parseOptionRows(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [labelPart, oddsPart] = entry.split("|");
      const label = labelPart?.trim() ?? "";
      const parsedOdds = oddsPart ? Number(oddsPart.trim()) : null;

      return {
        label,
        odd: Number.isFinite(parsedOdds) ? parsedOdds : null,
      };
    })
    .filter((entry) => entry.label.length > 0);
}

function formatOptionsForTextarea(event: AdminEventView) {
  return event.options
    .map((option) => `${option.label}|${option.initial_odds.toFixed(2)}`)
    .join("\n");
}

function calculateMargin(rows: Array<{ label: string; odd: number | null }>) {
  if (rows.length < 2 || rows.some((row) => row.odd == null)) {
    return null;
  }

  const implied = rows.reduce((sum, row) => sum + 1 / (row.odd ?? 1), 0);
  return Number(((implied - 1) * 100).toFixed(2));
}

export function AdminEventsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthenticatedUser();
  const [view, setView] = useState<"markets" | "proposals">("markets");
  const [editingEvent, setEditingEvent] = useState<AdminEventView | null>(null);
  const [draftProposal, setDraftProposal] = useState<EventProposalView | null>(null);
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

  const { data: proposals } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: () => fetchAdminProposals(),
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
    setDraftProposal(null);
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
      options_text: formatOptionsForTextarea(event),
      closing_at: toDateTimeLocalValue(event.closing_at),
      min_bet: String(event.min_bet),
      max_bet: event.max_bet == null ? "" : String(event.max_bet),
    });
    setSelectedExcludedUsers(event.excluded_users);
  };

  const submitForm = async () => {
    const parsedOptions = parseOptionRows(form.options_text);
    const options = parsedOptions.map((entry) => entry.label);
    const optionInitialOdds = Object.fromEntries(
      parsedOptions
        .filter((entry) => entry.odd != null)
        .map((entry) => [entry.label, entry.odd as number]),
    );

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
        proposal_id: !editingEvent ? draftProposal?.id : undefined,
        image_url: form.image_url.trim() || null,
        options,
        option_initial_odds: optionInitialOdds,
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
        toast.success(
          draftProposal ? "Evenement cree et proposition approuvee." : "Evenement cree.",
        );
      }

      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-proposals"] }),
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
        queryClient.invalidateQueries({ queryKey: ["admin-proposals"] }),
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

  const optionRows = useMemo(() => parseOptionRows(form.options_text), [form.options_text]);
  const currentMargin = useMemo(() => calculateMargin(optionRows), [optionRows]);

  const applyProposalToForm = (proposal: EventProposalView) => {
    setEditingEvent(null);
    setDraftProposal(proposal);
    setSelectedExcludedUsers([]);
    setForm({
      title: proposal.title,
      description: proposal.description ?? "",
      category: proposal.category,
      image_url: "",
      options_text: "Oui|1.90\nNon|1.90",
      closing_at: proposal.suggested_date ? toDateTimeLocalValue(proposal.suggested_date) : "",
      min_bet: "10",
      max_bet: "",
    });
    setView("markets");
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Panneau admin</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Creez les marches, gerez les exclusions et traitez les propositions de la promo.
          </p>
        </div>

        <div className="flex gap-2 border-b border-zinc-800">
          <button
            className={`relative px-4 py-3 text-sm font-medium transition ${
              view === "markets" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
            onClick={() => setView("markets")}
            type="button"
          >
            Marches
            {view === "markets" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" /> : null}
          </button>
          <button
            className={`relative px-4 py-3 text-sm font-medium transition ${
              view === "proposals" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
            onClick={() => setView("proposals")}
            type="button"
          >
            Propositions
            {view === "proposals" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" /> : null}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="min-w-[300px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">
                  {editingEvent ? "Edition" : draftProposal ? "Depuis proposition" : "Creation"}
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-text">
                  {editingEvent ? "Modifier un marche" : "Nouveau marche"}
                </h2>
              </div>
              {editingEvent || draftProposal ? (
                <Button size="sm" variant="secondary" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              {draftProposal ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Cette creation validera la proposition de {draftProposal.user.pseudo}.
                </div>
              ) : null}

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
                  placeholder={"Oui|1.65\nNon|2.35\nUne option par ligne, avec la cote apres |"}
                  value={form.options_text}
                />
                <p className="text-xs text-brand-muted">
                  Format recommande: `Nom de l&apos;issue|1.85`.
                </p>
                {currentMargin != null ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-xs text-brand-muted">
                    <span className="text-brand-text">Marge calculee:</span> {currentMargin}%
                  </div>
                ) : null}
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
            {view === "proposals" ? (
              <Card className="min-w-[300px]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">
                    Propositions
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-brand-text">
                    File a traiter
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-brand-muted">
                  {(proposals ?? []).length} element(s)
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {(proposals ?? []).slice(0, 6).map((proposal) => (
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4" key={proposal.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-cyan">
                        {formatEventCategory(proposal.category)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-muted">
                        {proposal.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-brand-text">{proposal.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">
                      {proposal.description || "Aucune description fournie."}
                    </p>
                    <p className="mt-2 text-xs text-brand-muted">
                      Par {proposal.user.pseudo} · Suggestion {formatEventDate(proposal.suggested_date)}
                    </p>
                    {proposal.rejection_reason ? (
                      <p className="mt-2 text-xs text-red-200">
                        Motif: {proposal.rejection_reason}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        onClick={() => applyProposalToForm(proposal)}
                        size="sm"
                        variant="secondary"
                      >
                        Pre-remplir
                      </Button>
                      {proposal.status === "PENDING" ? (
                        <>
                          <Button
                          onClick={() =>
                              applyProposalToForm(proposal)
                            }
                            size="sm"
                          >
                            Creer le marche
                          </Button>
                          <Button
                            onClick={() => {
                              const reason = window.prompt("Motif du refus ?");

                              if (!reason) {
                                return;
                              }

                              void runAction(
                                `reject-${proposal.id}`,
                                () => rejectAdminProposal(proposal.id, reason),
                                "Proposition refusee.",
                              );
                            }}
                            size="sm"
                            variant="danger"
                          >
                            Refuser
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}

                {(proposals ?? []).length === 0 ? (
                  <p className="text-sm leading-7 text-brand-muted">
                    Aucune proposition en attente pour le moment.
                  </p>
                ) : null}
              </div>
              </Card>
            ) : null}

            {view === "markets"
              ? (events ?? []).map((event) => (
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
              ))
              : null}

            {view === "markets" && (events ?? []).length === 0 ? (
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
