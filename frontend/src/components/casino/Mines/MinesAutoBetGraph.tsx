import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AutoBetRound } from "../../../hooks/useMinesAutoBet";

interface Props {
  rounds: AutoBetRound[];
  startingBalance: number;
  sessionProfit: number;
  roundsPlayed: number;
  isRunning: boolean;
}

export function MinesAutoBetGraph({
  rounds,
  startingBalance,
  sessionProfit,
  roundsPlayed,
  isRunning,
}: Props) {
  const profitPositive = sessionProfit >= 0;
  const profitColor = profitPositive ? "#10b981" : "#ef4444";
  const profitSign = sessionProfit >= 0 ? "+" : "";

  // Compute Y domain to place the gradient split exactly at startingBalance
  const balances = rounds.map((r) => r.balance);
  const rawMin = balances.length > 0 ? Math.min(...balances) : startingBalance;
  const rawMax = balances.length > 0 ? Math.max(...balances) : startingBalance;
  const padding = Math.max((rawMax - rawMin) * 0.08, 1);
  const yMin = Math.max(0, rawMin - padding);
  const yMax = rawMax + padding;
  const yRange = yMax - yMin;

  // Percentage from top where the reference line sits (for gradient split)
  const refPct = yRange > 0 ? Math.max(0, Math.min(100, ((yMax - startingBalance) / yRange) * 100)) : 50;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#172531", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Auto-bet</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{roundsPlayed} rounds</span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: profitColor }}
          >
            {profitSign}{sessionProfit.toLocaleString()} tokens
          </span>
        </div>
      </div>

      {rounds.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: 120, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}
        >
          <span className="text-xs text-zinc-600">En attente du premier round...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={rounds} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="aboveBelow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset={`${refPct}%`} stopColor="#10b981" stopOpacity={0.08} />
                <stop offset={`${refPct}%`} stopColor="#ef4444" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="round"
              tick={{ fontSize: 10, fill: "#52525b" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "#52525b" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />

            {/* Reference line at starting balance */}
            <ReferenceLine
              y={startingBalance}
              stroke="#52525b"
              strokeDasharray="4 3"
              strokeWidth={1}
            />

            <Tooltip
              contentStyle={{
                background: "#172531",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#71717a", marginBottom: 2 }}
              formatter={(value: unknown) => {
                const n = typeof value === "number" ? value : Number(value);
                return [`${n.toLocaleString()} tokens`, "Balance"];
              }}
              labelFormatter={(label: unknown) => `Round ${label}`}
            />

            <Area
              type="monotone"
              dataKey="balance"
              stroke={profitColor}
              strokeWidth={2}
              fill="url(#aboveBelow)"
              dot={false}
              activeDot={{ r: 3, fill: profitColor, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Starting balance label */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="h-px w-4 bg-zinc-600 border-dashed" style={{ borderTop: "1px dashed #52525b" }} />
        <span className="text-[10px] text-zinc-600">
          Balance initiale : {startingBalance.toLocaleString()} tokens
        </span>
      </div>
    </div>
  );
}
