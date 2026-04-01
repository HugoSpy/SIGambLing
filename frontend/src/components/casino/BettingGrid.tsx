import { type ReactNode, useMemo } from "react";
import {
  COLUMN_BET_BY_ROW,
  DOZEN_BETS,
  NUMBER_COLORS,
  NUMBER_GRID_ROWS,
  OUTSIDE_BETS,
} from "../../lib/casino/rouletteConstants";
import { aggregateBetsByType } from "../../lib/casino/rouletteUtils";
import { cn } from "../../lib/utils";
import type { BetChipPosition, BetType, RouletteBet, RouletteNumber } from "../../types/roulette";
import { Card } from "../ui/Card";
import { RouletteChip } from "./RouletteChip";

interface BettingGridProps {
  bets: RouletteBet[];
  disabled: boolean;
  onPlaceBet: (betType: BetType, position?: BetChipPosition) => void;
}

const OUTSIDE_LABELS: Record<BetType, string> = {
  red: "Rouge",
  black: "Noir",
  even: "Pair",
  odd: "Impair",
  "1-18": "1-18",
  "19-36": "19-36",
  dozen_1: "1re douzaine",
  dozen_2: "2e douzaine",
  dozen_3: "3e douzaine",
  column_1: "Colonne 1",
  column_2: "Colonne 2",
  column_3: "Colonne 3",
  number_0: "0",
  number_1: "1",
  number_2: "2",
  number_3: "3",
  number_4: "4",
  number_5: "5",
  number_6: "6",
  number_7: "7",
  number_8: "8",
  number_9: "9",
  number_10: "10",
  number_11: "11",
  number_12: "12",
  number_13: "13",
  number_14: "14",
  number_15: "15",
  number_16: "16",
  number_17: "17",
  number_18: "18",
  number_19: "19",
  number_20: "20",
  number_21: "21",
  number_22: "22",
  number_23: "23",
  number_24: "24",
  number_25: "25",
  number_26: "26",
  number_27: "27",
  number_28: "28",
  number_29: "29",
  number_30: "30",
  number_31: "31",
  number_32: "32",
  number_33: "33",
  number_34: "34",
  number_35: "35",
  number_36: "36",
};

function getNumberCellClasses(number: RouletteNumber) {
  const color = NUMBER_COLORS[number];

  if (color === "green") {
    return "bg-[linear-gradient(180deg,#0E8F4D_0%,#0B6A3B_100%)]";
  }

  if (color === "red") {
    return "bg-[linear-gradient(180deg,#D92A55_0%,#A8183E_100%)]";
  }

  return "bg-[linear-gradient(180deg,#243C4D_0%,#152532_100%)]";
}

function getOutsideCellClasses(type: BetType) {
  if (type === "red") {
    return "bg-[linear-gradient(180deg,#D92A55_0%,#A8183E_100%)]";
  }

  if (type === "black") {
    return "bg-[linear-gradient(180deg,#243C4D_0%,#152532_100%)]";
  }

  return "bg-white/[0.07]";
}

function TableCell({
  activeAmount,
  children,
  className,
  compactChip = false,
  disabled,
  onClick,
}: {
  activeAmount?: number;
  children: ReactNode;
  className?: string;
  compactChip?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "relative flex min-h-[60px] min-w-[40px] items-center justify-center overflow-hidden rounded-[18px] border border-white/10 px-2 py-3 text-center text-sm font-semibold text-white transition-all duration-300",
        "hover:scale-[1.05] hover:border-brand-cyan/60 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.2),0_0_22px_rgba(6,182,212,0.26)]",
        "disabled:cursor-not-allowed disabled:opacity-65",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
      {activeAmount ? <RouletteChip amount={activeAmount} compact={compactChip} /> : null}
    </button>
  );
}

export function BettingGrid({ bets, disabled, onPlaceBet }: BettingGridProps) {
  const aggregatedBets = useMemo(() => aggregateBetsByType(bets), [bets]);

  return (
    <Card className="min-w-[300px] overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Table des mises</p>
            <h3 className="mt-2 font-display text-2xl text-brand-text">
              Choisissez vos numeros et vos chances
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-muted">
            {bets.length} mise{bets.length > 1 ? "s" : ""} active{bets.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-3 py-4 sm:px-5">
        <div className="min-w-[920px] space-y-3">
          <div className="grid grid-cols-[80px_repeat(12,minmax(56px,1fr))_100px] gap-2">
            <TableCell
              activeAmount={aggregatedBets.number_0}
              className={cn(getNumberCellClasses(0), "row-span-3 min-h-[196px]")}
              disabled={disabled}
              onClick={() => onPlaceBet("number_0", { row: 0, column: 0 })}
            >
              <span className="rotate-90 font-display text-2xl font-bold">0</span>
            </TableCell>

            {NUMBER_GRID_ROWS.map((row, rowIndex) => (
              <div className="contents" key={`row-${rowIndex}`}>
                {row.map((number, columnIndex) => {
                  const type = `number_${number}` as BetType;
                  return (
                    <TableCell
                      key={number}
                      activeAmount={aggregatedBets[type]}
                      className={cn(getNumberCellClasses(number), "font-display text-lg font-bold")}
                      disabled={disabled}
                      onClick={() => onPlaceBet(type, { row: rowIndex, column: columnIndex + 1 })}
                    >
                      {number}
                    </TableCell>
                  );
                })}

                <TableCell
                  activeAmount={aggregatedBets[COLUMN_BET_BY_ROW[rowIndex]]}
                  className="bg-white/[0.07] text-xs uppercase tracking-[0.2em] text-brand-text"
                  compactChip
                  disabled={disabled}
                  onClick={() =>
                    onPlaceBet(COLUMN_BET_BY_ROW[rowIndex], {
                      row: rowIndex,
                      column: 13,
                    })
                  }
                >
                  {OUTSIDE_LABELS[COLUMN_BET_BY_ROW[rowIndex]]}
                </TableCell>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DOZEN_BETS.map((bet, index) => (
              <TableCell
                key={bet.type}
                activeAmount={aggregatedBets[bet.type]}
                className={cn(
                  getOutsideCellClasses(bet.type),
                  "min-h-[64px] text-sm uppercase tracking-[0.2em]",
                )}
                disabled={disabled}
                onClick={() => onPlaceBet(bet.type, { row: 3, column: index })}
              >
                {OUTSIDE_LABELS[bet.type]}
              </TableCell>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {OUTSIDE_BETS.map((bet, index) => (
              <TableCell
                key={bet.type}
                activeAmount={aggregatedBets[bet.type]}
                className={cn(
                  getOutsideCellClasses(bet.type),
                  "min-h-[70px] flex-col gap-1 text-sm uppercase tracking-[0.2em]",
                )}
                disabled={disabled}
                onClick={() => onPlaceBet(bet.type, { row: 4, column: index })}
              >
                <span>{OUTSIDE_LABELS[bet.type]}</span>
                <span className="text-[11px] font-medium tracking-[0.16em] text-brand-muted">
                  {bet.type === "red" || bet.type === "black" ? "Couleur" : "Exterieur"}
                </span>
              </TableCell>
            ))}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-brand-muted">
            Cliquez sur autant de cases que vous le souhaitez. Les jetons s&apos;empilent
            automatiquement sur chaque zone de la table.
          </div>
        </div>
      </div>
    </Card>
  );
}
