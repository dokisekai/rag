import React, { useEffect, useRef } from 'react';

export default function AudioVisualizer({ isActive, mode = 'listening' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.lineWidth = 3;
      
      // 颜色模式设置
      if (mode === 'speaking') {
        ctx.strokeStyle = '#6366f1'; // Indigo (AI 说话)
      } else if (mode === 'listening') {
        ctx.strokeStyle = '#10b981'; // Emerald (在听用户说话)
      } else {
        ctx.strokeStyle = '#f59e0b'; // Amber (在思考中)
      }

      ctx.beginPath();
      const numPoints = 100;
      const amplitude = isActive ? (mode === 'thinking' ? 12 : 25) : 4;
      const frequency = isActive ? 0.08 : 0.03;

      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const sinVal = Math.sin(i * frequency + phase);
        const y = centerY + sinVal * amplitude * Math.sin((i / numPoints) * Math.PI);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      phase += isActive ? 0.15 : 0.04;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, mode]);

  return (
    <div className="relative w-full h-24 flex items-center justify-center overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800">
      <canvas ref={canvasRef} width={600} height={96} className="w-full h-full" />
    </div>
  );
}
