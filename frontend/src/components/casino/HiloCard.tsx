import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { HiloCard as HiloCardType } from "../../types/hilo";

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const VALUE_LABELS: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

const RED_SUITS = new Set(["hearts", "diamonds"]);

function getValueLabel(value: number): string {
  return VALUE_LABELS[value] ?? String(value);
}

interface HiloCardProps {
  card: HiloCardType;
  animateKey?: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HiloCard({ card, animateKey, size = "md", className }: HiloCardProps) {
  const isRed = RED_SUITS.has(card.suit);
  const suitSymbol = SUIT_SYMBOLS[card.suit] ?? "?";
  const valueLabel = getValueLabel(card.value);

  const sizeClasses = {
    sm: "w-16 h-24 text-lg",
    md: "w-24 h-36 text-2xl",
    lg: "w-32 h-48 text-3xl",
  };

  const cornerTextSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <motion.div
      key={animateKey}
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl border border-white/20 bg-zinc-100 shadow-xl select-none",
        sizeClasses[size],
        className,
      )}
      style={{ perspective: "600px" }}
    >
      {/* Top-left corner */}
      <div className={cn("absolute top-1.5 left-2 leading-none", cornerTextSize[size])}>
        <div className={cn("font-bold", isRed ? "text-red-500" : "text-zinc-900")}>{valueLabel}</div>
        <div className={cn(isRed ? "text-red-500" : "text-zinc-900")}>{suitSymbol}</div>
      </div>

      {/* Center suit */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center font-bold",
          isRed ? "text-red-500" : "text-zinc-900",
        )}
      >
        <span className={cn(size === "sm" ? "text-xl" : size === "md" ? "text-4xl" : "text-5xl")}>
          {suitSymbol}
        </span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div
        className={cn(
          "absolute bottom-1.5 right-2 leading-none rotate-180",
          cornerTextSize[size],
        )}
      >
        <div className={cn("font-bold", isRed ? "text-red-500" : "text-zinc-900")}>{valueLabel}</div>
        <div className={cn(isRed ? "text-red-500" : "text-zinc-900")}>{suitSymbol}</div>
      </div>
    </motion.div>
  );
}

interface HiloCardGhostProps {
  label: string;
  sublabel: string;
  highlight?: boolean;
  size?: "sm" | "md" | "lg";
}

export function HiloCardGhost({ label, sublabel, highlight, size = "md" }: HiloCardGhostProps) {
  const sizeClasses = {
    sm: "w-16 h-24",
    md: "w-24 h-36",
    lg: "w-32 h-48",
  };

  return (
    <motion.div
      animate={highlight ? { boxShadow: "0 0 20px rgba(139,92,246,0.5)" } : { boxShadow: "0 0 0px transparent" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative rounded-xl border border-white/10 bg-zinc-800/60 flex flex-col items-center justify-center gap-1 select-none",
        sizeClasses[size],
      )}
    >
      <span className="font-display text-lg text-zinc-300 font-bold">{label}</span>
      <span className="text-xs text-zinc-500 uppercase tracking-widest">{sublabel}</span>
    </motion.div>
  );
}
