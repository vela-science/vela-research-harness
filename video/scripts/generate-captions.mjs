import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const videoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(
  await readFile(resolve(videoRoot, 'src/data/script.json'), 'utf8'),
);

const words = (text) => text.trim().split(/\s+/u);

const splitForCaptions = (text, maxCharacters = 82) => {
  const sentenceParts = text.split(/(?<=[.!?])\s+(?=[A-Z])/u);
  const cues = [];

  for (const sentence of sentenceParts) {
    const sentenceStart = cues.length;
    let cue = '';
    for (const word of words(sentence)) {
      const next = cue ? `${cue} ${word}` : word;
      if (cue && next.length > maxCharacters) {
        cues.push(cue);
        cue = word;
      } else {
        cue = next;
      }
    }
    if (cue) cues.push(cue);

    if (cues.length - sentenceStart > 1) {
      const previousIndex = cues.length - 2;
      const finalIndex = cues.length - 1;
      const previousWords = words(cues[previousIndex]);
      const finalWords = words(cues[finalIndex]);
      while (finalWords.length < 3 && previousWords.length > 5) {
        finalWords.unshift(previousWords.pop());
      }
      cues[previousIndex] = previousWords.join(' ');
      cues[finalIndex] = finalWords.join(' ');
    }
  }

  return cues;
};

const wrapTwoLines = (text, lineTarget = 42) => {
  if (text.length <= lineTarget) return text;
  const tokens = words(text);
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < tokens.length; index += 1) {
    const first = tokens.slice(0, index).join(' ');
    const second = tokens.slice(index).join(' ');
    const distance = Math.abs(first.length - second.length);
    if (first.length <= 46 && second.length <= 46 && distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }

  return `${tokens.slice(0, bestIndex).join(' ')}\n${tokens.slice(bestIndex).join(' ')}`;
};

const formatTime = (milliseconds) => {
  const value = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  const millis = value % 1_000;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':') + `,${String(millis).padStart(3, '0')}`;
};

const captions = [];

for (const chapter of script) {
  const chunks = splitForCaptions(chapter.text);
  const weights = chunks.map((chunk) => words(chunk).length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const duration = chapter.endMs - chapter.startMs;
  let cursor = chapter.startMs;

  chunks.forEach((chunk, index) => {
    const isLast = index === chunks.length - 1;
    const end = isLast
      ? chapter.endMs
      : cursor + (duration * weights[index]) / totalWeight;
    captions.push({
      startMs: cursor,
      endMs: end - 40,
      text: wrapTwoLines(chunk),
    });
    cursor = end;
  });
}

const srt = captions
  .map(
    (caption, index) =>
      `${index + 1}\n${formatTime(caption.startMs)} --> ${formatTime(caption.endMs)}\n${caption.text}\n`,
  )
  .join('\n');

await writeFile(
  resolve(videoRoot, 'public/captions/canopus-build-week.srt'),
  srt,
  'utf8',
);

console.log(`Generated ${captions.length} caption cues`);
