import { cn } from "../../lib/utils";
import type { HiloHistoryEntry } from "../../types/hilo";
import { HiloCard } from "./HiloCard";

interface HiloHistoryProps {
  entries: HiloHistoryEntry[];
}

export function HiloHistory({ entries }: HiloHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex items-end gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
      {entries.map((entry, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
          <HiloCard card={entry.card} size="sm" />
          <span
            className={cn(
              "text-xs font-mono font-semibold",
              entry.multiplier > 1 ? "text-emerald-400" : "text-zinc-400",
            )}
          >
            x{entry.multiplier.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
