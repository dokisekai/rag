import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Radio, Zap } from "lucide-react";

export default function UserCamera({
  isListening = false,
  isSpeaking = false,
  micOn = false,
  onToggleMic = null,
  micMuted = false,
  onToggleMute = null,
}) {
  const animationRef = useRef(null);
  const [bars, setBars] = useState(Array(18).fill(0.1));

  // 动态音频波形动画
  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      const newBars = Array.from({ length: 18 }, (_, i) => {
        if (isListening && micOn) {
          const base = 0.35 + Math.sin(frame * 0.2 + i * 0.4) * 0.35;
          const noise = Math.random() * 0.3;
          return Math.min(1, base + noise);
        } else if (isSpeaking) {
          const base = 0.2 + Math.sin(frame * 0.1 + i * 0.3) * 0.2;
          return base;
        } else if (micOn) {
          const base = 0.12 + Math.sin(frame * 0.05 + i * 0.2) * 0.08;
          return base;
        } else {
          return 0.05;
        }
      });
      setBars(newBars);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isListening, isSpeaking, micOn, micMuted]);

  return (
    <div className="flex flex-col items-center justify-between p-6 glass-panel rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-700/50 min-h-[340px] shadow-2xl relative overflow-hidden">
      {/* 极客风后台发光弧圈背景 */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 头部标题与状态 Badge */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
          <h3 className="font-bold text-xs text-white tracking-wider">语音交互终端</h3>
        </div>

        <div>
          {isListening && micOn ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              麦克风监听中
            </span>
          ) : isSpeaking ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              AI 播报中
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              麦克风待命
            </span>
          )}
        </div>
      </div>

      {/* 中央主声音交互中心 */}
      <div className="flex flex-col items-center justify-center my-4 space-y-5">
        {/* 中央发光按键图标 */}
        <button
          onClick={onToggleMic}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-2xl ${
            micOn
              ? "bg-gradient-to-tr from-sky-500 to-indigo-600 text-white ring-4 ring-sky-500/30 shadow-sky-500/30 scale-105"
              : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700"
          }`}
        >
          {micOn && (
            <div className="absolute inset-0 rounded-full bg-sky-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          )}
          {micOn ? (
            <Mic className="w-10 h-10 relative z-10" />
          ) : (
            <MicOff className="w-10 h-10 relative z-10" />
          )}
        </button>

        {/* 动态音频波形频谱柱 */}
        <div className="flex items-center justify-center gap-1 h-12 w-full px-4">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                micOn ? "bg-gradient-to-t from-sky-500 to-teal-400" : "bg-slate-800"
              }`}
              style={{
                height: `${Math.max(6, bar * 48)}px`,
                opacity: micOn ? 0.4 + bar * 0.6 : 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* 底部按钮栏与快捷提示 */}
      <div className="w-full pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <button
          onClick={onToggleMic}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            micOn
              ? "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          }`}
        >
          {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          {micOn ? "关闭麦克风" : "开启麦克风"}
        </button>

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title={micMuted ? "取消静音" : "静音"}
          >
            {micMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
