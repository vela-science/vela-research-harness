import {describe, expect, it} from 'vitest';
import {lineProgress, reveal} from './motion';

describe('deterministic film motion', () => {
  it('clamps reveals and authority progress', () => {
    expect(reveal(-10, 0)).toBe(0);
    expect(reveal(100, 0)).toBe(1);
    expect(lineProgress(5, 10, 20)).toBe(0);
    expect(lineProgress(25, 10, 20)).toBe(1);
  });
});

