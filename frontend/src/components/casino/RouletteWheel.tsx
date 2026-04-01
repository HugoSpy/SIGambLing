import { useEffect, useMemo, useRef, useState } from "react";
import { NUMBER_COLORS } from "../../lib/casino/rouletteConstants";
import { getRouletteWheelBackground, RouletteEngine } from "../../lib/casino/rouletteEngine";
import type { RouletteNumber, RouletteSpinAnimationRequest } from "../../types/roulette";

interface RouletteWheelProps {
  spinRequest: RouletteSpinAnimationRequest | null;
  onSpinComplete: (spinId: string) => void;
}

const RESULT_BADGE_STYLES = {
  red: "bg-[#C41E3A]",
  black: "bg-[#1A1A1A]",
  green: "bg-[#0D8A45]",
} as const;

export function RouletteWheel({ spinRequest, onSpinComplete }: RouletteWheelProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RouletteEngine | null>(null);
  const hideResultTimerRef = useRef<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [visibleResult, setVisibleResult] = useState<RouletteNumber | null>(null);
  const wheelBackground = useMemo(() => getRouletteWheelBackground(), []);

  useEffect(() => {
    if (!stageRef.current || !wheelRef.current || !canvasRef.current) {
      return;
    }

    try {
      engineRef.current = new RouletteEngine(wheelRef.current, canvasRef.current);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      return;
    }

    const resizeWheel = () => {
      if (!stageRef.current || !engineRef.current) {
        return;
      }

      const nextSize = Math.min(stageRef.current.clientWidth, stageRef.current.clientHeight, 560);
      engineRef.current.resize(nextSize);
    };

    resizeWheel();

    const resizeObserver = new ResizeObserver(() => {
      resizeWheel();
    });

    resizeObserver.observe(stageRef.current);

    return () => {
      resizeObserver.disconnect();

      if (hideResultTimerRef.current !== null) {
        window.clearTimeout(hideResultTimerRef.current);
        hideResultTimerRef.current = null;
      }

      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!spinRequest || !engineRef.current) {
      return;
    }

    if (hideResultTimerRef.current !== null) {
      window.clearTimeout(hideResultTimerRef.current);
      hideResultTimerRef.current = null;
    }

    let cancelled = false;
    setVisibleResult(null);

    const playSpin = async () => {
      await engineRef.current?.spin(spinRequest.resultNumber, 4200);

      if (cancelled) {
        return;
      }

      setVisibleResult(spinRequest.resultNumber);
      hideResultTimerRef.current = window.setTimeout(() => {
        setVisibleResult((current) => (current === spinRequest.resultNumber ? null : current));
        hideResultTimerRef.current = null;
      }, 1800);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 220);
      });

      if (!cancelled) {
        onSpinComplete(spinRequest.spinId);
      }
    };

    void playSpin();

    return () => {
      cancelled = true;
    };
  }, [onSpinComplete, spinRequest]);

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      {unavailable ? (
        <div className="aspect-square w-full rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_40%),linear-gradient(180deg,#122433_0%,#0f212e_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
          <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-white/10 text-center">
            <div className="max-w-sm space-y-3 px-6">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Roulette europeenne</p>
              <h3 className="font-display text-3xl text-brand-text">La roue se recharge</h3>
              <p className="text-sm leading-7 text-brand-muted">
                Le moteur canvas n&apos;est pas disponible sur ce navigateur pour le moment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-square w-full overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(37,99,235,0.15),transparent_30%),linear-gradient(180deg,#0E1B26_0%,#0A141D_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
          <div
            className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_38%),radial-gradient(circle_at_50%_50%,rgba(15,23,36,0)_56%,rgba(4,8,12,0.62)_100%)]"
            aria-hidden="true"
          />

          <div className="relative h-full w-full" ref={stageRef}>
            <div className="absolute inset-[4.6%] rounded-full bg-[radial-gradient(circle_at_50%_46%,#162734_0%,#0A141D_65%,#04080C_100%)] shadow-[inset_0_18px_36px_rgba(255,255,255,0.05),0_26px_50px_rgba(0,0,0,0.35)]">
              <div
                className="absolute inset-0 rounded-full bg-cover bg-center bg-no-repeat"
                ref={wheelRef}
                style={{ backgroundImage: wheelBackground, backgroundSize: "100% 100%" }}
              />
              <canvas className="pointer-events-none absolute inset-0 h-full w-full" ref={canvasRef} />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[1.2%] z-20 -translate-x-1/2">
              <div className="rounded-full border border-[#FFE39A]/45 bg-[#101B25] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.32)]">
                <div className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-[#FFC857] drop-shadow-[0_10px_18px_rgba(255,200,87,0.45)]" />
              </div>
            </div>

            {visibleResult !== null ? (
              <div className="pointer-events-none absolute inset-x-0 top-[13%] z-20 flex justify-center">
                <div className="rounded-[20px] border border-white/10 bg-[#08121A]/90 px-5 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-sm">
                  <p className="text-center text-[10px] uppercase tracking-[0.3em] text-brand-muted">
                    Numero gagnant
                  </p>
                  <div
                    className={`mt-2 flex h-14 min-w-[92px] items-center justify-center rounded-[16px] border border-white/10 text-3xl font-display text-white ${RESULT_BADGE_STYLES[NUMBER_COLORS[visibleResult]]}`}
                  >
                    {visibleResult}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
