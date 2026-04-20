import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRobinHoodEvent } from "../../hooks/useRobinHoodEvent";
import { formatTokens } from "../../lib/utils";
import type { } from "react"; // keep React import path aligned

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

export function RobinHoodBanner() {
  const { data: event } = useRobinHoodEvent();

  const voteCountdown = useCountdown(event?.status === "VOTE" ? event.voteEndAt : null);
  const activeCountdown = useCountdown(event?.status === "ACTIVE" ? event.eventEndAt : null);

  if (!event || (event.status !== "VOTE" && event.status !== "ACTIVE")) return null;

  const isVote = event.status === "VOTE";
  const candidateCount = event.candidates.length || event.voteCounts.length;

  return (
    <div className="sticky top-[57px] z-20 w-full bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <span>🏹</span>
          {isVote ? (
            <span>
              Robin de Vegas — Vote en cours !{" "}
              <span className="opacity-80">{candidateCount} candidat{candidateCount !== 1 ? "s" : ""}</span>{" "}
              • Fermeture dans{" "}
              <span className="font-mono font-bold">{voteCountdown}</span>
            </span>
          ) : (
            <span>
              Robin de Vegas ACTIF — Cagnotte :{" "}
              <span className="font-bold">{formatTokens(event.currentPool)}</span>{" "}
              • Fin dans{" "}
              <span className="font-mono font-bold">{activeCountdown}</span>
            </span>
          )}
        </div>
        <Link
          to="/robin-hood"
          className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30 transition-colors"
        >
          {isVote ? "Voter →" : "Voir →"}
        </Link>
      </div>
    </div>
  );
}
