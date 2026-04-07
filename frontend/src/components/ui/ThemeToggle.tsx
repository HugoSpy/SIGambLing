import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/theme-store";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="interactive-hover inline-flex h-11 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.18)] enabled:hover:border-zinc-700 enabled:hover:bg-zinc-800"
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <div className="relative h-5 w-9 flex-shrink-0 rounded-full border border-zinc-700 bg-zinc-800">
        <motion.div
          animate={{ x: isDark ? 2 : 18 }}
          className="absolute top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-sm"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <motion.span
            animate={{ opacity: 1 }}
            className="flex items-center justify-center"
            initial={{ opacity: 0 }}
            key={theme}
            transition={{ duration: 0.15 }}
          >
            {isDark ? (
              <Moon className="h-2.5 w-2.5 text-zinc-900" />
            ) : (
              <Sun className="h-2.5 w-2.5 text-zinc-900" />
            )}
          </motion.span>
        </motion.div>
      </div>
      <span className="text-zinc-400">{isDark ? "Mode sombre" : "Mode clair"}</span>
    </button>
  );
}
