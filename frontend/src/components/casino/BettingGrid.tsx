import { useCallback, useMemo, useRef, useState } from "react";
import {
  COLUMN_BET_BY_ROW,
  DOZEN_BETS,
  NUMBER_COLORS,
  NUMBER_GRID_ROWS,
  OUTSIDE_BETS,
  SIXLINE_STARTS,
  STREET_STARTS,
} from "../../lib/casino/rouletteConstants";
import { aggregateBetsByType } from "../../lib/casino/rouletteUtils";
import { cn } from "../../lib/utils";
import type { BetType, RouletteBet, RouletteNumber } from "../../types/roulette";
import { Card } from "../ui/Card";
import { RouletteChip } from "./RouletteChip";

interface BettingGridProps {
  bets: RouletteBet[];
  disabled: boolean;
  onPlaceBet: (betType: BetType) => void;
}

interface HoverZone {
  betType: BetType;
  xPct: number; // 0–1 relative to number grid overlay
  yPct: number;
  label: string;
}

// ─── Zone detection threshold (fraction of cell width/height) ──────────────
const T = 0.26;

function makeCornerZone(r1: number, c1: number, r2: number, c2: number): HoverZone {
  const n1 = NUMBER_GRID_ROWS[r1][c1];
  const n2 = NUMBER_GRID_ROWS[r1][c2];
  const n3 = NUMBER_GRID_ROWS[r2][c1];
  const n4 = NUMBER_GRID_ROWS[r2][c2];
  const minN = Math.min(n1, n2, n3, n4);
  return {
    betType: `corner_${minN}` as BetType,
    xPct: (c1 + 1) / 12,
    yPct: (r1 + 1) / 3,
    label: `×9`,
  };
}

function computeHoverZone(mx: number, my: number, W: number, H: number): HoverZone | null {
  const col = (mx / W) * 12;
  const row = (my / H) * 3;
  const colIdx = Math.floor(col);
  const rowIdx = Math.floor(row);

  if (colIdx < 0 || colIdx > 11 || rowIdx < 0 || rowIdx > 2) return null;

  const colFrac = col - colIdx;
  const rowFrac = row - rowIdx;
  const isLeft   = colFrac < T;
  const isRight  = colFrac > 1 - T;
  const isTop    = rowFrac < T;
  const isBottom = rowFrac > 1 - T;

  // ── Corner (two edges active) ─────────────────────────────────────────
  if (isTop && isLeft && colIdx > 0 && rowIdx > 0)
    return makeCornerZone(rowIdx - 1, colIdx - 1, rowIdx, colIdx);
  if (isTop && isRight && colIdx < 11 && rowIdx > 0)
    return makeCornerZone(rowIdx - 1, colIdx, rowIdx, colIdx + 1);
  if (isBottom && isLeft && colIdx > 0 && rowIdx < 2)
    return makeCornerZone(rowIdx, colIdx - 1, rowIdx + 1, colIdx);
  if (isBottom && isRight && colIdx < 11 && rowIdx < 2)
    return makeCornerZone(rowIdx, colIdx, rowIdx + 1, colIdx + 1);

  // ── Split (single edge) ───────────────────────────────────────────────
  if (isLeft && colIdx > 0) {
    const a = NUMBER_GRID_ROWS[rowIdx][colIdx - 1];
    const b = NUMBER_GRID_ROWS[rowIdx][colIdx];
    const [mn, mx2] = a < b ? [a, b] : [b, a];
    return { betType: `split_${mn}_${mx2}` as BetType, xPct: colIdx / 12, yPct: (rowIdx + 0.5) / 3, label: "×18" };
  }
  if (isRight && colIdx < 11) {
    const a = NUMBER_GRID_ROWS[rowIdx][colIdx];
    const b = NUMBER_GRID_ROWS[rowIdx][colIdx + 1];
    const [mn, mx2] = a < b ? [a, b] : [b, a];
    return { betType: `split_${mn}_${mx2}` as BetType, xPct: (colIdx + 1) / 12, yPct: (rowIdx + 0.5) / 3, label: "×18" };
  }
  if (isTop && rowIdx > 0) {
    const a = NUMBER_GRID_ROWS[rowIdx - 1][colIdx];
    const b = NUMBER_GRID_ROWS[rowIdx][colIdx];
    const [mn, mx2] = a < b ? [a, b] : [b, a];
    return { betType: `split_${mn}_${mx2}` as BetType, xPct: (colIdx + 0.5) / 12, yPct: rowIdx / 3, label: "×18" };
  }
  if (isBottom && rowIdx < 2) {
    const a = NUMBER_GRID_ROWS[rowIdx][colIdx];
    const b = NUMBER_GRID_ROWS[rowIdx + 1][colIdx];
    const [mn, mx2] = a < b ? [a, b] : [b, a];
    return { betType: `split_${mn}_${mx2}` as BetType, xPct: (colIdx + 0.5) / 12, yPct: (rowIdx + 1) / 3, label: "×18" };
  }

  // ── Straight ──────────────────────────────────────────────────────────
  const number = NUMBER_GRID_ROWS[rowIdx][colIdx];
  return {
    betType: `number_${number}` as BetType,
    xPct: (colIdx + 0.5) / 12,
    yPct: (rowIdx + 0.5) / 3,
    label: `${number}`,
  };
}

