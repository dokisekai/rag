import React, { useState } from 'react';
import { Bot, User, Shield, Sparkles, Settings, Radio, Activity } from 'lucide-react';
import NotificationCenter from '../components/NotificationCenter';
import UserPreferencesModal from '../components/UserPreferencesModal';
import SettingsModal from '../components/SettingsModal';
import { useApp } from '../context/AppContext';

export default function UserLayout({ children }) {
  const {
    config,
    saveConfig,
    avatarType,
    setAvatarType,
    setActiveView,
    setAdminPage,
  } = useApp();

  const [isUserPrefsOpen, setIsUserPrefsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userVoice, setUserVoice] = useState(config.voice || 'zh-CN-XiaoxiaoNeural');

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="dashboard-container px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/60 hover:scale-110 transition-all duration-300 animate-float-mini">
              <Bot className="w-5 h-5" />
              {/* 呼吸光环 */}
              <div className="absolute inset-0 rounded-xl animate-pulse-ring" style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white flex items-center gap-2">
                <span className="text-gradient-indigo text-gradient-flow neon-text-indigo">VoiceRAG</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                  AI 知识库
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Obsidian / 本地文档 · RAG 检索增强 · 智能问答</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 系统状态标签（保持动态视觉效果） */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 hover:bg-emerald-500/15 transition-colors">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">系统就绪</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/8 border border-indigo-500/15 hover:bg-indigo-500/15 transition-colors">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">v1.0</span>
            </div>

            <NotificationCenter />

            <button
              onClick={() => {
                setActiveView('admin');
                setAdminPage('settings');
              }}
              className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all cursor-pointer shadow-sm group"
              title="进入管理后台与系统配置（大模型/在线拉取/仅知识库严谨模式/联网搜索）"
              aria-label="设置"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 dashboard-container px-6 py-4 w-full">
        {children}
      </main>

      <footer className="border-t border-slate-900/30 py-2 text-center text-[10px] text-slate-600">
        VoiceRAG AI 知识库系统 · 本地 LLM · 向量检索 · Edge TTS
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={saveConfig}
        avatarType={avatarType}
        onAvatarTypeChange={setAvatarType}
      />

      <UserPreferencesModal
        isOpen={isUserPrefsOpen}
        onClose={() => setIsUserPrefsOpen(false)}
        avatarType={avatarType}
        onAvatarTypeChange={setAvatarType}
        voice={userVoice}
        onVoiceChange={setUserVoice}
      />
    </div>
  );
}
