import {useCurrentFrame} from 'remotion';
import {BrowserFrame} from '../components/BrowserFrame';
import {EvidenceChain, StatusPill} from '../components/Evidence';
import {Scene} from '../components/Scene';
import {Body, EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const chain = [
  {label: 'Mission', detail: 'root-bound'},
  {label: 'GPT-5.6', detail: 'worker success'},
  {label: 'Artifact', detail: '7,194 points'},
  {label: 'Verifier', detail: 'pass'},
  {label: 'Vela Receipt', detail: 'recorded'},
  {label: 'Defer', detail: 'human untouched'},
];

export const RetainedSuccess = () => {
  const frame = useCurrentFrame();
  const progress = lineProgress(frame, 45, 195);
  const liveSurface = reveal(frame, 480, 30);

  return (
    <Scene eyebrow="Governed scientific state" chapter="06 / route" dark={false}>
      <div style={{paddingTop: 50, opacity: 1 - liveSurface, transform: `scale(${1 - liveSurface * 0.018})`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', ...enter(frame, 2)}}>
          <div>
            <Label color="#2F6F6B">Verified evidence · pending review</Label>
            <EditorialTitle dark={false} style={{marginTop: 18, fontSize: 72}}>
              The result advances.
              <br />Authority does not.
            </EditorialTitle>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <StatusPill tone="evidence">verifier pass</StatusPill>
            <StatusPill tone="caution">defer</StatusPill>
            <StatusPill tone="neutral">accepted Δ 0</StatusPill>
          </div>
        </div>

        <div style={{marginTop: 62}}><EvidenceChain nodes={chain} progress={progress} dark={false} /></div>

        <div style={{marginTop: 54, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 38, opacity: reveal(frame, 135, 22)}}>
          <div style={{padding: '28px 30px', border: '1px solid #D9DBDF', borderRadius: 20, backgroundColor: '#FBFAF7'}}>
            <div style={{color: colors.slate, fontFamily: type.mono, fontSize: 16, textTransform: 'uppercase'}}>Scoped claim</div>
            <Body dark={false} style={{marginTop: 16, fontSize: 24}}>
              An explicit Sidon subset of {'{0,1}'}²⁴ with 7,194 points; all 25,880,415 unordered componentwise pair sums are distinct.
            </Body>
          </div>
          <div style={{padding: '28px 30px', border: `1px solid ${colors.caution}`, borderRadius: 20, backgroundColor: '#F7F1E5'}}>
            <div style={{color: '#805A16', fontFamily: type.mono, fontSize: 16, textTransform: 'uppercase'}}>Standing caveat</div>
            <Body dark={false} style={{marginTop: 16, fontSize: 24}}>
              This does not establish maximality, classification, acceptance, or a world record.
            </Body>
            <div style={{marginTop: 18}}><RootText dark={false}>Receipt {shortRoot(evidence.primary.receiptRoot)}</RootText></div>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 132, left: 120, right: 120, opacity: liveSurface, transform: `translateY(${(1 - liveSurface) * 26}px) scale(${0.985 + liveSurface * 0.015})`}}>
        <BrowserFrame src="captures/sidon-run.jpg" address="app.vela.space / sidon-sets / GPT-5.6 run" />
      </div>
    </Scene>
  );
};
