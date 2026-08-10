import { useState, useRef, useEffect } from 'react';
import { Brain, Search, Mic, FileText, Cpu, Network } from 'lucide-react';

const CARDS = [
  { icon: Brain, title: 'RAG 增强检索', desc: '向量语义匹配，精准定位知识片段', color: '#6366f1', bg: 'from-indigo-500/20 to-indigo-500/5' },
  { icon: Search, title: '语义向量引擎', desc: 'Embedding 驱动的深度语义理解', color: '#8b5cf6', bg: 'from-purple-500/20 to-purple-500/5' },
  { icon: Mic, title: '语音自然交互', desc: 'TTS 合成 + 实时语音识别', color: '#ec4899', bg: 'from-pink-500/20 to-pink-500/5' },
  { icon: FileText, title: '多格式文档解析', desc: 'MD/Obsidian/PDF 智能解析', color: '#10b981', bg: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Cpu, title: '本地 LLM 推理', desc: '完全本地化，数据安全可控', color: '#f59e0b', bg: 'from-amber-500/20 to-amber-500/5' },
  { icon: Network, title: 'MCP 扩展生态', desc: '开放协议，无限扩展能力边界', color: '#06b6d4', bg: 'from-cyan-500/20 to-cyan-500/5' },
];

export default function CompactRotatingCards() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % CARDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-3 card-enter card-enter-delay-3 overflow-hidden relative flex-1 flex flex-col">
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12), transparent 70%)' }} />
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="p-1 rounded-lg bg-purple-500/10">
          <Brain className="w-3 h-3 text-purple-400" />
        </div>
        <h3 className="text-[11px] font-bold text-white">核心能力</h3>
        <div className="flex items-center gap-1 ml-auto">
          {CARDS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-2.5 h-1 bg-indigo-400 shadow-[0_0_4px_rgba(99,102,241,0.5)]' : 'w-1 h-1 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden" ref={containerRef}>
        {CARDS.map((card, i) => {
          const isActive = i === activeIndex;
          const offset = i - activeIndex;
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="absolute inset-0 transition-all duration-500 ease-out"
              style={{
                transform: `translateY(${offset * 100}%) scale(${isActive ? 1 : 0.85})`,
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <div className={`h-full rounded-xl bg-gradient-to-br ${card.bg} border border-white/[0.06] p-3 flex flex-col items-center justify-center text-center`}>
                <div className="p-2 rounded-xl mb-2" style={{ backgroundColor: `${card.color}18` }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5">{card.title}</h4>
                <p className="text-[9px] text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
