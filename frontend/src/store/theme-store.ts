import { create } from "zustand";
import { updateCurrentUserProfile } from "../lib/api";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: (theme?: Theme) => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

function persistTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    void updateCurrentUserProfile({ theme_preference: theme });
  }, 500);
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: "dark",

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    persistTheme(theme);
  },

  initTheme: (theme) => {
    let resolved: Theme;

    if (theme === "dark" || theme === "light") {
      resolved = theme;
    } else {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        resolved = stored;
      } else {
        resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
    }

    set({ theme: resolved });
    applyTheme(resolved);
  },
}));
