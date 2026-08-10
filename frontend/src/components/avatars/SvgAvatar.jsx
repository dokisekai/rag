import React from "react";
import { Bot, Volume2, VolumeX, Sparkles, Brain, MessageCircle, Award, X } from "lucide-react";

export default function SvgAvatar({
  aiState,
  name = "AI 面试官",
  title = "资深技术面试官",
  muted = false,
  onToggleMute = null,
  mode = "simulation",
  strictness = 3,
  ragEnabled = false,
  moduleTitle = "",
  onFinishInterview = null,
  isGeneratingReport = false,
  onExit = null,
  size = 128,
  bars,
  getStateColor,
  getStateText,
  getStateIcon,
}) {
  return (
    <>
      <div
        className="relative rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
            </defs>

            <circle cx="50" cy="50" r="45" fill="url(#avatarGrad)" opacity="0.1" />

            <g className={`${aiState === "speaking" ? "animate-bounce" : ""}`} style={{ transformOrigin: "50% 50%" }}>
              <path
                d="M25 55 Q25 30 50 28 Q75 30 75 55 L75 75 Q75 80 70 80 L30 80 Q25 80 25 75 Z"
                fill="url(#faceGrad)"
              />

              <path
                d="M28 35 Q30 15 50 14 Q70 15 72 35 Q65 28 50 27 Q35 28 28 35"
                fill="#1e293b"
              />

              <path
                d="M32 33 Q35 22 50 21 Q65 22 68 33"
                fill="#fbbf24"
                opacity="0.8"
              />

              <g className={aiState === "thinking" ? "animate-pulse" : ""}>
                <ellipse cx="38" cy="48" rx="4" ry={aiState === "speaking" ? 2 : 4} fill="#1e293b" />
                <ellipse cx="62" cy="48" rx="4" ry={aiState === "speaking" ? 2 : 4} fill="#1e293b" />
                <circle cx="39" cy="47" r="1.5" fill="white" />
                <circle cx="63" cy="47" r="1.5" fill="white" />
              </g>

              <path
                d="M42 58 Q50 64 58 58"
                stroke="#1e293b"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />

              <ellipse
                cx="50"
                cy="66"
                rx={aiState === "speaking" ? 6 : 2}
                ry={aiState === "speaking" ? 4 : 1}
                fill="#1e293b"
              />

              <path
                d="M30 75 Q50 82 70 75 L68 82 Q50 86 32 82 Z"
                fill="#6366f1"
              />
              <path
                d="M35 75 Q50 79 65 75 L63 79 Q50 82 37 79 Z"
                fill="#818cf8"
              />
            </g>
          </svg>
        </div>

        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {bars.slice(0, 8).map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-gradient-to-t ${getStateColor()} transition-all duration-75`}
              style={{ height: `${Math.max(4, h * 20)}px` }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
