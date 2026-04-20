import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "../components/layout/DashboardShell";
import { Button } from "../components/ui/Button";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";
import { useRobinHoodEvent } from "../hooks/useRobinHoodEvent";
import type { RobinHoodEvent } from "../hooks/useRobinHoodEvent";
import { formatTokens } from "../lib/utils";
import { notify, getErrorMessage } from "../lib/notifications";
import { api, logoutRequest } from "../lib/api";

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(target: string | null | undefined) {
  const [display, setDisplay] = useState("--:--:--");

  useEffect(() => {
    if (!target) return;
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setDisplay("00:00:00"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setDisplay(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return display;
}

// ─── Next Tuesday 00:00 ──────────────────────────────────────────────────────

function nextTuesdayMidnight(): string {
  const now = new Date();
  const day = now.getDay(); // 0=sun, 1=mon, 2=tue ...
  const daysUntilTuesday = day === 2 ? 7 : (9 - day) % 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilTuesday);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

// ─── VoteCard ─────────────────────────────────────────────────────────────────

function VoteCard({
  candidate,
  voteCount,
  totalVotes,
  isLeader,
  hasVoted,
  myVoteTarget,
  onVote,
}: {
  candidate: { id: string; pseudo: string; avatarUrl: string | null; balance: number };
  voteCount: number;
  totalVotes: number;
  isLeader: boolean;
  hasVoted: boolean;
  myVoteTarget: string | null;
  onVote: (id: string) => void;
}) {
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  const initials = candidate.pseudo.slice(0, 2).toUpperCase();
  const isMine = myVoteTarget === candidate.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] p-4 flex flex-col gap-3"
    >
      {isLeader && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
          👑 En tête
        </span>
      )}
      <div className="flex items-center gap-3">
        {candidate.avatarUrl ? (
          <img src={candidate.avatarUrl} alt={candidate.pseudo} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold text-[var(--fg-primary)]">{candidate.pseudo}</p>
          <p className="text-xs text-[var(--fg-muted)]">💰 {formatTokens(candidate.balance)}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-[var(--fg-muted)]">
          <span>{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--surface-2)]">
          <div
            className="h-2 rounded-full bg-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isMine ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 py-2 text-center text-xs font-semibold text-amber-400">
          ✓ Votre choix
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={hasVoted}
          onClick={() => onVote(candidate.id)}
          fullWidth
        >
          Voter
        </Button>
      )}
    </motion.div>
  );
}

// ─── Phase VOTE ───────────────────────────────────────────────────────────────

