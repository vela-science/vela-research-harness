import type {ReactNode} from 'react';
import {colors, type} from '../design/tokens';

export const Terminal = ({
  children,
  title,
  tone = 'neutral',
}: {
  children: ReactNode;
  title: string;
  tone?: 'neutral' | 'conflict';
}) => (
  <div
    style={{
      overflow: 'hidden',
      border: `1px solid ${tone === 'conflict' ? colors.conflict : colors.darkBorder}`,
      borderRadius: 24,
      backgroundColor: colors.darkEmphasis,
      boxShadow:
        'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 28px 80px rgba(5, 12, 24, 0.18)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 48,
        padding: '0 18px',
        borderBottom: `1px solid ${colors.darkBorder}`,
        color: colors.mist,
        fontFamily: type.mono,
        fontSize: 16,
        letterSpacing: '0.04em',
      }}
    >
      <span style={{color: colors.stardust, marginRight: 12}}>●</span>
      {title}
    </div>
    <div
      style={{
        padding: '24px 26px 28px',
        color: colors.light,
        fontFamily: type.mono,
        fontSize: 21,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </div>
  </div>
);
