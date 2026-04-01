import * as THREE from "three";
import { NUMBER_COLORS, UI_COLORS, WHEEL_SEQUENCE } from "../rouletteConstants";
import type { RouletteNumber } from "../../../types/roulette";

type WheelMode = "three" | "canvas";

const DEFAULT_SIZE = 600;
const GOLD = "#F5C35B";
const WHEEL_THICKNESS = 34;
const WHEEL_RADIUS = 200;
const INNER_DISC_RADIUS = 64;
const LABEL_RADIUS = 148;
const SEGMENT_ANGLE = (Math.PI * 2) / WHEEL_SEQUENCE.length;

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function toNumberColor(value: string) {
  return new THREE.Color(value).getHex();
}

export class RouletteWheel3D {
  private readonly canvas: HTMLCanvasElement;
  private mode: WheelMode = "three";
  private width = DEFAULT_SIZE;
  private height = DEFAULT_SIZE;
  private pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  private currentRotation = Math.random() * Math.PI * 2;
  private animationFrameId: number | null = null;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private wheelGroup: THREE.Group | null = null;
  private wheelTexture: THREE.CanvasTexture | null = null;

  private fallbackContext: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    try {
      this.initializeThreeRenderer();
    } catch {
      this.initializeCanvasFallback();
    }

    this.setSize(DEFAULT_SIZE, DEFAULT_SIZE);
    this.render();
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

