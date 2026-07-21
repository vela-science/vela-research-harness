import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const videoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(
  await readFile(resolve(videoRoot, 'src/data/script.json'), 'utf8'),
);
const work = await mkdtemp(join(tmpdir(), 'canopus-narration-'));
const clips = [];

try {
  for (const [index, chapter] of script.entries()) {
    const stem = String(index + 1).padStart(2, '0');
    const textPath = join(work, `${stem}.txt`);
    const rawPath = join(work, `${stem}.aiff`);
    const clipPath = join(work, `${stem}.wav`);
    const targetDuration = (chapter.endMs - chapter.startMs) / 1000;
    const speechDuration = Math.max(0.5, targetDuration - 0.32);

    await writeFile(textPath, `${chapter.text}\n`, 'utf8');
    execFileSync('say', ['-v', 'Samantha', '-r', '158', '-f', textPath, '-o', rawPath]);

    const rawDuration = Number(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', rawPath],
        {encoding: 'utf8'},
      ).trim(),
    );
    const tempo = rawDuration / speechDuration;
    if (tempo < 0.5 || tempo > 2) {
      throw new Error(`Narration tempo ${tempo.toFixed(3)} is unsafe for chapter ${stem}`);
    }

    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', rawPath,
      '-af', `atempo=${tempo.toFixed(8)},apad,atrim=duration=${targetDuration.toFixed(3)}`,
      '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', clipPath,
    ]);
    clips.push(clipPath);
  }

  const concatPath = join(work, 'concat.txt');
  await writeFile(
    concatPath,
    clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n') + '\n',
    'utf8',
  );

  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', concatPath,
    '-af', 'loudnorm=I=-16:LRA=7:TP=-1.5,apad=whole_dur=166.245,atrim=duration=166.245',
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
    resolve(videoRoot, 'public/audio/narration.wav'),
  ]);
} finally {
  await rm(work, {recursive: true, force: true});
}

console.log('Generated 166.245-second Samantha narration');
