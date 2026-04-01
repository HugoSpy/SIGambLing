export const EVENT_CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "sports", label: "Sports" },
  { id: "politics", label: "Politique" },
  { id: "culture", label: "Culture" },
  { id: "esports", label: "Esports" },
  { id: "finance", label: "Finance" },
  { id: "other", label: "Autre" },
];

export const ROULETTE_OPTIONS = [
  { selectionType: "color", selectionValue: "red", label: "Rouge", odds: "1:1" },
  { selectionType: "color", selectionValue: "black", label: "Noir", odds: "1:1" },
  { selectionType: "parity", selectionValue: "even", label: "Pair", odds: "1:1" },
  { selectionType: "parity", selectionValue: "odd", label: "Impair", odds: "1:1" },
  { selectionType: "half", selectionValue: "low", label: "1 - 18", odds: "1:1" },
  { selectionType: "half", selectionValue: "high", label: "19 - 36", odds: "1:1" },
  { selectionType: "dozen", selectionValue: "1", label: "1re douzaine", odds: "2:1" },
  { selectionType: "dozen", selectionValue: "2", label: "2e douzaine", odds: "2:1" },
  { selectionType: "dozen", selectionValue: "3", label: "3e douzaine", odds: "2:1" },
  { selectionType: "straight", selectionValue: "17", label: "Numero 17", odds: "35:1" },
];

export function formatDate(input) {
  if (!input) {
    return "Sans date";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

