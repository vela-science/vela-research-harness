import {useCurrentFrame} from 'remotion';
import {BrowserFrame} from '../components/BrowserFrame';
import {EvidenceChain, StatusPill} from '../components/Evidence';
import {Scene} from '../components/Scene';
import {Body, EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const chain = [
  {label: 'Mission', detail: 'bounded range'},
  {label: 'GPT-5.4', detail: 'worker success'},
  {label: 'Artifact', detail: 'frozen'},
  {label: 'Verifier', detail: 'pass'},
  {label: 'Vela Receipt', detail: 'recorded'},
  {label: 'Defer', detail: 'human untouched'},
];

export const RetainedSuccess = () => {
  const frame = useCurrentFrame();
  const progress = lineProgress(frame, 45, 195);
  const liveSurface = reveal(frame, 480, 30);

  return (
    <Scene eyebrow="Retained evidence · GPT-5.4" chapter="06 / verified" dark={false}>
      <div
        style={{
          paddingTop: 50,
          opacity: 1 - liveSurface,
          transform: `scale(${1 - liveSurface * 0.018})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            ...enter(frame, 2),
          }}
        >
          <div>
            <Label color="#2F6F6B">Successful verified example</Label>
            <EditorialTitle dark={false} style={{marginTop: 18, fontSize: 72}}>
              Verification completes.
              <br />
              Authority still does not move.
            </EditorialTitle>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <StatusPill tone="evidence">verifier pass</StatusPill>
            <StatusPill tone="caution">defer</StatusPill>
            <StatusPill tone="neutral">accepted Δ 0</StatusPill>
          </div>
        </div>

        <div style={{marginTop: 62}}>
          <EvidenceChain nodes={chain} progress={progress} dark={false} />
        </div>

        <div
          style={{
            marginTop: 54,
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: 38,
            opacity: reveal(frame, 135, 22),
          }}
        >
          <div
            style={{
              padding: '28px 30px',
              border: '1px solid #D9DBDF',
              borderRadius: 20,
              backgroundColor: '#FBFAF7',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 20px 60px rgba(8, 18, 36, 0.07)',
            }}
          >
            <div
              style={{
                color: colors.slate,
                fontFamily: type.mono,
                fontSize: 16,
                textTransform: 'uppercase',
              }}
            >
              Scoped claim
            </div>
            <Body dark={false} style={{marginTop: 16, fontSize: 24}}>
              Exhaustive registered search over primes in 10428401..10428600 completed with a bounded negative result; maximum multiplicity 12 at p=10428581.
            </Body>
          </div>
          <div
            style={{
              padding: '28px 30px',
              border: `1px solid ${colors.caution}`,
              borderRadius: 20,
              backgroundColor: '#F7F1E5',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            }}
          >
            <div
              style={{
                color: '#805A16',
                fontFamily: type.mono,
                fontSize: 16,
                textTransform: 'uppercase',
              }}
            >
              Nonclaim
            </div>
            <Body dark={false} style={{marginTop: 16, fontSize: 24}}>
              This bounded result does not solve the general Erdős problem and is not scientific acceptance.
            </Body>
            <div style={{marginTop: 18}}>
              <RootText dark={false}>
                Receipt {shortRoot(evidence.retained.receiptRoot)}
              </RootText>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 132,
          left: 120,
          right: 120,
          opacity: liveSurface,
          transform: `translateY(${(1 - liveSurface) * 26}px) scale(${0.985 + liveSurface * 0.015})`,
        }}
      >
        <BrowserFrame
          src="captures/retained-run.jpg"
          address="app.vela.space / frontiers / erdos / retained run"
        />
      </div>
    </Scene>
  );
};
