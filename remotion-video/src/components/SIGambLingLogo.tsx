import React from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

interface Props {
  startFrame: number;
  size?: number;
  subtitle?: boolean;
}

export const SIGambLingLogo: React.FC<Props> = ({
  startFrame,
  size = 72,
  subtitle = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 60, mass: 1 },
    durationInFrames: 40,
  });

  const opacity = interpolate(localFrame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(progress, [0, 1], [28, 0]);

  const subtitleOpacity = interpolate(localFrame, [30, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleY = interpolate(
    spring({
      frame: Math.max(0, localFrame - 28),
      fps,
      config: { damping: 20, stiffness: 55, mass: 1 },
      durationInFrames: 35,
    }),
    [0, 1],
    [20, 0]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Logo wordmark */}
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span style={{ color: COLORS.text }}>SIG</span>
        <span style={{ color: "rgba(250,250,250,0.72)" }}>amb</span>
        <span style={{ color: "rgba(250,250,250,0.72)", letterSpacing: "-0.03em" }}>
          <span style={{ color: COLORS.cyan }}>L</span>ing
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: Math.round(size * 0.28),
            fontWeight: 500,
            color: COLORS.muted,
            letterSpacing: "0.01em",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            display: "flex",
            gap: 6,
          }}
        >
          <span>La plateforme de paris des</span>
          <span style={{ color: COLORS.cyan, fontWeight: 700 }}>SIGL 2027</span>
        </div>
      )}
    </div>
  );
};
