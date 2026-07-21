import {useCurrentFrame} from 'remotion';
import {EvidenceChain, StatusPill} from '../components/Evidence';
import {Scene} from '../components/Scene';
import {Terminal} from '../components/Terminal';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const chain = [
  {label: 'Artifact', detail: '359,754 bytes'},
  {label: 'Parse', detail: '7,194 distinct'},
  {label: 'Enumerate', detail: '25,880,415'},
  {label: 'Uniqueness', detail: 'all distinct'},
  {label: 'Verifier', detail: 'exit 0'},
  {label: 'Receipt', detail: 'root-bound'},
];

const checks = [
  ['dimension', '24'],
  ['points', '7,194'],
  ['pair sums', '25,880,415'],
  ['collisions', '0'],
  ['result', 'PASS'],
];

export const VerifierFailClosed = () => {
  const frame = useCurrentFrame();
  const progress = lineProgress(frame, 38, 170);

  return (
    <Scene eyebrow="Separate frozen verifier" chapter="05 / verify">
      <div style={{paddingTop: 48}}>
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', ...enter(frame, 2)}}>
          <div>
            <Label color={colors.progress}>The artifact does not grade itself</Label>
            <EditorialTitle style={{marginTop: 18, fontSize: 74}}>
              Every sum. Independently checked.
            </EditorialTitle>
          </div>
          <div style={{textAlign: 'right'}}>
            <StatusPill tone="progress">verifier pass</StatusPill>
            <div style={{marginTop: 14}}><RootText>{shortRoot(evidence.primary.verifierRoot)}</RootText></div>
          </div>
        </div>

        <div style={{marginTop: 36, display: 'grid', gridTemplateColumns: '1.22fr 0.78fr', gap: 30}}>
          <div style={{opacity: reveal(frame, 34, 20)}}>
            <Terminal title="network denied · read-only capsule">
              <span style={{color: colors.stardust}}>$</span> capsule/verifier --claim a(24) ≥ 7194 witness.json
              {'\n\n'}parsed 7,194 distinct binary points
              {'\n'}enumerated 25,880,415 unordered sums
              {'\n'}duplicate sums: <span style={{color: colors.progress}}>0</span>
              {'\n'}claim binding: <span style={{color: colors.progress}}>matched</span>
              {'\n\n'}<span style={{color: colors.progress}}>PASS · exit 0</span>
            </Terminal>
          </div>

          <div style={{border: `1px solid ${colors.darkBorder}`, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.darkInset}}>
            {checks.map(([label, value], index) => (
              <div key={label} style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', minHeight: 73, padding: '0 22px', borderBottom: index === checks.length - 1 ? 'none' : `1px solid ${colors.darkBorder}`, opacity: reveal(frame, 92 + index * 18, 12)}}>
                <span style={{color: colors.mist, fontFamily: type.mono, fontSize: 17, textTransform: 'uppercase'}}>{label}</span>
                <span style={{color: value === 'PASS' ? colors.progress : colors.light, fontFamily: type.mono, fontSize: 18}}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop: 34}}>
          <EvidenceChain nodes={chain} progress={progress} />
        </div>
      </div>
    </Scene>
  );
};
