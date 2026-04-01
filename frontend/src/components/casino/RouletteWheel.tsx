import { useEffect, useRef, useState } from "react";
import { ResultOverlay } from "../../lib/casino/canvas/ResultOverlay";
import { NUMBER_COLORS } from "../../lib/casino/rouletteConstants";
import { RouletteWheel3D } from "../../lib/casino/three/RouletteWheel3D";
import type { RouletteSpinAnimationRequest } from "../../types/roulette";

interface RouletteWheelProps {
  spinRequest: RouletteSpinAnimationRequest | null;
  onSpinComplete: (spinId: string) => void;
}

export function RouletteWheel({ spinRequest, onSpinComplete }: RouletteWheelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RouletteWheel3D | null>(null);
  const resultOverlayRef = useRef<ResultOverlay | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !overlayRef.current || !containerRef.current) {
      return;
    }

    try {
      engineRef.current = new RouletteWheel3D(canvasRef.current);
      resultOverlayRef.current = new ResultOverlay(overlayRef.current);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry || !engineRef.current || !resultOverlayRef.current) {
        return;
      }

      const nextSize = Math.min(entry.contentRect.width, 640);
      engineRef.current.setSize(nextSize, nextSize);
      resultOverlayRef.current.setSize(nextSize, nextSize);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      resultOverlayRef.current?.destroy();
      resultOverlayRef.current = null;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!spinRequest || !engineRef.current || !resultOverlayRef.current) {
      return;
    }

    let cancelled = false;

    const playSpin = async () => {
      resultOverlayRef.current?.clear();
      await engineRef.current?.spin(spinRequest.resultNumber, 4000);

      if (cancelled) {
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 300);
      });

      if (cancelled) {
        return;
      }

      await resultOverlayRef.current?.showResult(
        spinRequest.resultNumber,
        NUMBER_COLORS[spinRequest.resultNumber],
      );

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
    <div className="relative mx-auto w-full max-w-[680px]" ref={containerRef}>
      {unavailable ? (
        <div className="aspect-square w-full rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_40%),linear-gradient(180deg,#122433_0%,#0f212e_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
          <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-white/10 text-center">
            <div className="max-w-sm space-y-3 px-6">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-cyan">Roulette européenne</p>
              <h3 className="font-display text-3xl text-brand-text">La table se prépare</h3>
              <p className="text-sm leading-7 text-brand-muted">
                La roue n&apos;est pas disponible sur ce navigateur pour le moment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0f212e] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
          <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
          <canvas className="pointer-events-none absolute inset-0 h-full w-full" ref={overlayRef} />
        </div>
      )}

      <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-brand-orange drop-shadow-[0_10px_20px_rgba(245,158,11,0.35)]" />
      </div>
    </div>
  );
}
