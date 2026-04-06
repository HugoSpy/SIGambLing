import React from "react";
import { COLORS } from "../constants";

export const BackgroundGlow: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `
        radial-gradient(circle at 20% 20%, rgba(16,185,129,0.11) 0%, transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(245,158,11,0.07) 0%, transparent 35%),
        ${COLORS.background}
      `,
      zIndex: 0,
    }}
  />
);
