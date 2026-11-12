import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type PromptVideoProps = {
  prompt: string;
};

/** Stable hue pair from the prompt, so each prompt gets its own colour mood. */
function palette(prompt: string) {
  let hash = 0;
  for (const character of prompt) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  const base = hash % 360;
  return {
    first: `hsl(${base}, 72%, 62%)`,
    second: `hsl(${(base + 62 + ((hash >> 8) % 96)) % 360}, 68%, 56%)`,
    glowFirst: `hsla(${base}, 72%, 62%, 0.32)`,
    glowSecond: `hsla(${(base + 62 + ((hash >> 8) % 96)) % 360}, 68%, 56%, 0.28)`,
  };
}

/** Font size that keeps the whole prompt on screen for the 3–40 word range. */
function fontSizeFor(length: number) {
  if (length <= 28) return 118;
  if (length <= 64) return 96;
  if (length <= 120) return 76;
  if (length <= 200) return 60;
  return 48;
}

/**
 * Kinetic typographic card: the prompt itself becomes the video.
 *
 * Every word springs in in reading order, the accents are derived from the
 * prompt text, and the footer shows the prompt's length — so two different
 * prompts never render the same frame.
 */
export const PromptVideo: React.FC<PromptVideoProps> = ({ prompt }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const colors = palette(prompt);

  const text = (typeof prompt === 'string' ? prompt : '').trim();
  const words = text.length === 0 ? ['(empty prompt)'] : text.split(/\s+/).slice(0, 60);
  const fontSize = fontSizeFor(text.length);

  const drift = frame / fps;
  const outro = interpolate(frame, [durationInFrames - 10, durationInFrames - 1], [1, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badge = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const footer = spring({ frame, fps, delay: 6, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#07080d',
        fontFamily: '"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
        color: '#f7f8fc',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 760px at 14% -12%, ${colors.glowFirst}, transparent 62%), radial-gradient(1100px 720px at 94% 112%, ${colors.glowSecond}, transparent 62%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          left: `${18 + Math.sin(drift * 0.6) * 5}%`,
          top: `${24 + Math.cos(drift * 0.5) * 5}%`,
          marginLeft: -450,
          marginTop: -450,
          background: `radial-gradient(circle, ${colors.glowFirst}, transparent 68%)`,
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 760,
          borderRadius: '50%',
          left: `${82 + Math.cos(drift * 0.45) * 5}%`,
          top: `${76 + Math.sin(drift * 0.7) * 5}%`,
          marginLeft: -380,
          marginTop: -380,
          background: `radial-gradient(circle, ${colors.glowSecond}, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />

      <AbsoluteFill
        style={{
          padding: 86,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            alignSelf: 'flex-start',
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid rgba(247, 248, 252, 0.14)',
            backgroundColor: 'rgba(10, 12, 18, 0.6)',
            fontFamily: '"Cascadia Code", "Consolas", monospace',
            fontSize: 19,
            letterSpacing: 3,
            color: 'rgba(247, 248, 252, 0.72)',
            opacity: badge,
            transform: `translateY(${(1 - badge) * -14}px)`,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: colors.first,
              boxShadow: `0 0 14px ${colors.first}`,
            }}
          />
          PROMPT
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: '0.26em',
            rowGap: '0.12em',
            maxWidth: 1560,
            fontSize,
            lineHeight: 1.18,
            fontWeight: 650,
            letterSpacing: -2,
            opacity: outro,
          }}
        >
          {words.map((word, index) => {
            const delay = Math.min(index * 2.6, 52);
            const entrance = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200, stiffness: 120 },
              durationInFrames: 22,
            });
            const isLast = index === words.length - 1;
            return (
              <span
                key={`${index}-${word}`}
                style={{
                  display: 'inline-block',
                  opacity: entrance,
                  transform: `translateY(${(1 - entrance) * 26}px)`,
                  filter: `blur(${(1 - entrance) * 6}px)`,
                  color: isLast ? colors.first : '#f7f8fc',
                }}
              >
                {word}
              </span>
            );
          })}
          <span
            style={{
              display: 'inline-block',
              width: Math.max(3, fontSize * 0.05),
              height: fontSize * 0.82,
              marginLeft: '0.06em',
              borderRadius: 2,
              backgroundColor: colors.second,
              opacity: Math.sin(frame / 6) > 0 ? 0.95 : 0.15,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            opacity: footer,
            transform: `translateY(${(1 - footer) * 16}px)`,
          }}
        >
          <div
            style={{
              fontFamily: '"Cascadia Code", "Consolas", monospace',
              fontSize: 18,
              letterSpacing: 1.4,
              color: 'rgba(247, 248, 252, 0.46)',
              maxWidth: 900,
            }}
          >
            {`${text.length} chars · ${words.length} words · rendered by DSH`}
          </div>
          <div
            style={{
              fontFamily: '"Cascadia Code", "Consolas", monospace',
              fontSize: 18,
              letterSpacing: 1.4,
              color: 'rgba(247, 248, 252, 0.46)',
              whiteSpace: 'nowrap',
            }}
          >
            {`${String(Math.floor(frame / fps)).padStart(2, '0')}s / ${Math.round(durationInFrames / fps)}s`}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
