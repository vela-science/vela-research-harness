import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {Label} from '../components/Typography';
import {StatusPill} from '../components/Evidence';
import {colors, type} from '../design/tokens';
import {enter, lineProgress, reveal} from '../motion';

const states = [
  {label: 'worker', value: 'success', tone: 'progress' as const},
  {label: 'verifier', value: 'pass', tone: 'evidence' as const},
  {label: 'route', value: 'defer', tone: 'caution' as const},
  {label: 'accepted Δ', value: '0', tone: 'neutral' as const},
];

export const OutcomeColdOpen = () => {
  const frame = useCurrentFrame();
  const progress = lineProgress(frame, 18, 170);

  return (
    <Scene eyebrow="Canopus / bounded research" chapter="01 / result">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.82fr 1.18fr',
          gap: 72,
          height: '100%',
          alignItems: 'center',
        }}
      >
        <div style={enter(frame, 2)}>
          <Label>New scientific result · GPT-5.6</Label>
          <div
            style={{
              marginTop: 28,
              color: colors.light,
              fontFamily: type.display,
              fontSize: 82,
              fontWeight: 500,
              lineHeight: 0.96,
              letterSpacing: '-0.05em',
            }}
          >
            A real result.
            <br />
            No authority leak.
          </div>
          <div
            style={{
              marginTop: 30,
              maxWidth: 620,
              color: '#C5CAD2',
              fontFamily: type.sans,
              fontSize: 23,
              lineHeight: 1.5,
            }}
          >
            GPT-5.6 produced a new Sidon construction. Independent code verified it. Vela kept it pending.
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${colors.darkBorder}`,
            borderRadius: 28,
            padding: 8,
            backgroundColor: 'rgba(247, 246, 242, 0.025)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 38px 100px rgba(1, 7, 17, 0.32)',
            opacity: reveal(frame, 8, 24),
          }}
        >
          <div
            style={{
              overflow: 'hidden',
              border: `1px solid ${colors.darkBorder}`,
              borderRadius: 20,
              backgroundColor: 'rgba(5, 12, 24, 0.88)',
            }}
          >
            <div style={{padding: '34px 38px 30px'}}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 20,
                  color: colors.mist,
                  fontFamily: type.mono,
                  fontSize: 22,
                }}
              >
                <span style={{textDecoration: 'line-through', opacity: 0.65}}>7,193</span>
                <span style={{color: colors.stardust}}>→</span>
                <span>lower bound for a(24)</span>
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: colors.light,
                  fontFamily: type.display,
                  fontSize: 142,
                  fontWeight: 500,
                  lineHeight: 0.92,
                  letterSpacing: '-0.055em',
                }}
              >
                7,194
              </div>
              <div
                style={{
                  marginTop: 20,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div style={{color: colors.evidence, fontFamily: type.mono, fontSize: 20}}>+ 970f25</div>
                <div style={{color: colors.evidence, fontFamily: type.mono, fontSize: 20}}>+ 246891</div>
                <div style={{color: colors.mist, fontFamily: type.mono, fontSize: 18}}>− baseline[72]</div>
                <div style={{color: colors.light, fontFamily: type.mono, fontSize: 18}}>25,880,415 sums · 0 collisions</div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                borderTop: `1px solid ${colors.darkBorder}`,
              }}
            >
              {states.map((state, index) => (
                <div
                  key={state.label}
                  style={{
                    minHeight: 98,
                    padding: '18px 14px',
                    borderRight: index === states.length - 1 ? 'none' : `1px solid ${colors.darkBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{color: colors.mist, fontFamily: type.mono, fontSize: 14, textTransform: 'uppercase'}}>
                    {state.label}
                  </span>
                  <StatusPill tone={state.tone}>{state.value}</StatusPill>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          bottom: 196,
          height: 2,
          backgroundColor: colors.darkBorder,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: colors.stardust,
            transform: `scaleX(${progress})`,
            transformOrigin: 'left center',
          }}
        />
      </div>
    </Scene>
  );
};
