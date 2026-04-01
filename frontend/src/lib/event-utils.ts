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
    return "∞";
  }

  return `x${odds.toFixed(2)}`;
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
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "RESOLVED") {
    return "border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyanSoft";
  }

  if (status === "CANCELLED") {
    return "border-red-400/35 bg-red-400/10 text-red-200";
  }

  return "border-brand-orange/35 bg-brand-orange/10 text-brand-orangeSoft";
}
