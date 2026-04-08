import { useRef, useState } from "react";
import type { EventOddsHistorySeries } from "../types/event";

const palette = ["#10b981", "#38bdf8", "#f59e0b", "#f87171", "#c084fc", "#facc15"];

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function formatTooltipDate(timestamp: string) {
  const d = new Date(timestamp);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

interface TooltipData {
  mouseX: number;
  mouseY: number;
  svgX: number;
  timestamp: string;
  entries: Array<{ option: string; odds: number; color: string }>;
}

export function OddsHistoryChart({ series }: { series: EventOddsHistorySeries[] }) {
  const nonEmptySeries = series.filter((entry) => entry.points.length > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (nonEmptySeries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-sm text-zinc-400">
        Aucun historique de cotes disponible pour le moment.
      </div>
    );
  }

  const flatPoints = nonEmptySeries.flatMap((entry) => entry.points.map((point) => point.odds));
  const minOdds = Math.min(...flatPoints);
  const maxOdds = Math.max(...flatPoints);
  const height = 260;
  const width = 760;
  const padding = 28;
  const denominator = maxOdds - minOdds || 1;

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = event.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * width;
    const relY = event.clientY - rect.top;

    const chartLeft = padding;
    const chartRight = width - padding;
    const clampedX = Math.max(chartLeft, Math.min(chartRight, relX));
    const ratio = (clampedX - chartLeft) / (chartRight - chartLeft);

    // For each series, find the point closest to this ratio
    const entries: TooltipData["entries"] = [];
    let bestTimestamp = "";

    nonEmptySeries.forEach((entry, seriesIndex) => {
      const color = palette[seriesIndex % palette.length];
      const len = entry.points.length;
      const idx = Math.round(ratio * Math.max(len - 1, 0));
      const point = entry.points[idx];
      if (point) {
        entries.push({ option: entry.option, odds: point.odds, color });
        if (!bestTimestamp) bestTimestamp = point.timestamp;
      }
    });

    if (entries.length > 0) {
      setTooltip({ mouseX: event.clientX, mouseY: relY, svgX: clampedX, timestamp: bestTimestamp, entries });
    }
  };

  const seriesPoints = nonEmptySeries.map((entry) =>
    entry.points.map((point, pointIndex) => ({
      x: padding + ((width - padding * 2) / Math.max(entry.points.length - 1, 1)) * pointIndex,
      y: height - padding - ((point.odds - minOdds) / denominator) * (height - padding * 2),
    })),
  );

  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4" ref={containerRef}>
      <svg
        className="h-[260px] w-full"
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setTooltip(null)}
        onMouseMove={handleMouseMove}
      >
        {[0, 1, 2, 3].map((index) => {
          const y = padding + ((height - padding * 2) / 3) * index;

          return (
            <line
              key={index}
              stroke="rgba(63,63,70,0.9)"
              strokeDasharray="4 6"
              strokeWidth="1"
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
            />
          );
        })}

        {nonEmptySeries.map((entry, index) => {
          const color = palette[index % palette.length];
          const points = seriesPoints[index];

          return (
            <g key={entry.option}>
              <path
                d={buildPath(points)}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point, pointIndex) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={color}
                  key={`${entry.option}-${pointIndex}`}
                  r="3"
                />
              ))}
            </g>
          );
        })}

        {tooltip && (
          <g>
            <line
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              x1={tooltip.svgX}
              x2={tooltip.svgX}
              y1={padding}
              y2={height - padding}
            />
            {nonEmptySeries.map((entry, index) => {
              const color = palette[index % palette.length];
              const points = seriesPoints[index];
              const len = points.length;
              if (len === 0) return null;
              const ratio = (tooltip.svgX - padding) / (width - padding * 2);
              const frac = ratio * Math.max(len - 1, 0);
              const floorIdx = Math.floor(frac);
              const ceilIdx = Math.min(floorIdx + 1, len - 1);
              const t = frac - floorIdx;
              const cy = points[floorIdx].y * (1 - t) + points[ceilIdx].y * t;
              return (
                <circle
                  cx={tooltip.svgX}
                  cy={cy}
                  fill={color}
                  key={`hover-${entry.option}`}
                  r="4"
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm"
          style={{
            top: Math.max(4, tooltip.mouseY - 8),
            left: (() => {
              const containerWidth = containerRef.current?.offsetWidth ?? 400;
              const est = tooltip.mouseX - (containerRef.current?.getBoundingClientRect().left ?? 0);
              return est + 160 > containerWidth ? est - 168 : est + 12;
            })(),
          }}
        >
          <div className="space-y-1.5">
            {tooltip.entries.map((entry) => (
              <div className="flex items-center gap-2" key={entry.option}>
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-zinc-300">{entry.option}</span>
                <span className="ml-auto pl-3 font-semibold text-zinc-100">
                  {entry.odds.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-zinc-700 pt-2 text-zinc-500">
            {formatTooltipDate(tooltip.timestamp)}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {nonEmptySeries.map((entry, index) => (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-100"
            key={entry.option}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            {entry.option}
          </div>
        ))}
      </div>
    </div>
  );
}
