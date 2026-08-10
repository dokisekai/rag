import { useMemo } from 'react';

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

export default function DataRain({ count = 18, opacity = 0.25 }) {
  const drops = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 94 + 3}%`,
      chars: Array.from({ length: Math.floor(Math.random() * 6 + 3) }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
      ).join('\n'),
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 6,
      fontSize: 9 + Math.random() * 5,
    })), [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" style={{ opacity }}>
      {drops.map(d => (
        <span
          key={d.id}
          className="data-rain-char"
          style={{
            left: d.left,
            fontSize: `${d.fontSize}px`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        >
          {d.chars}
        </span>
      ))}
    </div>
  );
}
