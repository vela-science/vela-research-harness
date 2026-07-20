import {describe, expect, it} from 'vitest';
import {scenes, TOTAL_FRAMES} from './timing';

describe('Canopus Build Week composition', () => {
  it('mounts the ten locked chapters', () => {
    expect(Object.keys(scenes)).toHaveLength(10);
    const frames = Object.values(scenes).reduce(
      (sum, scene) => sum + scene.durationInFrames,
      0,
    );
    expect(frames).toBe(TOTAL_FRAMES);
  });
});
