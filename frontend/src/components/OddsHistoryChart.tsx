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

export function OddsHistoryChart({ series }: { series: EventOddsHistorySeries[] }) {
  const nonEmptySeries = series.filter((entry) => entry.points.length > 0);

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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <svg className="h-[260px] w-full" viewBox={`0 0 ${width} ${height}`}>
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
          const points = entry.points.map((point, pointIndex) => {
            const x =
              padding +
              ((width - padding * 2) /
                Math.max(entry.points.length - 1, 1)) *
                pointIndex;
            const y =
              height -
              padding -
              ((point.odds - minOdds) / denominator) * (height - padding * 2);

            return { x, y };
          });

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
      </svg>

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
