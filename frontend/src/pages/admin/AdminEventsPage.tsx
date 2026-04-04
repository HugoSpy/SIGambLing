import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, ShieldBan, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { StatisticsTab } from "../../components/admin/StatisticsTab";
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
  triggerAdminJackpotPayout,
  unlockAdminUserBadge,
  updateAdminEvent,
} from "../../lib/api";
import {
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
  EventProposalView,
  EventSearchUser,
} from "../../types/event";

const DEFAULT_HOUSE_MARGIN = 0.05;

interface ProbabilityRow {
  id: string;
  label: string;
  probability: string;
}

interface EventFormState {
  title: string;
  description: string;
  image_url: string;
  options: ProbabilityRow[];
  closing_at: string;
  min_bet: string;
  max_bet: string;
}

function createProbabilityRow(label = "", probability = ""): ProbabilityRow {
  return {
    id: crypto.randomUUID(),
    label,
    probability,
  };
}

function createDefaultProbabilityRows() {
  return [createProbabilityRow("Oui", "50"), createProbabilityRow("Non", "50")];
}

const emptyFormState: EventFormState = {
  title: "",
  description: "",
  image_url: "",
  options: createDefaultProbabilityRows(),
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

function normalizeProbabilityRows(rows: ProbabilityRow[]) {
  return rows
    .map((row) => {
      const label = row.label.trim();
      const parsedProbability = Number(row.probability);

      return {
        id: row.id,
        label,
        probability: Number.isFinite(parsedProbability) ? parsedProbability : null,
      };
    })
    .filter((row) => row.label.length > 0);
}

function calculateProbabilityTotal(rows: ProbabilityRow[]) {
  const normalized = normalizeProbabilityRows(rows);

  if (normalized.length === 0 || normalized.some((row) => row.probability == null)) {
    return null;
  }

  return Number(
    normalized.reduce((sum, row) => sum + (row.probability ?? 0), 0).toFixed(2),
  );
}

function probabilityToInitialOdds(probability: number) {
  return Number((100 / (probability * (1 + DEFAULT_HOUSE_MARGIN))).toFixed(4));
}

function initialOddsToProbability(odds: number, totalImplied: number) {
  if (!Number.isFinite(odds) || odds <= 0 || totalImplied <= 0) {
    return "";
  }

  return (((1 / odds) / totalImplied) * 100).toFixed(1).replace(/\.0$/, "");
}

function buildProbabilityRowsFromEvent(event: AdminEventView) {
  const totalImplied = event.options.reduce((sum, option) => sum + 1 / option.initial_odds, 0);

  return event.options.map((option) =>
    createProbabilityRow(
      option.label,
      initialOddsToProbability(option.initial_odds, totalImplied),
    ),
  );
}

export function AdminEventsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthenticatedUser();
  const [view, setView] = useState<"markets" | "proposals" | "users" | "statistics">("markets");
  const [editingEvent, setEditingEvent] = useState<AdminEventView | null>(null);
  const [draftProposal, setDraftProposal] = useState<EventProposalView | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyFormState);
  const [selectedExcludedUsers, setSelectedExcludedUsers] = useState<EventSearchUser[]>([]);
  const [excludedUserSearch, setExcludedUserSearch] = useState("");
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [selectedAdminUser, setSelectedAdminUser] = useState<AdminUserLookup | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState("100");
  const [balanceReason, setBalanceReason] = useState("");
  const [selectedBadgeKey, setSelectedBadgeKey] = useState("");
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
    queryKey: ["admin-user-search", excludedUserSearch],
    queryFn: () => searchUsers(excludedUserSearch),
    enabled: excludedUserSearch.trim().length >= 2,
  });

  const { data: adminUsers } = useQuery({
    queryKey: ["admin-user-ops-search", adminUserSearch],
    queryFn: () => searchUsers(adminUserSearch),
    enabled: adminUserSearch.trim().length >= 2,
  });

  const { data: badgeCatalog } = useQuery({
    queryKey: ["admin-badge-catalog"],
    queryFn: fetchAdminBadgeCatalog,
  });

  useEffect(() => {
    if (resolveTarget) {
      setResolvedOption(resolveTarget.options[0]?.label ?? "");
    }
  }, [resolveTarget]);

  useEffect(() => {
    if (!selectedAdminUser) {
      return;
    }

    const refreshedUser =
      (adminUsers ?? []).find((entry) => entry.id === selectedAdminUser.id) ?? null;

    if (refreshedUser) {
      setSelectedAdminUser(refreshedUser);
    }
  }, [adminUsers, selectedAdminUser]);

  const resetForm = () => {
    setEditingEvent(null);
    setDraftProposal(null);
    setForm(emptyFormState);
    setSelectedExcludedUsers([]);
    setExcludedUserSearch("");
  };

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  const applyEventToForm = (event: AdminEventView) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      image_url: event.image_url ?? "",
      options: buildProbabilityRowsFromEvent(event),
      closing_at: toDateTimeLocalValue(event.closing_at),
      min_bet: String(event.min_bet),
      max_bet: event.max_bet == null ? "" : String(event.max_bet),
    });
    setSelectedExcludedUsers(event.excluded_users);
  };

  const submitForm = async () => {
    const parsedOptions = normalizeProbabilityRows(form.options);
    const options = parsedOptions.map((entry) => entry.label);
    const probabilityTotal = calculateProbabilityTotal(form.options);

    if (options.length < 2) {
      toast.error("Ajoutez au moins deux options.");
      return;
    }

    if (parsedOptions.some((entry) => entry.probability == null || entry.probability <= 0)) {
      toast.error("Chaque option doit avoir une probabilite strictement positive.");
      return;
    }

    if (probabilityTotal !== 100) {
      toast.error("La somme des probabilites doit etre exactement de 100%.");
      return;
    }

    const optionInitialOdds = Object.fromEntries(
      parsedOptions.map((entry) => [
        entry.label,
        probabilityToInitialOdds(entry.probability as number),
      ]),
    );

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
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
        toast.success("Événement modifié.");
      } else {
        await createAdminEvent(payload);
        toast.success(
          draftProposal ? "Événement créé et proposition approuvée." : "Événement créé.",
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
      queryClient.invalidateQueries({ queryKey: ["jackpot"] }),
      queryClient.invalidateQueries({ queryKey: ["gamification"] }),
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

  const probabilityTotal = useMemo(() => calculateProbabilityTotal(form.options), [form.options]);
  const currentMargin = useMemo(
    () =>
      probabilityTotal == null
        ? null
        : Number((DEFAULT_HOUSE_MARGIN * 100).toFixed(2)),
    [probabilityTotal],
  );

  const availableManualBadges = useMemo(
    () =>
      (badgeCatalog ?? []).filter((badge) => !selectedAdminUser?.badges.includes(badge.key)),
    [badgeCatalog, selectedAdminUser],
  );

  useEffect(() => {
    if (!selectedAdminUser) {
      setSelectedBadgeKey("");
      return;
    }

    setSelectedBadgeKey(availableManualBadges[0]?.key ?? "");
  }, [availableManualBadges, selectedAdminUser]);

  if (!user || isLoading) {
    return <LoadingScreen label="Chargement du panel admin..." />;
  }

  const applyProposalToForm = (proposal: EventProposalView) => {
    setEditingEvent(null);
    setDraftProposal(proposal);
    setSelectedExcludedUsers([]);
    setForm({
      title: proposal.title,
      description: proposal.description ?? "",
      image_url: "",
      options: createDefaultProbabilityRows(),
      closing_at: proposal.suggested_date ? toDateTimeLocalValue(proposal.suggested_date) : "",
      min_bet: "10",
      max_bet: "",
    });
    setView("markets");
  };

  const refreshAdminUserData = async (nextSelectedUserId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-user-ops-search"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-user-search"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["gamification"] }),
    ]);

    if (!nextSelectedUserId) {
      return;
    }

    const refreshedUsers = await queryClient.fetchQuery({
      queryKey: ["admin-user-ops-search", adminUserSearch],
      queryFn: () => searchUsers(adminUserSearch),
    });
    const refreshedUser = refreshedUsers.find((entry) => entry.id === nextSelectedUserId) ?? null;
    setSelectedAdminUser(refreshedUser);
  };

  const submitBalanceAdjustment = async () => {
    if (!selectedAdminUser) {
      toast.error("Selectionnez d'abord un joueur.");
      return;
    }

    const amount = Number(balanceAdjustment);

    if (!Number.isInteger(amount) || amount === 0) {
      toast.error("Le montant doit etre un entier non nul.");
      return;
    }

    if (!balanceReason.trim()) {
      toast.error("Ajoutez un motif.");
      return;
    }

    try {
      setActionKey(`balance-${selectedAdminUser.id}`);
      const updatedUser = await adjustAdminUserBalance(selectedAdminUser.id, {
        amount,
        reason: balanceReason.trim(),
      });
      setSelectedAdminUser(updatedUser);
      setBalanceReason("");
      await refreshAdminUserData(updatedUser.id);
      toast.success("Solde admin mis a jour.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  const submitBadgeUnlock = async () => {
    if (!selectedAdminUser) {
      toast.error("Selectionnez d'abord un joueur.");
      return;
    }

    if (!selectedBadgeKey) {
      toast.error("Choisissez un badge.");
      return;
    }

    try {
      setActionKey(`badge-${selectedAdminUser.id}`);
      const outcome = await unlockAdminUserBadge(selectedAdminUser.id, selectedBadgeKey);
      setSelectedAdminUser(outcome.user);
      await refreshAdminUserData(outcome.user.id);
      toast.success(outcome.already_unlocked ? "Badge deja debloque." : "Badge debloque.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Panneau admin</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Créez les marchés, gérez les exclusions et traitez les propositions de la promo.
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
          <button
            className={`relative px-4 py-3 text-sm font-medium transition ${
              view === "users" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
            onClick={() => setView("users")}
            type="button"
          >
            Joueurs
            {view === "users" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" /> : null}
          </button>
          <button
            className={`relative px-4 py-3 text-sm font-medium transition ${
              view === "statistics" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
            onClick={() => setView("statistics")}
            type="button"
          >
            Statistiques
            {view === "statistics" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" /> : null}
          </button>
        </div>

        {view === "statistics" ? <StatisticsTab /> : null}

        {view !== "statistics" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="min-w-[300px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">
                  {editingEvent ? "Edition" : draftProposal ? "Depuis proposition" : "Creation"}
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-text">
                  {editingEvent ? "Modifier un marché" : "Nouvel Evènement"}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-brand-text">Issues et probabilites</span>
                    <p className="mt-1 text-xs text-brand-muted">
                      Repartissez 100% de probabilite, les cotes initiales sont derivees avec une
                      marge fixe de {currentMargin ?? Number((DEFAULT_HOUSE_MARGIN * 100).toFixed(2))}%.
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        options: [...current.options, createProbabilityRow()],
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.options.map((row, index) => (
                    <div
                      className="rounded-[22px] border border-white/10 bg-white/5 p-4"
                      key={row.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                          <input
                            className="w-full rounded-2xl border border-brand-line bg-black/10 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, label: event.target.value }
                                    : entry,
                                ),
                              }))
                            }
                            placeholder={`Issue ${index + 1}`}
                            value={row.label}
                          />
                          <input
                            className="w-full rounded-2xl border border-brand-line bg-black/10 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                            max={100}
                            min={0}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, probability: event.target.value }
                                    : entry,
                                ),
                              }))
                            }
                            step="0.1"
                            type="number"
                            value={row.probability}
                          />
                        </div>
                        <Button
                          disabled={form.options.length <= 2}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              options: current.options.filter((entry) => entry.id !== row.id),
                            }))
                          }
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <input
                        className="mt-3 w-full accent-brand-cyan"
                        max={100}
                        min={0}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            options: current.options.map((entry) =>
                              entry.id === row.id
                                ? { ...entry, probability: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                        step="0.1"
                        type="range"
                        value={row.probability || 0}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-xs text-brand-muted">
                  <span className="text-brand-text">Total probabilites:</span>{" "}
                  {probabilityTotal == null ? "--" : `${probabilityTotal}%`}
                  {" · "}
                  <span className="text-brand-text">Marge derivee:</span>{" "}
                  {currentMargin == null ? "--" : `${currentMargin}%`}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-brand-text">Clôture</span>
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
                      onChange={(event) => setExcludedUserSearch(event.target.value)}
                      placeholder="Pseudo ou email"
                      value={excludedUserSearch}
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
                          setExcludedUserSearch("");
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
                {saving ? "Enregistrement..." : editingEvent ? "Sauvegarder" : "Créer l'événement"}
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
                            Créer le marché
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

            {view === "users" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.8fr)]">
                <Card className="min-w-[300px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">
                        Operations joueurs
                      </p>
                      <h2 className="mt-2 font-display text-3xl text-brand-text">
                        Recherche et moderation
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-brand-muted">
                      {(adminUsers ?? []).length} resultat(s)
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-brand-text">Pseudo ou email</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white/5 px-4 py-3">
                        <Search className="h-4 w-4 text-brand-muted" />
                        <input
                          className="w-full bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-muted"
                          onChange={(event) => setAdminUserSearch(event.target.value)}
                          placeholder="Rechercher un joueur"
                          value={adminUserSearch}
                        />
                      </div>
                    </label>

                    {(adminUsers ?? []).length > 0 ? (
                      <div className="space-y-3">
                        {(adminUsers ?? []).map((entry) => (
                          <button
                            className={`w-full rounded-[22px] border p-4 text-left transition-all duration-300 ${
                              selectedAdminUser?.id === entry.id
                                ? "border-brand-cyan/60 bg-brand-cyan/10"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                            key={entry.id}
                            onClick={() => setSelectedAdminUser(entry)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brand-text">
                                  {entry.pseudo}
                                </p>
                                <p className="truncate text-xs text-brand-muted">{entry.email}</p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-muted">
                                {entry.role}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                              <span>{formatTokens(entry.balance)}</span>
                              <span>Série {entry.streak_days} j</span>
                              <span>{entry.badges.length} badge(s)</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-7 text-brand-muted">
                        {adminUserSearch.trim().length < 2
                          ? "Saisissez au moins deux caracteres pour lancer une recherche."
                          : "Aucun joueur actif ne correspond a cette recherche."}
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="min-w-[300px]">
                  {selectedAdminUser ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">
                          Fiche joueur
                        </p>
                        <h2 className="mt-2 font-display text-3xl text-brand-text">
                          {selectedAdminUser.pseudo}
                        </h2>
                        <p className="mt-2 text-sm text-brand-muted">{selectedAdminUser.email}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                            Solde
                          </p>
                          <p className="mt-3 font-display text-3xl text-brand-text">
                            {formatTokens(selectedAdminUser.balance)}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">
                            Compte
                          </p>
                          <p className="mt-3 text-sm text-brand-text">
                            Rôle {selectedAdminUser.role} · série {selectedAdminUser.streak_days} jour
                            {selectedAdminUser.streak_days > 1 ? "s" : ""}
                          </p>
                          <p className="mt-2 text-xs text-brand-muted">
                            Inscrit le{" "}
                            {new Date(selectedAdminUser.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <div>
                          <p className="text-sm font-semibold text-brand-text">
                            Ajustement de solde
                          </p>
                          <p className="mt-1 text-xs text-brand-muted">
                            Utilisez un montant positif pour crediter et negatif pour debiter.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-brand-text">Montant</span>
                            <input
                              className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                              onChange={(event) => setBalanceAdjustment(event.target.value)}
                              placeholder="+250 ou -100"
                              type="number"
                              value={balanceAdjustment}
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-brand-text">Motif</span>
                            <input
                              className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                              onChange={(event) => setBalanceReason(event.target.value)}
                              placeholder="Correction jackpot, geste commercial..."
                              value={balanceReason}
                            />
                          </label>
                        </div>

                        <Button
                          disabled={actionKey === `balance-${selectedAdminUser.id}`}
                          onClick={() => void submitBalanceAdjustment()}
                        >
                          {actionKey === `balance-${selectedAdminUser.id}`
                            ? "Mise a jour..."
                            : "Appliquer l'ajustement"}
                        </Button>
                      </div>

                      <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <div>
                          <p className="text-sm font-semibold text-brand-text">
                            Badges et hooks de récompense
                          </p>
                          <p className="mt-1 text-xs text-brand-muted">
                            Debloquez un badge manuel ou preparez une action jackpot quand le contrat
                            cross-track sera finalise.
                          </p>
                        </div>

                        {selectedAdminUser.badges.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedAdminUser.badges.map((badge) => (
                              <span
                                className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs text-brand-cyan"
                                key={badge}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-brand-muted">
                            Aucun badge debloque pour ce joueur.
                          </p>
                        )}

                        <label className="block space-y-2">
                          <span className="text-sm font-medium text-brand-text">
                            Deblocage manuel
                          </span>
                          <select
                            className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                            onChange={(event) => setSelectedBadgeKey(event.target.value)}
                            value={selectedBadgeKey}
                          >
                            <option className="bg-[#0f212e]" value="">
                              Choisir un badge
                            </option>
                            {availableManualBadges.map((badge: AdminBadgeCatalogItem) => (
                              <option className="bg-[#0f212e]" key={badge.key} value={badge.key}>
                                {badge.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedBadgeKey ? (
                          <p className="text-xs text-brand-muted">
                            {
                              availableManualBadges.find((badge) => badge.key === selectedBadgeKey)
                                ?.description
                            }
                          </p>
                        ) : null}

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            disabled={
                              actionKey === `badge-${selectedAdminUser.id}` || !selectedBadgeKey
                            }
                            onClick={() => void submitBadgeUnlock()}
                          >
                            {actionKey === `badge-${selectedAdminUser.id}`
                              ? "Deblocage..."
                              : "Debloquer le badge"}
                          </Button>
                          <Button
                            disabled={actionKey === `jackpot-${selectedAdminUser.id}`}
                            onClick={() =>
                              void runAction(
                                `jackpot-${selectedAdminUser.id}`,
                                async () => {
                                  await triggerAdminJackpotPayout(selectedAdminUser.id);
                                  await refreshAdminUserData(selectedAdminUser.id);
                                },
                                "Jackpot verse au gagnant GOLD.",
                              )
                            }
                            variant="secondary"
                          >
                            {actionKey === `jackpot-${selectedAdminUser.id}`
                              ? "Paiement..."
                              : "Payer le jackpot GOLD"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.28em] text-brand-orange">
                        Fiche joueur
                      </p>
                      <h2 className="font-display text-3xl text-brand-text">
                        Selection requise
                      </h2>
                      <p className="text-sm leading-7 text-brand-muted">
                        Choisissez un joueur a gauche pour ajuster son solde, debloquer un badge
                        manuel et preparer les hooks jackpot.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            ) : null}

            {view === "markets"
              ? (events ?? []).map((event) => (
              <Card className="min-w-[300px]" key={event.id}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                      <span>Clôture {formatEventDate(event.closing_at)}</span>
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
                          "Événement clos.",
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
                          "Événement annulé et remboursé.",
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
                  Aucun événement admin à afficher pour le moment.
                </p>
              </Card>
            ) : null}
          </div>
        </div>
        ) : null}
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
                  "Événement résolu.",
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
