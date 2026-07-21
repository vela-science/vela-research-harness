import {describe, expect, it} from 'vitest';
import {colors, type} from './tokens';

describe('stable Vela film identity', () => {
  it('keeps the approved primary and semantic colors', () => {
    expect(colors).toMatchObject({
      midnight: '#081224',
      stardust: '#C9A664',
      light: '#F7F6F2',
      evidence: '#4F8F8B',
      progress: '#6E9F77',
      caution: '#B7832F',
      conflict: '#9C3F4A',
    });
  });

  it('uses Vela editorial, product, and evidence type roles', () => {
    expect(type).toEqual({
      display: 'Newsreader Display',
      sans: 'IBM Plex Mono',
      mono: 'IBM Plex Mono',
    });
  });
});
