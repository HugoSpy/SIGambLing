import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

interface Props {
  startFrame: number;
  icon: string;
  title: string;
  items: string[];
  countLabel?: string;
}

export const FeatureCard: React.FC<Props> = ({
  startFrame,
  icon,
  title,
  items,
  countLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const cardProgress = spring({
    frame: local,
    fps,
    config: { damping: 22, stiffness: 65, mass: 1 },
    durationInFrames: 35,
  });
  const cardOpacity = interpolate(local, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(cardProgress, [0, 1], [40, 0]);

  // Title fade
  const titleOpacity = interpolate(local, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: 0,
      }}
    >
      {/* Card */}
      <div
        style={{
          background: "rgba(24,24,27,0.92)",
          border: `1px solid ${COLORS.borderSolid}`,
          borderRadius: 24,
          padding: "48px 60px",
          minWidth: 560,
          maxWidth: 640,
          backdropFilter: "blur(12px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.08)",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              fontSize: 42,
              lineHeight: 1,
              background: "rgba(16,185,129,0.12)",
              borderRadius: 14,
              width: 68,
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(16,185,129,0.2)",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.text,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>

        {/* Items with stagger */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item, i) => {
            const itemDelay = 18 + i * 12;
            const itemProgress = spring({
              frame: Math.max(0, local - itemDelay),
              fps,
              config: { damping: 24, stiffness: 70, mass: 0.8 },
              durationInFrames: 28,
            });
            const itemOpacity = interpolate(
              local - itemDelay,
              [0, 16],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const itemX = interpolate(itemProgress, [0, 1], [-16, 0]);

            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: COLORS.cyan,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20,
                    color: COLORS.muted,
                    fontWeight: 500,
                  }}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>

        {/* Count label */}
        {countLabel && (
          <CountLabel
            label={countLabel}
            startFrame={startFrame}
            delay={30 + items.length * 12}
          />
        )}
      </div>
    </div>
  );
};

const CountLabel: React.FC<{
  label: string;
  startFrame: number;
  delay: number;
}> = ({ label, startFrame, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame - delay;

  const progress = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 20, stiffness: 60 },
    durationInFrames: 30,
  });
  const opacity = interpolate(local, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(progress, [0, 1], [0.88, 1]);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(16,185,129,0.1)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: 10,
        padding: "8px 18px",
        alignSelf: "flex-start",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: COLORS.cyanSoft,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
};
