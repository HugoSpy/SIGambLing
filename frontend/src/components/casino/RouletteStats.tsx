import { getHotColdNumbers } from "../../lib/casino/rouletteUtils";
import { cn } from "../../lib/utils";
import type { RouletteResult } from "../../types/roulette";

interface RouletteStatsProps {
  history: RouletteResult[];
}

function NumberPill({
  label,
  value,
  count,
  variant,
}: {
  label: string;
  value: number;
  count: number;
  variant: "hot" | "cold";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-[18px] border px-4 py-3",
        variant === "hot"
          ? "border-brand-orange/30 bg-brand-orange/10"
          : "border-brand-cyan/30 bg-brand-cyan/10",
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">{label}</p>
        <p className="mt-1 font-display text-2xl text-brand-text">{value}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-brand-muted">Sorties</p>
        <p className="mt-1 text-sm font-semibold text-brand-text">{count}</p>
      </div>
    </div>
  );
}

export function RouletteStats({ history }: RouletteStatsProps) {
  const { hot, cold } = getHotColdNumbers(history);

  return (
    <div className="min-w-[300px] rounded-[26px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Tendances</p>
      <h3 className="mt-2 font-display text-2xl text-brand-text">Numéros du moment</h3>

      {history.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-dashed border-white/10 px-4 py-6 text-sm leading-7 text-brand-muted">
          Les tendances se remplissent automatiquement au fil des tours.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-brand-text">En forme</p>
            <div className="space-y-3">
              {hot.map((entry) => (
                <NumberPill
                  key={`hot-${entry.number}`}
                  count={entry.count}
                  label="En forme"
                  value={entry.number}
                  variant="hot"
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-brand-text">Discrets</p>
            <div className="space-y-3">
              {cold.map((entry) => (
                <NumberPill
                  key={`cold-${entry.number}`}
                  count={entry.count}
                  label="Discret"
                  value={entry.number}
                  variant="cold"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
