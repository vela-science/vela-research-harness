import {Audio} from '@remotion/media';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {CaptionTrack} from './captions/CaptionTrack';
import {CodexBuildDelta} from './scenes/CodexBuildDelta';
import {FidelityAudit} from './scenes/FidelityAudit';
import {OutcomeColdOpen} from './scenes/OutcomeColdOpen';
import {
  ArtifactProductSurface,
  MissionProductSurface,
  ObservatoryProductSurface,
  ReleaseProductSurface,
  ReproductionProductSurface,
  VelaProductSurface,
  VerifierProductSurface,
} from './scenes/ProductDemoScenes';
import {scenes} from './timing';

export const CanopusBuildWeek = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#081224'}}>
      <Sequence {...scenes.outcomeColdOpen} premountFor={30}>
        <OutcomeColdOpen />
      </Sequence>
      <Sequence {...scenes.authorityBoundary} premountFor={30}>
        <VelaProductSurface />
      </Sequence>
      <Sequence {...scenes.missionRegistration} premountFor={30}>
        <MissionProductSurface />
      </Sequence>
      <Sequence {...scenes.workerStream} premountFor={30}>
        <ArtifactProductSurface />
      </Sequence>
      <Sequence {...scenes.verifierFailClosed} premountFor={30}>
        <VerifierProductSurface />
      </Sequence>
      <Sequence {...scenes.retainedSuccess} premountFor={30}>
        <ObservatoryProductSurface />
      </Sequence>
      <Sequence {...scenes.fidelityAudit} premountFor={30}>
        <FidelityAudit />
      </Sequence>
      <Sequence {...scenes.releaseIdentity} premountFor={30}>
        <ReleaseProductSurface />
      </Sequence>
      <Sequence {...scenes.reproduction} premountFor={30}>
        <ReproductionProductSurface />
      </Sequence>
      <Sequence {...scenes.codexBuildDelta} premountFor={30}>
        <CodexBuildDelta />
      </Sequence>

      <Audio src={staticFile('audio/narration.wav')} />
      <CaptionTrack />
    </AbsoluteFill>
  );
};
