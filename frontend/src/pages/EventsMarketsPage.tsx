import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { ActiveEventBetsList } from "../components/ActiveEventBetsList";
import { BetDrawer } from "../components/BetDrawer";
import { EventCard } from "../components/EventCard";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import {
  createProposal,
  fetchEvents,
  fetchMyEventBets,
  fetchMyProposals,
  logoutRequest,
} from "../lib/api";
import { formatEventDate, formatEventStatus } from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import { useBetCartStore } from "../store/bet-cart-store";
import type { EventStatus, EventView } from "../types/event";

const statusOptions: Array<{ value: "all" | EventStatus; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "OPEN", label: "Ouverts" },
  { value: "CLOSED", label: "Clôturés" },
  { value: "RESOLVED", label: "Résolus" },
];

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

function proposalTone(status: string) {
  if (status === "APPROVED") {
    return "text-emerald-300";
  }

  if (status === "REJECTED") {
    return "text-red-300";
  }

  return "text-amber-200";
}

export function EventsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketCount = useBetCartStore((state) => state.selections.length);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | EventStatus>("all");
  const viewTab = searchParams.get("tab") === "my-bets" ? "my-bets" : "all";
  const [selectedBet, setSelectedBet] = useState<{
    event: EventView;
    optionLabel?: string;
  } | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    suggested_date: "",
  });

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: myBets } = useQuery({
    queryKey: ["my-event-bets"],
    queryFn: fetchMyEventBets,
  });

  const { data: myProposals } = useQuery({
    queryKey: ["my-proposals"],
    queryFn: fetchMyProposals,
  });

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
    const pendingEventIds = new Set(
      (myBets ?? [])
        .filter((bet) => bet.status === "PENDING" && bet.event_id)
        .map((bet) => bet.event_id as string),
    );

    return (events ?? []).filter((event) => {
      if (viewTab === "my-bets" && !pendingEventIds.has(event.id)) {
        return false;
      }

      if (status !== "all" && event.status !== status) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${event.title} ${event.description ?? ""}`;
      return haystack.toLocaleLowerCase("fr-FR").includes(normalizedSearch);
    });
  }, [events, myBets, search, status, viewTab]);

  if (!user || eventsLoading) {
    return <LoadingScreen label="Chargement des événements..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermée.");
  };

  const submitProposal = async () => {
    if (proposalForm.title.trim().length < 10) {
      toast.error("Le titre doit contenir au moins 10 caractères.");
      return;
    }

    try {
      setProposalSubmitting(true);
      await createProposal({
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim() || null,
        suggested_date: proposalForm.suggested_date
          ? new Date(proposalForm.suggested_date).toISOString()
          : null,
      });
      setProposalOpen(false);
      setProposalForm({
        title: "",
        description: "",
        suggested_date: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["my-proposals"] });
      toast.success("Proposition envoyée.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setProposalSubmitting(false);
    }
  };

  const activePositions = myBets?.filter((bet) => bet.status === "PENDING").length ?? 0;
  const activeBetList = myBets?.filter((bet) => bet.status === "PENDING").slice(0, 5) ?? [];
  const totalExposure =
    myBets?.filter((bet) => bet.status === "PENDING").reduce((sum, bet) => sum + bet.stake, 0) ??
    0;
  const openMarkets = (events ?? []).filter((event) => event.status === "OPEN").length;

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Événements</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Parcourez les marchés, ouvrez un pari rapide ou alimentez votre ticket.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setProposalOpen(true)}>
            Proposer un événement
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    viewTab === "all"
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  onClick={() => setSearchParams({})}
                  type="button"
                >
                  Tous les marchés
                </button>
                <button
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    viewTab === "my-bets"
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  onClick={() => setSearchParams({ tab: "my-bets" })}
                  type="button"
                >
                  Mes paris
                </button>
              </div>

              <div className="grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-200">Recherche</span>
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3">
                    <Search className="h-4 w-4 text-zinc-500" />
                    <input
                      className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Titre ou description"
                      value={search}
                    />
                  </div>
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium text-zinc-200">Statut</span>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        status === option.value
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {viewTab === "my-bets" ? (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Mes paris actifs</p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-100">Exposition en cours</h2>
                  </div>
                  <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    {activePositions}
                  </span>
                </div>

                <div className="mt-4">
                  <ActiveEventBetsList
                    bets={activeBetList}
                    emptyMessage="Aucun pari actif pour le moment."
                    events={events}
                    fallbackLinkTarget="/events"
                  />
                </div>
              </Card>
            ) : null}

            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>
                {filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""} affiché
                {filteredEvents.length > 1 ? "s" : ""}
              </span>
              <span>{ticketCount} sélection(s) dans le ticket</span>
            </div>

            {eventsError ? (
              <Card>
                <p className="text-sm text-red-300">{toErrorMessage(eventsError)}</p>
              </Card>
            ) : null}

            {filteredEvents.length === 0 ? (
              <Card>
                <p className="text-sm leading-7 text-zinc-400">
                  Aucun événement ne correspond à vos filtres.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredEvents.map((event) => (
                  <EventCard
                    event={event}
                    key={event.id}
                    onBet={(selectedEvent, optionLabel) =>
                      setSelectedBet({ event: selectedEvent, optionLabel })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card accent="cyan">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Vue rapide</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Marches ouverts</span>
                  <span className="font-semibold text-zinc-100">{openMarkets}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Positions ouvertes</span>
                  <span className="font-semibold text-zinc-100">{activePositions}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Exposition</span>
                  <span className="font-semibold text-zinc-100">
                    {formatTokens(totalExposure)}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Vos propositions
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-100">Suivi</h2>
                </div>
                <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                  {(myProposals ?? []).length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {(myProposals ?? []).slice(0, 4).map((proposal) => (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" key={proposal.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-medium ${proposalTone(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-100">{proposal.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {proposal.suggested_date
                        ? `Suggestion ${formatEventDate(proposal.suggested_date)}`
                        : "Sans date suggérée"}
                    </p>
                  </div>
                ))}

                {(myProposals ?? []).length === 0 ? (
                  <p className="text-sm leading-7 text-zinc-400">
                    Aucune proposition envoyée pour l'instant.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <BetDrawer
        event={selectedBet?.event ?? null}
        initialOption={selectedBet?.optionLabel ?? null}
        onClose={() => setSelectedBet(null)}
        open={Boolean(selectedBet)}
      />

      <Modal
        description="Soumettez une idée de marché. Un admin pourra ensuite la configurer avec les cotes."
        onClose={() => setProposalOpen(false)}
        open={proposalOpen}
        title="Proposer un événement"
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Titre</span>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
              onChange={(event) =>
                setProposalForm((current) => ({ ...current, title: event.target.value }))
              }
              value={proposalForm.title}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Description</span>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
              onChange={(event) =>
                setProposalForm((current) => ({ ...current, description: event.target.value }))
              }
              value={proposalForm.description}
            />
          </label>

          <div className="grid gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">Date suggérée</span>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    suggested_date: event.target.value,
                  }))
                }
                type="datetime-local"
                value={proposalForm.suggested_date}
              />
            </label>
          </div>

          <Button disabled={proposalSubmitting} fullWidth onClick={() => void submitProposal()}>
            {proposalSubmitting ? "Envoi..." : "Envoyer la proposition"}
          </Button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
