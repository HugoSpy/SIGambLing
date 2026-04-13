import { motion } from "framer-motion";
import type { MinesCellState } from "../../../types/mines";

interface MinesCellProps {
  index: number;
  state: MinesCellState;
  isClickable: boolean;
  isRevealing: boolean;
  onClick: () => void;
  isAutoSelected?: boolean;
}

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow-[0_0_8px_rgba(0,231,1,0.8)]" fill="none">
      <polygon
        points="12,2 20,8 17,20 7,20 4,8"
        fill="#00e701"
        stroke="#00ff88"
        strokeWidth="0.5"
      />
      <polygon
        points="12,2 20,8 12,6"
        fill="#00ff88"
        opacity="0.7"
      />
      <polygon
        points="4,8 12,6 12,2"
        fill="#00cc00"
        opacity="0.5"
      />
    </svg>
  );
}

function MineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow-[0_0_8px_rgba(255,68,68,0.9)]" fill="none">
      {/* Spikes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="12"
          x2={12 + 10 * Math.cos((deg * Math.PI) / 180)}
          y2={12 + 10 * Math.sin((deg * Math.PI) / 180)}
          stroke="#ff4444"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {/* Body */}
      <circle cx="12" cy="12" r="5" fill="#cc2222" stroke="#ff4444" strokeWidth="0.5" />
      {/* Fuse */}
      <path d="M12 7 Q14 4 16 3" stroke="#ff8888" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Shine */}
      <circle cx="10" cy="10.5" r="1.2" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

export function MinesCell({ index, state, isClickable, isRevealing, onClick, isAutoSelected }: MinesCellProps) {
  const isHidden = state === "hidden";
  const isGem = state === "gem";
  const isMine = state === "mine";

  return (
    <motion.button
      key={`cell-${index}-${state}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.05 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
      className="relative aspect-square w-full rounded-lg overflow-hidden select-none"
      style={{
        cursor: isClickable ? "pointer" : "default",
        background: isMine
          ? "linear-gradient(145deg, #3d1111 0%, #220808 100%)"
          : isGem
            ? "linear-gradient(145deg, #0d2e1a 0%, #071a0f 100%)"
            : isAutoSelected
              ? "linear-gradient(145deg, #0c2217 0%, #071a0f 100%)"
              : "linear-gradient(145deg, #1e3547 0%, #152636 100%)",
        border: isMine
          ? "1px solid rgba(255,68,68,0.4)"
          : isGem
            ? "1px solid rgba(0,231,1,0.4)"
            : isAutoSelected
              ? "1.5px dashed rgba(0,231,1,0.6)"
              : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isMine
          ? "inset 0 1px 0 rgba(255,100,100,0.15), 0 0 12px rgba(255,68,68,0.3)"
          : isGem
            ? "inset 0 1px 0 rgba(0,255,136,0.2), 0 0 12px rgba(0,231,1,0.25)"
            : isAutoSelected
              ? "inset 0 1px 0 rgba(0,255,136,0.1), 0 0 8px rgba(0,231,1,0.2)"
              : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
      aria-label={`Case ${index + 1}`}
    >
      {/* Top shine on hidden cells */}
      {isHidden && (
        <div
          className="absolute inset-x-0 top-0 h-[40%] rounded-t-lg pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
          }}
        />
      )}

      {/* Loading spinner while revealing */}
      {isRevealing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Gem icon */}
      {isGem && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 0.35, ease: "backOut" }}
        >
          <GemIcon />
          {/* Particle burst */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <motion.div
              key={deg}
              className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: 20 * Math.cos((deg * Math.PI) / 180),
                y: 20 * Math.sin((deg * Math.PI) / 180),
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}

      {/* Mine icon */}
      {isMine && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 12 }}
        >
          <MineIcon />
        </motion.div>
      )}
    </motion.button>
  );
}
