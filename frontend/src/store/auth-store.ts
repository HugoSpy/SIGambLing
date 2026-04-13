import { create } from "zustand";
import type { AuthUser } from "../types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

export interface FeatureFlags {
  rouletteDisabled: boolean;
  blackjackDisabled: boolean;
  eventsDisabled: boolean;
  minesDisabled: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  maintenanceMode: boolean;
  rouletteDisabled: boolean;
  blackjackDisabled: boolean;
  eventsDisabled: boolean;
  minesDisabled: boolean;
  setStatus: (status: AuthStatus) => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (payload: { user: AuthUser; accessToken: string }) => void;
  updateBalance: (balance: number) => void;
  updateOddsPreference: (acceptOddsChanges: boolean) => void;
  setMaintenanceMode: (enabled: boolean) => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
  clearSession: () => void;
}

const LEGACY_AUTH_STORAGE_KEYS = ["sigambling-auth", "sig_token", "sig_user"] as const;

export function purgeLegacyAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  for (const storageKey of LEGACY_AUTH_STORAGE_KEYS) {
    window.localStorage.removeItem(storageKey);
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  status: "idle",
  maintenanceMode: false,
  rouletteDisabled: false,
  blackjackDisabled: false,
  eventsDisabled: false,
  minesDisabled: false,
  setStatus: (status) => set({ status }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setSession: ({ user, accessToken }) =>
    set({
      user,
      accessToken,
      status: "authenticated",
    }),
  updateBalance: (balance) =>
    set((state) => ({
      user: state.user ? { ...state.user, balance } : null,
    })),
  updateOddsPreference: (acceptOddsChanges) =>
    set((state) => ({
      user: state.user ? { ...state.user, accept_odds_changes: acceptOddsChanges } : null,
    })),
  setMaintenanceMode: (enabled) => set({ maintenanceMode: enabled }),
  setFeatureFlags: (flags) => set(flags),
  clearSession: () => set({ user: null, accessToken: null, status: "anonymous" }),
}));
