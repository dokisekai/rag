import { useState, useEffect, useRef } from 'react';

export default function TypewriterText({ text, speed = 60, deleteSpeed = 30, pause = 2000, cursorColor = '#6366f1' }) {
  const [display, setDisplay] = useState('');
  // 用 ref 存阶段，避免依赖 phase state 触发 effect 重跑
  const indexRef = useRef(0);
  const phaseRef = useRef('typing');

  useEffect(() => {
    let timer;
    let cancelled = false;

    // text 变化时重置
    indexRef.current = 0;
    phaseRef.current = 'typing';
    setDisplay('');

    const tick = () => {
      if (cancelled) return;
      const phase = phaseRef.current;
      if (phase === 'typing') {
        if (indexRef.current < text.length) {
          indexRef.current++;
          setDisplay(text.slice(0, indexRef.current));
          timer = setTimeout(tick, speed);
        } else {
          phaseRef.current = 'pausing-typed';
          timer = setTimeout(tick, pause);
        }
      } else if (phase === 'pausing-typed') {
        phaseRef.current = 'deleting';
        timer = setTimeout(tick, 0);
      } else if (phase === 'deleting') {
        if (indexRef.current > 0) {
          indexRef.current--;
          setDisplay(text.slice(0, indexRef.current));
          timer = setTimeout(tick, deleteSpeed);
        } else {
          phaseRef.current = 'pausing-deleted';
          timer = setTimeout(tick, pause * 0.5);
        }
      } else if (phase === 'pausing-deleted') {
        phaseRef.current = 'typing';
        timer = setTimeout(tick, 0);
      }
    };

    timer = setTimeout(tick, speed);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [text, speed, deleteSpeed, pause]);

  return (
    <span className="inline">
      <span>{display}</span>
      <span
        className="inline-block align-middle"
        style={{
          width: '2px',
          height: '1em',
          marginLeft: '1px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.1s',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '100%',
            height: '100%',
            backgroundColor: cursorColor,
            boxShadow: `0 0 6px ${cursorColor}80`,
            animation: 'terminal-blink 1s step-end infinite',
          }}
        />
      </span>
    </span>
  );
}
