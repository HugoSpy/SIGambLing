import React from "react";
import { Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, DURATION_FRAMES, SCENES } from "./constants";
import { SIGambLingLogo } from "./components/SIGambLingLogo";
import { FeatureCard } from "./components/FeatureCard";
import { SceneFade } from "./components/SceneFade";
import { BackgroundGlow } from "./components/BackgroundGlow";

// ─── Intro Scene [0 → 3s] ────────────────────────────────────────────────────
const IntroScene: React.FC = () => {
  const { start, end } = SCENES.intro;
  return (
    <SceneFade startFrame={start} endFrame={end} fadeIn={18} fadeOut={18}>
      <BackgroundGlow />
      <div style={{ position: "relative", zIndex: 1 }}>
        <SIGambLingLogo startFrame={start} size={88} subtitle />
      </div>
    </SceneFade>
  );
};

// ─── Casino Scene [3s → 7s] ───────────────────────────────────────────────────
const CasinoScene: React.FC = () => {
  const { start, end } = SCENES.casino;
  return (
    <SceneFade startFrame={start} endFrame={end}>
      <BackgroundGlow />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <FeatureCard
          startFrame={start}
          icon="🎰"
          title="Casino"
          items={["Roulette Européenne", "Blackjack"]}
          countLabel="2 jeux disponibles"
        />
      </div>
    </SceneFade>
  );
};

// ─── Betting Scene [7s → 11s] ─────────────────────────────────────────────────
const BettingScene: React.FC = () => {
  const { start, end } = SCENES.betting;
  return (
    <SceneFade startFrame={start} endFrame={end}>
      <BackgroundGlow />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <FeatureCard
          startFrame={start}
          icon="⚡"
          title="Paris & Événements"
          items={["Paris simples", "Paris combinés", "Cotes en temps réel"]}
        />
      </div>
    </SceneFade>
  );
};

// ─── Gamification Scene [11s → 15s] ──────────────────────────────────────────
const GamificationScene: React.FC = () => {
  const { start, end } = SCENES.gamification;
  return (
    <SceneFade startFrame={start} endFrame={end}>
      <BackgroundGlow />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <FeatureCard
          startFrame={start}
          icon="🏆"
          title="Classement & Récompenses"
          items={["Jackpot progressif", "Badges", "Récompenses journalières"]}
        />
      </div>
    </SceneFade>
  );
};

// ─── CTA Scene [15s → 18s] ────────────────────────────────────────────────────
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, end } = SCENES.cta;
  const local = frame - start;

  const bgOpacity = interpolate(local, [0, 20, (end - start) - 15, end - start], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mainProgress = spring({
    frame: local,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
    durationInFrames: 35,
  });
  const mainScale = interpolate(mainProgress, [0, 1], [0.94, 1]);
  const mainOpacity = interpolate(local, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(local, [22, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlY = interpolate(
    spring({
      frame: Math.max(0, local - 20),
      fps,
      config: { damping: 22, stiffness: 62 },
      durationInFrames: 30,
    }),
    [0, 1],
    [16, 0]
  );

  if (frame < start || frame >= end) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: bgOpacity,
        background: `radial-gradient(circle at 50% 50%, rgba(16,185,129,0.09) 0%, transparent 55%), ${COLORS.background}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      {/* Token badge */}
      <div
        style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.28)",
          borderRadius: 14,
          padding: "10px 24px",
          opacity: mainOpacity,
          transform: `scale(${mainScale})`,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.cyanSoft,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Offre de lancement
        </span>
      </div>

      {/* Main CTA text */}
      <div
        style={{
          opacity: mainOpacity,
          transform: `scale(${mainScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 62,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          1 000 jetons offerts
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 500,
            color: COLORS.muted,
            letterSpacing: "-0.01em",
          }}
        >
          à l'inscription
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          transform: `translateY(${urlY}px)`,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.cyan,
          letterSpacing: "0.01em",
        }}
      >
        sigambling.fr
      </div>
    </div>
  );
};

// ─── Outro Scene [18s → 20s] ──────────────────────────────────────────────────
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { start, end } = SCENES.outro;
  const local = frame - start;

  const bgOpacity = interpolate(local, [0, 15, (end - start) - 10, end - start], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const footerOpacity = interpolate(local, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < start || frame >= end) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: bgOpacity,
        background: COLORS.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }}
    >
      <BackgroundGlow />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <SIGambLingLogo startFrame={start} size={72} />
        <div
          style={{
            opacity: footerOpacity,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 500,
            color: COLORS.muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          EPITA SIGL 2027
        </div>
      </div>
    </div>
  );
};

// ─── Background Music ─────────────────────────────────────────────────────────
const BackgroundMusic: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeInFrames = 30;  // 1s
  const fadeOutFrames = 30; // 1s

  const volume = interpolate(
    frame,
    [0, fadeInFrames, DURATION_FRAMES - fadeOutFrames, DURATION_FRAMES],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return <Audio src={staticFile("music.mp3")} volume={volume} />;
};

// ─── Main Composition ─────────────────────────────────────────────────────────
export const SIGamblingLaunch: React.FC = () => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: COLORS.background,
        fontFamily: "'Space Grotesk', sans-serif",
        overflow: "hidden",
      }}
    >
      <BackgroundMusic />
      <IntroScene />
      <CasinoScene />
      <BettingScene />
      <GamificationScene />
      <CTAScene />
      <OutroScene />
    </div>
  );
};
