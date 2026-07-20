import {describe, expect, it} from 'vitest';
import {FPS, scenes, TOTAL_FRAMES} from './timing';

describe('film timeline', () => {
  it('is contiguous and strictly under three minutes', () => {
    const ranges = Object.values(scenes);
    expect(ranges[0]?.from).toBe(0);

    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1];
      const current = ranges[index];
      expect(current.from).toBe(previous.from + previous.durationInFrames);
    }

    const final = ranges.at(-1);
    expect(final && final.from + final.durationInFrames).toBe(TOTAL_FRAMES);
    expect(TOTAL_FRAMES / FPS).toBeLessThan(180);
  });
});

