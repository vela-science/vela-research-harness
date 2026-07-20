import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'out', 'canopus-build-week.mp4');

const probe = JSON.parse(
  execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration,size:stream=index,codec_type,codec_name,pix_fmt,width,height,r_frame_rate,duration,nb_frames,sample_rate,channels',
      '-of',
      'json',
      output,
    ],
    {encoding: 'utf8'},
  ),
);

const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
const videoDuration = Number(video?.duration);
const audioDuration = Number(audio?.duration);
const durationDelta = Math.abs(videoDuration - audioDuration);

const requirements = {
  videoCodec: video?.codec_name === 'h264',
  dimensions: video?.width === 1920 && video?.height === 1080,
  frameRate: video?.r_frame_rate === '30/1',
  frameCount: Number(video?.nb_frames) === 4988,
  youtubePixelFormat: ['yuv420p', 'yuvj420p'].includes(video?.pix_fmt),
  audioCodec: audio?.codec_name === 'aac',
  sampleRate: Number(audio?.sample_rate) === 48000,
  duration: videoDuration >= 165 && videoDuration < 180,
  audioSync: durationDelta <= 0.1,
};

const failed = Object.entries(requirements)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

if (failed.length > 0) {
  throw new Error(`Render verification failed: ${failed.join(', ')}`);
}

const volumeOutput = execFileSync(
  'ffmpeg',
  ['-hide_banner', '-i', output, '-af', 'volumedetect', '-f', 'null', '-'],
  {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
);

const sha256 = createHash('sha256').update(readFileSync(output)).digest('hex');
const report = {
  schema: 'canopus.video-render-report.v1',
  composition: 'CanopusBuildWeek',
  remotion: '4.0.495',
  output: 'out/canopus-build-week.mp4',
  sha256,
  sizeBytes: Number(probe.format.size),
  video: {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    pixelFormat: video.pix_fmt,
    frameRate: video.r_frame_rate,
    frames: Number(video.nb_frames),
    durationSeconds: videoDuration,
  },
  audio: {
    codec: audio.codec_name,
    sampleRate: Number(audio.sample_rate),
    channels: Number(audio.channels),
    durationSeconds: audioDuration,
    syncDeltaSeconds: durationDelta,
  },
  requirements,
};

mkdirSync(path.join(root, 'out'), {recursive: true});
writeFileSync(
  path.join(root, 'out', 'render-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify(report, null, 2));
