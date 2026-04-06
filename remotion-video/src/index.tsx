import { registerRoot, Composition } from "remotion";
import React from "react";
import { SIGamblingLaunch } from "./SIGamblingLaunch";
import { DURATION_FRAMES, FPS, WIDTH, HEIGHT } from "./constants";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SIGamblingLaunch"
        component={SIGamblingLaunch}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

registerRoot(RemotionRoot);
