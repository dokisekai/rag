import React, { useState, useEffect, useRef } from "react";
import { Bot, Volume2, VolumeX, Sparkles, Brain, MessageCircle, Save, X } from "lucide-react";
import SvgAvatar from "./avatars/SvgAvatar";
import WarashiAvatar from "./avatars/WarashiAvatar";
import DHLiveAvatar from "./avatars/DHLiveAvatar";
import { getCharacter } from "../data/characters";

export default function InterviewAvatar({
  aiState,
  name = "AI 知识助手",
  title = "AI 智库专家",
  muted = false,
  onToggleMute = null,
  ragEnabled = false,
  moduleTitle = "",
  onFinishInterview = null,
  isGeneratingReport = false,
  onExit = null,
  avatarType = "svg",
  audioUrl = "",
  compact = false,
}) {
  const character = getCharacter(avatarType);
  const CharacterIcon = character.icon;

  const animationRef = useRef(null);
  const [bars, setBars] = useState(Array(20).fill(0));

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      const newBars = Array.from({ length: 20 }, (_, i) => {
        if (aiState === "speaking") {
          const base = 0.3 + Math.sin(frame * 0.15 + i * 0.5) * 0.3;
          const noise = Math.random() * 0.4;
          return Math.min(1, base + noise);
        } else if (aiState === "thinking") {
          const base = 0.15 + Math.sin(frame * 0.08 + i * 0.3) * 0.1;
          return base;
        } else {
          return 0.05 + Math.sin(frame * 0.03 + i * 0.2) * 0.03;
        }
      });
      setBars(newBars);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [aiState]);

  const getStateColor = () => {
    if (muted) return "from-slate-500 to-slate-600";
    switch (aiState) {
      case "speaking":
        return "from-emerald-500 to-teal-500";
      case "thinking":
        return "from-amber-500 to-orange-500";
      case "listening":
        return "from-indigo-500 to-purple-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  const getStateText = () => {
    if (muted) return "已静音";
    switch (aiState) {
      case "speaking":
        return "正在语音播报...";
      case "thinking":
        return "检索思考中...";
      case "listening":
        return "倾听提问中...";
      default:
        return "准备就绪";
    }
  };

  const getStateIcon = () => {
    if (muted) return <VolumeX className="w-4 h-4" />;
    switch (aiState) {
      case "speaking":
        return <Volume2 className="w-4 h-4 animate-pulse" />;
      case "thinking":
        return <Brain className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />;
      case "listening":
        return <MessageCircle className="w-4 h-4 animate-pulse" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const renderAvatar = () => {
    const avatarProps = {
      aiState,
      muted,
      bars,
      getStateColor,
      audioUrl,
    };

    switch (avatarType) {
      case "warashi":
        return <WarashiAvatar {...avatarProps} />;
      case "dh_live":
        return <DHLiveAvatar {...avatarProps} />;
      case "svg":
      default:
        return (
          <SvgAvatar
            {...avatarProps}
            name={name}
            title={title}
            onToggleMute={onToggleMute}
            ragEnabled={ragEnabled}
            moduleTitle={moduleTitle}
            onFinishInterview={onFinishInterview}
            isGeneratingReport={isGeneratingReport}
            onExit={onExit}
            getStateText={getStateText}
            getStateIcon={getStateIcon}
          />
        );
    }
  };

  if (compact) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {renderAvatar()}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 p-6 glass-panel rounded-3xl bg-gradient-to-b ${character.bgColor} border ${character.borderColor} relative overflow-hidden`}>
      {moduleTitle && (
        <div className={`absolute top-0 left-0 right-0 px-4 py-2 bg-gradient-to-r ${character.color} opacity-20 border-b border-slate-700/50`}>
          <p className="text-xs font-semibold text-white text-center truncate">{moduleTitle}</p>
        </div>
      )}

      <div className={`relative ${moduleTitle ? 'mt-3' : ''}`}>
        {(onFinishInterview || onExit) && (
          <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1">
            {onFinishInterview && (
              <button
                onClick={onFinishInterview}
                disabled={isGeneratingReport}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-500/30"
                title="保存问答会话"
              >
                <Save className="w-3 h-3 text-purple-200" />
                {isGeneratingReport ? '保存中' : '保存'}
              </button>
            )}
            {onExit && (
              <button
                onClick={onExit}
                className="p-1 rounded-lg bg-slate-800/90 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer shadow-lg border border-slate-700/50 hover:border-rose-500/50"
                title="退出"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${getStateColor()} blur-2xl opacity-30 animate-pulse`}
          style={{ animationDuration: "2s" }}
        />

        {renderAvatar()}

        <div className="absolute -top-1 -right-1">
          <div className={`p-1.5 rounded-full bg-gradient-to-r ${getStateColor()} text-white shadow-lg`}>
            {getStateIcon()}
          </div>
        </div>
      </div>

      <div className="text-center">
        <h3 className={`text-lg font-bold flex items-center justify-center gap-2 bg-gradient-to-r ${character.color} bg-clip-text text-transparent`}>
          <CharacterIcon className={`w-5 h-5 ${character.textColor}`} />
          {character.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1">{character.title}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {character.tags.map((tag, i) => (
            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full ${character.textColor} bg-white/5 border border-white/10`}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium">
          💡 AI 智库问答
        </span>
        {ragEnabled && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium">
            ⚡ RAG 检索
          </span>
        )}
      </div>

      <div className="w-full">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStateColor()} ${muted ? '' : 'animate-pulse'}`} />
          <span className="text-xs font-medium text-slate-300">{getStateText()}</span>
        </div>

        <div className="flex justify-center gap-0.5 h-8 items-end">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full bg-gradient-to-t ${getStateColor()} transition-all duration-75`}
              style={{
                height: muted ? '4px' : `${Math.max(4, h * 32)}px`,
                opacity: muted ? 0.3 : 0.7 + h * 0.3,
              }}
            />
          ))}
        </div>
      </div>

      {onToggleMute && (
        <button
          onClick={onToggleMute}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            muted
              ? "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
          }`}
          title={muted ? "取消静音" : "静音"}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
