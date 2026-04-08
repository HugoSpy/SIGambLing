import { useEffect, useRef } from "react";

interface FogParticle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

interface FogEffectProps {
  className?: string;
}

export function FogEffect({ className }: FogEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<FogParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function initParticles() {
      const w = canvas!.width;
      const h = canvas!.height;
      particlesRef.current = Array.from({ length: 14 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 18 + Math.random() * 36,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: 0.06 + Math.random() * 0.12,
      }));
    }

    function syncSize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      if (canvas!.width !== Math.round(width) || canvas!.height !== Math.round(height)) {
        canvas!.width = Math.round(width);
        canvas!.height = Math.round(height);
        initParticles();
      }
    }

    function animate() {
      syncSize();
      const w = canvas!.width;
      const h = canvas!.height;

      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx!.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x > w + p.radius) p.x = -p.radius;
        if (p.x < -p.radius) p.x = w + p.radius;
        if (p.y > h + p.radius) p.y = -p.radius;
        if (p.y < -p.radius) p.y = h + p.radius;

        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `rgba(148, 163, 184, ${p.opacity})`);
        gradient.addColorStop(1, "rgba(148, 163, 184, 0)");

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    syncSize();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 rounded-[22px] ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