function VotePhase({ event }: { event: RobinHoodEvent }) {
  const countdown = useCountdown(event.voteEndAt);
  const queryClient = useQueryClient();
  const hasVoted = event.myVote !== null;
  const totalVotes = event.voteCounts.reduce((s, v) => s + v.voteCount, 0);
  const maxVoteCount = Math.max(...event.voteCounts.map((v) => v.voteCount), 0);

  const voteMutation = useMutation({
    mutationFn: async (targetId: string) => {
      await api.post("/robin-hood/vote", { targetId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["robin-hood-current"] });
      notify.success("Vote enregistré !");
    },
    onError: (err) => {
      notify.error(getErrorMessage(err));
    },
  });

  const allCandidates = event.candidates.length > 0 ? event.candidates : event.voteCounts.map((v) => ({
    id: v.userId,
    pseudo: v.pseudo,
    avatarUrl: v.avatarUrl,
    balance: v.balance,
  }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-[var(--fg-muted)] text-sm mb-1">Fermeture du vote dans</p>
        <p className="text-4xl font-bold font-mono text-amber-400">{countdown}</p>
      </div>

      {hasVoted && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-300">
          Votre vote a été pris en compte. Résultat à 10:00.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allCandidates.map((candidate) => {
          const vc = event.voteCounts.find((v) => v.userId === candidate.id);
          const count = vc?.voteCount ?? 0;
          const isLeader = count > 0 && count === maxVoteCount;
          return (
            <VoteCard
              key={candidate.id}
              candidate={candidate}
              voteCount={count}
              totalVotes={totalVotes}
              isLeader={isLeader}
              hasVoted={hasVoted}
              myVoteTarget={event.myVote}
              onVote={(id) => voteMutation.mutate(id)}
            />
          );
        })}
      </div>

      {allCandidates.length === 0 && (
        <p className="text-center text-[var(--fg-muted)]">Aucun candidat éligible pour cette semaine.</p>
      )}
    </div>
  );
}

// ─── Phase ACTIVE ─────────────────────────────────────────────────────────────

function ActivePhase({ event }: { event: RobinHoodEvent }) {
  const countdown = useCountdown(event.eventEndAt);
  const poolPct = event.initialPool > 0 ? Math.max(0, (event.currentPool / event.initialPool) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-[var(--fg-muted)] text-sm mb-1">Fin de l'événement dans</p>
        <p className="text-4xl font-bold font-mono text-red-400">{countdown}</p>
      </div>

      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
        <p className="text-[var(--fg-muted)] text-sm">Cagnotte Robin des Slots</p>
        <p className="text-5xl font-bold text-red-400">{formatTokens(event.currentPool)}</p>
        <div className="h-3 w-full rounded-full bg-[var(--surface-2)]">
          <div
            className="h-3 rounded-full bg-red-500 transition-all duration-700"
            style={{ width: `${poolPct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--fg-muted)]">Initial : {formatTokens(event.initialPool)}</p>
      </div>

      <div className="rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] p-4">
        <p className="font-semibold text-[var(--fg-primary)] mb-3">🎯 Victim{event.victims.length > 1 ? "es" : "e"} désignée{event.victims.length > 1 ? "s" : ""}</p>
        <div className="space-y-2">
          {event.victims.map((v) => (
            <div key={v.userId} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
              <span className="text-sm font-medium text-[var(--fg-primary)]">{v.pseudo}</span>
              <span className="text-xs text-[var(--fg-muted)]">-{formatTokens(v.amountTaken)} prélevés</span>
            </div>
          ))}
        </div>
      </div>

      <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-300">
        ✨ Les jeux casino ont une espérance de 1 aujourd'hui. Profitez-en !
      </p>
    </div>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────

function HistorySection() {
  const [history, setHistory] = useState<Array<{
    id: string;
    createdAt: string;
    initialPool: number;
    victims: Array<{ user: { pseudo: string }; amountReturned: number | null }>;
  }>>([]);

  useEffect(() => {
    api.get<typeof history>("/robin-hood/history").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] p-4">
      <p className="font-semibold text-[var(--fg-primary)] mb-3">Historique</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-[var(--fg-secondary)]">
          <thead>
            <tr className="border-b border-[var(--ink-700)] text-xs text-[var(--fg-muted)] uppercase">
              <th className="pb-2 text-left">Date</th>
              <th className="pb-2 text-left">Victime(s)</th>
              <th className="pb-2 text-right">Pool initial</th>
              <th className="pb-2 text-right">Restitué</th>
            </tr>
          </thead>
          <tbody>
            {history.map((e) => (
              <tr key={e.id} className="border-b border-[var(--ink-700)]/40">
                <td className="py-2">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="py-2">{e.victims.map((v) => v.user.pseudo).join(", ")}</td>
                <td className="py-2 text-right">{formatTokens(e.initialPool)}</td>
                <td className="py-2 text-right">
                  {e.victims.map((v) => v.amountReturned ?? 0).reduce((a, b) => a + b, 0) > 0
                    ? formatTokens(e.victims.map((v) => v.amountReturned ?? 0).reduce((a, b) => a + b, 0))
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Info Modal ───────────────────────────────────────────────────────────────

const INFO_SECTIONS = [
  {
    title: "Le principe",
    icon: "🏹",
    text: "Chaque mardi à 00:00, un vote s'ouvre pour désigner la victime de la semaine. La victime perd 1 000 000 tokens qui alimentent la cagnotte Robin des Slots.",
  },
  {
    title: "Le vote",
    icon: "🗳️",
    text: "Tous les joueurs votent jusqu'à 10:00. En cas d'égalité au sommet, toutes les victimes à égalité sont désignées. Sans votes, une victime est tirée au sort parmi les éligibles.",
  },
  {
    title: "L'événement (10:00 → 23:59)",
    icon: "🎰",
    text: "Pendant toute la durée de l'événement, tous les jeux casino passent à RTP 100% : les gains sont prélevés directement sur la cagnotte Robin des Slots.",
  },
  {
    title: "La fin",
    icon: "⏰",
    text: "À 23:59, l'événement se clôture. Les tokens restants dans la cagnotte sont restitués à la (aux) victime(s). Si la cagnotte tombe à 0 avant, l'événement se clôture automatiquement.",
  },
  {
    title: "La victime",
    icon: "🚫",
    text: "La victime est bannie de tous les jeux casino pendant toute la durée de l'événement. Elle ne peut ni jouer ni miser jusqu'à la clôture.",
  },
];

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="relative w-full max-w-lg rounded-2xl border border-amber-400/30 bg-[var(--surface-1)] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)] transition-colors"
          >
            ✕
          </button>

          <div className="mb-5 text-center">
            <span className="text-3xl">🏹</span>
            <h2 className="mt-2 text-xl font-bold text-amber-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Comment fonctionne Robin des Slots ?
            </h2>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {INFO_SECTIONS.map((s) => (
              <div key={s.title} className="rounded-xl border border-[var(--ink-700)] bg-[var(--surface-2)] p-4">
                <p className="mb-1 flex items-center gap-2 font-semibold text-[var(--fg-primary)]">
                  <span>{s.icon}</span>
                  {s.title}
                </p>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RobinHoodPage() {
  const { data: user } = useAuthenticatedUser();
  const { data: event, isLoading } = useRobinHoodEvent();
  const nextTuesday = nextTuesdayMidnight();
  const nextCountdown = useCountdown(nextTuesday);
  const [showInfo, setShowInfo] = useState(false);

  const handleLogout = async () => {
    await logoutRequest();
  };

  if (isLoading || !user) {
    return <LoadingScreen label="Chargement Robin des Slots..." />;
  }

  const status = event?.status ?? null;

  const tagline =
    status === "VOTE" ? "Qui sera dépouillé ce mardi ?" :
    status === "ACTIVE" ? "L'heure de la redistribution a sonné." :
    "Préparez-vous pour le prochain Robin des Slots.";

  return (
    <DashboardShell user={user} onLogout={handleLogout}>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-4xl font-bold text-[var(--fg-primary)] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            🏹 Robin des Slots
          </h1>
          <p className="text-[var(--fg-muted)]">{tagline}</p>
        </div>

        {/* Golden particles background (CSS only) */}
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { transform: translateY(-80px) rotate(360deg); opacity: 0; }
          }
          .robin-particle {
            position: fixed;
            pointer-events: none;
            z-index: 0;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #f59e0b;
            animation: float-particle 4s ease-in infinite;
          }
        `}</style>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="robin-particle"
            style={{
              left: `${10 + i * 12}%`,
              bottom: "10%",
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}

        {/* Content by phase */}
        {status === "VOTE" && event && <VotePhase event={event} />}
        {status === "ACTIVE" && event && <ActivePhase event={event} />}
        {(!status || status === "COMPLETED" || status === "SKIPPED") && (
          <div className="rounded-xl border border-[var(--ink-700)] bg-[var(--surface-1)] p-8 text-center space-y-3">
            <p className="text-2xl font-bold text-[var(--fg-primary)]">Aucun événement actif</p>
            {event?.status === "COMPLETED" && event.victims.length > 0 && (
              <p className="text-[var(--fg-muted)] text-sm">
                Dernier Robin des Slots : victime{event.victims.length > 1 ? "s" : ""}{" "}
                {event.victims.map((v) => v.pseudo).join(", ")} •{" "}
                {formatTokens(event.victims.reduce((s, v) => s + (v.amountReturned ?? 0), 0))} restitués
              </p>
            )}
            <p className="text-sm text-[var(--fg-muted)]">Prochain Robin des Slots dans</p>
            <p className="text-3xl font-bold font-mono text-amber-400">{nextCountdown}</p>
          </div>
        )}

        <HistorySection />
      </div>

      {/* Floating info button */}
      <button
        onClick={() => setShowInfo(true)}
        className="fixed bottom-24 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-black text-xl font-bold shadow-lg hover:bg-amber-400 transition-colors"
        aria-label="Explication Robin des Slots"
      >
        ?
      </button>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </DashboardShell>
  );
}
