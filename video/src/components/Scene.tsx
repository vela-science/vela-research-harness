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
        backgroundImage: dark
          ? 'radial-gradient(circle at 10% 18%, rgba(79, 143, 139, 0.12), transparent 30%), radial-gradient(circle at 84% 74%, rgba(201, 166, 100, 0.09), transparent 33%)'
          : 'radial-gradient(circle at 12% 16%, rgba(201, 166, 100, 0.12), transparent 31%), radial-gradient(circle at 86% 78%, rgba(79, 143, 139, 0.08), transparent 34%)',
        color: foreground,
        fontFamily: type.sans,
        padding: `${layout.insetY}px ${layout.insetX}px ${layout.captionSafeHeight + 80}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: dark ? 0.1 : 0.12,
          backgroundImage:
            'linear-gradient(rgba(161, 167, 176, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(161, 167, 176, 0.14) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 78%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 24,
          border: `1px solid ${border}`,
          borderRadius: 28,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 31,
          border: `1px solid ${dark ? 'rgba(247, 246, 242, 0.035)' : 'rgba(8, 18, 36, 0.045)'}`,
          borderRadius: 22,
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
