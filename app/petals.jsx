'use client';
import { useMemo } from 'react';

// Sakura petals drifting over the page. Pure CSS animation, no library.
export default function Petals({ count = 14 }) {
  const petals = useMemo(
    () => Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      dur: 9 + Math.random() * 7,
      delay: -Math.random() * 16,
      scale: 0.6 + Math.random() * 0.7,
      opacity: 0.35 + Math.random() * 0.25,
      sway: 30 + Math.random() * 60,
    })),
    [count]
  );

  return (
    <div className="petals" aria-hidden="true">
      {petals.map((p, i) => (
        <svg key={i} className="petal" viewBox="0 0 20 20" width="20" height="20"
             style={{
               left: `${p.left}vw`,
               animationDuration: `${p.dur}s`,
               animationDelay: `${p.delay}s`,
               '--scale': p.scale,
               '--sway': `${p.sway}px`,
               opacity: p.opacity,
             }}>
          <path fill="#e7b8c6"
                d="M10 1C6 4 3 8 4 13c0.6 3 3.4 5.5 6 6 2.6-0.5 5.4-3 6-6 1-5-2-9-6-12z" />
        </svg>
      ))}
    </div>
  );
}
