import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

interface Props {
  startFrame: number;
  endFrame: number;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
}

export const SceneFade: React.FC<Props> = ({
  startFrame,
  endFrame,
  children,
  fadeIn = 20,
  fadeOut = 15,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const duration = endFrame - startFrame;

  const opacity = interpolate(
    local,
    [0, fadeIn, duration - fadeOut, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame < startFrame || frame >= endFrame) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        background: COLORS.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
};
