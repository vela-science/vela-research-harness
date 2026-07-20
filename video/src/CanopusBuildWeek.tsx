import {Audio} from '@remotion/media';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {CaptionTrack} from './captions/CaptionTrack';
import {AuthorityBoundary} from './scenes/AuthorityBoundary';
import {CodexBuildDelta} from './scenes/CodexBuildDelta';
import {FidelityAudit} from './scenes/FidelityAudit';
import {MissionRegistration} from './scenes/MissionRegistration';
import {OutcomeColdOpen} from './scenes/OutcomeColdOpen';
import {ReleaseIdentity} from './scenes/ReleaseIdentity';
import {Reproduction} from './scenes/Reproduction';
import {RetainedSuccess} from './scenes/RetainedSuccess';
import {VerifierFailClosed} from './scenes/VerifierFailClosed';
import {WorkerStream} from './scenes/WorkerStream';
import {scenes} from './timing';

export const CanopusBuildWeek = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#081224'}}>
      <Sequence {...scenes.outcomeColdOpen} premountFor={30}>
        <OutcomeColdOpen />
      </Sequence>
      <Sequence {...scenes.authorityBoundary} premountFor={30}>
        <AuthorityBoundary />
      </Sequence>
      <Sequence {...scenes.missionRegistration} premountFor={30}>
        <MissionRegistration />
      </Sequence>
      <Sequence {...scenes.workerStream} premountFor={30}>
        <WorkerStream />
      </Sequence>
      <Sequence {...scenes.verifierFailClosed} premountFor={30}>
        <VerifierFailClosed />
      </Sequence>
      <Sequence {...scenes.retainedSuccess} premountFor={30}>
        <RetainedSuccess />
      </Sequence>
      <Sequence {...scenes.fidelityAudit} premountFor={30}>
        <FidelityAudit />
      </Sequence>
      <Sequence {...scenes.releaseIdentity} premountFor={30}>
        <ReleaseIdentity />
      </Sequence>
      <Sequence {...scenes.reproduction} premountFor={30}>
        <Reproduction />
      </Sequence>
      <Sequence {...scenes.codexBuildDelta} premountFor={30}>
        <CodexBuildDelta />
      </Sequence>

      <Audio src={staticFile('audio/narration.wav')} />
      <CaptionTrack />
    </AbsoluteFill>
  );
};
