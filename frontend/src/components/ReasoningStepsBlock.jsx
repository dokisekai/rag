import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain, Search, BookOpen, Globe, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

export default function ReasoningStepsBlock({ steps = [], isThinking = false, ragCount = 0, webCount = 0 }) {
  // 当在思考中时默认展开，完成后自动折叠收起（类似 Trae / CodeBuddy / DeepSeek R1 体验）
  const [isExpanded, setIsExpanded] = useState(isThinking);

  // 监听 isThinking 变动：完成思考后自动折叠收起
  useEffect(() => {
    if (isThinking) {
      setIsExpanded(true);
    } else {
      // 延时 400ms 自动折叠，给用户一个平滑收起的视觉效果
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  if (!steps || steps.length === 0) {
    if (!isThinking) return null;
  }

  const completedSteps = steps.filter(s => s.status === 'done');
  const activeStep = steps.find(s => s.status === 'active') || steps[steps.length - 1];

  return (
    <div className="mb-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md overflow-hidden transition-all duration-300">
      {/* 头部折叠/展开栏（即 Trae 风格的 Process Accordion Header） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-xs text-slate-300 transition-colors cursor-pointer border-b border-transparent"
      >
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className={`p-1 rounded-lg ${isThinking ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-slate-800 text-emerald-400'}`}>
            <Brain className="w-3.5 h-3.5" />
          </div>

          {isThinking ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-300">AI 思考与多源检索中...</span>
              <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                已完成思考与多源检索
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
                {ragCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                    <BookOpen className="w-2.5 h-2.5" /> 知识切片 x{ragCount}
                  </span>
                )}
                {webCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-0.5">
                    <Globe className="w-2.5 h-2.5" /> 联网来源 x{webCount}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <span>{isExpanded ? '收起过程' : '展开思考过程'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* 展开后的中间详细步骤列表 */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/70 border-t border-slate-800/60 space-y-2 animate-in fade-in slide-in-from-top-1 text-xs">
          {steps.map((step, i) => {
            const isDone = step.status === 'done' || (!isThinking && i === steps.length - 1);
            const isActive = isThinking && step.status === 'active';
            return (
              <div
                key={step.id || i}
                className={`flex items-start gap-2 text-[11px] font-mono leading-relaxed transition-all ${
                  isDone
                    ? 'text-slate-300'
                    : isActive
                    ? 'text-indigo-300 font-bold animate-pulse'
                    : 'text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 ml-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <span>{step.text}</span>
                  {step.detail && (
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">{step.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
