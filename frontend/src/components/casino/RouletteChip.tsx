import { motion } from "framer-motion";
import { formatTokens } from "../../lib/utils";

interface RouletteChipProps {
  amount: number;
  compact?: boolean;
}

export function RouletteChip({ amount, compact = false }: RouletteChipProps) {
  const size = compact ? 36 : 48;
  const gradientId = `chip-gradient-${amount}-${compact ? "compact" : "default"}`;

  return (
    <motion.svg
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_14px_28px_rgba(0,0,0,0.35)]"
      height={size}
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      viewBox="0 0 100 100"
      width={size}
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFF1C2" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#8A4A07" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" fill={`url(#${gradientId})`} r="42" stroke="rgba(255,255,255,0.88)" strokeWidth="5" />
      <circle cx="50" cy="50" fill="none" r="31" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <text
        fill="#0f172a"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize={compact ? "22" : "20"}
        fontWeight="700"
        textAnchor="middle"
        x="50"
        y="57"
      >
        {formatTokens(amount)}
      </text>
    </motion.svg>
  );
}
