import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {Body, EditorialTitle, Label} from '../components/Typography';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

const authorities = [
  {name: 'Codex', action: 'produces', detail: 'bounded worker'},
  {name: 'Verifier', action: 'checks', detail: 'frozen artifact'},
  {name: 'Vela', action: 'records + routes', detail: 'Receipt and policy'},
  {name: 'Human', action: 'decides', detail: 'protected authority'},
];

export const AuthorityBoundary = () => {
  const frame = useCurrentFrame();
  const split = reveal(frame, 74, 36);

  return (
    <Scene eyebrow="The boundary-collapse problem" chapter="02 / authority">
      <div style={{paddingTop: 80}}>
        <div style={enter(frame, 4)}>
          <Label>One act becomes four accountable roles</Label>
          <EditorialTitle style={{marginTop: 24, fontSize: 78}}>
            Production is not verification.
            <br />
            Verification is not acceptance.
          </EditorialTitle>
        </div>

        <div
          style={{
            marginTop: 62,
            display: 'grid',
            gridTemplateColumns: `repeat(${authorities.length}, minmax(0, 1fr))`,
            overflow: 'hidden',
            border: `1px solid ${colors.darkBorder}`,
            borderRadius: 26,
            backgroundColor: 'rgba(11, 22, 41, 0.68)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.045)',
          }}
        >
          {authorities.map((authority, index) => {
            const opacity = reveal(frame, 82 + index * 18, 20);
            const protectedColumn = index === authorities.length - 1;
            return (
              <div
                key={authority.name}
                style={{
                  minHeight: 240,
                  padding: '38px 34px',
                  borderLeft:
                    index === 0
                      ? 'none'
                      : `1px solid ${
                          protectedColumn ? colors.stardust : colors.darkBorder
                        }`,
                  backgroundColor: protectedColumn
                    ? 'rgba(201, 166, 100, 0.055)'
                    : 'transparent',
                  opacity,
                  transform: `translateY(${(1 - opacity) * 20}px)`,
                }}
              >
                <div
                  style={{
                    color: protectedColumn ? colors.stardust : colors.light,
                    fontFamily: type.display,
                    fontSize: 45,
                    lineHeight: 1,
                  }}
                >
                  {authority.name}
                </div>
                <div
                  style={{
                    marginTop: 30,
                    color: colors.mist,
                    fontFamily: type.mono,
                    fontSize: 18,
                    textTransform: 'uppercase',
                  }}
                >
                  {authority.action}
                </div>
                <Body style={{marginTop: 10, fontSize: 25}}>
                  {authority.detail}
                </Body>
                {protectedColumn ? (
                  <div
                    style={{
                      marginTop: 30,
                      color: colors.stardust,
                      fontFamily: type.mono,
                      fontSize: 16,
                      textTransform: 'uppercase',
                    }}
                  >
                    key custody stays here
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            right: 120,
            top: 318,
            width: 2,
            height: 345 * split,
            backgroundColor: colors.stardust,
          }}
        />
      </div>
    </Scene>
  );
};
