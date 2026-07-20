import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {StatusPill} from '../components/Evidence';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

const deterministic = [
  'source run bound',
  'artifact root matched',
  'all five Vela roots bound',
  'numeric correspondence matched',
  'verification ≠ acceptance',
];

const semantic = [
  ['universal claim', 'not detected'],
  ['“solved” language', 'not detected'],
  ['classification', 'model_assessment'],
  ['scientific state', 'not landed'],
];

export const FidelityAudit = () => {
  const frame = useCurrentFrame();

  return (
    <Scene eyebrow="GPT-5.6 claim-fidelity audit" chapter="07 / advisory" dark={false}>
      <div style={{paddingTop: 48}}>
        <div style={enter(frame, 2)}>
          <Label color="#2F6F6B">Immutable evidence, separate assessment</Label>
          <EditorialTitle dark={false} style={{marginTop: 18, fontSize: 72}}>
            Deterministic facts on the left.
            <br />
            Model judgment on the right.
          </EditorialTitle>
        </div>

        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 30,
          }}
        >
          <div style={{overflow: 'hidden', border: '1px solid #D9DBDF', borderRadius: 22, backgroundColor: '#FBFAF7', boxShadow: '0 22px 64px rgba(8, 18, 36, 0.07)'}}>
            <div
              style={{
                height: 58,
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                borderBottom: '1px solid #D9DBDF',
                color: '#2F6F6B',
                fontFamily: type.mono,
                fontSize: 17,
                textTransform: 'uppercase',
              }}
            >
              deterministic checks
            </div>
            {deterministic.map((check, index) => (
              <div
                key={check}
                style={{
                  minHeight: 58,
                  padding: '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom:
                    index === deterministic.length - 1
                      ? 'none'
                      : '1px solid #E9EBEF',
                  opacity: reveal(frame, 30 + index * 16, 12),
                }}
              >
                <span style={{fontSize: 22, color: colors.slate}}>{check}</span>
                <span style={{color: '#2F6F6B', fontFamily: type.mono}}>✓ pass</span>
              </div>
            ))}
          </div>

          <div style={{overflow: 'hidden', border: `1px solid ${colors.caution}`, borderRadius: 22, backgroundColor: '#F7F1E5', boxShadow: '0 22px 64px rgba(8, 18, 36, 0.07)'}}>
            <div
              style={{
                height: 58,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                borderBottom: `1px solid ${colors.caution}`,
                color: '#805A16',
                fontFamily: type.mono,
                fontSize: 17,
                textTransform: 'uppercase',
              }}
            >
              <span>semantic layer</span>
              <StatusPill tone="caution">GPT-5.6</StatusPill>
            </div>
            {semantic.map(([label, value], index) => (
              <div
                key={label}
                style={{
                  minHeight: 72,
                  padding: '0 24px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  borderBottom:
                    index === semantic.length - 1
                      ? 'none'
                      : '1px solid rgba(183, 131, 47, 0.28)',
                  opacity: reveal(frame, 42 + index * 20, 12),
                }}
              >
                <span style={{fontSize: 21, color: colors.slate}}>{label}</span>
                <span
                  style={{
                    color: '#805A16',
                    fontFamily: type.mono,
                    fontSize: 17,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'space-between',
            opacity: reveal(frame, 118, 18),
          }}
        >
          <RootText dark={false}>{shortRoot(evidence.audit.assessmentRoot)}</RootText>
          <div
            style={{
              color: colors.conflict,
              fontFamily: type.mono,
              fontSize: 18,
              textTransform: 'uppercase',
            }}
          >
            advisory only · not scientific state
          </div>
        </div>
      </div>
    </Scene>
  );
};
