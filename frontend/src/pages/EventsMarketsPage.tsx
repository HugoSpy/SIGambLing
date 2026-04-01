import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { BetDrawer } from "../components/BetDrawer";
import { EventCard } from "../components/EventCard";
import { DashboardShell } from "../components/layout/DashboardShell";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { Card } from "../components/ui/Card";
import { fetchEvents, fetchMyEventBets, logoutRequest } from "../lib/api";
import { formatEventCategory } from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import type { EventCategory, EventView } from "../types/event";

const categoryOptions: Array<{ value: "all" | EventCategory; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "epita", label: "EPITA" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics" },
  { value: "culture", label: "Culture" },
];

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

export function EventsPage() {
  const { data: user } = useAuthenticatedUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | EventCategory>("all");
  const [selectedEvent, setSelectedEvent] = useState<EventView | null>(null);

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

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");

    return (events ?? []).filter((event) => {
      if (category !== "all" && event.category !== category) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${event.title} ${event.description ?? ""} ${formatEventCategory(event.category)}`;
      return haystack.toLocaleLowerCase("fr-FR").includes(normalizedSearch);
    });
  }, [category, events, search]);

  if (!user || eventsLoading) {
    return <LoadingScreen label="Chargement des evenements..." />;
  }

  const handleLogout = async () => {
    await logoutRequest();
    toast.success("Session fermee.");
  };

  const activePositions = myBets?.filter((bet) => bet.status === "PENDING").length ?? 0;
  const totalExposure = myBets?.reduce((sum, bet) => sum + bet.amount, 0) ?? 0;

  return (
    <DashboardShell onLogout={handleLogout} user={user}>
      <div className="space-y-6">
        <Card accent="cyan" className="min-w-[300px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Evenements</p>
          <h1 className="mt-3 font-display text-4xl text-brand-text">Marches de prediction</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-brand-muted">
            Les cotes evoluent avec la repartition de la pool. Prenez une position, suivez vos
            marches ouverts et laissez la promo arbitrer le reste.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="min-w-[300px]">
            <TrendingUp className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">
              Positions ouvertes
            </p>
            <p className="mt-2 font-display text-3xl text-brand-text">{activePositions}</p>
          </Card>

          <Card className="min-w-[300px]">
            <Filter className="h-5 w-5 text-brand-orange" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">
              Exposition totale
            </p>
            <p className="mt-2 font-display text-3xl text-brand-text">
              {formatTokens(totalExposure)} tokens
            </p>
          </Card>

          <Card className="min-w-[300px]">
            <Search className="h-5 w-5 text-brand-cyan" />
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-brand-muted">Marches dispo</p>
            <p className="mt-2 font-display text-3xl text-brand-text">{filteredEvents.length}</p>
          </Card>
        </div>

        <Card className="min-w-[300px]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-text">Recherche</span>
              <div className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white/5 px-4 py-3">
                <Search className="h-4 w-4 text-brand-muted" />
                <input
                  className="w-full bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-muted"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Titre, categorie ou description"
                  value={search}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-text">Categorie</span>
              <select
                className="w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 focus:border-brand-cyan/50 focus:bg-white/10"
                onChange={(event) => setCategory(event.target.value as "all" | EventCategory)}
                value={category}
              >
                {categoryOptions.map((option) => (
                  <option className="bg-[#0f212e]" key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {eventsError ? (
          <Card className="min-w-[300px]">
            <p className="text-sm leading-7 text-red-200">{toErrorMessage(eventsError)}</p>
          </Card>
        ) : null}

        {filteredEvents.length === 0 ? (
          <Card className="min-w-[300px]">
            <p className="text-sm leading-7 text-brand-muted">
              Aucun evenement ouvert ne correspond a vos filtres.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventCard event={event} key={event.id} onBet={setSelectedEvent} />
            ))}
          </div>
        )}
      </div>

      <BetDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        open={Boolean(selectedEvent)}
      />
    </DashboardShell>
  );
}
