import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BETTING_BOARD_DIMENSIONS,
  BETTING_BOARD_LAYOUT,
  COLUMN_BET_BY_ROW,
  DOZEN_BETS,
  NUMBER_COLORS,
  NUMBER_GRID_ROWS,
  OUTSIDE_BETS,
  SIXLINE_STARTS,
  STREET_STARTS,
} from "../../lib/casino/rouletteConstants";
import {
  aggregateBetsByType,
  getBetDisplayPosition,
  getBetMultiplierLabel,
} from "../../lib/casino/rouletteUtils";
import { formatTokens } from "../../lib/utils";
import type { BetType, RouletteBet, RouletteNumber } from "../../types/roulette";
import { Card } from "../ui/Card";

interface BettingGridProps {
  bets: RouletteBet[];
  disabled: boolean;
  onPlaceBet: (betType: BetType) => void;
}

interface InteractiveZoneProps {
  betType: BetType;
  children: ReactNode;
  disabled: boolean;
  onHover: (betType: BetType | null) => void;
  onPlaceBet: (betType: BetType) => void;
}

const {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  innerWidth: BOARD_INNER_WIDTH,
  zeroX,
  zeroY,
  gridX,
  gridY,
  columnX,
  streetY,
  sixlineY,
  dozenY,
  outsideY,
} = BETTING_BOARD_DIMENSIONS;

const CELL_WIDTH = BETTING_BOARD_LAYOUT.cellWidth;
const CELL_HEIGHT = BETTING_BOARD_LAYOUT.cellHeight;
const ZERO_WIDTH = BETTING_BOARD_LAYOUT.zeroWidth;
const COLUMN_WIDTH = BETTING_BOARD_LAYOUT.columnWidth;
const STREET_HEIGHT = BETTING_BOARD_LAYOUT.streetHeight;
const SIXLINE_HEIGHT = BETTING_BOARD_LAYOUT.sixlineHeight;
const DOZEN_HEIGHT = BETTING_BOARD_LAYOUT.dozenHeight;
const OUTSIDE_HEIGHT = BETTING_BOARD_LAYOUT.outsideHeight;
const SPLIT_THICKNESS = 10;
const CORNER_SIZE = 16;

const OUTSIDE_LABEL: Record<string, string> = {
  red: "ROUGE",
  black: "NOIR",
  even: "PAIR",
  odd: "IMPAIR",
  "1-18": "1-18",
  "19-36": "19-36",
  dozen_1: "1re douzaine",
  dozen_2: "2e douzaine",
  dozen_3: "3e douzaine",
  column_1: "2:1",
  column_2: "2:1",
  column_3: "2:1",
};

function getNumberFrame(number: RouletteNumber) {
  if (number === 0) {
    return {
      x: zeroX,
      y: zeroY,
      width: ZERO_WIDTH,
      height: CELL_HEIGHT * 3,
    };
  }

  const column = Math.floor((number - 1) / 3);
  const row = 2 - ((number - 1) % 3);

  return {
    x: gridX + column * CELL_WIDTH,
    y: gridY + row * CELL_HEIGHT,
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
  };
}

function getNumberFill(number: RouletteNumber) {
  const color = NUMBER_COLORS[number];

  if (color === "green") {
    return "#0D8A45";
  }

  if (color === "red") {
    return "#C41E3A";
  }

  return "#1A1A1A";
}

function getOutsideFill(type: BetType) {
  if (type === "red") {
    return "#C41E3A";
  }

  if (type === "black") {
    return "#1A1A1A";
  }

  return "#14352E";
}

function getZonePosition(betType: BetType) {
  const position = getBetDisplayPosition(betType, "betting-board");

  if (!position) {
    return null;
  }

  return {
    x: position.xPct * BOARD_WIDTH,
    y: position.yPct * BOARD_HEIGHT,
  };
}

function makeCornerBetType(r1: number, c1: number, r2: number, c2: number): BetType {
  const numbers = [
    NUMBER_GRID_ROWS[r1][c1],
    NUMBER_GRID_ROWS[r1][c2],
    NUMBER_GRID_ROWS[r2][c1],
    NUMBER_GRID_ROWS[r2][c2],
  ];
  return `corner_${Math.min(...numbers)}` as BetType;
}

function InteractiveZone({
  betType,
  children,
  disabled,
  onHover,
  onPlaceBet,
}: InteractiveZoneProps) {
  return (
    <g
      className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onBlur={() => onHover(null)}
      onClick={() => {
        if (!disabled) {
          onPlaceBet(betType);
        }
      }}
      onFocus={() => {
        if (!disabled) {
          onHover(betType);
        }
      }}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlaceBet(betType);
        }
      }}
      onMouseEnter={() => {
        if (!disabled) {
          onHover(betType);
        }
      }}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </g>
  );
}

