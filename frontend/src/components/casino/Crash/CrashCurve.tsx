import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

interface CrashCurveProps {
  status: "WAITING" | "RUNNING" | "CRASHED" | "CONNECTING";
  multiplier: number;
  crashPoint: number | null;
  startTime: number | null;
  countdown: number;
  /** Pre-computed curve points passed from the hook via rAF */
  curvePoints: { t: number; m: number }[];
}

const PAD_LEFT = 40;
const PAD_BOTTOM = 32;
const PAD_TOP = 24;
const PAD_RIGHT = 16;

function buildPath(
  points: { t: number; m: number }[],
  svgW: number,
  svgH: number,
  maxT: number,
  maxM: number,
): string {
  if (points.length < 2) return "";

  const w = svgW - PAD_LEFT - PAD_RIGHT;
  const h = svgH - PAD_BOTTOM - PAD_TOP;

  const toX = (t: number) => PAD_LEFT + (t / maxT) * w;
  const toY = (m: number) => PAD_TOP + h - ((m - 1) / (maxM - 1)) * h;

  const d = points
    .map((p, i) => {
      const x = toX(p.t);
      const y = toY(p.m);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return d;
}

function buildFillPath(
  points: { t: number; m: number }[],
  svgW: number,
  svgH: number,
  maxT: number,
  maxM: number,
): string {
  if (points.length < 2) return "";

  const w = svgW - PAD_LEFT - PAD_RIGHT;
  const h = svgH - PAD_BOTTOM - PAD_TOP;

  const toX = (t: number) => PAD_LEFT + (t / maxT) * w;
  const toY = (m: number) => PAD_TOP + h - ((m - 1) / (maxM - 1)) * h;
  const baseY = PAD_TOP + h;

  const linePath = points
    .map((p, i) => {
      const x = toX(p.t);
      const y = toY(p.m);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = toX(points[points.length - 1]!.t);
  const firstX = toX(points[0]!.t);

  return `${linePath} L${lastX.toFixed(1)},${baseY.toFixed(1)} L${firstX.toFixed(1)},${baseY.toFixed(1)} Z`;
}

export function CrashCurve({
  status,
  multiplier,
  crashPoint,
  startTime,
  countdown,
  curvePoints,
}: CrashCurveProps) {
  const SVG_W = 600;
  const SVG_H = 320;

  const isCrashed = status === "CRASHED";
  const isRunning = status === "RUNNING";
  const isWaiting = status === "WAITING" || status === "CONNECTING";

  // Dynamic axis limits: give headroom above current multiplier
  const maxM = useMemo(() => {
    const top = Math.max(multiplier * 1.3, 2.0);
    return parseFloat(top.toFixed(2));
  }, [multiplier]);

  const maxT = useMemo(() => {
    if (curvePoints.length === 0 || !startTime) return 15000;
    const lastT = curvePoints[curvePoints.length - 1]!.t;
    return Math.max(lastT * 1.25, 15000);
  }, [curvePoints, startTime]);

  const pathD = useMemo(
    () => buildPath(curvePoints, SVG_W, SVG_H, maxT, maxM),
    [curvePoints, maxT, maxM],
  );

  const fillD = useMemo(
    () => buildFillPath(curvePoints, SVG_W, SVG_H, maxT, maxM),
    [curvePoints, maxT, maxM],
  );

  const strokeColor = isCrashed ? "#ef4444" : isRunning ? "#22c55e" : "#52525b";
  const gradientId = isCrashed ? "grad-crash" : "grad-run";

  // Y-axis labels (multiplicateurs)
  const yLabels = useMemo(() => {
    const labels: { y: number; label: string }[] = [];
    const steps = [1, 1.5, 2, 3, 5, 10, 20, 50, 100];
    const h = SVG_H - PAD_BOTTOM - PAD_TOP;
    for (const v of steps) {
      if (v > maxM) break;
      const y = PAD_TOP + h - ((v - 1) / (maxM - 1)) * h;
      labels.push({ y, label: `×${v}` });
    }
    return labels;
  }, [maxM]);

  return (
    <div className="relative w-full h-full select-none">
      {/* SVG graph */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <defs>
          {/* Running gradient */}
          <linearGradient id="grad-run" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.00" />
          </linearGradient>
          {/* Crashed gradient */}
          <linearGradient id="grad-crash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map(({ y, label }) => (
          <g key={label}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={SVG_W - PAD_RIGHT}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <text
              x={PAD_LEFT - 6}
              y={y + 4}
              fill="rgba(255,255,255,0.3)"
              fontSize="11"
              textAnchor="end"
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        ))}

        {/* X baseline */}
        <line
          x1={PAD_LEFT}
          y1={SVG_H - PAD_BOTTOM}
          x2={SVG_W - PAD_RIGHT}
          y2={SVG_H - PAD_BOTTOM}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />

        {/* Fill under curve */}
        {fillD && (
          <path
            d={fillD}
            fill={`url(#${gradientId})`}
          />
        )}

        {/* Curve path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dot at curve end */}
        {curvePoints.length > 0 && !isWaiting && (function () {
          const last = curvePoints[curvePoints.length - 1]!;
          const w = SVG_W - PAD_LEFT - PAD_RIGHT;
          const h = SVG_H - PAD_BOTTOM - PAD_TOP;
          const x = PAD_LEFT + (last.t / maxT) * w;
          const y = PAD_TOP + h - ((last.m - 1) / (maxM - 1)) * h;
          return (
            <circle
              cx={x}
              cy={y}
              r="5"
              fill={strokeColor}
              opacity="0.9"
            />
          );
        })()}
      </svg>

      {/* Center overlay: multiplier / status text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {isWaiting ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-zinc-400 text-base font-medium tracking-wide">En attente...</span>
              <span className="text-5xl font-black text-white tabular-nums">{countdown}s</span>
            </motion.div>
          ) : isCrashed ? (
            <motion.div
              key="crashed"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -6, 6, -4, 4, 0],
                transition: {
                  scale: { type: "spring", stiffness: 400, damping: 20 },
                  x: { duration: 0.4, ease: "easeOut" },
                },
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-red-400 text-sm font-semibold uppercase tracking-widest">
                CRASHED
              </span>
              <span className="text-5xl font-black text-red-400 tabular-nums drop-shadow-lg">
                ×{(crashPoint ?? multiplier).toFixed(2)}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                scale: Math.min(1 + (multiplier - 1) * 0.04, 1.4),
              }}
              className="flex flex-col items-center"
            >
              <span
                className="font-black tabular-nums text-white drop-shadow-lg"
                style={{ fontSize: `${Math.min(3.5 + multiplier * 0.08, 6)}rem` }}
              >
                ×{multiplier.toFixed(2)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
