import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label} from '../components/Typography';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

const delta = [
  'bounded GPT-5.6 mission',
  'new 7,194-point construction',
  'independent frozen verifier',
  'Vela Receipt and Defer route',
  'sanitized public projection',
  'Observatory evidence surface',
  'Canopus 0.6.2 release',
];

export const CodexBuildDelta = () => {
  const frame = useCurrentFrame();
  const endCard = reveal(frame, 320, 34);
  const ledgerOpacity = 1 - reveal(frame, 286, 32);

  return (
    <Scene eyebrow="Built with Codex during OpenAI Build Week" chapter="10 / delta">
      <div
        style={{
          position: 'absolute',
          inset: '150px 120px 214px',
          display: 'grid',
          gridTemplateColumns: '0.86fr 1.14fr',
          gap: 94,
          alignItems: 'center',
          opacity: ledgerOpacity,
        }}
      >
        <div style={enter(frame, 2)}>
          <Label>Submission-period delta</Label>
          <EditorialTitle style={{marginTop: 24, fontSize: 80}}>
            One task built the bounded chain.
          </EditorialTitle>
        </div>

        <div style={{borderTop: `1px solid ${colors.darkBorder}`}}>
          {delta.map((item, index) => (
            <div
              key={item}
              style={{
                minHeight: 72,
                padding: '0 18px',
                display: 'grid',
                gridTemplateColumns: '52px 1fr',
                alignItems: 'center',
                borderBottom: `1px solid ${colors.darkBorder}`,
                opacity: reveal(frame, 22 + index * 16, 12),
                transform: `translateX(${(1 - reveal(frame, 22 + index * 16, 12)) * 20}px)`,
              }}
            >
              <span style={{color: colors.stardust, fontFamily: type.mono, fontSize: 17}}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span style={{color: colors.light, fontFamily: type.sans, fontSize: 25}}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: '150px 120px 210px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          opacity: endCard,
          transform: `translateY(${(1 - endCard) * 22}px)`,
        }}
      >
        <Label>Canopus: Bounded Research for Codex</Label>
        <EditorialTitle style={{marginTop: 26, maxWidth: 1450, fontSize: 88}}>
          Give Codex a mission.
          <br />
          Verify the work.
          <br />
          Keep humans in authority.
        </EditorialTitle>
        <div
          style={{
            marginTop: 34,
            color: '#C5CAD2',
            fontFamily: type.sans,
            fontSize: 30,
          }}
        >
          Let agents do the work without letting them declare truth.
        </div>
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 34,
            color: colors.stardust,
            fontFamily: type.mono,
            fontSize: 20,
          }}
        >
          <span>github.com/vela-science/vela-research-harness</span>
          <span>app.vela.space/build-week</span>
        </div>
      </div>
    </Scene>
  );
};