function ChipMarker({ amount, betType }: { amount: number; betType: BetType }) {
  const position = getZonePosition(betType);

  if (!position) {
    return null;
  }

  return (
    <motion.g
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.72 }}
      style={{ transformOrigin: `${position.x}px ${position.y}px` }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <circle cx={position.x} cy={position.y} fill="#FACC15" r="18" stroke="rgba(255,255,255,0.92)" strokeWidth="4" />
      <circle cx={position.x} cy={position.y} fill="none" r="12.5" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
      <text
        fill="#111827"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="13"
        fontWeight="700"
        textAnchor="middle"
        x={position.x}
        y={position.y + 4}
      >
        {formatTokens(amount)}
      </text>
    </motion.g>
  );
}

export function BettingGrid({ bets, disabled, onPlaceBet }: BettingGridProps) {
  const aggregatedBets = useMemo(() => aggregateBetsByType(bets), [bets]);
  const [hoveredBet, setHoveredBet] = useState<BetType | null>(null);

  const hoveredPosition = hoveredBet ? getBetDisplayPosition(hoveredBet, "betting-board") : null;

  const chipEntries = useMemo(
    () =>
      Object.entries(aggregatedBets).filter(([, amount]) => amount > 0) as [BetType, number][],
    [aggregatedBets],
  );

  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-[0.28em] text-brand-cyan">Table des mises</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-muted">
            {bets.length} mise{bets.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        {/* overflow-x-auto so the betting grid scrolls horizontally on mobile */}
        <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
          <div style={{ minWidth: BOARD_WIDTH }}>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,95,58,0.52),rgba(8,35,28,0.96))] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.26)]">
            <svg
              aria-label="Table de roulette"
              className="block h-auto w-full"
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            >
              <defs>
                <filter id="bet-hover-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" floodColor="#22D3EE" floodOpacity="0.55" stdDeviation="6" />
                </filter>
              </defs>

              <rect
                fill="rgba(5,16,13,0.35)"
                height={BOARD_HEIGHT}
                rx="24"
                width={BOARD_WIDTH}
                x="0"
                y="0"
              />

              <InteractiveZone
                betType="number_0"
                disabled={disabled}
                onHover={setHoveredBet}
                onPlaceBet={onPlaceBet}
              >
                <rect
                  fill={getNumberFill(0)}
                  filter={hoveredBet === "number_0" ? "url(#bet-hover-glow)" : undefined}
                  height={CELL_HEIGHT * 3}
                  rx="20"
                  stroke={hoveredBet === "number_0" ? "#67E8F9" : "rgba(255,255,255,0.22)"}
                  strokeWidth="2"
                  width={ZERO_WIDTH}
                  x={zeroX}
                  y={zeroY}
                />
                <text
                  fill="#FFFFFF"
                  fontFamily="'Space Grotesk', sans-serif"
                  fontSize="34"
                  fontWeight="700"
                  textAnchor="middle"
                  transform={`rotate(-90 ${zeroX + ZERO_WIDTH / 2} ${zeroY + CELL_HEIGHT * 1.5})`}
                  x={zeroX + ZERO_WIDTH / 2}
                  y={zeroY + CELL_HEIGHT * 1.5 + 12}
                >
                  0
                </text>
              </InteractiveZone>

              {NUMBER_GRID_ROWS.flatMap((row) =>
                row.map((number) => {
                  const frame = getNumberFrame(number);
                  const betType = `number_${number}` as BetType;
                  const isHovered = hoveredBet === betType;

                  return (
                    <InteractiveZone
                      betType={betType}
                      disabled={disabled}
                      key={betType}
                      onHover={setHoveredBet}
                      onPlaceBet={onPlaceBet}
                    >
                      <rect
                        fill={getNumberFill(number)}
                        filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                        height={frame.height}
                        rx="10"
                        stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.18)"}
                        strokeWidth="2"
                        width={frame.width}
                        x={frame.x}
                        y={frame.y}
                      />
                      <text
                        fill="#FFFFFF"
                        fontFamily="'Space Grotesk', sans-serif"
                        fontSize="24"
                        fontWeight="700"
                        textAnchor="middle"
                        x={frame.x + frame.width / 2}
                        y={frame.y + frame.height / 2 + 8}
                      >
                        {number}
                      </text>
                    </InteractiveZone>
                  );
                }),
              )}

              {COLUMN_BET_BY_ROW.map((betType, index) => {
                const y = gridY + index * CELL_HEIGHT;
                const isHovered = hoveredBet === betType;

                return (
                  <InteractiveZone
                    betType={betType}
                    disabled={disabled}
                    key={betType}
                    onHover={setHoveredBet}
                    onPlaceBet={onPlaceBet}
                  >
                    <rect
                      fill="#133B33"
                      filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                      height={CELL_HEIGHT}
                      rx="14"
                      stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.18)"}
                      strokeWidth="2"
                      width={COLUMN_WIDTH}
                      x={columnX}
                      y={y}
                    />
                    <text
                      fill="#E5EEF8"
                      fontFamily="Inter, sans-serif"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor="middle"
                      x={columnX + COLUMN_WIDTH / 2}
                      y={y + CELL_HEIGHT / 2 + 6}
                    >
                      {OUTSIDE_LABEL[betType]}
                    </text>
                  </InteractiveZone>
                );
              })}

              {STREET_STARTS.map((streetStart) => {
                const streetIndex = Math.floor((streetStart - 1) / 3);
                const betType = `street_${streetStart}` as BetType;
                const isHovered = hoveredBet === betType;

                return (
                  <InteractiveZone
                    betType={betType}
                    disabled={disabled}
                    key={betType}
                    onHover={setHoveredBet}
                    onPlaceBet={onPlaceBet}
                  >
                    <rect
                      fill="#11473B"
                      filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                      height={STREET_HEIGHT}
                      rx="8"
                      stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.16)"}
                      strokeWidth="2"
                      width={CELL_WIDTH}
                      x={gridX + streetIndex * CELL_WIDTH}
                      y={streetY}
                    />
                    <text
                      fill="#DCE8F6"
                      fontFamily="Inter, sans-serif"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      x={gridX + streetIndex * CELL_WIDTH + CELL_WIDTH / 2}
                      y={streetY + STREET_HEIGHT / 2 + 4}
                    >
                      {streetStart}-{streetStart + 2}
                    </text>
                  </InteractiveZone>
                );
              })}

              {SIXLINE_STARTS.map((sixlineStart) => {
                const sixlineIndex = Math.floor((sixlineStart - 1) / 3);
                const betType = `sixline_${sixlineStart}` as BetType;
                const isHovered = hoveredBet === betType;

                return (
                  <InteractiveZone
                    betType={betType}
                    disabled={disabled}
                    key={betType}
                    onHover={setHoveredBet}
                    onPlaceBet={onPlaceBet}
                  >
                    <rect
                      fill="#123F4B"
                      filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                      height={SIXLINE_HEIGHT}
                      rx="8"
                      stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.16)"}
                      strokeWidth="2"
                      width={CELL_WIDTH}
                      x={gridX + sixlineIndex * CELL_WIDTH}
                      y={sixlineY}
                    />
                    <text
                      fill="#E2ECFF"
                      fontFamily="Inter, sans-serif"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      x={gridX + sixlineIndex * CELL_WIDTH + CELL_WIDTH / 2}
                      y={sixlineY + SIXLINE_HEIGHT / 2 + 4}
                    >
                      {sixlineStart}-{sixlineStart + 5}
                    </text>
                  </InteractiveZone>
                );
              })}

              {DOZEN_BETS.map((bet, index) => {
                const width = BOARD_INNER_WIDTH / 3;
                const x = zeroX + index * width;
                const isHovered = hoveredBet === bet.type;

                return (
                  <InteractiveZone
                    betType={bet.type}
                    disabled={disabled}
                    key={bet.type}
                    onHover={setHoveredBet}
                    onPlaceBet={onPlaceBet}
                  >
                    <rect
                      fill="#123B32"
                      filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                      height={DOZEN_HEIGHT}
                      rx="14"
                      stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.18)"}
                      strokeWidth="2"
                      width={width}
                      x={x}
                      y={dozenY}
                    />
                    <text
                      fill="#FFFFFF"
                      fontFamily="'Space Grotesk', sans-serif"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor="middle"
                      x={x + width / 2}
                      y={dozenY + DOZEN_HEIGHT / 2 + 6}
                    >
                      {OUTSIDE_LABEL[bet.type]}
                    </text>
                  </InteractiveZone>
                );
              })}

              {OUTSIDE_BETS.map((bet, index) => {
                const width = BOARD_INNER_WIDTH / 6;
                const x = zeroX + index * width;
                const isHovered = hoveredBet === bet.type;

                return (
                  <InteractiveZone
                    betType={bet.type}
                    disabled={disabled}
                    key={bet.type}
                    onHover={setHoveredBet}
                    onPlaceBet={onPlaceBet}
                  >
                    <rect
                      fill={getOutsideFill(bet.type)}
                      filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                      height={OUTSIDE_HEIGHT}
                      rx="16"
                      stroke={isHovered ? "#67E8F9" : "rgba(255,255,255,0.2)"}
                      strokeWidth="2"
                      width={width}
                      x={x}
                      y={outsideY}
                    />
                    <text
                      fill="#FFFFFF"
                      fontFamily="'Space Grotesk', sans-serif"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor="middle"
                      x={x + width / 2}
                      y={outsideY + OUTSIDE_HEIGHT / 2 + 6}
                    >
                      {OUTSIDE_LABEL[bet.type]}
                    </text>
                  </InteractiveZone>
                );
              })}

              {NUMBER_GRID_ROWS.map((row, rowIndex) =>
                row.slice(0, -1).map((number, columnIndex) => {
                  const other = row[columnIndex + 1];
                  const [low, high] = number < other ? [number, other] : [other, number];
                  const betType = `split_${low}_${high}` as BetType;
                  const isHovered = hoveredBet === betType;

                  return (
                    <InteractiveZone
                      betType={betType}
                      disabled={disabled}
                      key={betType}
                      onHover={setHoveredBet}
                      onPlaceBet={onPlaceBet}
                    >
                      <rect
                        fill={isHovered ? "rgba(34,211,238,0.28)" : "rgba(255,255,255,0.001)"}
                        filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                        height={CELL_HEIGHT * 0.62}
                        rx="5"
                        stroke={isHovered ? "#67E8F9" : "none"}
                        strokeWidth="2"
                        width={SPLIT_THICKNESS}
                        x={gridX + (columnIndex + 1) * CELL_WIDTH - SPLIT_THICKNESS / 2}
                        y={gridY + rowIndex * CELL_HEIGHT + CELL_HEIGHT * 0.19}
                      />
                    </InteractiveZone>
                  );
                }),
              )}

              {NUMBER_GRID_ROWS.slice(0, -1).map((row, rowIndex) =>
                row.map((number, columnIndex) => {
                  const other = NUMBER_GRID_ROWS[rowIndex + 1][columnIndex];
                  const [low, high] = number < other ? [number, other] : [other, number];
                  const betType = `split_${low}_${high}` as BetType;
                  const isHovered = hoveredBet === betType;

                  return (
                    <InteractiveZone
                      betType={betType}
                      disabled={disabled}
                      key={`${betType}-h`}
                      onHover={setHoveredBet}
                      onPlaceBet={onPlaceBet}
                    >
                      <rect
                        fill={isHovered ? "rgba(34,211,238,0.28)" : "rgba(255,255,255,0.001)"}
                        filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                        height={SPLIT_THICKNESS}
                        rx="5"
                        stroke={isHovered ? "#67E8F9" : "none"}
                        strokeWidth="2"
                        width={CELL_WIDTH * 0.62}
                        x={gridX + columnIndex * CELL_WIDTH + CELL_WIDTH * 0.19}
                        y={gridY + (rowIndex + 1) * CELL_HEIGHT - SPLIT_THICKNESS / 2}
                      />
                    </InteractiveZone>
                  );
                }),
              )}

              {NUMBER_GRID_ROWS.slice(0, -1).map((row, rowIndex) =>
                row.slice(0, -1).map((_, columnIndex) => {
                  const betType = makeCornerBetType(
                    rowIndex,
                    columnIndex,
                    rowIndex + 1,
                    columnIndex + 1,
                  );
                  const isHovered = hoveredBet === betType;

                  return (
                    <InteractiveZone
                      betType={betType}
                      disabled={disabled}
                      key={betType}
                      onHover={setHoveredBet}
                      onPlaceBet={onPlaceBet}
                    >
                      <rect
                        fill={isHovered ? "rgba(34,211,238,0.34)" : "rgba(255,255,255,0.001)"}
                        filter={isHovered ? "url(#bet-hover-glow)" : undefined}
                        height={CORNER_SIZE}
                        rx="6"
                        stroke={isHovered ? "#67E8F9" : "none"}
                        strokeWidth="2"
                        width={CORNER_SIZE}
                        x={gridX + (columnIndex + 1) * CELL_WIDTH - CORNER_SIZE / 2}
                        y={gridY + (rowIndex + 1) * CELL_HEIGHT - CORNER_SIZE / 2}
                      />
                    </InteractiveZone>
                  );
                }),
              )}
            </svg>

            <svg className="pointer-events-none absolute inset-4" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}>
              {chipEntries.map(([betType, amount]) => (
                <ChipMarker amount={amount} betType={betType} key={betType} />
              ))}
            </svg>

            <div className="pointer-events-none absolute inset-4 z-20">
              {hoveredBet && hoveredPosition ? (
                <div
                  className="absolute -translate-x-1/2 -translate-y-[125%]"
                  style={{
                    left: `${hoveredPosition.xPct * 100}%`,
                    top: `${hoveredPosition.yPct * 100}%`,
                  }}
                >
                  <div className="rounded-full bg-[#0B63F6] px-4 py-2 text-base font-bold leading-none text-white shadow-[0_12px_24px_rgba(11,99,246,0.45)]">
                    {getBetMultiplierLabel(hoveredBet)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
