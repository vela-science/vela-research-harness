import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';

const captureRoot = path.resolve(process.cwd(), 'public/captures/product-demo');
const manifest = JSON.parse(
  readFileSync(path.join(captureRoot, 'manifest.json'), 'utf8'),
) as {captures: Array<{file: string; sha256: string}>};

describe('product demo captures', () => {
  it('binds every public browser capture by SHA-256', () => {
    for (const capture of manifest.captures) {
      const actual = createHash('sha256')
        .update(readFileSync(path.join(captureRoot, capture.file)))
        .digest('hex');
      expect(actual, capture.file).toBe(capture.sha256);
    }
  });
});
