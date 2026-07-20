export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const TOTAL_FRAMES = 4988;

export const scenes = {
  outcomeColdOpen: {from: 0, durationInFrames: 360},
  authorityBoundary: {from: 360, durationInFrames: 474},
  missionRegistration: {from: 834, durationInFrames: 786},
  workerStream: {from: 1620, durationInFrames: 456},
  verifierFailClosed: {from: 2076, durationInFrames: 570},
  retainedSuccess: {from: 2646, durationInFrames: 741},
  fidelityAudit: {from: 3387, durationInFrames: 582},
  releaseIdentity: {from: 3969, durationInFrames: 300},
  reproduction: {from: 4269, durationInFrames: 213},
  codexBuildDelta: {from: 4482, durationInFrames: 506},
} as const;

