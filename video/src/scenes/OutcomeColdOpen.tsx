import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label} from '../components/Typography';
import {StatusPill} from '../components/Evidence';
import {colors, type} from '../design/tokens';
import {lineProgress} from '../motion';

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
          gridTemplateColumns: '0.95fr 1.05fr',
          gap: 110,
          height: '100%',
          alignItems: 'center',
        }}
      >
        <div>
          <Label>Retained run · GPT-5.4</Label>
          <EditorialTitle style={{marginTop: 28}}>
            Bounded work.
            <br />
            Authority intact.
          </EditorialTitle>
          <div
            style={{
              marginTop: 36,
              maxWidth: 650,
              color: '#C5CAD2',
              fontFamily: type.sans,
              fontSize: 29,
              lineHeight: 1.4,
            }}
          >
            The work can complete without letting the worker declare scientific truth.
          </div>
        </div>

        <div
          style={{
            overflow: 'hidden',
            border: `1px solid ${colors.darkBorder}`,
            borderRadius: 24,
            backgroundColor: 'rgba(11, 22, 41, 0.72)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.045)',
          }}
        >
          {states.map((state, index) => {
            const opacity = 1;
            return (
              <div
                key={state.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  minHeight: 108,
                  padding: '0 18px',
                  borderBottom:
                    index === states.length - 1
                      ? 'none'
                      : `1px solid ${colors.darkBorder}`,
                  opacity,
                  transform: `translateX(${(1 - opacity) * 28}px)`,
                }}
              >
                <span
                  style={{
                    color: colors.mist,
                    fontFamily: type.mono,
                    fontSize: 24,
                    textTransform: 'uppercase',
                  }}
                >
                  {state.label}
                </span>
                <StatusPill tone={state.tone}>{state.value}</StatusPill>
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
