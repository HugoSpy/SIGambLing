import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  COLUMN_BET_BY_ROW,
  DOZEN_BETS,
  NUMBER_COLORS,
  NUMBER_GRID_ROWS,
  OUTSIDE_BETS,
  UI_COLORS,
} from "../../lib/casino/rouletteConstants";
import { aggregateBetsByType } from "../../lib/casino/rouletteUtils";
import { cn } from "../../lib/utils";
import type { BetChipPosition, BetType, RouletteBet, RouletteNumber } from "../../types/roulette";
import { RouletteChip } from "./RouletteChip";

interface RouletteBetGridProps {
  bets: RouletteBet[];
  disabled: boolean;
  onPlaceBet: (betType: BetType, position?: BetChipPosition) => void;
}

function getNumberCellClasses(number: RouletteNumber) {
  const color = NUMBER_COLORS[number];

  if (color === "green") {
    return "bg-[linear-gradient(180deg,#0e8f4d,#0a6b3a)] border-[#35ff9a]/35 hover:border-[#8cffc0]/60";
  }

  if (color === "red") {
    return "bg-[linear-gradient(180deg,#ff2a68,#d20f4a)] border-[#ff9dba]/25 hover:border-[#ffc3d2]/60";
  }

  return "bg-[linear-gradient(180deg,#2b4253,#162532)] border-[#6e93ab]/20 hover:border-[#9fc7e0]/50";
}

function getOutsideCellClasses(type: BetType) {
  if (type === "red") {
    return "bg-[linear-gradient(180deg,#ff2a68,#d20f4a)] border-[#ff9dba]/25 hover:border-[#ffc3d2]/60";
  }

  if (type === "black") {
    return "bg-[linear-gradient(180deg,#2b4253,#162532)] border-[#6e93ab]/20 hover:border-[#9fc7e0]/50";
  }

  return "bg-white/[0.07] border-white/10 hover:border-brand-cyan/45 hover:bg-white/[0.10]";
}

export function RouletteBetGrid({
  bets,
  disabled,
  onPlaceBet,
}: RouletteBetGridProps) {
  const aggregatedBets = useMemo(() => aggregateBetsByType(bets), [bets]);

  const renderChip = (type: BetType, compact = false) => {
    const amount = aggregatedBets[type];

    if (!amount) {
      return null;
    }

    return <RouletteChip amount={amount} compact={compact} />;
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,95,61,0.32),rgba(10,33,28,0.92))] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Bet Table</p>
          <h3 className="mt-2 font-display text-2xl text-brand-text">Table européenne complète</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-brand-muted">
          {bets.length} paris actifs
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[780px] space-y-3">
          <div className="grid grid-cols-[72px_repeat(12,minmax(0,1fr))_82px] gap-1.5">
            <button
              className={cn(
                "relative row-span-3 flex min-h-[170px] items-center justify-center rounded-[18px] border text-2xl font-display font-bold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70",
                getNumberCellClasses(0),
              )}
              disabled={disabled}
              onClick={() => onPlaceBet("number_0", { row: 0, column: 0 })}
              type="button"
            >
              <span className="rotate-90">0</span>
              {renderChip("number_0")}
            </button>

            {NUMBER_GRID_ROWS.map((row, rowIndex) => (
              <motion.div
                key={`row-${rowIndex}`}
                animate={{ opacity: 1, y: 0 }}
                className="contents"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: rowIndex * 0.04, duration: 0.2 }}
              >
                {row.map((number, columnIndex) => (
                  <button
                    key={number}
                    className={cn(
                      "relative min-h-[54px] rounded-[16px] border text-lg font-display font-bold text-white transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70",
                      getNumberCellClasses(number),
                    )}
                    disabled={disabled}
                    onClick={() =>
                      onPlaceBet(`number_${number}` as BetType, {
                        row: rowIndex,
                        column: columnIndex + 1,
                      })
                    }
                    type="button"
                  >
                    {number}
                    {renderChip(`number_${number}` as BetType)}
                  </button>
                ))}

                <button
                  className="relative min-h-[54px] rounded-[16px] border border-white/10 bg-white/[0.07] px-2 text-sm font-semibold text-brand-text transition-all duration-300 hover:scale-[1.02] hover:border-brand-cyan/45 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={disabled}
                  onClick={() =>
                    onPlaceBet(COLUMN_BET_BY_ROW[rowIndex], {
                      row: rowIndex,
                      column: 13,
                    })
                  }
                  type="button"
                >
                  2 to 1
                  {renderChip(COLUMN_BET_BY_ROW[rowIndex], true)}
                </button>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DOZEN_BETS.map((bet, index) => (
              <button
                key={bet.type}
                className={cn(
                  "relative min-h-[58px] rounded-[18px] border px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-text transition-all duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70",
                  getOutsideCellClasses(bet.type),
                )}
                disabled={disabled}
                onClick={() => onPlaceBet(bet.type, { row: 3, column: index })}
                type="button"
              >
                {bet.label}
                {renderChip(bet.type)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {OUTSIDE_BETS.map((bet, index) => (
              <button
                key={bet.type}
                className={cn(
                  "relative min-h-[64px] rounded-[20px] border px-3 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70",
                  getOutsideCellClasses(bet.type),
                )}
                disabled={disabled}
                onClick={() => onPlaceBet(bet.type, { row: 4, column: index })}
                type="button"
              >
                <span>{bet.label}</span>
                <span
                  className="mt-1 block text-[10px] tracking-[0.2em]"
                  style={{ color: UI_COLORS.textGray }}
                >
                  {bet.type === "red" || bet.type === "black" ? "Color" : "Outside"}
                </span>
                {renderChip(bet.type)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
