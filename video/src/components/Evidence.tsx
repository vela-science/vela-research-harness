import type {ReactNode} from 'react';
import {colors, type} from '../design/tokens';

export const StatusPill = ({
  children,
  tone = 'evidence',
}: {
  children: ReactNode;
  tone?: 'evidence' | 'progress' | 'caution' | 'conflict' | 'neutral';
}) => {
  const toneColor = {
    evidence: colors.evidence,
    progress: colors.progress,
    caution: colors.caution,
    conflict: colors.darkConflict,
    neutral: colors.mist,
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 36,
        padding: '5px 12px',
        border: `1px solid ${toneColor}`,
        borderRadius: 999,
        color: toneColor,
        fontFamily: type.mono,
        fontSize: 18,
        lineHeight: 1,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
};

export type ChainNode = {
  label: string;
  detail: string;
  tone?: 'evidence' | 'progress' | 'caution' | 'conflict' | 'neutral';
};

export const EvidenceChain = ({
  nodes,
  progress,
  dark = true,
  stopTone = 'stardust',
}: {
  nodes: ChainNode[];
  progress: number;
  dark?: boolean;
  stopTone?: 'stardust' | 'conflict';
}) => {
  const base = dark ? colors.darkBorder : '#D9DBDF';
  const active = stopTone === 'conflict' ? colors.darkConflict : colors.stardust;

  return (
    <div style={{position: 'relative', paddingTop: 4}}>
      <div
        style={{
          position: 'absolute',
          top: 27,
          left: 24,
          right: 24,
          height: 2,
          backgroundColor: base,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: active,
            transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
            transformOrigin: 'left center',
          }}
        />
      </div>
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))`,
          gap: 16,
        }}
      >
        {nodes.map((node, index) => {
          const location = nodes.length === 1 ? 0 : index / (nodes.length - 1);
          const reached = progress >= location - 0.001;
          return (
            <div key={`${node.label}-${index}`} style={{minWidth: 0}}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  border: `2px solid ${reached ? active : base}`,
                  backgroundColor: dark ? colors.midnight : colors.light,
                  color: reached ? active : dark ? colors.mist : colors.slate,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: type.mono,
                  fontSize: 17,
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  marginTop: 18,
                  color: dark ? colors.light : colors.midnight,
                  fontFamily: type.sans,
                  fontSize: 21,
                  fontWeight: 650,
                  lineHeight: 1.1,
                }}
              >
                {node.label}
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: dark ? colors.mist : colors.slate,
                  fontFamily: type.mono,
                  fontSize: 16,
                  lineHeight: 1.25,
                }}
              >
                {node.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
