export const FPS = 30;
export const DURATION_FRAMES = 600; // 20s
export const WIDTH = 1280;
export const HEIGHT = 720;

// Brand colors — extracted from tailwind.config.ts & index.css
export const COLORS = {
  background: "#09090B",
  panel: "rgba(24, 24, 27, 0.94)",
  panelStrong: "rgba(39, 39, 42, 0.96)",
  panelSolid: "#18181B",
  border: "rgba(63, 63, 70, 0.95)",
  borderSolid: "#3F3F46",
  text: "#FAFAFA",
  muted: "#A1A1AA",
  cyan: "#10B981",
  cyanSoft: "#6EE7B7",
  orange: "#F59E0B",
  orangeSoft: "#FCD34D",
};

// Scene timing in frames (30fps)
export const SCENES = {
  intro: { start: 0, end: 90 },       // 0s – 3s
  casino: { start: 90, end: 210 },    // 3s – 7s
  betting: { start: 210, end: 330 },  // 7s – 11s
  gamification: { start: 330, end: 450 }, // 11s – 15s
  cta: { start: 450, end: 540 },      // 15s – 18s
  outro: { start: 540, end: 600 },    // 18s – 20s
};
