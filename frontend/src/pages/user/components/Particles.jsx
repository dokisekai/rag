import React, { useMemo } from 'react';

export default function Particles({ count = 12, color }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    })), [count]);

  const rgbMap = { indigo: '99,102,241', rose: '244,63,94', purple: '168,85,247' };
  const rgb = rgbMap[color] || '99,102,241';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: `rgba(${rgb}, 0.6)`,
            animation: `particle-float-${(p.id % 3) + 1} ${p.duration}s ${p.delay}s infinite ease-in-out`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
