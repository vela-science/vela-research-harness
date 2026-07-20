import {parseSrt, type Caption} from '@remotion/captions';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import {colors, layout, type} from '../design/tokens';

export const CaptionTrack = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {cancelRender, continueRender, delayRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Loading Build Week captions'));

  const loadCaptions = useCallback(async () => {
    try {
      const response = await fetch(
        staticFile('captions/canopus-build-week.srt'),
      );
      if (!response.ok) throw new Error(`Caption request failed: ${response.status}`);
      const parsed = parseSrt({input: await response.text()});
      setCaptions(parsed.captions);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    void loadCaptions();
  }, [loadCaptions]);

  const currentTimeMs = (frame / fps) * 1000;
  const active = useMemo(
    () =>
      captions?.find(
        (caption) =>
          currentTimeMs >= caption.startMs && currentTimeMs < caption.endMs,
      ),
    [captions, currentTimeMs],
  );

  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: `0 120px ${layout.captionSafeHeight - 14}px`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          padding: '12px 24px 14px',
          borderRadius: 18,
          backgroundColor: 'rgba(5, 12, 24, 0.9)',
          border: `1px solid ${colors.darkBorder}`,
          color: colors.light,
          fontFamily: type.sans,
          fontSize: 42,
          fontWeight: 520,
          lineHeight: 1.18,
          letterSpacing: '-0.015em',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 50px rgba(5, 12, 24, 0.2)',
        }}
      >
        {active.text.trim()}
      </div>
    </AbsoluteFill>
  );
};
