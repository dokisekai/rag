import React from "react";

export default function WarashiAvatar({
  aiState,
  muted = false,
  size = 128,
  bars,
  getStateColor,
}) {
  return (
    <div
      className="relative rounded-full overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-red-500 flex items-center justify-center shadow-2xl shadow-rose-500/30"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-1 rounded-full bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="warashiKimono" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            <linearGradient id="warashiObi" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="warashiFace" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <radialGradient id="warashiBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="45" fill="#fef3c7" opacity="0.3" />

          <g className={`${aiState === "speaking" ? "animate-bounce" : ""}`} style={{ transformOrigin: "50% 50%" }}>
            <ellipse cx="50" cy="78" rx="30" ry="15" fill="url(#warashiKimono)" />
            <rect x="20" y="70" width="60" height="8" fill="url(#warashiObi)" rx="2" />
            <circle cx="50" cy="74" r="3" fill="#fff" opacity="0.8" />

            <ellipse cx="50" cy="45" rx="22" ry="24" fill="url(#warashiFace)" />

            <ellipse cx="50" cy="25" rx="24" ry="12" fill="#1e293b" />
            <ellipse cx="50" cy="22" rx="20" ry="8" fill="#334155" />
            <circle cx="50" cy="18" r="3" fill="#fbbf24" />

            <path
              d="M28 28 Q30 15 50 13 Q70 15 72 28 Q65 22 50 21 Q35 22 28 28"
              fill="#1e293b"
            />
            <path
              d="M32 26 Q35 18 50 17 Q65 18 68 26"
              fill="#fbbf24"
              opacity="0.9"
            />

            <ellipse cx="30" cy="55" rx="5" ry="4" fill="url(#warashiBlush)" />
            <ellipse cx="70" cy="55" rx="5" ry="4" fill="url(#warashiBlush)" />

            <g className={aiState === "thinking" ? "animate-pulse" : ""}>
              <ellipse cx="40" cy="45" rx="3.5" ry={aiState === "speaking" ? 1.5 : 4} fill="#1e293b" />
              <ellipse cx="60" cy="45" rx="3.5" ry={aiState === "speaking" ? 1.5 : 4} fill="#1e293b" />
              <circle cx="41" cy="44" r="1.2" fill="white" />
              <circle cx="61" cy="44" r="1.2" fill="white" />
            </g>

            <path
              d="M44 38 Q50 34 56 38"
              stroke="#888"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            <path
              d="M42 55 Q50 60 58 55"
              stroke="#be123c"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            <ellipse
              cx="50"
              cy="62"
              rx={aiState === "speaking" ? 5 : 2}
              ry={aiState === "speaking" ? 3.5 : 1}
              fill="#be123c"
            />
            {aiState === "speaking" && (
              <ellipse cx="50" cy="61" rx="2.5" ry="1.5" fill="#fda4af" />
            )}

            <ellipse cx="25" cy="72" rx="4" ry="6" fill="url(#warashiKimono)" />
            <ellipse cx="75" cy="72" rx="4" ry="6" fill="url(#warashiKimono)" />
            <circle cx="25" cy="77" r="3" fill="#fef3c7" />
            <circle cx="75" cy="77" r="3" fill="#fef3c7" />
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
  );
}
