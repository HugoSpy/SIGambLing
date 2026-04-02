import type { EventBetStatus, EventCategory, EventStatus } from "../types/event";

const categoryLabels: Record<EventCategory, string> = {
  sports: "Sports",
  politics: "Politics",
  culture: "Culture",
  epita: "EPITA",
};

const statusLabels: Record<EventStatus, string> = {
  OPEN: "Ouvert",
  CLOSED: "Clos",
  RESOLVED: "Resolu",
  CANCELLED: "Annule",
};

const betStatusLabels: Record<EventBetStatus, string> = {
  PENDING: "En cours",
  WON: "Gagne",
  LOST: "Perdu",
  CANCELLED: "Rembourse",
};

export function formatEventCategory(category: EventCategory) {
  return categoryLabels[category];
}

export function formatEventStatus(status: EventStatus) {
  return statusLabels[status];
}

export function formatEventBetStatus(status: EventBetStatus) {
  return betStatusLabels[status];
}

export function formatEventOdds(odds: number | null) {
  if (odds == null || !Number.isFinite(odds)) {
    return "--";
  }

  return `${odds.toFixed(2)}x`;
}

export function formatEventDate(value: string | null) {
  if (!value) {
    return "Aucune date";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusTone(status: EventStatus) {
  if (status === "OPEN") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "RESOLVED") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (status === "CANCELLED") {
    return "border-red-400/35 bg-red-400/10 text-red-200";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-200";
}
