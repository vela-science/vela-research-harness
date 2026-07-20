import {parseSrt} from '@remotion/captions';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from '../timing';

describe('burned-in caption track', () => {
  it('covers the approved narration within the film duration', async () => {
    const input = await readFile(
      resolve('public/captions/canopus-build-week.srt'),
      'utf8',
    );
    const {captions} = parseSrt({input});

    expect(captions.length).toBeGreaterThan(30);
    expect(captions[0]?.startMs).toBe(0);
    expect(captions.at(-1)?.endMs).toBeLessThanOrEqual(
      (TOTAL_FRAMES / FPS) * 1000,
    );

    for (const caption of captions) {
      const lines = caption.text.trim().split('\n');
      expect(lines.length).toBeLessThanOrEqual(2);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(46);
      expect(caption.endMs - caption.startMs).toBeGreaterThanOrEqual(760);
    }
  });
});