// Position of a placed chip on the overlay (returns null for non-grid bets)
function getBetGridPosition(betType: string): { xPct: number; yPct: number } | null {
  if (betType.startsWith("number_")) {
    const n = parseInt(betType.split("_")[1]);
    if (n < 1 || n > 36) return null;
    const col = Math.floor((n - 1) / 3);
    const row = 2 - ((n - 1) % 3);
    return { xPct: (col + 0.5) / 12, yPct: (row + 0.5) / 3 };
  }
  if (betType.startsWith("split_")) {
    const parts = betType.split("_");
    const a = parseInt(parts[1]);
    const b = parseInt(parts[2]);
    const colA = Math.floor((a - 1) / 3), rowA = 2 - ((a - 1) % 3);
    const colB = Math.floor((b - 1) / 3), rowB = 2 - ((b - 1) % 3);
    return { xPct: (colA + 0.5 + colB + 0.5) / 2 / 12, yPct: (rowA + 0.5 + rowB + 0.5) / 2 / 3 };
  }
  if (betType.startsWith("corner_")) {
    const x = parseInt(betType.split("_")[1]);
    const nums = [x, x + 1, x + 3, x + 4];
    const cols = nums.map((n) => Math.floor((n - 1) / 3));
    const rows = nums.map((n) => 2 - ((n - 1) % 3));
    return { xPct: (Math.min(...cols) + 1) / 12, yPct: (Math.min(...rows) + 1) / 3 };
  }
  return null;
}

function getNumberCellClasses(number: RouletteNumber) {
  const color = NUMBER_COLORS[number];
  if (color === "green") return "bg-[linear-gradient(180deg,#0E8F4D_0%,#0B6A3B_100%)]";
  if (color === "red")   return "bg-[linear-gradient(180deg,#D92A55_0%,#A8183E_100%)]";
  return "bg-[linear-gradient(180deg,#243C4D_0%,#152532_100%)]";
}

function getOutsideCellClasses(type: BetType) {
  if (type === "red")   return "bg-[linear-gradient(180deg,#D92A55_0%,#A8183E_100%)]";
  if (type === "black") return "bg-[linear-gradient(180deg,#243C4D_0%,#152532_100%)]";
  return "bg-white/[0.07]";
}

const OUTSIDE_LABEL: Record<string, string> = {
  red: "Rouge", black: "Noir", even: "Pair", odd: "Impair",
  "1-18": "1-18", "19-36": "19-36",
  dozen_1: "1re douzaine", dozen_2: "2e douzaine", dozen_3: "3e douzaine",
  column_1: "Colonne 1", column_2: "Colonne 2", column_3: "Colonne 3",
};

// ─── Overlay component for the 3×12 number grid ───────────────────────────

