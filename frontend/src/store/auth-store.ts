import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthUser } from "../types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (payload: { user: AuthUser; accessToken: string }) => void;
  updateBalance: (balance: number) => void;
  updateOddsPreference: (acceptOddsChanges: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      status: "idle",
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
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          status: "anonymous",
        }),
    }),
    {
      name: "sigambling-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        status: state.status,
      }),
    },
  ),
);
