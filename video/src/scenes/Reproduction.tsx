import {useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {Terminal} from '../components/Terminal';
import {EditorialTitle, Label} from '../components/Typography';
import {colors, type} from '../design/tokens';
import {enter, reveal} from '../motion';

export const Reproduction = () => {
  const frame = useCurrentFrame();

  return (
    <Scene eyebrow="Judge path" chapter="09 / reproduce" dark={false}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.8fr 1.2fr',
          gap: 86,
          alignItems: 'center',
          height: '100%',
        }}
      >
        <div style={enter(frame, 2)}>
          <Label color="#2F6F6B">No rebuild required</Label>
          <EditorialTitle dark={false} style={{marginTop: 24, fontSize: 78}}>
            Inspect the package.
            <br />
            Replay the commit.
          </EditorialTitle>
          <div
            style={{
              marginTop: 30,
              color: colors.slate,
              fontFamily: type.sans,
              fontSize: 27,
              lineHeight: 1.4,
            }}
          >
            Node 22 or 24 · public repository · exact frontier source
          </div>
        </div>

        <div style={{opacity: reveal(frame, 18, 20)}}>
          <Terminal title="90-second inspection / full replay">
            <span style={{color: colors.stardust}}>$</span> npx -p @vela-science/canopus@0.4.5 canopus --version
            {'\n\n'}<span style={{color: colors.stardust}}>$</span> git checkout 807f0a8f770cfed05ac0dff00b952dc41052a720
            {'\n\n'}<span style={{color: colors.stardust}}>$</span> vela reproduce .
          </Terminal>
        </div>
      </div>
    </Scene>
  );
};

