import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {StatusPill} from '../components/Evidence';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

export const ReleaseIdentity = () => {
  const frame = useCurrentFrame();

  return (
    <Scene eyebrow="Public package · trusted publishing" chapter="08 / release">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 0.9fr',
          gap: 90,
          alignItems: 'center',
          height: '100%',
        }}
      >
        <div style={enter(frame, 2)}>
          <Label>Published during Build Week</Label>
          <EditorialTitle style={{marginTop: 24, fontSize: 76}}>
            @vela-science/
            <br />
            canopus
          </EditorialTitle>
          <div
            style={{
              marginTop: 28,
              color: colors.stardust,
              fontFamily: type.mono,
              fontSize: 52,
            }}
          >
            v{evidence.release.canopusVersion}
          </div>
        </div>

        <div
          style={{
            padding: '34px 36px',
            border: `1px solid ${colors.darkBorder}`,
            borderRadius: 24,
            backgroundColor: colors.darkInset,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 30px 90px rgba(5, 12, 24, 0.22)',
            opacity: reveal(frame, 20, 18),
          }}
        >
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            <StatusPill tone="evidence">trusted publishing</StatusPill>
            <StatusPill tone="progress">SLSA provenance</StatusPill>
          </div>
          <div
            style={{
              marginTop: 38,
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <div
              style={{
                padding: '24px 20px',
                border: `1px solid ${colors.darkBorder}`,
                borderRadius: 16,
                textAlign: 'center',
              }}
            >
              <div style={{fontFamily: type.mono, color: colors.mist, fontSize: 17}}>npm tarball</div>
            </div>
            <div style={{fontFamily: type.mono, color: colors.stardust, fontSize: 34}}>==</div>
            <div
              style={{
                padding: '24px 20px',
                border: `1px solid ${colors.darkBorder}`,
                borderRadius: 16,
                textAlign: 'center',
              }}
            >
              <div style={{fontFamily: type.mono, color: colors.mist, fontSize: 17}}>GitHub asset</div>
            </div>
          </div>
          <div style={{marginTop: 30, display: 'grid', gap: 9}}>
            <RootText>commit: {evidence.release.canopusCommit.slice(0, 12)}</RootText>
            <RootText>{shortRoot(evidence.release.packageSha256)}</RootText>
            <RootText>Vela {evidence.release.velaVersion} · Observatory {evidence.release.observatoryVersion}</RootText>
          </div>
        </div>
      </div>
    </Scene>
  );
};
