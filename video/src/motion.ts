import {interpolate, spring} from 'remotion';

export const reveal = (
  frame: number,
  start: number,
  durationInFrames = 18,
) =>
  interpolate(frame, [start, start + durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const fadeWindow = (
  frame: number,
  durationInFrames: number,
  fadeIn = 14,
  fadeOut = 14,
) =>
  interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

export const enter = (frame: number, start: number, distance = 24) => {
  const progress = spring({
    frame: frame - start,
    fps: 30,
    config: {damping: 200, stiffness: 120, mass: 0.8},
    durationInFrames: 28,
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`,
  };
};

export const lineProgress = (
  frame: number,
  start: number,
  end: number,
) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

