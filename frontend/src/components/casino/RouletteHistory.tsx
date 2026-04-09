import { NUMBER_COLORS } from "../../lib/casino/rouletteConstants";
import { cn, formatTokens } from "../../lib/utils";
import type { RouletteResult } from "../../types/roulette";

interface RouletteHistoryProps {
  history: RouletteResult[];
}

export function RouletteHistory({ history }: RouletteHistoryProps) {
  const latestResult = history[0] ?? null;
  const latestColor =
    latestResult?.color === "green"
      ? "Vert"
      : latestResult?.color === "red"
        ? "Rouge"
        : latestResult
          ? "Noir"
          : null;

  return (
    <div className="min-w-0 rounded-[26px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Historique</p>
          <h3 className="mt-2 font-display text-2xl text-brand-text">Derniers numéros</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-brand-muted">
          {history.length} tour{history.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {history.length > 0 ? (
          history.slice(0, 16).map((entry) => (
            <div
              key={`${entry.timestamp}-${entry.number}`}
              className={cn(
                "flex h-12 min-w-12 flex-col items-center justify-center rounded-2xl border text-sm font-display font-bold text-white",
                entry.color === "green"
                  ? "border-emerald-300/25 bg-emerald-500"
                  : entry.color === "red"
                    ? "border-rose-300/20 bg-rose-500"
                    : "border-slate-200/15 bg-slate-700",
              )}
            >
              {entry.number}
            </div>
          ))
        ) : (
          <div className="w-full rounded-[20px] border border-dashed border-white/10 px-4 py-6 text-center text-sm text-brand-muted">
            Les premiers résultats apparaîtront ici dès le prochain tour.
          </div>
        )}
      </div>

      {latestResult ? (
        <div className="mt-5 rounded-[20px] border border-white/10 bg-black/10 p-4 text-sm">
          <p className="text-brand-muted">Dernier gain</p>
          <p className="mt-2 font-display text-2xl text-brand-text">
            {formatTokens(latestResult.totalPayout)}
          </p>
          <p className="mt-2 text-brand-muted">
            Couleur : {latestColor ?? NUMBER_COLORS[latestResult.number]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
