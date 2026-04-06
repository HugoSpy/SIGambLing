import { motion } from "framer-motion";
import { BarChart3, Dice1, Shield, TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublicStats, type PublicStats } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 23 23" fill="none">
      <path fill="#f25022" d="M0 0h11v11H0z" />
      <path fill="#00a4ef" d="M12 0h11v11H12z" />
      <path fill="#7fba00" d="M0 12h11v11H0z" />
      <path fill="#ffb900" d="M12 12h11v11H12z" />
    </svg>
  );
}

const features = [
  {
    icon: BarChart3,
    title: "Événements",
    description: "Pariez sur des événements réels avec des cotes en temps réel",
    color: "emerald" as const,
  },
  {
    icon: Dice1,
    title: "Casino",
    description: "Roulette et Blackjack avec des tokens virtuels",
    color: "purple" as const,
  },
  {
    icon: Trophy,
    title: "Classement",
    description: "Compétition amicale avec vos camarades étudiants",
    color: "blue" as const,
  },
  {
    icon: Users,
    title: "Communauté",
    description: "60 étudiants actifs dans votre communauté privée",
    color: "orange" as const,
  },
] as const;

const colorMap = {
  emerald: {
    card: "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    icon: "bg-emerald-500/20",
    text: "text-emerald-500",
  },
  purple: {
    card: "bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20",
    icon: "bg-purple-500/20",
    text: "text-purple-500",
  },
  blue: {
    card: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20",
    icon: "bg-blue-500/20",
    text: "text-blue-500",
  },
  orange: {
    card: "bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20",
    icon: "bg-orange-500/20",
    text: "text-orange-500",
  },
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

export function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    fetchPublicStats().then(setPublicStats).catch(() => {});
  }, []);

  const handleMicrosoftLogin = () => {
    setSubmitting(true);
    setStatus("loading");
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    window.location.href = new URL("/auth/microsoft", apiBase).toString();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="size-5 text-white" />
              </div>
              <span className="text-xl font-bold text-zinc-100">SIGambling</span>
            </div>
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={submitting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium transition-colors border border-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Se connecter
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — hero content */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Plateforme exclusive pour étudiants
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-zinc-100 mb-4">
                Pariez sur
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-400">
                  l'avenir
                </span>
              </h1>

              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Rejoignez une communauté de 60 étudiants qui parient sur des événements réels et
                tentent leur chance au casino virtuel.
              </p>

              {/* Microsoft CTA */}
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={submitting}
                className="group relative w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-50 text-zinc-900 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <MicrosoftLogo />
                {submitting ? "Redirection vers Microsoft…" : "Se connecter avec Microsoft"}
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <p className="text-sm text-zinc-500 mt-4">
                Connexion sécurisée via votre compte Microsoft étudiant
              </p>
            </motion.div>

            {/* Right — 2×2 feature grid */}
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              {features.map(({ icon: Icon, title, description, color }) => {
                const c = colorMap[color];
                return (
                  <div key={title} className={`${c.card} border rounded-xl p-6`}>
                    <div
                      className={`w-12 h-12 ${c.icon} rounded-lg flex items-center justify-center mb-4`}
                    >
                      <Icon className={`size-6 ${c.text}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
                    <p className="text-sm text-zinc-400">{description}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-12 border-t border-zinc-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            {[
              {
                value: publicStats ? `${publicStats.totalUsers}+` : "—",
                label: "Utilisateurs actifs",
              },
              {
                value: publicStats ? formatTokens(publicStats.totalTokens) : "—",
                label: "Tokens en circulation",
              },
              {
                value: publicStats ? `${publicStats.totalBets.toLocaleString("fr-FR")}+` : "—",
                label: "Paris placés",
              },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-emerald-500 mb-1">{value}</div>
                <div className="text-sm text-zinc-500">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <span>Plateforme sécurisée réservée aux étudiants</span>
            </div>
            <div>© 2026 SIGambling. Tous droits réservés.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
