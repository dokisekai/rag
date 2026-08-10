import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Database, 
  History, 
  Settings, 
  LogOut,
  Shield,
  Users,
  BarChart3,
  Cpu,
  Sparkles,
  ChevronRight,
  Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const MENU_ITEMS = [
  { id: 'dashboard', label: '数据仪表盘', icon: LayoutDashboard, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'knowledge', label: '知识库管理', icon: Database, color: 'text-sky-400', bgColor: 'bg-sky-500/10', gradient: 'from-sky-500 to-blue-500' },
  { id: 'ai-agents', label: 'AI 智能体', icon: Bot, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'ai-skills', label: 'AI 能力中心', icon: Cpu, color: 'text-purple-400', bgColor: 'bg-purple-500/10', gradient: 'from-purple-500 to-pink-500' },
  { id: 'history', label: '问答历史', icon: History, color: 'text-violet-400', bgColor: 'bg-violet-500/10', gradient: 'from-violet-500 to-purple-500' },
  { id: 'users', label: '用户管理', icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-500/10', gradient: 'from-pink-500 to-rose-500' },
  { id: 'settings', label: '系统设置', icon: Settings, color: 'text-amber-400', bgColor: 'bg-amber-500/10', gradient: 'from-amber-500 to-orange-500' },
];

export default function AdminLayout({ children }) {
  const { adminPage, setAdminPage, setActiveView } = useApp();
  const currentMenu = MENU_ITEMS.find(m => m.id === adminPage);

  return (
    <div className="min-h-screen flex font-sans selection:bg-amber-500 selection:text-white">
      {/* 侧边栏 - 更紧凑精致 */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-2xl flex flex-col sticky top-0 h-screen">
        {/* Logo 区域 */}
        <div className="px-4 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover-lift">
              <Shield className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-gradient-amber">知识库管理</h1>
              <p className="text-[9px] text-slate-500">VoiceRAG Admin</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = adminPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                  isActive
                    ? `${item.bgColor} ${item.color} shadow-sm`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? item.bgColor : 'bg-slate-800/30 group-hover:bg-slate-700/30'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="px-2 py-3 border-t border-slate-800/50 space-y-2">
          <div className="px-3 py-2.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">Admin</p>
                <p className="text-[9px] text-slate-500 truncate">超级管理员</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
          
          <button
            onClick={() => setActiveView('user')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:text-amber-400 transition-colors" />
            返回用户端
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 - 更紧凑 */}
        <header className="h-12 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-30 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${currentMenu?.bgColor || 'bg-slate-500/10'}`}>
              {currentMenu?.icon && <currentMenu.icon className={`w-4 h-4 ${currentMenu?.color || 'text-slate-400'}`} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {currentMenu?.label || '管理后台'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              系统正常
            </span>
            <span className="text-[10px] text-slate-600 font-mono hidden sm:block">v1.0.0</span>
          </div>
        </header>

        {/* 内容区 - 更紧凑的内边距 */}
        <main className="flex-1 p-4 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
