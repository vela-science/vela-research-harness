import type {CSSProperties, ReactNode} from 'react';
import {colors, type} from '../design/tokens';

export const EditorialTitle = ({
  children,
  dark = true,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) => (
  <h1
    style={{
      margin: 0,
      color: dark ? colors.light : colors.midnight,
      fontFamily: type.display,
      fontSize: 92,
      fontWeight: 500,
      lineHeight: 0.98,
      letterSpacing: '-0.045em',
      ...style,
    }}
  >
    {children}
  </h1>
);

export const Label = ({
  children,
  color = colors.stardust,
}: {
  children: ReactNode;
  color?: string;
}) => (
  <div
    style={{
      color,
      fontFamily: type.sans,
      fontSize: 19,
      fontWeight: 650,
      lineHeight: 1.2,
      letterSpacing: '0.095em',
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

export const Body = ({
  children,
  dark = true,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) => (
  <div
    style={{
      color: dark ? '#C5CAD2' : colors.slate,
      fontFamily: type.sans,
      fontSize: 31,
      lineHeight: 1.34,
      letterSpacing: '-0.018em',
      ...style,
    }}
  >
    {children}
  </div>
);

export const RootText = ({children, dark = true}: {children: ReactNode; dark?: boolean}) => (
  <div
    style={{
      color: dark ? colors.mist : '#626A76',
      fontFamily: type.mono,
      fontSize: 20,
      lineHeight: 1.35,
      overflowWrap: 'anywhere',
    }}
  >
    {children}
  </div>
);

export const shortRoot = (root: string, head = 12, tail = 8) => {
  const value = root.replace(/^sha256:/u, '');
  return `sha256:${value.slice(0, head)}…${value.slice(-tail)}`;
};
