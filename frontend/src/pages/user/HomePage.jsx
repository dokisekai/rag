import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Database, ChevronDown, ChevronUp, ArrowRight, MessageSquare } from 'lucide-react';
import ModulePicker from '../../components/ModulePicker';
import VoiceConsole from '../../components/VoiceConsole';
import { useApp } from '../../context/AppContext';
import { getCharacter } from '../../data/characters';
import Particles from './components/Particles';
import DataRain from './components/DataRain';
import TypewriterText from './components/TypewriterText';
import KnowledgeGraph from './components/KnowledgeGraph';
import CompactRotatingCards from './components/CompactRotatingCards';
import InsightCard from './components/InsightCard';

export default function HomePage() {
  const {
    modules, selectedModule, setSelectedModule,
    config, ragEnabled, setRagEnabled,
    customKBs, selectedKbId, setSelectedKbId,
    avatarType, setAvatarType,
  } = useApp();

  const [activeSession, setActiveSession] = useState(false);
  const [showKbSelector, setShowKbSelector] = useState(false);

  const character = getCharacter(avatarType);

  const typewriterText = useMemo(() =>
    `结合本地 Markdown/Obsidian 文档与 RAG 向量检索，与 ${character.name} 一起探索知识库中的专业内容`,
    [character.name]
  );

  const handleStartSession = () => {
    // 没选知识库时强制关闭 RAG（避免进入对话页后无知识库可用）
    if (!selectedKbId && ragEnabled) {
      setRagEnabled(false);
    }
    setActiveSession(true);
  };

  if (activeSession) {
    return (
      <VoiceConsole
        module={selectedModule} config={config}
        ragEnabled={ragEnabled} kbId={selectedKbId}
        onEnd={() => setActiveSession(false)}
        onFinishReport={() => setActiveSession(false)}
        avatarType={avatarType} onAvatarTypeChange={setAvatarType}
      />
    );
  }

  const selectedKb = customKBs.find(kb => kb.id === selectedKbId);
  const particleColor = character.textColor?.includes('indigo') ? 'indigo'
    : character.textColor?.includes('rose') ? 'rose' : 'purple';

  return (
    <div className="page-reveal space-y-4">

      {/* ====== Hero Banner ====== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 scanning-border"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,30,50,0.92) 40%, rgba(15,23,42,0.95) 100%)',
          contain: 'layout style paint',
        }}>
        <div className="absolute inset-0 animated-grid opacity-40" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3), transparent)' }} />
        <DataRain count={15} opacity={0.12} />
        <Particles count={10} color={particleColor} />
        {/* 边框光点跑动 */}
        <div className="border-glow-runner" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8), transparent 70%)' }} />
        <div className="border-glow-runner" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6), transparent 70%)', animationDelay: '3s', animationDuration: '7s' }} />

        <div className="relative px-6 py-5">
          {/* ===== 第一行：主标题（系统状态标签已移至顶部 Header） ===== */}
          <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 tracking-tight">
            <span className="text-gradient-indigo neon-text-indigo">AI 知识库智能问答</span>
          </h1>

          {/* ===== 第三行：动态打字副标题 ===== */}
          <div className="mb-5">
            <p className="text-sm text-slate-400 leading-relaxed font-medium" style={{ minHeight: '1.75em' }}>
              <TypewriterText text={typewriterText} speed={55} deleteSpeed={25} pause={2200} cursorColor="#818cf8" />
            </p>
          </div>

          {/* ===== 第四行：控制栏 + CTA（同一行） ===== */}
          <div className="flex flex-wrap items-center gap-3">
            {/* RAG 开关 */}
            <div className="flex items-center gap-2.5 bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800/40 hover:border-slate-700/60 transition-colors">
              <div className={`p-1.5 rounded-lg transition-colors ${ragEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-300 select-none">RAG 检索增强</span>
              <button
                onClick={() => setRagEnabled(!ragEnabled)}
                className="relative w-9 rounded-full transition-all duration-300 cursor-pointer ml-1"
                style={{ height: '18px', background: ragEnabled ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'rgb(51,65,85)' }}
              >
                <div className={`absolute top-[2px] w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-300 ${ragEnabled ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
            </div>

            {/* 知识库选择器 */}
            {ragEnabled && (
              <KbSelector kbs={customKBs} selectedKbId={selectedKbId} selectedKb={selectedKb}
                show={showKbSelector} setShow={setShowKbSelector} onSelect={(id) => { setSelectedKbId(id); setShowKbSelector(false); }} />
            )}

            {/* CTA 按钮 - 立即体验（与控制栏同行，不单独占行） */}
            <button onClick={handleStartSession}
              className="group relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] ml-auto"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                boxShadow: '0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(139,92,246,0.15)',
              }}>
              <span className="btn-pulse-ring" />
              <span className="btn-pulse-ring" />
              <span className="btn-pulse-ring" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <MessageSquare className="w-4 h-4 relative z-10" />
              <span className="relative z-10 whitespace-nowrap">立即体验</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ====== 知识宇宙 + 右侧卡片 ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <KnowledgeGraph
            modules={modules} customKBs={customKBs}
            onNodeClick={(node) => {
              if (node.type === 'kb') {
                const kbId = node.id.startsWith('kb-') ? node.id.slice(3) : node.id;
                setSelectedKbId(kbId);
              } else if (node.type === 'module') {
                const mod = modules.find(m => String(m.id) === String(node.rawId));
                if (mod) setSelectedModule(mod);
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-4" style={{ height: 400 }}>
          <CompactRotatingCards />
          <InsightCard customKBs={customKBs} />
        </div>
      </div>

      {/* ====== 模块选择器 ====== */}
      <div className="mt-4">
        <ModulePicker modules={modules} selectedModule={selectedModule} onSelect={setSelectedModule} />
      </div>
    </div>
  );
}

// ====== 知识库选择器（内联组件） ======
function KbSelector({ kbs, selectedKbId, selectedKb, show, setShow, onSelect }) {
  const btnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  useLayoutEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setDropdownPos(null);
    }
  }, [show]);

  // 监听窗口尺寸变化，下拉框打开时同步更新位置
  useLayoutEffect(() => {
    if (!show || !btnRef.current) return;
    const update = () => {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [show]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setShow(!show)}
        className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/60 border border-slate-800/40 rounded-xl hover:border-indigo-500/40 transition-all text-left cursor-pointer min-w-[190px]"
      >
        {selectedKb ? (
          <>
            <Database className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-white truncate flex-1 font-medium">{selectedKb.name}</span>
          </>
        ) : (
          <span className="text-xs text-slate-500 flex-1">选择知识库...</span>
        )}
        {show ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {show && dropdownPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        >
          {kbs.length === 0 ? (
            <div className="p-4 text-center">
              <Database className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">暂无自定义知识库</p>
            </div>
          ) : (
            <div className="max-h-44 overflow-y-auto scrollbar-thin">
              {kbs.map(kb => (
                <button key={kb.id} onClick={() => { onSelect(kb.id); setShow(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors cursor-pointer ${
                    selectedKbId === kb.id ? 'bg-indigo-500/15 border-l-2 border-indigo-500' : 'hover:bg-slate-800/50'
                  }`}>
                  <Database className={`w-4 h-4 flex-shrink-0 ${selectedKbId === kb.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className={`text-xs truncate ${selectedKbId === kb.id ? 'text-white font-medium' : 'text-slate-300'}`}>{kb.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
