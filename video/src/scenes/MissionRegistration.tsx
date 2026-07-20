import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {StatusPill} from '../components/Evidence';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

const missionRows = [
  ['model', evidence.formal.model],
  ['target', 'Erdős 505 · dimension one'],
  ['artifact', evidence.formal.artifact],
  ['verifier', `${evidence.formal.verifier} · frozen image`],
  ['forbidden', evidence.formal.forbidden.join(' · ')],
  ['policy', `${evidence.formal.expectedRoute} · accepted Δ ${evidence.formal.acceptedStateDelta}`],
];

const custody = ['Codex', 'Git', 'Docker', 'Vela', 'frontier', 'sandbox'];

export const MissionRegistration = () => {
  const frame = useCurrentFrame();

  return (
    <Scene eyebrow="Exact GPT-5.6 registration" chapter="03 / mission">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.86fr 1.14fr',
          gap: 92,
          height: '100%',
          alignItems: 'center',
        }}
      >
        <div style={enter(frame, 3, 28)}>
          <Label>Bound before the model sees the target</Label>
          <EditorialTitle style={{marginTop: 26, fontSize: 84}}>
            One target.
            <br />
            One artifact.
            <br />
            Zero authority.
          </EditorialTitle>
          <div style={{marginTop: 34}}>
            <RootText>{shortRoot(evidence.formal.profileRoot)}</RootText>
            <RootText>{shortRoot(evidence.formal.missionRoot)}</RootText>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${colors.darkBorder}`,
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: colors.darkInset,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 28px 80px rgba(5, 12, 24, 0.16)',
          }}
        >
          {missionRows.map(([label, value], index) => {
            const opacity = reveal(frame, 28 + index * 24, 18);
            return (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  alignItems: 'center',
                  minHeight: 78,
                  padding: '0 26px',
                  borderBottom:
                    index === missionRows.length - 1
                      ? 'none'
                      : `1px solid ${colors.darkBorder}`,
                  opacity,
                  transform: `translateX(${(1 - opacity) * 24}px)`,
                }}
              >
                <span
                  style={{
                    color: colors.mist,
                    fontFamily: type.mono,
                    fontSize: 17,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: label === 'model' ? colors.stardust : colors.light,
                    fontFamily: label === 'model' ? type.mono : type.sans,
                    fontSize: label === 'model' ? 25 : 23,
                    fontWeight: 580,
                  }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          bottom: 252,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            marginRight: 10,
            color: colors.mist,
            fontFamily: type.mono,
            fontSize: 16,
            textTransform: 'uppercase',
          }}
        >
          custody preflight
        </span>
        {custody.map((item, index) => (
          <div key={item} style={{opacity: reveal(frame, 190 + index * 16, 12)}}>
            <StatusPill tone="evidence">✓ {item}</StatusPill>
          </div>
        ))}
      </div>
    </Scene>
  );
};
