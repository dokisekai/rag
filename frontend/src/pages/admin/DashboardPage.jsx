import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Activity,
  Sparkles,
  Zap,
  Server,
  Brain,
  Layers
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalKbs: 0,
    totalDocs: 0,
    totalChunks: 0,
    totalSessions: 0,
    totalQueries: 0,
    todaySessions: 0,
  });
  const [recentHistory, setRecentHistory] = useState([]);
  const [systemHealth, setSystemHealth] = useState('检测中');

  useEffect(() => {
    fetchStats();
    fetchRecentHistory();
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const resp = await fetch('/api/health');
      if (resp.ok) {
        setSystemHealth('运行中');
      } else {
        setSystemHealth('异常');
      }
    } catch (e) {
      console.error(e);
      setSystemHealth('异常');
    }
  };

  const fetchStats = async () => {
    try {
      const [kbResp, historyResp] = await Promise.all([
        fetch('/api/knowledge/list'),
        fetch('/api/interview/history')
      ]);
      const kbData = await kbResp.json();
      const historyData = await historyResp.json();

      const kbs = kbData.items || kbData || [];
      const history = historyData || [];

      const totalDocsCount = kbs.reduce((sum, kb) => sum + (kb.file_count || (kb.documents ? kb.documents.length : 0) || 0), 0);
      const totalChunksCount = kbs.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0);
      const totalQueriesCount = history.reduce((sum, item) => {
        const userMsgs = (item.dialog_messages || []).filter(m => m.role === 'user');
        return sum + (item.query_count || userMsgs.length || 0);
      }, 0);

      const today = new Date().toISOString().split('T')[0];
      const todayCount = history.filter(item => item.created_at && item.created_at.startsWith(today)).length;

      setStats({
        totalKbs: kbs.length,
        totalDocs: totalDocsCount,
        totalChunks: totalChunksCount,
        totalSessions: history.length,
        totalQueries: totalQueriesCount,
        todaySessions: todayCount,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentHistory = async () => {
    try {
      const resp = await fetch('/api/interview/history');
      const data = await resp.json();
      setRecentHistory((data || []).slice(0, 6));
    } catch (e) {
      console.error(e);
    }
  };

  const statCards = [
    { label: '知识库数量', value: stats.totalKbs, icon: Database, color: 'from-sky-500 to-blue-500', bgColor: 'bg-sky-500/10', textColor: 'text-sky-400', unit: '个' },
    { label: '文档卡片总数', value: stats.totalDocs, icon: FileText, color: 'from-indigo-500 to-purple-500', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400', unit: '篇' },
    { label: '向量切块 Chunk', value: stats.totalChunks, icon: Layers, color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', unit: '块' },
    { label: '问答会话次数', value: stats.totalSessions, icon: MessageSquare, color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', unit: '次' },
    { label: '累计提问频次', value: stats.totalQueries, icon: Activity, color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', unit: '条' },
    { label: '今日问答会话', value: stats.todaySessions, icon: Clock, color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-500/10', textColor: 'text-pink-400', unit: '次' },
  ];

  const systemStatus = [
    { label: 'RAG 向量引擎', status: systemHealth, desc: '嵌入与检索组件就绪', icon: Database },
    { label: 'LLM 推理服务', status: systemHealth, desc: '本地 LM Studio / Ollama', icon: Brain },
    { label: 'TTS 语音合成', status: systemHealth, desc: 'Edge TTS 语音播报', icon: Zap },
    { label: 'MCP 协议扩展', status: systemHealth, desc: '上下文工具插件支持', icon: Server },
  ];

  return (
    <div className="space-y-4">
      {/* 统计卡片 - 6列紧凑布局 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="glass-panel p-3.5 rounded-xl border border-slate-800/50 bg-slate-900/30 hover:border-slate-700/50 transition-all hover-lift group"
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className={`p-2 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${card.textColor}`} />
                </div>
                <span className="text-[9px] text-slate-600 font-mono">{card.unit}</span>
              </div>
              <div className={`text-xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                {card.value}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* 记录 + 系统状态 - 布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 最近问答会话 */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-slate-800/50 bg-slate-900/30 hover-lift">
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-500/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            最近问答会话 (Q&A Sessions)
          </h3>
          <div className="space-y-2">
            {recentHistory.length > 0 ? (
              recentHistory.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {item.title || item.summary || item.module_title || '知识库问答'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {item.created_at}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {item.query_count || (item.dialog_messages || []).filter(m => m.role === 'user').length} 次交互
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-600 text-xs">
                暂无问答记录，可在用户端发起智能对话
              </div>
            )}
          </div>
        </div>

        {/* 系统状态 */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-xl border border-slate-800/50 bg-slate-900/30 hover-lift">
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <div className="p-1 rounded-md bg-purple-500/10">
              <Server className="w-3.5 h-3.5 text-purple-400" />
            </div>
            系统与组件状态
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {systemStatus.map((item, i) => {
              const Icon = item.icon;
              const isHealthy = item.status === '运行中' || item.status === '已连接';
              return (
                <div key={i} className={`p-3 rounded-lg border transition-colors group flex items-center justify-between ${isHealthy ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{item.label}</p>
                      <p className="text-[9px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    </span>
                    <span className={`text-[10px] font-medium ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>{item.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
