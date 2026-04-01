import * as THREE from "three";
import { NUMBER_COLORS, POINTER_ANGLE, UI_COLORS, WHEEL_SEQUENCE } from "../rouletteConstants";
import type { RouletteNumber } from "../../../types/roulette";

type WheelMode = "three" | "canvas";

const DEFAULT_SIZE = 600;
const GOLD = "#D4A520";
const WHEEL_RADIUS = 200;
const SEGMENT_COUNT = WHEEL_SEQUENCE.length; // 37
const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENT_COUNT;
const BALL_TRACK_RADIUS = 190;
const BALL_POCKET_RADIUS = 162;
// 1 clockwise revolution every 10 s = 2π / 10000 ms
const IDLE_SPEED = (Math.PI * 2) / 10000;

// ─── Easing ────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Spin state ─────────────────────────────────────────────────────────────

interface SpinState {
  startTime: number;
  duration: number;
  startRotation: number;
  finalRotation: number;
  startBallAngle: number;
  finalBallAngle: number;
  resolve: () => void;
}

// ─── Main class ────────────────────────────────────────────────────────────

export class RouletteWheel3D {
  private readonly canvas: HTMLCanvasElement;
  private mode: WheelMode = "three";
  private width = DEFAULT_SIZE;
  private height = DEFAULT_SIZE;
  private pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  // Wheel state
  private currentRotation = Math.random() * Math.PI * 2;
  private currentBallAngle = POINTER_ANGLE;
  private currentBallRadius = BALL_TRACK_RADIUS;

  // Animation
  private animationFrameId: number | null = null;
  private spinState: SpinState | null = null;
  private destroyed = false;

  // Three.js objects
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private wheelGroup: THREE.Group | null = null;
  private ball: THREE.Mesh | null = null;
  private wheelTexture: THREE.CanvasTexture | null = null;

  // Canvas fallback
  private fallbackContext: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    try {
      this.initializeThreeRenderer();
    } catch {
      this.initializeCanvasFallback();
    }

