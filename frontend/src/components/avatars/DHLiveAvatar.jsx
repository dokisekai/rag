import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

export default function DHLiveAvatar({
  aiState,
  muted = false,
  audioUrl = "",
  size = 128,
  bars,
  getStateColor,
  avatarConfig = null,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let frame = 0;

    const animate = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.42;

      const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      bgGrad.addColorStop(0, "#c084fc");
      bgGrad.addColorStop(0.5, "#a855f7");
      bgGrad.addColorStop(1, "#7c3aed");
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bgGrad;
      ctx.fill();

      const innerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.95);
      innerGrad.addColorStop(0, "#fef3c7");
      innerGrad.addColorStop(1, "#fde68a");
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.92, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      const faceY = centerY - radius * 0.05;
      const faceScale = radius / 45;

      const hairGrad = ctx.createLinearGradient(centerX, faceY - 35 * faceScale, centerX, faceY - 10 * faceScale);
      hairGrad.addColorStop(0, "#4c1d95");
      hairGrad.addColorStop(1, "#6d28d9");
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, faceY - 18 * faceScale, 32 * faceScale, 20 * faceScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#581c87";
      ctx.beginPath();
      ctx.moveTo(centerX - 30 * faceScale, faceY - 15 * faceScale);
      ctx.quadraticCurveTo(centerX - 25 * faceScale, faceY - 25 * faceScale, centerX, faceY - 28 * faceScale);
      ctx.quadraticCurveTo(centerX + 25 * faceScale, faceY - 25 * faceScale, centerX + 30 * faceScale, faceY - 15 * faceScale);
      ctx.lineTo(centerX + 28 * faceScale, faceY - 10 * faceScale);
      ctx.quadraticCurveTo(centerX, faceY - 20 * faceScale, centerX - 28 * faceScale, faceY - 10 * faceScale);
      ctx.closePath();
      ctx.fill();

      const blinkScale = aiState === "speaking" ? 0.3 + Math.sin(frame * 0.05) * 0.1 : aiState === "thinking" ? 0.8 : 1;
      const eyeY = faceY - 2 * faceScale;
      const eyeSpacing = 12 * faceScale;

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(centerX - eyeSpacing, eyeY, 4 * faceScale, 4 * faceScale * blinkScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + eyeSpacing, eyeY, 4 * faceScale, 4 * faceScale * blinkScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(centerX - eyeSpacing + 1.5 * faceScale, eyeY - 1.5 * faceScale * blinkScale, 1.5 * faceScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + eyeSpacing + 1.5 * faceScale, eyeY - 1.5 * faceScale * blinkScale, 1.5 * faceScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#6d28d9";
      ctx.lineWidth = 2 * faceScale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX - eyeSpacing - 4 * faceScale, eyeY - 8 * faceScale);
      ctx.quadraticCurveTo(centerX - eyeSpacing, eyeY - 10 * faceScale, centerX - eyeSpacing + 4 * faceScale, eyeY - 8 * faceScale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + eyeSpacing - 4 * faceScale, eyeY - 8 * faceScale);
      ctx.quadraticCurveTo(centerX + eyeSpacing, eyeY - 10 * faceScale, centerX + eyeSpacing + 4 * faceScale, eyeY - 8 * faceScale);
      ctx.stroke();

      const blushGrad1 = ctx.createRadialGradient(centerX - 18 * faceScale, faceY + 8 * faceScale, 0, centerX - 18 * faceScale, faceY + 8 * faceScale, 6 * faceScale);
      blushGrad1.addColorStop(0, "rgba(251, 113, 133, 0.5)");
      blushGrad1.addColorStop(1, "rgba(251, 113, 133, 0)");
      ctx.fillStyle = blushGrad1;
      ctx.beginPath();
      ctx.arc(centerX - 18 * faceScale, faceY + 8 * faceScale, 6 * faceScale, 0, Math.PI * 2);
      ctx.fill();

      const blushGrad2 = ctx.createRadialGradient(centerX + 18 * faceScale, faceY + 8 * faceScale, 0, centerX + 18 * faceScale, faceY + 8 * faceScale, 6 * faceScale);
      blushGrad2.addColorStop(0, "rgba(251, 113, 133, 0.5)");
      blushGrad2.addColorStop(1, "rgba(251, 113, 133, 0)");
      ctx.fillStyle = blushGrad2;
      ctx.beginPath();
      ctx.arc(centerX + 18 * faceScale, faceY + 8 * faceScale, 6 * faceScale, 0, Math.PI * 2);
      ctx.fill();

      const mouthY = faceY + 16 * faceScale;
      let mouthWidth = 8 * faceScale;
      let mouthHeight = 3 * faceScale;

      if (aiState === "speaking") {
        const audioIntensity = bars.reduce((a, b) => a + b, 0) / bars.length;
        mouthWidth = (6 + audioIntensity * 6) * faceScale;
        mouthHeight = (2 + audioIntensity * 8) * faceScale;
      } else if (aiState === "thinking") {
        mouthWidth = 4 * faceScale;
        mouthHeight = 2 * faceScale;
      }

      const mouthGrad = ctx.createLinearGradient(centerX, mouthY - mouthHeight, centerX, mouthY + mouthHeight);
      mouthGrad.addColorStop(0, "#be185d");
      mouthGrad.addColorStop(1, "#9d174d");
      ctx.fillStyle = mouthGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, mouthY, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      if (aiState === "speaking") {
        const tongueGrad = ctx.createRadialGradient(centerX, mouthY + 1, 0, centerX, mouthY + 1, mouthWidth * 0.6);
        tongueGrad.addColorStop(0, "#fda4af");
        tongueGrad.addColorStop(1, "#fb7185");
        ctx.fillStyle = tongueGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY + mouthHeight * 0.3, mouthWidth * 0.5, mouthHeight * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const kimonoY = centerY + radius * 0.5;
      const kimonoGrad = ctx.createLinearGradient(centerX, kimonoY - 10, centerX, kimonoY + 30);
      kimonoGrad.addColorStop(0, "#7c3aed");
      kimonoGrad.addColorStop(1, "#5b21b6");
      ctx.fillStyle = kimonoGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, kimonoY + 20, radius * 0.85, radius * 0.35, 0, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(centerX - radius * 0.7, kimonoY + 5, radius * 1.4, 8 * faceScale);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(centerX - radius * 0.7, kimonoY + 5 + 8 * faceScale, radius * 1.4, 2 * faceScale);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(centerX, kimonoY + 9 * faceScale, 4 * faceScale, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    setIsLoading(false);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [aiState, bars]);

  return (
    <div
      className="relative rounded-full overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-purple-500/30"
      style={{ width: size, height: size }}
    >
      {error ? (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            className="w-full h-full"
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {bars.slice(0, 8).map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full bg-gradient-to-t ${getStateColor()} transition-all duration-75`}
                style={{ height: `${Math.max(4, h * 20)}px` }}
              />
            ))}
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="w-8 h-8 border-3 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