    this.render();
  }

  async spin(targetNumber: RouletteNumber, duration = 4000) {
    const targetIndex = WHEEL_SEQUENCE.indexOf(targetNumber);

    if (targetIndex < 0) {
      return;
    }

    const startRotation = this.currentRotation;
    const baseTarget = -targetIndex * SEGMENT_ANGLE;
    const normalizedDelta =
      ((baseTarget - startRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const extraTurns = (4 + Math.random() * 2) * Math.PI * 2;
    const finalRotation = startRotation + extraTurns + normalizedDelta;

    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = easeOutCubic(progress);

        this.currentRotation = startRotation + (finalRotation - startRotation) * eased;
        this.applyRotation();
        this.render();

        if (progress < 1) {
          this.animationFrameId = window.requestAnimationFrame(step);
          return;
        }

        this.animationFrameId = null;
        this.currentRotation = finalRotation;
        this.applyRotation();
        this.render();
        resolve();
      };

      this.animationFrameId = window.requestAnimationFrame(step);
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
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.wheelGroup) {
      this.wheelGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();

          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    this.wheelTexture?.dispose();
    this.renderer?.dispose();
  }

  private initializeThreeRenderer() {
    this.mode = "three";
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(UI_COLORS.background);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera.position.set(0, 260, 500);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.35);
    directionalLight.position.set(160, 320, 260);
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-260, 180, -160);

    this.scene.add(ambientLight, directionalLight, rimLight);

    this.wheelTexture = this.createWheelTexture();

    const baseWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_THICKNESS, 37),
      new THREE.MeshStandardMaterial({
        map: this.wheelTexture,
        roughness: 0.76,
        metalness: 0.08,
      }),
    );

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(WHEEL_RADIUS - 10, 12, 18, 96),
      new THREE.MeshStandardMaterial({
        color: toNumberColor(GOLD),
        roughness: 0.34,
        metalness: 0.38,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = WHEEL_THICKNESS / 2 + 4;

    const innerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(110, 110, 16, 64),
      new THREE.MeshStandardMaterial({
        color: toNumberColor("#173548"),
        roughness: 0.66,
        metalness: 0.14,
      }),
    );
    innerDisc.position.y = WHEEL_THICKNESS / 2 + 8;

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(INNER_DISC_RADIUS, 24, 48, 32),
      new THREE.MeshStandardMaterial({
        color: toNumberColor("#F59E0B"),
        roughness: 0.28,
        metalness: 0.52,
      }),
    );
    hub.position.y = WHEEL_THICKNESS / 2 + 32;

    this.wheelGroup = new THREE.Group();
    this.wheelGroup.add(baseWheel, rim, innerDisc, hub);
    this.scene.add(this.wheelGroup);

    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(234, 246, 24, 64),
      new THREE.MeshStandardMaterial({
        color: toNumberColor("#0A1628"),
        roughness: 0.88,
        metalness: 0.1,
      }),
    );
    basePlate.position.y = -26;
    this.scene.add(basePlate);

    this.applyRotation();
  }

  private initializeCanvasFallback() {
    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D unavailable");
    }

    this.mode = "canvas";
    this.fallbackContext = context;
  }

  private createWheelTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 2048;
    textureCanvas.height = 2048;

    const context = textureCanvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to build wheel texture");
    }

    const size = textureCanvas.width;
    const center = size / 2;
    const outerRadius = size * 0.46;
    const innerRadius = size * 0.22;

    context.clearRect(0, 0, size, size);
    context.fillStyle = "#08131f";
    context.fillRect(0, 0, size, size);

    WHEEL_SEQUENCE.forEach((number, index) => {
      const startAngle = -Math.PI / 2 - SEGMENT_ANGLE / 2 + index * SEGMENT_ANGLE;
      const endAngle = startAngle + SEGMENT_ANGLE;

      context.beginPath();
      context.arc(center, center, outerRadius, startAngle, endAngle);
      context.arc(center, center, innerRadius, endAngle, startAngle, true);
      context.closePath();
      context.fillStyle =
        number === 0 ? "#0E8F4D" : NUMBER_COLORS[number] === "red" ? "#B91C3A" : "#172D3D";
      context.fill();

      context.lineWidth = 8;
      context.strokeStyle = "rgba(255,255,255,0.12)";
      context.stroke();

      const labelAngle = startAngle + SEGMENT_ANGLE / 2;
      const labelX = center + Math.cos(labelAngle) * (innerRadius + outerRadius) * 0.5;
      const labelY = center + Math.sin(labelAngle) * (innerRadius + outerRadius) * 0.5;

      context.save();
      context.translate(labelX, labelY);
      context.rotate(labelAngle + Math.PI / 2);
      context.fillStyle = "#ffffff";
      context.font = "bold 66px 'Space Grotesk', sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(number), 0, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, innerRadius, 0, Math.PI * 2);
    context.fillStyle = "#112637";
    context.fill();

    context.lineWidth = 28;
    context.strokeStyle = GOLD;
    context.beginPath();
    context.arc(center, center, outerRadius - 18, 0, Math.PI * 2);
    context.stroke();

    context.lineWidth = 18;
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.beginPath();
    context.arc(center, center, innerRadius + 16, 0, Math.PI * 2);
    context.stroke();

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private applyRotation() {
    if (this.mode === "three" && this.wheelGroup) {
      this.wheelGroup.rotation.y = this.currentRotation;
    }
  }

  private drawCanvasFallback() {
    if (!this.fallbackContext) {
      return;
    }

    const context = this.fallbackContext;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const outerRadius = Math.min(this.width, this.height) * 0.43;
    const innerRadius = outerRadius * 0.38;

    context.clearRect(0, 0, this.width, this.height);

    context.fillStyle = UI_COLORS.background;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    context.translate(centerX, centerY);
    context.rotate(this.currentRotation);

    WHEEL_SEQUENCE.forEach((number, index) => {
      const startAngle = -Math.PI / 2 - SEGMENT_ANGLE / 2 + index * SEGMENT_ANGLE;
      const endAngle = startAngle + SEGMENT_ANGLE;

      context.beginPath();
      context.arc(0, 0, outerRadius, startAngle, endAngle);
      context.arc(0, 0, innerRadius, endAngle, startAngle, true);
      context.closePath();
      context.fillStyle =
        number === 0 ? "#118552" : NUMBER_COLORS[number] === "red" ? "#C72C54" : "#203646";
      context.fill();

      context.strokeStyle = "rgba(255,255,255,0.1)";
      context.lineWidth = 2;
      context.stroke();

      const labelAngle = startAngle + SEGMENT_ANGLE / 2;
      const labelX = Math.cos(labelAngle) * LABEL_RADIUS * (outerRadius / WHEEL_RADIUS);
      const labelY = Math.sin(labelAngle) * LABEL_RADIUS * (outerRadius / WHEEL_RADIUS);

      context.save();
      context.translate(labelX, labelY);
      context.rotate(labelAngle + Math.PI / 2);
      context.fillStyle = "#ffffff";
      context.font = `700 ${Math.max(18, outerRadius * 0.12)}px 'Space Grotesk', sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(number), 0, 0);
      context.restore();
    });

    context.restore();

    context.beginPath();
    context.arc(centerX, centerY, outerRadius + 10, 0, Math.PI * 2);
    context.lineWidth = 16;
    context.strokeStyle = GOLD;
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    context.fillStyle = "#143044";
    context.fill();

    context.beginPath();
    context.arc(centerX, centerY, innerRadius * 0.44, 0, Math.PI * 2);
    context.fillStyle = "#F59E0B";
    context.fill();
  }
}
