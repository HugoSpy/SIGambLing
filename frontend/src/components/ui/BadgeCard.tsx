import { motion } from "framer-motion";
import { Check, HelpCircle, Lock } from "lucide-react";

import { formatTokens } from "../../lib/utils";
import type { BadgeCatalogRarity, GamificationBadge } from "../../types/gamification";
import { FogEffect } from "./FogEffect";

const BADGE_STYLES: Record<GamificationBadge["tone"], string> = {
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  violet: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

const CLAIM_BUTTON_STYLES: Record<BadgeCatalogRarity, string> = {
  COMMON: "bg-zinc-600/80 hover:bg-zinc-500/80 text-zinc-100 border border-zinc-500/50",
  RARE: "bg-sky-600/80 hover:bg-sky-500/80 text-white border border-sky-400/50",
  EPIC: "bg-fuchsia-600/80 hover:bg-fuchsia-500/80 text-white border border-fuchsia-400/50",
  LEGENDARY: "bg-amber-500/80 hover:bg-amber-400/80 text-black border border-amber-400/50",
};

const RARITY_GLOW: Partial<Record<BadgeCatalogRarity, string>> = {
  RARE: "0 0 8px rgba(56,189,248,0.35)",
  EPIC: "0 0 12px rgba(232,121,249,0.45)",
  LEGENDARY: "0 0 14px rgba(251,191,36,0.45)",
};

interface BadgeCardProps {
  badge: GamificationBadge;
  size?: "sm" | "lg";
  onClaim?: (badge: GamificationBadge) => void;
  claiming?: boolean;
}

export function BadgeCard({ badge, size = "lg", onClaim, claiming }: BadgeCardProps) {
  const isSecretLocked = badge.visibility === "SECRET" && !badge.unlocked;

  if (isSecretLocked) {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-4">
        <FogEffect />
        <div className="relative z-10 flex flex-col items-center justify-center py-4 text-center">
          <HelpCircle className="h-8 w-8 text-white/30" />
          <p className="mt-2 text-sm font-semibold text-white/40">???</p>
          <p className="mt-1 text-xs text-white/25">Badge secret</p>
        </div>
      </div>
    );
  }

  const isLocked = !badge.unlocked;
  const style = badge.unlocked
    ? BADGE_STYLES[badge.tone]
    : "border-white/10 bg-white/5 text-brand-text";
  const glow = badge.unlocked ? RARITY_GLOW[badge.catalog_rarity] : undefined;
  const isSmall = size === "sm";

  return (
    <motion.div
      className={`rounded-[22px] border p-4 ${style}`}
      style={glow ? { boxShadow: glow } : undefined}
      initial={
        badge.visibility === "SECRET" && badge.unlocked
          ? { opacity: 0, scale: 0.95 }
          : false
      }
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className={`font-semibold ${isSmall ? "text-xs" : "text-sm"}`}>{badge.name}</p>
        <div className="flex items-center gap-2">
          {isLocked && <Lock className="h-3.5 w-3.5 text-white/40" />}
          {badge.unlocked && badge.claimed_at !== null && (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span className="text-[11px] uppercase tracking-[0.24em] text-white/60">
            {badge.rarity}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className={`mt-2 leading-6 text-white/80 ${isSmall ? "text-[11px]" : "text-xs"}`}>
        {badge.description}
      </p>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-white/60">
          <span>Progression</span>
          <span>
            {badge.progress.current}/{badge.progress.target} {badge.progress.label}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${badge.unlocked ? "bg-current" : "bg-white/30"}`}
            style={{
              width: `${Math.min(
                100,
                Math.round((badge.progress.current / badge.progress.target) * 100),
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
          {badge.unlocked && badge.unlocked_at
            ? new Date(badge.unlocked_at).toLocaleDateString("fr-FR")
            : "verrouille"}
        </p>
        {badge.unlocked && badge.claimed_at === null && onClaim && (
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${CLAIM_BUTTON_STYLES[badge.catalog_rarity]}`}
            disabled={claiming}
            onClick={() => onClaim(badge)}
          >
            {claiming ? "..." : `+${formatTokens(badge.reward)} tokens`}
          </button>
        )}
      </div>
    </motion.div>
  );
}
