import {useCurrentFrame} from 'remotion';
import {EvidenceChain} from '../components/Evidence';
import {Scene} from '../components/Scene';
import {Terminal} from '../components/Terminal';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const chain = [
  {label: 'Worker', detail: 'success'},
  {label: 'Artifact', detail: 'frozen'},
  {label: 'Lean verifier', detail: 'failed'},
  {label: 'Receipt', detail: 'not produced'},
  {label: 'Policy', detail: 'not reached'},
  {label: 'State', detail: 'unchanged'},
];

const absent = [
  ['Receipt', 'not produced'],
  ['proposal', 'not created'],
  ['policy route', 'not reached'],
  ['frontier commit', 'unchanged'],
  ['accepted Δ', '0'],
];

export const VerifierFailClosed = () => {
  const frame = useCurrentFrame();
  const stopAtVerifier = lineProgress(frame, 38, 150) * 0.4;

  return (
    <Scene eyebrow="Frozen Lean 4.27.0 replay" chapter="05 / fail closed">
      <div style={{paddingTop: 48}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            ...enter(frame, 2),
          }}
        >
          <div>
            <Label color={colors.darkConflict}>The candidate failed closed</Label>
            <EditorialTitle style={{marginTop: 18, fontSize: 74}}>
              A failed proof stays failed.
            </EditorialTitle>
          </div>
          <div style={{textAlign: 'right'}}>
            <div
              style={{
                color: colors.darkConflict,
                fontFamily: type.mono,
                fontSize: 38,
                letterSpacing: '0.08em',
              }}
            >
              EXIT 1
            </div>
            <RootText>{shortRoot(evidence.formal.verifierResultRoot)}</RootText>
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: '1.22fr 0.78fr',
            gap: 30,
          }}
        >
          <div style={{opacity: reveal(frame, 34, 20)}}>
            <Terminal title="exact frozen replay" tone="conflict">
              <span style={{color: colors.darkConflict}}>error: unsolved goals</span>
              {'\n'}S : Set (EuclideanSpace ℝ (Fin 1))
              {'\n'}hS : Bornology.IsBounded S
              {'\n'}hd : 0 &lt; diam S
              {'\n'}x : EuclideanSpace ℝ (Fin 1)
              {'\n'}⊢ EuclideanSpace.single 0 (x.ofLp 0) = x
              {'\n\n'}depends on axioms:
              {'\n'}[propext, <span style={{color: colors.darkConflict}}>sorryAx</span>, Classical.choice, Quot.sound]
            </Terminal>
          </div>

          <div
            style={{
              border: `1px solid ${colors.darkBorder}`,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: colors.darkInset,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.045)',
            }}
          >
            {absent.map(([label, value], index) => {
              const opacity = reveal(frame, 92 + index * 18, 12);
              return (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    minHeight: 73,
                    padding: '0 22px',
                    borderBottom:
                      index === absent.length - 1
                        ? 'none'
                        : `1px solid ${colors.darkBorder}`,
                    opacity,
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
                      color: value === '0' ? colors.light : colors.darkConflict,
                      fontFamily: type.mono,
                      fontSize: 18,
                    }}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{marginTop: 34}}>
          <EvidenceChain
            nodes={chain}
            progress={stopAtVerifier}
            stopTone="conflict"
          />
        </div>
      </div>
    </Scene>
  );
};
