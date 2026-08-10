import { Zap, Database, FileText, Search, Brain } from 'lucide-react';

export default function InsightCard({ customKBs }) {
  const kbs = customKBs || [];
  const totalDocs = kbs.reduce((s, kb) => s + (kb.doc_count || 0), 0);
  const totalChunks = kbs.reduce((s, kb) => s + (kb.chunk_count || 0), 0);

  const metrics = [
    { label: '知识库', value: kbs.length, unit: '个', color: '#6366f1', icon: <Database className="w-3 h-3" /> },
    { label: '文档', value: totalDocs, unit: '篇', color: '#10b981', icon: <FileText className="w-3 h-3" /> },
    { label: '分块', value: totalChunks, unit: '', color: '#f59e0b', icon: <Search className="w-3 h-3" /> },
    { label: '向量维度', value: kbs.length > 0 ? (kbs[0].emb_dim || 1536) : '-', unit: '', color: '#a855f7', icon: <Brain className="w-3 h-3" /> },
  ];

  return (
    <div className="glass-panel rounded-2xl p-3 card-enter card-enter-delay-4 overflow-hidden relative flex-1 flex flex-col"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03), rgba(129,140,248,0.05))' }}
    >
      {/* 流光扫过效果 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(129,140,248,0.1) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s ease-in-out infinite',
        }}
      />
      {/* 顶部光晕 */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(129,140,248,0.15), transparent 70%)' }}
      />
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0 relative z-10">
        <div className="p-1 rounded-lg" style={{ backgroundColor: 'rgba(129,140,248,0.15)' }}>
          <Zap className="w-3 h-3" style={{ color: '#818cf8' }} />
        </div>
        <h3 className="text-[11px] font-bold text-white">系统洞察</h3>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full relative" style={{ backgroundColor: '#818cf8' }}>
            <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ backgroundColor: '#818cf8' }} />
          </span>
          <span className="text-[8px] text-slate-500">LIVE</span>
        </div>
      </div>
      {/* 指标网格 */}
      <div className="grid grid-cols-2 gap-1.5 flex-1 relative z-10">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.03]"
            style={{ backgroundColor: `${m.color}0A`, border: `1px solid ${m.color}15` }}
          >
            <div className="flex items-center gap-1 mb-1" style={{ color: m.color }}>
              {m.icon}
              <span className="text-[9px] text-slate-500">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold leading-none"
                style={{ color: m.color, textShadow: `0 0 12px ${m.color}40` }}>
                {m.value}
              </span>
              {m.unit && <span className="text-[9px] text-slate-500">{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
