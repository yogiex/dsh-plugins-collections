import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type HelloWorldProps = {
  title: string;
  subtitle: string;
  badge: string;
};

/**
 * The bundled sample composition: a dark stage, two drifting gradient orbs,
 * a spring-entrance title, and a progress hairline. No network, no assets:
 * it must render on a machine that has only Node, Chrome, and this package.
 */
export const HelloWorld: React.FC<HelloWorldProps> = ({ title, subtitle, badge }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const settle = spring({ frame, fps, delay: 8, config: { damping: 200 }, durationInFrames: 26 });
  const outro = interpolate(frame, [durationInFrames - 16, durationInFrames - 2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = frame / fps;
  const orbOne = {
    x: 62 + Math.sin(drift * 0.9) * 6,
    y: 30 + Math.cos(drift * 0.7) * 5,
  };
  const orbTwo = {
    x: 26 + Math.cos(drift * 0.6) * 5,
    y: 72 + Math.sin(drift * 1.1) * 6,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#08090f',
        fontFamily: '"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
        color: '#f6f7fb',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(1200px 720px at 18% -10%, rgba(94, 92, 230, 0.30), transparent 62%), radial-gradient(1000px 680px at 92% 108%, rgba(46, 196, 182, 0.24), transparent 60%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: `${orbOne.x}%`,
          top: `${orbOne.y}%`,
          width: 760,
          height: 760,
          marginLeft: -380,
          marginTop: -380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122, 108, 255, 0.42), rgba(122, 108, 255, 0) 68%)',
          filter: 'blur(6px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${orbTwo.x}%`,
          top: `${orbTwo.y}%`,
          width: 620,
          height: 620,
          marginLeft: -310,
          marginTop: -310,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(64, 214, 190, 0.36), rgba(64, 214, 190, 0) 70%)',
          filter: 'blur(8px)',
        }}
      />

      <AbsoluteFill
        style={{
          padding: 96,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: outro,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            alignSelf: 'flex-start',
            padding: '12px 20px',
            borderRadius: 999,
            border: '1px solid rgba(246, 247, 251, 0.16)',
            backgroundColor: 'rgba(12, 14, 22, 0.55)',
            fontFamily: '"Cascadia Code", "Consolas", monospace',
            fontSize: 22,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            color: 'rgba(246, 247, 251, 0.78)',
            opacity: entrance,
            transform: `translateY(${(1 - entrance) * -18}px)`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: '#40d6be',
              boxShadow: '0 0 16px rgba(64, 214, 190, 0.9)',
            }}
          />
          {badge}
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 148,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: -5.5,
              opacity: settle,
              transform: `translateY(${(1 - settle) * 44}px)`,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: '26px 0 0',
              maxWidth: 980,
              fontSize: 34,
              lineHeight: 1.35,
              fontWeight: 400,
              color: 'rgba(246, 247, 251, 0.66)',
              opacity: interpolate(settle, [0, 1], [0, 1]),
              transform: `translateY(${(1 - settle) * 26}px)`,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              fontFamily: '"Cascadia Code", "Consolas", monospace',
              fontSize: 22,
              letterSpacing: 1.6,
              color: 'rgba(246, 247, 251, 0.5)',
            }}
          >
            <span>{`${String(Math.floor(frame / fps)).padStart(2, '0')}s / ${Math.round(durationInFrames / fps)}s`}</span>
            <span>1920 × 1080 · 30 fps</span>
          </div>
          <div
            style={{
              marginTop: 18,
              height: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(246, 247, 251, 0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${interpolate(frame, [0, durationInFrames - 1], [0, 100], {
                  extrapolateRight: 'clamp',
                })}%`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #7a6cff, #40d6be)',
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
