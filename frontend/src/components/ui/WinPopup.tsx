import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION = 2200;

export interface WinPopupProps {
  multiplier: number;
  netGain: number;
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

export function WinPopup({ multiplier, netGain, visible }: WinPopupProps) {
  if (netGain < 0) return null;

  const isWin = netGain > 0;
  const color = isWin ? "#00e676" : "#ffc107";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 460, damping: 26 },
          }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            x: "-50%",
            y: "-50%",
            zIndex: 50,
            pointerEvents: "none",
            background: "rgba(12,15,20,0.92)",
            border: `1px solid ${color}44`,
            borderRadius: 14,
            backdropFilter: "blur(8px)",
            boxShadow: `0 0 32px ${color}22, 0 8px 32px rgba(0,0,0,0.5)`,
            minWidth: 148,
            padding: "18px 24px",
            textAlign: "center",
          }}
        >
          {/* Multiplier */}
          <div
            style={{
              color,
              fontSize: "2.2rem",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {multiplier.toFixed(2)}×
          </div>

          {/* Gradient divider */}
          <div
            style={{
              height: 1,
              margin: "10px 0",
              background: `linear-gradient(to right, transparent, ${color}66, transparent)`,
            }}
          />

          {/* Amount row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {/* Filled token circle */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 900,
                color: "#060606",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              S
            </div>
            <span
              style={{
                color,
                fontSize: "1.15rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              +{netGain.toLocaleString("fr-FR")}
            </span>
            <span style={{ color: `${color}80`, fontSize: "0.75rem", fontWeight: 600 }}>
              S
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useWinPopup(duration?: number): {
  popupProps: WinPopupProps;
  showWin: (p: { multiplier: number; netGain: number }) => void;
  showPush: (p: { multiplier: number; netGain: number }) => void;
} {
  const effectiveDuration = duration ?? DEFAULT_DURATION;
  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState({ multiplier: 1, netGain: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => setVisible(false), []);

  const show = useCallback(
    (p: { multiplier: number; netGain: number }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setParams(p);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), effectiveDuration);
    },
    [effectiveDuration],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showWin = useCallback(
    (p: { multiplier: number; netGain: number }) => {
      if (p.netGain > 0) show(p);
    },
    [show],
  );

  const showPush = useCallback(
    (p: { multiplier: number; netGain: number }) => {
      show({ ...p, netGain: 0 });
    },
    [show],
  );

  return {
    popupProps: { ...params, visible, onHide: hide, duration: effectiveDuration },
    showWin,
    showPush,
  };
}
