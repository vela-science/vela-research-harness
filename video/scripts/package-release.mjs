import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
const release = path.join(out, 'release');

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

mkdirSync(release, {recursive: true});

execFileSync('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  path.join(out, 'cold-open-final.png'),
  '-vf',
  'scale=1800:1012,pad=1800:1200:0:94:color=0x081224',
  '-q:v',
  '2',
  path.join(out, 'canopus-build-week-thumbnail.jpg'),
]);

const files = [
  ['canopus-build-week.mp4', 'canopus-build-week-final.mp4'],
  [path.join('..', 'public', 'captions', 'canopus-build-week.srt'), 'canopus-build-week.en.srt'],
  ['canopus-build-week-thumbnail.jpg', 'canopus-build-week-thumbnail.jpg'],
  ['cold-open-final.png', 'gallery-01-result.png'],
  ['final-observatory.jpg', 'gallery-02-observatory.jpg'],
  ['final-end-card.jpg', 'gallery-03-end-card.jpg'],
  ['render-report.json', 'render-report.json'],
];

for (const [source, target] of files) {
  const sourcePath = source.startsWith('..') ? path.resolve(out, source) : path.join(out, source);
  copyFileSync(sourcePath, path.join(release, target));
}

const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: path.resolve(root, '..'),
  encoding: 'utf8',
}).trim();

const packaged = files.map(([, target]) => ({
  file: target,
  sha256: hash(path.join(release, target)),
}));

const manifest = {
  schema: 'canopus.build-week-video-package.v1',
  title: 'Canopus: Bounded Research for Codex',
  tagline: 'Give Codex a mission. Verify the work. Keep humans in authority.',
  runtimeSeconds: 166.266667,
  uploadStatus: 'local-only',
  sourceBaseCommit: baseCommit,
  primaryRun: 'run_f68e4cfc-e5c7-4c73-86cb-d79807c47ec4',
  scientificResult: {
    target: 'a(24)',
    baseline: 7193,
    candidate: 7194,
    checkedPairSums: 25880415,
    collisions: 0,
    route: 'defer',
    acceptedStateDelta: 0,
  },
  files: packaged,
};

writeFileSync(path.join(release, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
