import {useCurrentFrame} from 'remotion';
import {EvidenceChain, StatusPill} from '../components/Evidence';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const chain = [
  {label: 'Worker', detail: 'candidate'},
  {label: 'Artifact', detail: 'frozen'},
  {label: 'Lean', detail: 'failed'},
  {label: 'Receipt', detail: 'absent'},
  {label: 'Policy', detail: 'not reached'},
  {label: 'State', detail: 'unchanged'},
];

const absent = [
  ['verifier', 'EXIT 1'],
  ['Receipt', 'not produced'],
  ['proposal', 'not created'],
  ['frontier commit', 'unchanged'],
  ['accepted Δ', '0'],
];

export const FidelityAudit = () => {
  const frame = useCurrentFrame();
  const stopped = lineProgress(frame, 40, 145) * 0.4;

  return (
    <Scene eyebrow="Fail-closed counterexample" chapter="07 / reject" dark={false}>
      <div style={{paddingTop: 48}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', ...enter(frame, 2)}}>
          <div>
            <Label color={colors.conflict}>A different GPT-5.6 candidate failed</Label>
            <EditorialTitle dark={false} style={{marginTop: 18, fontSize: 72}}>
              When verification fails,
              <br />the chain stops.
            </EditorialTitle>
          </div>
          <StatusPill tone="conflict">Lean rejected</StatusPill>
        </div>

        <div style={{marginTop: 48, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 30}}>
          <div style={{padding: '30px', border: '1px solid #D9DBDF', borderRadius: 22, backgroundColor: '#FBFAF7', opacity: reveal(frame, 28, 18)}}>
            <div style={{fontFamily: type.mono, color: colors.conflict, fontSize: 17, textTransform: 'uppercase'}}>Frozen Lean 4.27.0</div>
            <div style={{marginTop: 24, fontFamily: type.mono, color: colors.slate, fontSize: 20, lineHeight: 1.6}}>
              error: unsolved inverse goal<br />declaration depends on <span style={{color: colors.conflict}}>sorryAx</span><br />verifier returned exit code 1
            </div>
            <div style={{marginTop: 22}}><RootText dark={false}>{shortRoot(evidence.failClosed.verifierRoot)}</RootText></div>
          </div>
          <div style={{overflow: 'hidden', border: `1px solid ${colors.conflict}`, borderRadius: 22, backgroundColor: '#F8EEEE'}}>
            {absent.map(([label, value], index) => (
              <div key={label} style={{minHeight: 62, padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', borderBottom: index === absent.length - 1 ? 'none' : '1px solid rgba(156,63,74,0.2)', opacity: reveal(frame, 48 + index * 18, 12)}}>
                <span style={{fontSize: 20, color: colors.slate}}>{label}</span>
                <span style={{color: colors.conflict, fontFamily: type.mono, fontSize: 17}}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop: 42}}><EvidenceChain nodes={chain} progress={stopped} dark={false} stopTone="conflict" /></div>
      </div>
    </Scene>
  );
};
