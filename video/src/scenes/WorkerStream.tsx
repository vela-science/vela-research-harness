import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {EditorialTitle, Label, RootText, shortRoot} from '../components/Typography';
import {evidence} from '../data/evidence';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

const events = [
  ['01', 'thread.started', ''],
  ['02', 'turn.started', ''],
  ['03', 'item.completed', 'agent_message'],
  ['04', 'item.started', 'command_execution · in_progress'],
  ['05', 'item.completed', 'command_execution · completed'],
  ['06', 'item.started', 'file_change · in_progress'],
  ['07', 'item.completed', 'file_change · completed'],
  ['08', 'item.completed', 'agent_message'],
  ['09', 'turn.completed', ''],
];

export const WorkerStream = () => {
  const frame = useCurrentFrame();

  return (
    <Scene eyebrow="Sanitized genuine activity" chapter="04 / worker">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.78fr 1.22fr',
          gap: 90,
          alignItems: 'center',
          height: '100%',
        }}
      >
        <div style={enter(frame, 2)}>
          <Label>Non-authoritative producer</Label>
          <EditorialTitle style={{marginTop: 24, fontSize: 78}}>
            The worker can act.
            <br />
            It cannot certify itself.
          </EditorialTitle>
          <div style={{marginTop: 34, display: 'grid', gap: 8}}>
            <RootText>model: {evidence.formal.model}</RootText>
            <RootText>engine: codex-tools-native</RootText>
            <RootText>
              events: {shortRoot(evidence.formal.workerEventsRoot)}
            </RootText>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          {events.map(([index, event, detail], eventIndex) => {
            const opacity = reveal(frame, 20 + eventIndex * 15, 12);
            return (
              <div
                key={index}
                style={{
                  minHeight: 128,
                  padding: '18px 20px',
                  border: `1px solid ${colors.darkBorder}`,
                  borderRadius: 18,
                  backgroundColor: colors.darkInset,
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.045)',
                  opacity,
                  transform: `translateY(${(1 - opacity) * 18}px)`,
                }}
              >
                <div
                  style={{
                    color: colors.stardust,
                    fontFamily: type.mono,
                    fontSize: 16,
                  }}
                >
                  {index}
                </div>
                <div
                  style={{
                    marginTop: 11,
                    color: colors.light,
                    fontFamily: type.mono,
                    fontSize: 19,
                    lineHeight: 1.2,
                  }}
                >
                  {event}
                </div>
                {detail ? (
                  <div
                    style={{
                      marginTop: 9,
                      color: colors.mist,
                      fontFamily: type.mono,
                      fontSize: 14,
                      lineHeight: 1.25,
                    }}
                  >
                    {detail}
                  </div>
                ) : null}
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
          bottom: 198,
          display: 'flex',
          justifyContent: 'space-between',
          color: colors.mist,
          fontFamily: type.mono,
          fontSize: 17,
        }}
      >
        <span>worker result: <b style={{color: colors.progress}}>success</b></span>
        <span>next boundary: independent frozen verifier →</span>
      </div>
    </Scene>
  );
};