    this.setSize(DEFAULT_SIZE, DEFAULT_SIZE);
    this.startMainLoop();
  }

  get renderingMode() {
    return this.mode;
  }

  setSize(width: number, height: number) {
    this.width = Math.max(320, Math.floor(width));
    this.height = Math.max(320, Math.floor(height));
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.pixelRatio);
    this.canvas.height = Math.floor(this.height * this.pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.mode === "three" && this.renderer && this.camera) {
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    } else if (this.fallbackContext) {
      this.fallbackContext.setTransform(1, 0, 0, 1, 0, 0);
      this.fallbackContext.scale(this.pixelRatio, this.pixelRatio);
    }
  }

  // ─── Main animation loop ─────────────────────────────────────────────────

  private startMainLoop() {
    let lastTime: number | null = null;

    const loop = (now: number) => {
      if (this.destroyed) return;

      const dt = lastTime === null ? 0 : Math.min(now - lastTime, 100);
      lastTime = now;

      if (this.spinState) {
        // ── Spin animation ───────────────────────────────────────────────
        const elapsed = now - this.spinState.startTime;
        const progress = Math.min(elapsed / this.spinState.duration, 1);

        const wheelEased = easeOutCubic(progress);
        this.currentRotation =
          this.spinState.startRotation +
          (this.spinState.finalRotation - this.spinState.startRotation) * wheelEased;
        this.applyRotation();

        const ballEased = easeOutQuart(progress);
        this.currentBallAngle =
          this.spinState.startBallAngle +
          (this.spinState.finalBallAngle - this.spinState.startBallAngle) * ballEased;

        const pocketT = easeInOutCubic(Math.max(0, (progress - 0.65) / 0.35));
        this.currentBallRadius =
          BALL_TRACK_RADIUS + (BALL_POCKET_RADIUS - BALL_TRACK_RADIUS) * pocketT;

        if (this.ball) {
          this.ball.position.x = Math.cos(this.currentBallAngle) * this.currentBallRadius;
          this.ball.position.z = Math.sin(this.currentBallAngle) * this.currentBallRadius;
          this.ball.position.y = 22 - 10 * pocketT;
        }

        if (progress >= 1) {
          // Snap to exact final state
          this.currentRotation = this.spinState.finalRotation;
          this.currentBallAngle = POINTER_ANGLE;
          this.currentBallRadius = BALL_POCKET_RADIUS;
          if (this.ball) {
            this.ball.position.set(
              Math.cos(POINTER_ANGLE) * BALL_POCKET_RADIUS,
              12,
              Math.sin(POINTER_ANGLE) * BALL_POCKET_RADIUS,
            );
          }
          this.applyRotation();
          const { resolve } = this.spinState;
          this.spinState = null;
          resolve();
        }
      } else {
        // ── Idle: slow clockwise rotation ────────────────────────────────
        // Clockwise from above = negative rotation.y in Three.js
        this.currentRotation -= IDLE_SPEED * dt;
        this.applyRotation();
      }

      this.render();
      this.animationFrameId = window.requestAnimationFrame(loop);
    };

    this.animationFrameId = window.requestAnimationFrame(loop);
  }

  // ─── Spin ────────────────────────────────────────────────────────────────

  async spin(targetNumber: RouletteNumber, duration = 4000) {
    const targetIndex = WHEEL_SEQUENCE.indexOf(targetNumber);
    if (targetIndex < 0) return;

    if (this.spinState) {
      const { resolve } = this.spinState;
      this.spinState = null;
      resolve();
    }

    // Wheel: same normalisation logic as original, runs counter-clockwise (positive)
    const startRotation = this.currentRotation;
    const baseTarget = -targetIndex * SEGMENT_ANGLE;
    const normalizedDelta =
      ((baseTarget - startRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const extraTurns = (4 + Math.random() * 2) * Math.PI * 2;
    const finalRotation = startRotation + extraTurns + normalizedDelta;

    // Ball: rolls in clockwise direction (decreasing angle)
    const startBallAngle = this.currentBallAngle;
    const ballExtraRotations = (5 + Math.random() * 2) * Math.PI * 2;
    const finalBallAngle = POINTER_ANGLE - ballExtraRotations;

    return new Promise<void>((resolve) => {
      this.spinState = {
        startTime: performance.now(),
        duration,
        startRotation,
        finalRotation,
        startBallAngle,
        finalBallAngle,
        resolve,
      };
    });
  }

  render() {
    if (this.mode === "three" && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.drawCanvasFallback();
  }

  destroy() {
    this.destroyed = true;
    if (this.spinState) {
      const { resolve } = this.spinState;
      this.spinState = null;
      resolve();
    }
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.wheelGroup) {
      this.wheelGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    this.wheelTexture?.dispose();
    this.renderer?.dispose();
  }

  // ─── Three.js scene ──────────────────────────────────────────────────────

  private initializeThreeRenderer() {
    this.mode = "three";
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(UI_COLORS.background);

    // Bird's eye camera: high above with slight forward tilt
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
    this.camera.position.set(0, 560, 75);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting for overhead view
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topLight.position.set(0, 400, 80);
    topLight.castShadow = true;
    topLight.shadow.mapSize.set(1024, 1024);
    topLight.shadow.bias = -0.0005;
    const fillLight = new THREE.DirectionalLight(0x3355aa, 0.22);
    fillLight.position.set(-120, 200, -200);
    const goldAccent = new THREE.PointLight(0xffd060, 0.6, 700);
    goldAccent.position.set(0, 220, 0);
    this.scene.add(ambient, topLight, fillLight, goldAccent);

    this.wheelTexture = this.createWheelTexture();

    // ── Outer dark surround ───────────────────────────────────────────────
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(240, 248, 18, 72),
      new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.92, metalness: 0.18 }),
    );
    basePlate.position.y = -15;
    basePlate.receiveShadow = true;
    this.scene.add(basePlate);

    // ── Rotating wheel group ──────────────────────────────────────────────
    this.wheelGroup = new THREE.Group();

    // Wheel body (flat cylinder)
    const wheelBody = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 22, 128),
      new THREE.MeshStandardMaterial({ map: this.wheelTexture, roughness: 0.72, metalness: 0.08 }),
    );
    wheelBody.receiveShadow = true;
    this.wheelGroup.add(wheelBody);

    // Gold outer rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(WHEEL_RADIUS + 2, 12, 18, 120),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(GOLD).getHex(), roughness: 0.18, metalness: 0.82 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 4;
    rim.castShadow = true;
    this.wheelGroup.add(rim);

    // Radial frets between segments
    // BoxGeometry(length=95, height=8, thickness=1.8), rotation.y = -angle → radial orientation
    const fretMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#C09030").getHex(),
      roughness: 0.28,
      metalness: 0.72,
    });
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const angle = i * SEGMENT_ANGLE;
      const fret = new THREE.Mesh(new THREE.BoxGeometry(95, 8, 1.8), fretMat);
      fret.position.set(Math.cos(angle) * 148, 14, Math.sin(angle) * 148);
      fret.rotation.y = -angle; // negative = radial orientation
      fret.castShadow = true;
      this.wheelGroup.add(fret);
    }

    // Inner disc (sits cleanly on top of wheel body, no z-fighting)
    const innerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(93, 93, 8, 72),
      new THREE.MeshStandardMaterial({ color: 0x0c1c2c, roughness: 0.75, metalness: 0.15 }),
    );
    innerDisc.position.y = 14; // bottom at y=10, just above wheel body top (y=11)
    this.wheelGroup.add(innerDisc);

    // Six decorative spokes
    const spokeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#C09020").getHex(),
      roughness: 0.22,
      metalness: 0.68,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 74), spokeMat);
      spoke.position.set(Math.cos(angle) * 44, 18, Math.sin(angle) * 44);
      spoke.rotation.y = angle;
      this.wheelGroup.add(spoke);
    }

    // Hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 25, 32, 32),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#F59E0B").getHex(), roughness: 0.22, metalness: 0.62 }),
    );
    hub.position.y = 20;
    hub.castShadow = true;
    this.wheelGroup.add(hub);

    // Hub cap: flat cylinder (no partial sphere artifacts)
    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 4, 32),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#FFCB44").getHex(), roughness: 0.08, metalness: 0.88 }),
    );
    hubCap.position.y = 37;
    this.wheelGroup.add(hubCap);

    this.scene.add(this.wheelGroup);

    // ── Ball (not part of wheelGroup, animates independently) ─────────────
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(7, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, // pure white
        roughness: 0.04,
        metalness: 0.88,
        envMapIntensity: 1.4,
      }),
    );
    this.ball.castShadow = true;
    this.ball.position.set(
      Math.cos(this.currentBallAngle) * BALL_TRACK_RADIUS,
      22,
      Math.sin(this.currentBallAngle) * BALL_TRACK_RADIUS,
    );
    this.scene.add(this.ball);

    this.applyRotation();
  }

  // ─── Wheel texture (top-down polar view) ─────────────────────────────────

  private createWheelTexture() {
    const size = 2048;
    const texCanvas = document.createElement("canvas");
    texCanvas.width = size;
    texCanvas.height = size;
    const ctx = texCanvas.getContext("2d")!;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.475;
    const innerR = size * 0.228;

    ctx.fillStyle = "#08111e";
    ctx.fillRect(0, 0, size, size);

    WHEEL_SEQUENCE.forEach((number, index) => {
      const startAngle = -Math.PI / 2 - SEGMENT_ANGLE / 2 + index * SEGMENT_ANGLE;
      const endAngle = startAngle + SEGMENT_ANGLE;
      const midAngle = (startAngle + endAngle) / 2;

      // Radial gradient for depth
      const gx1 = cx + Math.cos(midAngle) * innerR;
      const gy1 = cy + Math.sin(midAngle) * innerR;
      const gx2 = cx + Math.cos(midAngle) * outerR;
      const gy2 = cy + Math.sin(midAngle) * outerR;
      const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);

      const color = NUMBER_COLORS[number];
      if (color === "green") {
        grad.addColorStop(0, "#13a85e");
        grad.addColorStop(0.5, "#0e8f4d");
        grad.addColorStop(1, "#075c30");
      } else if (color === "red") {
        grad.addColorStop(0, "#d91533");
        grad.addColorStop(0.5, "#b81028");
        grad.addColorStop(1, "#700818");
      } else {
        grad.addColorStop(0, "#1c3a50");
        grad.addColorStop(0.5, "#152d3f");
        grad.addColorStop(1, "#0a1928");
      }

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.11)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Number label
      const labelR = innerR + (outerR - innerR) * 0.54;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(size * 0.027)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(number), 0, 0);
      ctx.restore();
    });

    // Inner disc fill
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    innerGrad.addColorStop(0, "#1a3a52");
    innerGrad.addColorStop(1, "#0c1e2e");
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // Gold ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 14, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 22;
    ctx.stroke();

    // Inner highlight ring
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 14;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private applyRotation() {
    if (this.mode === "three" && this.wheelGroup) {
      this.wheelGroup.rotation.y = this.currentRotation;
    }
  }

  // ─── 2D canvas fallback ──────────────────────────────────────────────────

  private initializeCanvasFallback() {
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable");
    this.mode = "canvas";
    this.fallbackContext = context;
  }

  private drawCanvasFallback() {
    if (!this.fallbackContext) return;

    const ctx = this.fallbackContext;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const outerR = Math.min(this.width, this.height) * 0.44;
    const innerR = outerR * 0.38;
    const labelR = innerR + (outerR - innerR) * 0.54;

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = UI_COLORS.background;
    ctx.fillRect(0, 0, this.width, this.height);

    // Outer glow ring
    const glow = ctx.createRadialGradient(cx, cy, outerR - 4, cx, cy, outerR + 24);
    glow.addColorStop(0, "rgba(212,165,32,0.28)");
    glow.addColorStop(1, "rgba(212,165,32,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 24, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.currentRotation);

    WHEEL_SEQUENCE.forEach((number, index) => {
      const startAngle = -Math.PI / 2 - SEGMENT_ANGLE / 2 + index * SEGMENT_ANGLE;
      const endAngle = startAngle + SEGMENT_ANGLE;
      const midAngle = (startAngle + endAngle) / 2;

      ctx.beginPath();
      ctx.arc(0, 0, outerR, startAngle, endAngle);
      ctx.arc(0, 0, innerR, endAngle, startAngle, true);
      ctx.closePath();

      const color = NUMBER_COLORS[number];
      ctx.fillStyle =
        color === "green" ? "#0e8f4d" : color === "red" ? "#c01030" : "#172e40";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const lx = Math.cos(midAngle) * labelR;
      const ly = Math.sin(midAngle) * labelR;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.max(14, outerR * 0.11)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(number), 0, 0);
      ctx.restore();
    });

    ctx.restore();

    // Gold rim
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 8, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = GOLD;
    ctx.stroke();

    // Inner disc
    const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    disc.addColorStop(0, "#1a3a52");
    disc.addColorStop(1, "#0c1e2e");
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();

    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#F59E0B";
    ctx.fill();

    // Ball (pure white)
    const ballScaledR = outerR * (this.currentBallRadius / WHEEL_RADIUS);
    const bx = cx + Math.cos(this.currentBallAngle) * ballScaledR;
    const by = cy + Math.sin(this.currentBallAngle) * ballScaledR;
    const ballR = outerR * 0.05;
    const ballGrad = ctx.createRadialGradient(bx - ballR * 0.3, by - ballR * 0.3, 0, bx, by, ballR);
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(0.7, "#e0e0e0");
    ballGrad.addColorStop(1, "#a0a0a0");
    ctx.beginPath();
    ctx.arc(bx, by, ballR, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
