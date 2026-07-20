import {readFile, readdir} from 'node:fs/promises';
import {extname, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const forbidden = [
  '/Users/',
  '.canopus/runs',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN',
  'Bearer ',
  'isolated-home',
];

const textExtensions = new Set([
  '.css',
  '.json',
  '.md',
  '.mjs',
  '.srt',
  '.svg',
  '.ts',
  '.tsx',
]);

const collectTextFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectTextFiles(path);
      if (entry.name === 'privacy.test.ts') return [];
      return textExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return files.flat();
};

describe('public video assets', () => {
  it('do not contain private run or credential material', async () => {
    const roots = [resolve('src'), resolve('public')];
    const files = (await Promise.all(roots.map(collectTextFiles))).flat();
    const violations: string[] = [];

    for (const file of files) {
      const text = await readFile(file, 'utf8');
      for (const fragment of forbidden) {
        if (text.includes(fragment)) violations.push(`${file}: ${fragment}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
