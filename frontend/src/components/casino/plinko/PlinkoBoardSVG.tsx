import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { formatMultiplier } from "../../../lib/plinkoMultipliers";

export interface ActiveBall {
  id: string;
  path: boolean[];
  slotIndex: number;
}

interface Props {
  rows: number;
  multipliers: number[];
  balls: ActiveBall[];
  onBallComplete: (ballId: string) => void;
  onPinBounce?: () => void;
}

const W = 500;
const TOP_PAD = 52;
const ROW_H = 40;
const SLOT_H = 38;
const SIDE_PAD = 15;

function S(rows: number) {
  return (W - 2 * SIDE_PAD) / (rows + 1);
}

function pegX(rows: number, row: number, col: number) {
  return W / 2 + (col - row / 2) * S(rows);
}

function pegY(row: number) {
  return TOP_PAD + row * ROW_H;
}

function slotCx(rows: number, slot: number) {
  return W / 2 + (slot - rows / 2) * S(rows);
}

function slotY(rows: number) {
  return TOP_PAD + rows * ROW_H + 10;
}

function slotBg(mult: number): string {
  if (mult >= 100) return "rgba(0,231,1,0.9)";
  if (mult >= 20)  return "rgba(34,197,94,0.85)";
  if (mult >= 5)   return "rgba(163,230,53,0.8)";
  if (mult >= 2)   return "rgba(132,204,22,0.7)";
  if (mult >= 1)   return "rgba(113,113,122,0.6)";
  return "rgba(239,68,68,0.7)";
}

function slotTextColor(mult: number): string {
  if (mult >= 1) return "#fff";
  return "#fca5a5";
}

// One per active ball — manages its own step counter and reports landing / completion
function SingleBallAnimator({
  rows,
  ball,
  onLanding,
  onComplete,
  onBounce,
}: {
  rows: number;
  ball: ActiveBall;
  onLanding: (id: string, slotIndex: number) => void;
  onComplete: (id: string) => void;
  onBounce?: () => void;
}) {
  const [animStep, setAnimStep] = useState(0);
  const hasLandedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const onLandingRef = useRef(onLanding);
  const onCompleteRef = useRef(onComplete);
  const onBounceRef = useRef(onBounce);

  useEffect(() => { onLandingRef.current = onLanding; }, [onLanding]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onBounceRef.current = onBounce; }, [onBounce]);

  useEffect(() => {
    if (animStep < rows) {
      onBounceRef.current?.();
      const t = setTimeout(() => setAnimStep((s) => s + 1), 150);
      return () => clearTimeout(t);
    } else {
      if (!hasLandedRef.current) {
        hasLandedRef.current = true;
        onLandingRef.current(ball.id, ball.slotIndex);
      }
      const t = setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current(ball.id);
        }
      }, 500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animStep, rows]);

  let col = 0;
  for (let r = 0; r < Math.min(animStep, rows); r++) {
    if (ball.path[r]) col++;
  }

  const cx = animStep < rows
    ? pegX(rows, animStep, col)
    : slotCx(rows, ball.slotIndex);
  const cy = animStep < rows
    ? pegY(animStep)
    : slotY(rows) + SLOT_H / 2;

  return (
    <motion.circle
      r={7}
      fill="#00e701"
      animate={{ cx, cy }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      initial={{ cx: W / 2, cy: TOP_PAD - 20 }}
      style={{ filter: "drop-shadow(0 0 6px rgba(0,231,1,0.9))" }}
    />
  );
}

export function PlinkoBoardSVG({
  rows,
  multipliers,
  balls,
  onBallComplete,
  onPinBounce,
}: Props) {
  const H = TOP_PAD + rows * ROW_H + SLOT_H + 14;
  const s = S(rows);
  const slotW = Math.max(s - 4, 4);
  const fontSize = Math.max(7, Math.min(10, s * 0.36));

  // Track which balls are currently in their landing slot (for glow)
  const [landingBalls, setLandingBalls] = useState<Map<string, number>>(new Map());

  const handleLanding = useCallback((id: string, slotIndex: number) => {
    setLandingBalls((prev) => new Map([...prev, [id, slotIndex]]));
  }, []);

  const handleComplete = useCallback((id: string) => {
    setLandingBalls((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    onBallComplete(id);
  }, [onBallComplete]);

  const activeSlots = new Set(landingBalls.values());

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto" }}
    >
      {/* Background */}
      <rect width={W} height={H} fill="#0f1923" rx={12} />

      {/* Entry arrow */}
      <polygon
        points={`${W / 2},${TOP_PAD - 28} ${W / 2 - 6},${TOP_PAD - 16} ${W / 2 + 6},${TOP_PAD - 16}`}
        fill="rgba(0,231,1,0.3)"
      />

      {/* Pins */}
      {Array.from({ length: rows + 1 }, (_, r) =>
        Array.from({ length: r + 1 }, (_, c) => {
          const x = pegX(rows, r, c);
          const y = pegY(r);
          return (
            <circle
              key={`${r}-${c}`}
              cx={x} cy={y} r={4}
              fill="#2d4a5a"
            />
          );
        })
      )}

      {/* Slots */}
      {multipliers.map((mult, j) => {
        const cx = slotCx(rows, j);
        const y = slotY(rows);
        const isActive = activeSlots.has(j);
        return (
          <g key={j}>
            <rect
              x={cx - slotW / 2} y={y}
              width={slotW} height={SLOT_H - 2}
              rx={4}
              fill={slotBg(mult)}
              opacity={isActive ? 1 : 0.35}
            />
            {isActive && (
              <rect
                x={cx - slotW / 2 - 1} y={y - 1}
                width={slotW + 2} height={SLOT_H}
                rx={5}
                fill="none"
                stroke="#00e701"
                strokeWidth={1.5}
                opacity={0.9}
              >
                <animate
                  attributeName="opacity"
                  values="0.9;0.3;0.9"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </rect>
            )}
            <text
              x={cx}
              y={y + SLOT_H / 2 - 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill={isActive ? "#fff" : slotTextColor(mult)}
              style={{ fontFamily: "monospace" }}
            >
              {formatMultiplier(mult)}
            </text>
          </g>
        );
      })}

      {/* One animator per active ball */}
      {balls.map((ball) => (
        <SingleBallAnimator
          key={ball.id}
          rows={rows}
          ball={ball}
          onLanding={handleLanding}
          onComplete={handleComplete}
          onBounce={onPinBounce}
        />
      ))}
    </svg>
  );
}
