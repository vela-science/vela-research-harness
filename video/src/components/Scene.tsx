import type {ReactNode} from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {colors, layout, type} from '../design/tokens';

type SceneProps = {
  children: ReactNode;
  eyebrow: string;
  dark?: boolean;
  chapter: string;
};

export const Scene = ({children, eyebrow, dark = true, chapter}: SceneProps) => {
  const background = dark ? colors.midnight : colors.light;
  const foreground = dark ? colors.light : colors.midnight;
  const border = dark ? colors.darkBorder : '#D9DBDF';

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        backgroundColor: background,
        color: foreground,
        fontFamily: type.sans,
        padding: `${layout.insetY}px ${layout.insetX}px ${layout.captionSafeHeight + 80}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 24,
          border: `1px solid ${border}`,
          borderRadius: 28,
          pointerEvents: 'none',
        }}
      />
      <svg
        viewBox="0 0 900 900"
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          right: -260,
          top: 40,
          opacity: dark ? 0.11 : 0.065,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M60 720 C280 700 520 590 760 80"
          fill="none"
          stroke={dark ? colors.stardust : colors.midnight}
          strokeWidth="2"
        />
        <path
          d="M170 770 C390 700 590 510 760 80"
          fill="none"
          stroke={dark ? colors.mist : colors.slate}
          strokeWidth="1"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 108,
          left: 24,
          right: 24,
          height: 1,
          backgroundColor: border,
        }}
      />
      <header
        style={{
          position: 'absolute',
          top: 46,
          left: layout.insetX,
          right: layout.insetX,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: dark ? colors.mist : colors.slate,
          fontFamily: type.mono,
          fontSize: 18,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>{eyebrow}</span>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <span>{chapter}</span>
          <div
            style={{
              width: 44,
              height: 32,
              padding: 4,
              backgroundColor: dark ? colors.light : 'transparent',
              border: `1px solid ${dark ? colors.light : colors.midnight}`,
            }}
          >
            <Img
              src={staticFile('brand/vela-mark-full.svg')}
              style={{width: '100%', height: '100%', objectFit: 'contain'}}
            />
          </div>
        </div>
      </header>
      {children}
    </AbsoluteFill>
  );
};
