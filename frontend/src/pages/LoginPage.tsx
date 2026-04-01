import { motion } from "framer-motion";
import { CalendarDays, Menu, Sparkles, Trophy, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuthStore } from "../store/auth-store";

const navItems = [
  { label: "Accueil", href: "#accueil" },
  { label: "Casino", href: "#casino" },
  { label: "Classement", href: "#classement" },
  { label: "Profil", href: "#profil" },
];

function MicrosoftIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M2 2h9.5v9.5H2z" fill="currentColor" opacity="0.92" />
      <path d="M12.5 2H22v9.5h-9.5z" fill="currentColor" opacity="0.78" />
      <path d="M2 12.5h9.5V22H2z" fill="currentColor" opacity="0.78" />
      <path d="M12.5 12.5H22V22h-9.5z" fill="currentColor" />
    </svg>
  );
}

export function LoginPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const setStatus = useAuthStore((state) => state.setStatus);

  const microsoftLoginUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    return new URL("/auth/microsoft", apiBase).toString();
  }, []);

  const handleMicrosoftLogin = () => {
    setSubmitting(true);
    setStatus("loading");
    window.location.href = microsoftLoginUrl;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f212e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px]" />

      <header className="relative z-20 border-b border-white/10 bg-[#0f212e]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a className="flex items-center gap-3" href="#accueil">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#06B6D4_0%,#F59E0B_100%)] font-display text-lg font-bold text-slate-950">
              SG
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#06B6D4]">EPITA</p>
              <h1 className="font-display text-xl font-bold text-white">SIGambling</h1>
            </div>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                className="text-sm font-medium text-[#b1bad3] transition hover:text-white"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            className="hidden rounded-full border border-[#06B6D4]/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/12 md:inline-flex"
            onClick={handleMicrosoftLogin}
            type="button"
          >
            Connexion
          </button>

          <button
            aria-expanded={mobileNavOpen}
            aria-label="Ouvrir le menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#1a2c38]/80 text-white transition hover:border-[#06B6D4]/50 md:hidden"
            onClick={() => setMobileNavOpen((current) => !current)}
            type="button"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-3">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-[#1a2c38]/80 px-4 py-3 text-sm font-medium text-[#b1bad3] transition hover:border-[#06B6D4]/50 hover:text-white"
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <button
                className="rounded-2xl border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/16"
                onClick={handleMicrosoftLogin}
                type="button"
              >
                Connexion
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-81px)] max-w-[1800px] items-center px-4 py-10 sm:px-6 lg:px-8"
        id="accueil"
      >
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-xs uppercase tracking-[0.34em] text-[#06B6D4]">
              Plateforme privée de la promo
            </p>
            <h2 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-tight text-white sm:text-6xl">
              Entrez dans le salon où la promo parie, joue et grimpe au classement.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#b1bad3]">
              Une interface claire, pensée pour les étudiants EPITA, avec un accès direct à la
              roulette, au classement et au profil personnel.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <article
                className="rounded-[24px] border border-white/10 bg-[#1a2c38]/80 p-5 backdrop-blur-sm"
                id="casino"
              >
                <Sparkles className="h-5 w-5 text-[#F59E0B]" />
                <h3 className="mt-4 font-display text-xl font-semibold text-white">
                  Roulette Européenne
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#b1bad3]">
                  Une table lisible, rapide et prête pour vos mises de la soirée.
                </p>
              </article>

              <article
                className="rounded-[24px] border border-white/10 bg-[#1a2c38]/80 p-5 backdrop-blur-sm"
                id="classement"
              >
                <Trophy className="h-5 w-5 text-[#06B6D4]" />
                <h3 className="mt-4 font-display text-xl font-semibold text-white">Classement</h3>
                <p className="mt-2 text-sm leading-6 text-[#b1bad3]">
                  Suivez votre progression et gardez un œil sur la compétition de promo.
                </p>
              </article>

              <article
                className="rounded-[24px] border border-white/10 bg-[#1a2c38]/80 p-5 backdrop-blur-sm"
                id="profil"
              >
                <UserRound className="h-5 w-5 text-[#06B6D4]" />
                <h3 className="mt-4 font-display text-xl font-semibold text-white">Profil</h3>
                <p className="mt-2 text-sm leading-6 text-[#b1bad3]">
                  Ajoutez une photo, choisissez votre pseudo et gardez votre identité prête.
                </p>
              </article>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#1a2c38]/70 p-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <CalendarDays className="mt-1 h-5 w-5 text-[#06B6D4]" />
                <div>
                  <p className="text-sm font-semibold text-white">Accès simple et direct</p>
                  <p className="mt-2 text-sm leading-7 text-[#b1bad3]">
                    Une connexion Microsoft suffit pour retrouver votre solde et rejoindre la table.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.section
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[32px] border border-white/10 bg-[#1a2c38]/85 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-sm sm:p-10"
            initial={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#06B6D4_0%,#F59E0B_100%)] font-display text-lg font-bold text-slate-950">
                SG
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#06B6D4]">Connexion</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  Accéder à SIGambling
                </h3>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-[#b1bad3]">
              Rejoignez votre espace personnel, récupérez votre solde et ouvrez la roulette en
              quelques secondes.
            </p>

            <div className="mt-6 rounded-[24px] border border-[#06B6D4]/20 bg-[#0f212e]/55 p-4">
              <div className="flex items-start gap-3">
                <Trophy className="mt-0.5 h-5 w-5 text-[#06B6D4]" />
                <div>
                  <p className="text-sm font-semibold text-white">Réservé à la promo EPITA</p>
                  <p className="mt-1 text-sm leading-6 text-[#b1bad3]">
                    Seuls les comptes étudiants @epita.fr peuvent rejoindre la plateforme.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-[#0078d4] px-6 py-4 text-base font-semibold text-white transition hover:scale-[1.02] hover:bg-[#106ebe] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleMicrosoftLogin}
              type="button"
            >
              <MicrosoftIcon />
              {submitting ? "Redirection vers Microsoft..." : "Se connecter avec Microsoft"}
            </button>

            <p className="mt-4 text-center text-sm text-[#b1bad3]">
              Réservé aux étudiants EPITA (@epita.fr)
            </p>
          </motion.section>
        </div>
      </section>
    </main>
  );
}