function NumberGridOverlay({
  aggregatedBets,
  disabled,
  onPlaceBet,
}: {
  aggregatedBets: Record<string, number>;
  disabled: boolean;
  onPlaceBet: (betType: BetType) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hoverZone, setHoverZone] = useState<HoverZone | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !overlayRef.current) {
        setHoverZone(null);
        return;
      }
      const rect = overlayRef.current.getBoundingClientRect();
      const zone = computeHoverZone(
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height,
      );
      setHoverZone(zone);
    },
    [disabled],
  );

  const handleMouseLeave = useCallback(() => setHoverZone(null), []);

  const handleClick = useCallback(() => {
    if (disabled || !hoverZone) return;
    onPlaceBet(hoverZone.betType);
  }, [disabled, hoverZone, onPlaceBet]);

  // Placed chips for grid-based bets
  const gridChips = useMemo(() => {
    return Object.entries(aggregatedBets)
      .map(([betType, amount]) => {
        const pos = getBetGridPosition(betType);
        if (!pos) return null;
        return { betType, amount, ...pos };
      })
      .filter(Boolean) as { betType: string; amount: number; xPct: number; yPct: number }[];
  }, [aggregatedBets]);

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute inset-0 z-10",
        disabled ? "cursor-not-allowed" : "cursor-crosshair",
      )}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Hover indicator */}
      {hoverZone && !disabled && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
          style={{ left: `${hoverZone.xPct * 100}%`, top: `${hoverZone.yPct * 100}%` }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-cyan bg-brand-cyan/25 shadow-[0_0_14px_rgba(6,182,212,0.55)]">
            <span className="text-[10px] font-bold text-white">{hoverZone.label}</span>
          </div>
        </div>
      )}

      {/* Placed chips */}
      {gridChips.map(({ betType, amount, xPct, yPct }, i) => (
        <div
          key={betType}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${xPct * 100}%`, top: `${yPct * 100}%`, zIndex: 20 + i }}
        >
          <RouletteChip amount={amount} compact />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function BettingGrid({ bets, disabled, onPlaceBet }: BettingGridProps) {
  const aggregatedBets = useMemo(() => aggregateBetsByType(bets), [bets]);

  const handleZeroClick = useCallback(() => {
    if (!disabled) onPlaceBet("number_0");
  }, [disabled, onPlaceBet]);

  return (
    <Card className="min-w-[300px] overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Table des mises</p>
            <h3 className="mt-2 font-display text-2xl text-brand-text">
              Numéros, splits, corners, streets et six-lines
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-muted">
            {bets.length} mise{bets.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-3 py-4 sm:px-5">
        <div className="min-w-[860px] space-y-2">

          {/* Main grid: zero | numbers (with overlay) | column bets */}
          <div className="grid grid-cols-[80px_1fr_96px] gap-0">

            {/* Zero cell spanning 3 rows */}
            <button
              className={cn(
                "relative row-span-3 flex min-h-[192px] items-center justify-center rounded-l-[18px] border border-white/10 font-display text-2xl font-bold text-white transition-all duration-200 hover:border-brand-cyan/50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65",
                "bg-[linear-gradient(180deg,#0E8F4D_0%,#0B6A3B_100%)]",
              )}
              disabled={disabled}
              type="button"
              onClick={handleZeroClick}
            >
              <span className="rotate-90">0</span>
              {aggregatedBets["number_0"] ? (
                <RouletteChip amount={aggregatedBets["number_0"]} compact />
              ) : null}
            </button>

            {/* Number grid — visual cells + interaction overlay */}
            <div className="relative row-span-3">
              {/* Visual cells (no click) */}
              <div className="grid h-full grid-cols-12 grid-rows-3">
                {NUMBER_GRID_ROWS.flatMap((row, rowIndex) =>
                  row.map((number) => (
                    <div
                      key={number}
                      className={cn(
                        "flex min-h-[64px] items-center justify-center border border-white/[0.08] font-display text-base font-bold text-white select-none",
                        getNumberCellClasses(number),
                      )}
                    >
                      {number}
                    </div>
                  )),
                )}
              </div>

              {/* Interaction overlay */}
              <NumberGridOverlay
                aggregatedBets={aggregatedBets}
                disabled={disabled}
                onPlaceBet={onPlaceBet}
              />
            </div>

            {/* Column bets — 3 cells stacked */}
            <div className="row-span-3 flex flex-col gap-0">
              {COLUMN_BET_BY_ROW.map((colBet, i) => (
                <button
                  key={colBet}
                  className={cn(
                    "relative flex flex-1 items-center justify-center rounded-r-[18px] border border-white/10 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text transition-all duration-200 hover:border-brand-cyan/45 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-65",
                    "bg-white/[0.07]",
                    i === 0 && "rounded-tr-[18px]",
                    i === 2 && "rounded-br-[18px]",
                  )}
                  disabled={disabled}
                  type="button"
                  onClick={() => onPlaceBet(colBet)}
                >
                  2:1
                  {aggregatedBets[colBet] ? (
                    <RouletteChip amount={aggregatedBets[colBet]} compact />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Street row — 12 buttons aligned with number columns */}
          <div className="ml-[80px] mr-[96px] grid grid-cols-12 gap-0">
            {STREET_STARTS.map((streetStart, i) => {
              const betType = `street_${streetStart}` as BetType;
              const numbers = [streetStart, streetStart + 1, streetStart + 2];
              return (
                <button
                  key={streetStart}
                  className={cn(
                    "relative flex min-h-[28px] items-center justify-center border border-white/[0.08] bg-white/5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted transition-all duration-200 hover:bg-brand-cyan/15 hover:text-brand-cyan hover:border-brand-cyan/40 disabled:cursor-not-allowed disabled:opacity-65",
                    i === 0 && "rounded-bl-[12px]",
                    i === 11 && "rounded-br-[12px]",
                  )}
                  disabled={disabled}
                  title={`Street : ${numbers.join("-")} (×12)`}
                  type="button"
                  onClick={() => onPlaceBet(betType)}
                >
                  {numbers.join("-")}
                  {aggregatedBets[betType] ? (
                    <RouletteChip amount={aggregatedBets[betType]} compact />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Six-line row — 11 buttons covering adjacent streets */}
          <div className="ml-[80px] mr-[96px] grid grid-cols-11 gap-0">
            {SIXLINE_STARTS.map((sixlineStart, i) => {
              const betType = `sixline_${sixlineStart}` as BetType;
              const label = `${sixlineStart}-${sixlineStart + 5}`;
              return (
                <button
                  key={sixlineStart}
                  className={cn(
                    "relative flex min-h-[30px] items-center justify-center border border-white/[0.08] bg-white/[0.04] px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted transition-all duration-200 hover:border-brand-orange/40 hover:bg-brand-orange/10 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-65",
                    i === 0 && "rounded-bl-[12px]",
                    i === SIXLINE_STARTS.length - 1 && "rounded-br-[12px]",
                  )}
                  disabled={disabled}
                  title={`Six line : ${label} (×6)`}
                  type="button"
                  onClick={() => onPlaceBet(betType)}
                >
                  {label}
                  {aggregatedBets[betType] ? (
                    <RouletteChip amount={aggregatedBets[betType]} compact />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Dozens row */}
          <div className="grid grid-cols-3 gap-2 pt-1.5">
            {DOZEN_BETS.map((bet, i) => (
              <button
                key={bet.type}
                className={cn(
                  "relative flex min-h-[52px] items-center justify-center rounded-[16px] border border-white/10 px-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-text transition-all duration-200 hover:border-brand-cyan/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65",
                  getOutsideCellClasses(bet.type),
                  i === 0 && "bg-white/[0.07]",
                )}
                disabled={disabled}
                type="button"
                onClick={() => onPlaceBet(bet.type)}
              >
                {OUTSIDE_LABEL[bet.type]}
                {aggregatedBets[bet.type] ? (
                  <RouletteChip amount={aggregatedBets[bet.type]} compact />
                ) : null}
              </button>
            ))}
          </div>

          {/* Outside bets row */}
          <div className="grid grid-cols-6 gap-2">
            {OUTSIDE_BETS.map((bet) => (
              <button
                key={bet.type}
                className={cn(
                  "relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/10 px-2 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:border-brand-cyan/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65",
                  getOutsideCellClasses(bet.type),
                )}
                disabled={disabled}
                type="button"
                onClick={() => onPlaceBet(bet.type)}
              >
                <span>{OUTSIDE_LABEL[bet.type]}</span>
                <span className="text-[10px] font-medium tracking-[0.16em] text-brand-muted">
                  {bet.type === "red" || bet.type === "black" ? "Couleur" : "Extérieur"}
                </span>
                {aggregatedBets[bet.type] ? (
                  <RouletteChip amount={aggregatedBets[bet.type]} compact />
                ) : null}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-xs text-brand-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-cyan" />
              Centre = numéro (×36)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              Bord = split (×18)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              Coin = corner (×9)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Street = 3 numéros (×12)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-orange" />
              Six-line = 6 numéros (×6)
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
