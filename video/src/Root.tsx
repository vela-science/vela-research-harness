import "./index.css";
import {Composition} from 'remotion';
import {CanopusBuildWeek} from './CanopusBuildWeek';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timing';

export const RemotionRoot = () => (
  <Composition
    id="CanopusBuildWeek"
    component={CanopusBuildWeek}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
