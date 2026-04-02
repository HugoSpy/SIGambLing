import { create } from "zustand";
import type { EventCategory, EventOptionView, EventView } from "../types/event";

export type BetCartMode = "simple" | "parlay";

export interface BetCartSelection {
  eventId: string;
  eventTitle: string;
  category: EventCategory;
  optionLabel: string;
  odds: number;
  minBet: number;
  maxBet: number | null;
  closingAt: string | null;
  simpleStake: number;
}

interface BetCartState {
  open: boolean;
  mode: BetCartMode;
  parlayStake: number;
  selections: BetCartSelection[];
  setOpen: (open: boolean) => void;
  setMode: (mode: BetCartMode) => void;
  setParlayStake: (stake: number) => void;
  setSimpleStake: (eventId: string, stake: number) => void;
  addSelection: (event: EventView, option: EventOptionView) => void;
  removeSelection: (eventId: string) => void;
  clear: () => void;
}

export const useBetCartStore = create<BetCartState>((set) => ({
  open: false,
  mode: "simple",
  parlayStake: 5,
  selections: [],
  setOpen: (open) => set({ open }),
  setMode: (mode) => set({ mode }),
  setParlayStake: (parlayStake) => set({ parlayStake }),
  setSimpleStake: (eventId, simpleStake) =>
    set((state) => ({
      selections: state.selections.map((selection) =>
        selection.eventId === eventId ? { ...selection, simpleStake } : selection,
      ),
    })),
  addSelection: (event, option) =>
    set((state) => {
      const existing = state.selections.find((selection) => selection.eventId === event.id);
      const nextSelection: BetCartSelection = {
        eventId: event.id,
        eventTitle: event.title,
        category: event.category,
        optionLabel: option.label,
        odds: option.current_odds,
        minBet: event.min_bet,
        maxBet: event.max_bet,
        closingAt: event.closing_at,
        simpleStake: existing?.simpleStake ?? event.min_bet,
      };

      const remainingSelections = state.selections.filter(
        (selection) => selection.eventId !== event.id,
      );

      return {
        open: true,
        selections: [...remainingSelections, nextSelection],
      };
    }),
  removeSelection: (eventId) =>
    set((state) => ({
      selections: state.selections.filter((selection) => selection.eventId !== eventId),
    })),
  clear: () =>
    set({
      selections: [],
      parlayStake: 5,
      mode: "simple",
      open: false,
    }),
}));
