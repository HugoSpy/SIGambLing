import { NUMBER_COLORS, POINTER_ANGLE, UI_COLORS, WHEEL_SEQUENCE } from "./rouletteConstants";
import type { RouletteNumber } from "../../types/roulette";

const SVG_SIZE = 1000;
const SEGMENT_COUNT = WHEEL_SEQUENCE.length;
const SEGMENT_ANGLE_DEG = 360 / SEGMENT_COUNT;
const FULL_TURN_RAD = Math.PI * 2;
const WHEEL_EASING = "cubic-bezier(0.08, 0.8, 0.18, 1)";
const BALL_TRACK_RADIUS_RATIO = 0.46;
const BALL_POCKET_RADIUS_RATIO = 0.34;
const BALL_RADIUS_RATIO = 0.024;

const SEGMENT_FILL: Record<string, string> = {
  red: "#C41E3A",
  black: "#1A1A1A",
  green: "#0D8A45",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeInCubic(value: number) {
  return value * value * value;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeOutQuint(value: number) {
  return 1 - Math.pow(1 - value, 5);
}

function normalizeAngle(angle: number) {
  let normalized = angle % FULL_TURN_RAD;
  if (normalized < 0) {
    normalized += FULL_TURN_RAD;
  }
  return normalized;
}

function polarPoint(center: number, radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function createAnnularSegmentPath(
  center: number,
  outerRadius: number,
  innerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const startOuter = polarPoint(center, outerRadius, startAngleDeg);
  const endOuter = polarPoint(center, outerRadius, endAngleDeg);
  const startInner = polarPoint(center, innerRadius, startAngleDeg);
  const endInner = polarPoint(center, innerRadius, endAngleDeg);
  const largeArcFlag = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function buildWheelFaceSvgMarkup() {
  const center = SVG_SIZE / 2;
  const outerRadius = 470;
  const pocketOuterRadius = 438;
  const pocketInnerRadius = 256;
  const separatorInnerRadius = 238;
  const separatorOuterRadius = 446;
  const textRadius = 358;
  const hubRadius = 170;
  const hubInnerRadius = 92;

  const segments = WHEEL_SEQUENCE.map((number, index) => {
    const centerAngle = -90 + index * SEGMENT_ANGLE_DEG;
    const startAngle = centerAngle - SEGMENT_ANGLE_DEG / 2;
    const endAngle = centerAngle + SEGMENT_ANGLE_DEG / 2;
    const textPoint = polarPoint(center, textRadius, centerAngle);
    const pocketPath = createAnnularSegmentPath(
      center,
      pocketOuterRadius,
      pocketInnerRadius,
      startAngle,
      endAngle,
    );
    const fill = SEGMENT_FILL[NUMBER_COLORS[number]];

    return `
      <path d="${pocketPath}" fill="${fill}" />
      <text
        x="${textPoint.x}"
        y="${textPoint.y}"
        fill="${UI_COLORS.ivory}"
        font-family="'Space Grotesk', Arial, sans-serif"
        font-size="34"
        font-weight="700"
        text-anchor="middle"
        dominant-baseline="central"
        transform="rotate(${centerAngle + 90} ${textPoint.x} ${textPoint.y})"
      >${number}</text>
    `;
  }).join("");

  const separators = Array.from({ length: SEGMENT_COUNT }, (_, index) => {
    const boundaryAngle = -90 - SEGMENT_ANGLE_DEG / 2 + index * SEGMENT_ANGLE_DEG;
    const start = polarPoint(center, separatorInnerRadius, boundaryAngle);
    const end = polarPoint(center, separatorOuterRadius, boundaryAngle);

    return `
      <line
        x1="${start.x}"
        y1="${start.y}"
        x2="${end.x}"
        y2="${end.y}"
        stroke="${UI_COLORS.gold}"
        stroke-width="9"
        stroke-linecap="round"
      />
      <line
        x1="${start.x}"
        y1="${start.y}"
        x2="${end.x}"
        y2="${end.y}"
        stroke="rgba(255,255,255,0.35)"
        stroke-width="3"
        stroke-linecap="round"
      />
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}">
      <defs>
        <radialGradient id="rim-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stop-color="#385261" />
          <stop offset="45%" stop-color="#192734" />
          <stop offset="100%" stop-color="#0E1721" />
        </radialGradient>
        <radialGradient id="hub" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#496373" />
          <stop offset="55%" stop-color="#1C2B37" />
          <stop offset="100%" stop-color="#0B1219" />
        </radialGradient>
        <radialGradient id="gold" cx="30%" cy="25%" r="80%">
          <stop offset="0%" stop-color="#FFE39A" />
          <stop offset="48%" stop-color="#FFC857" />
          <stop offset="100%" stop-color="#7F4F16" />
        </radialGradient>
      </defs>
      <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="url(#rim-glow)" />
      <circle
        cx="${center}"
        cy="${center}"
        r="${outerRadius - 10}"
        fill="none"
        stroke="url(#gold)"
        stroke-width="18"
      />
      <circle
        cx="${center}"
        cy="${center}"
        r="${pocketOuterRadius + 8}"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        stroke-width="12"
      />
      ${segments}
      ${separators}
      <circle
        cx="${center}"
        cy="${center}"
        r="${pocketInnerRadius - 10}"
        fill="#10202B"
        stroke="rgba(255,255,255,0.06)"
        stroke-width="10"
      />
      <circle cx="${center}" cy="${center}" r="${hubRadius}" fill="url(#hub)" />
      <circle
        cx="${center}"
        cy="${center}"
        r="${hubRadius}"
        fill="none"
        stroke="url(#gold)"
        stroke-width="10"
      />
      <circle cx="${center}" cy="${center}" r="${hubInnerRadius}" fill="#0B131B" />
      <circle
        cx="${center}"
        cy="${center}"
        r="${hubInnerRadius}"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        stroke-width="8"
      />
      <circle cx="${center}" cy="${center}" r="20" fill="url(#gold)" />
    </svg>
  `.trim();
}

const WHEEL_BACKGROUND = `url("data:image/svg+xml,${encodeURIComponent(buildWheelFaceSvgMarkup())}")`;

export function getRouletteWheelBackground() {
  return WHEEL_BACKGROUND;
}

export class RouletteEngine {
  private readonly wheelElement: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private size = 500;
  private pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  private wheelRotationDeg = 0;
  private ballAngle = POINTER_ANGLE;
  private ballRadius = 500 * BALL_POCKET_RADIUS_RATIO;
  private ballFrameId: number | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private animationCleanup: (() => void) | null = null;
  private destroyed = false;
  private spinToken = 0;

  constructor(wheelElement: HTMLDivElement, canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D unavailable");
    }

    this.wheelElement = wheelElement;
    this.canvas = canvas;
    this.context = context;
    this.resize(500);
    this.applyWheelTransform(this.wheelRotationDeg);
  }

  resize(size: number) {
    this.size = Math.max(320, Math.floor(size));
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.size * this.pixelRatio);
    this.canvas.height = Math.floor(this.size * this.pixelRatio);
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.scale(this.pixelRatio, this.pixelRatio);

    if (!Number.isFinite(this.ballRadius) || this.ballRadius <= 0) {
      this.ballRadius = this.size * BALL_POCKET_RADIUS_RATIO;
    }

    this.drawBall(this.ballAngle, this.ballRadius, 1);
  }

  async spin(targetNumber: RouletteNumber, duration: number) {
    if (this.destroyed) {
      return;
    }

    const token = ++this.spinToken;
    const safeDuration = Math.max(1800, duration);
    const targetRotation = this.calculateTargetRotation(targetNumber);

    console.log('[Roulette] spin() → targetNumber:', targetNumber);
    console.log('[Roulette] targetIndex in WHEEL_SEQUENCE:', WHEEL_SEQUENCE.indexOf(targetNumber));
    console.log('[Roulette] targetRotation (deg):', targetRotation);

    await Promise.all([
      this.animateWheel(targetRotation, safeDuration, token),
      this.animateBall(safeDuration, token),
    ]);

    if (this.destroyed || token !== this.spinToken) {
      return;
    }

    this.wheelRotationDeg = targetRotation;
    // ballAngle is already set by animateBall to the exact landing angle — do not override
    this.ballRadius = this.size * BALL_POCKET_RADIUS_RATIO;
    this.applyWheelTransform(targetRotation);
    this.drawBall(this.ballAngle, this.ballRadius, 0.92);

    console.log('[Roulette] Final ballAngle (rad):', this.ballAngle, '≈ POINTER_ANGLE:', POINTER_ANGLE);
  }

  destroy() {
    this.destroyed = true;
    this.spinToken += 1;
    this.clearWheelAnimation();

    if (this.ballFrameId !== null) {
      window.cancelAnimationFrame(this.ballFrameId);
      this.ballFrameId = null;
    }

    this.context.clearRect(0, 0, this.size, this.size);
  }

  private calculateTargetRotation(targetNumber: RouletteNumber) {
    const targetIndex = WHEEL_SEQUENCE.indexOf(targetNumber);
    // finalOffset aligns targetIndex to the top (–90° in SVG = POINTER_ANGLE in canvas)
    const finalOffset = -targetIndex * SEGMENT_ANGLE_DEG;
    const minimumTurns = 5 + Math.random() * 1.4;
    const minimumTargetRotation = this.wheelRotationDeg + minimumTurns * 360;
    const snappedTurns = Math.ceil((minimumTargetRotation - finalOffset) / 360);
    const targetRotation = snappedTurns * 360 + finalOffset;

    console.log('[Roulette] calculateTargetRotation() → number:', targetNumber, 'index:', targetIndex, 'finalOffset:', finalOffset.toFixed(2), 'deg → total rotation:', targetRotation.toFixed(2), 'deg');

    return targetRotation;
  }

  private animateWheel(targetRotation: number, duration: number, token: number) {
    this.clearWheelAnimation();

    return new Promise<void>((resolve) => {
      const animationName = `roulette-wheel-spin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        @keyframes ${animationName} {
          from { transform: translateZ(0) rotate(${this.wheelRotationDeg}deg); }
          to { transform: translateZ(0) rotate(${targetRotation}deg); }
        }
      `;
      document.head.appendChild(styleElement);
      this.styleElement = styleElement;

      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        this.clearWheelAnimation();

        if (!this.destroyed && token === this.spinToken) {
          this.applyWheelTransform(targetRotation);
        }

        resolve();
      };

      const timeoutId = window.setTimeout(finish, duration + 120);
      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.animationName === animationName) {
          finish();
        }
      };

      this.animationCleanup = () => {
        window.clearTimeout(timeoutId);
        this.wheelElement.removeEventListener("animationend", handleAnimationEnd);
        this.wheelElement.style.animation = "none";

        if (this.styleElement === styleElement) {
          styleElement.remove();
          this.styleElement = null;
        }
      };

      this.wheelElement.addEventListener("animationend", handleAnimationEnd);
      this.wheelElement.style.animation = "none";
      this.applyWheelTransform(this.wheelRotationDeg);

      window.requestAnimationFrame(() => {
        if (this.destroyed || token !== this.spinToken) {
          finish();
          return;
        }

        this.wheelElement.style.animation = `${animationName} ${duration}ms ${WHEEL_EASING} forwards`;
      });
    });
  }

  private animateBall(duration: number, token: number) {
    if (this.ballFrameId !== null) {
      window.cancelAnimationFrame(this.ballFrameId);
      this.ballFrameId = null;
    }

    return new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const startAngle = this.ballAngle;
      const startRadius = this.ballRadius;
      const trackRadius = this.size * BALL_TRACK_RADIUS_RATIO;
      const pocketRadius = this.size * BALL_POCKET_RADIUS_RATIO;

      // KEY FIX: use exact integer orbit counts so ball arrives at POINTER_ANGLE at phase-one
      // end. Previously totalTravel * 0.76 produced a non-multiple of 2π → the ball started
      // the drop phase ~1.5 rotations away from POINTER_ANGLE, drifting through many numbers
      // visually before reaching the correct pocket.
      const numOrbits = 6 + Math.floor(Math.random() * 2); // 6 or 7 full orbits
      const phaseOneTravel = numOrbits * FULL_TURN_RAD; // exact multiple of 2π
      // After phaseOneTravel the ball is back at startAngle = POINTER_ANGLE.
      // A tiny drift (< half a segment) gives a realistic pocket-entry wobble.
      const segmentAngle = FULL_TURN_RAD / SEGMENT_COUNT;
      const phaseTwoTravel = segmentAngle * 0.35 * (Math.random() - 0.5); // ±0.175 segment ≈ ±1°
      const phaseOneEndAngle = startAngle - phaseOneTravel; // ≡ POINTER_ANGLE (same x,y)
      const finalAngle = phaseOneEndAngle - phaseTwoTravel; // landing angle (within target pocket)

      console.log('[Roulette] animateBall → numOrbits:', numOrbits, 'phaseTwoTravel (deg):', (phaseTwoTravel * 180 / Math.PI).toFixed(2));

      const step = (now: number) => {
        if (this.destroyed || token !== this.spinToken) {
          resolve();
          return;
        }

        const progress = clamp((now - startedAt) / duration, 0, 1);
        const riseProgress = clamp(progress / 0.12, 0, 1);
        const orbitProgress = clamp(progress / 0.6, 0, 1);
        const dropProgress = clamp((progress - 0.6) / 0.4, 0, 1);

        // During orbit phase ball spins numOrbits times back to POINTER_ANGLE.
        // During drop phase ball moves at most ±1° — stays firmly in target pocket.
        const angle =
          progress < 0.6
            ? startAngle - phaseOneTravel * easeOutCubic(orbitProgress)
            : phaseOneEndAngle - phaseTwoTravel * easeOutQuint(dropProgress);

        let radius = startRadius;

        if (progress < 0.12) {
          radius = startRadius + (trackRadius - startRadius) * easeOutCubic(riseProgress);
        } else if (progress < 0.6) {
          radius = trackRadius + Math.sin(orbitProgress * Math.PI * 4) * this.size * 0.003;
        } else {
          radius = trackRadius + (pocketRadius - trackRadius) * easeInCubic(dropProgress);
        }

        this.drawBall(
          angle,
          radius,
          progress < 0.6 ? 1 : 1 - dropProgress * 0.2,
        );

        if (progress < 1) {
          this.ballFrameId = window.requestAnimationFrame(step);
          return;
        }

        // Set exact landing angle — no snap to POINTER_ANGLE to avoid any visible jump.
        // finalAngle is within ±1° of POINTER_ANGLE, well inside the target pocket.
        this.ballFrameId = null;
        this.ballAngle = finalAngle;
        this.ballRadius = pocketRadius;
        this.drawBall(finalAngle, this.ballRadius, 0.92);
        resolve();
      };

      this.ballFrameId = window.requestAnimationFrame(step);
    });
  }

  private drawBall(angle: number, radius: number, glowStrength: number) {
    const context = this.context;
    const center = this.size / 2;
    const ballRadius = this.size * BALL_RADIUS_RATIO;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;

    context.clearRect(0, 0, this.size, this.size);

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.24)";
    context.beginPath();
    context.ellipse(
      x + ballRadius * 0.28,
      y + ballRadius * 1.1,
      ballRadius * 0.9,
      ballRadius * 0.55,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.beginPath();
    context.arc(x, y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "#FFFFFF";
    context.shadowColor = `rgba(255,255,255,${0.38 * glowStrength})`;
    context.shadowBlur = ballRadius * 1.8;
    context.fill();

    context.shadowBlur = 0;
    context.beginPath();
    context.arc(x - ballRadius * 0.32, y - ballRadius * 0.36, ballRadius * 0.34, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,0.88)";
    context.fill();
    context.restore();
  }

  private applyWheelTransform(rotation: number) {
    this.wheelElement.style.transform = `translateZ(0) rotate(${rotation}deg)`;
  }

  private clearWheelAnimation() {
    this.animationCleanup?.();
    this.animationCleanup = null;
  }
}
