import { UI_COLORS } from "../rouletteConstants";
import type { RouletteColor, RouletteNumber } from "../../../types/roulette";

const RESULT_COLORS: Record<RouletteColor, string> = {
  red: "#F43F5E",
  black: "#E2ECFF",
  green: "#22C55E",
};

const LABEL_TEXT = "Numero gagnant";

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

interface Particle {
  angle: number;
  distance: number;
  radius: number;
  velocity: number;
}

export class ResultOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private width = 600;
  private height = 600;
  private pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Overlay canvas unavailable");
    }

    this.canvas = canvas;
    this.context = context;
    this.setSize(600, 600);
  }

  setSize(width: number, height: number) {
    this.width = Math.max(320, Math.floor(width));
    this.height = Math.max(320, Math.floor(height));
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.pixelRatio);
    this.canvas.height = Math.floor(this.height * this.pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.scale(this.pixelRatio, this.pixelRatio);
    this.clear();
  }

  clear() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.context.clearRect(0, 0, this.width, this.height);
  }

  async showResult(number: RouletteNumber, color: RouletteColor) {
    const particles = this.createParticles();
    const accent = RESULT_COLORS[color];

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / 300, 1);
        const eased = easeOutCubic(progress);

        this.context.clearRect(0, 0, this.width, this.height);
        this.drawParticles(particles, eased, accent);
        this.drawResult(number, accent, eased);

        if (progress < 1) {
          this.animationFrameId = window.requestAnimationFrame(step);
          return;
        }

        this.animationFrameId = null;
        resolve();
      };

      this.animationFrameId = window.requestAnimationFrame(step);
    });
  }

  destroy() {
    this.clear();
  }

  private drawResult(number: RouletteNumber, accent: string, opacity: number) {
    const context = this.context;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.18;

    context.save();
    context.globalAlpha = opacity;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(15,33,46,0.82)";
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = `${accent}AA`;
    context.shadowColor = accent;
    context.shadowBlur = 24;
    context.stroke();

    context.shadowBlur = 0;
    context.fillStyle = UI_COLORS.white;
    context.font = `700 ${Math.max(44, radius * 0.8)}px 'Space Grotesk', sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), centerX, centerY - 6);

    context.fillStyle = UI_COLORS.textGray;
    context.font = `600 ${Math.max(13, radius * 0.15)}px Inter, sans-serif`;
    context.fillText(LABEL_TEXT, centerX, centerY + radius * 0.72);
    context.restore();
  }

  private drawParticles(particles: Particle[], progress: number, accent: string) {
    const context = this.context;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    context.save();
    context.globalAlpha = Math.max(0, 1 - progress * 0.45);

    particles.forEach((particle) => {
      const distance = particle.distance + particle.velocity * progress;
      const x = centerX + Math.cos(particle.angle) * distance;
      const y = centerY + Math.sin(particle.angle) * distance;

      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = accent;
      context.shadowColor = accent;
      context.shadowBlur = 18;
      context.fill();
    });

    context.restore();
  }

  private createParticles() {
    return Array.from({ length: 16 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 16,
      distance: 72 + Math.random() * 12,
      radius: 3 + Math.random() * 4,
      velocity: 28 + Math.random() * 34,
    }));
  }
}
