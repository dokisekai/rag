import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, RefreshCw, FileText, Calendar, MessageSquare } from 'lucide-react';

export default function HistoryAdminPage() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/interview/history');
      const data = await resp.json();
      setHistoryList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条问答会话记录吗？')) return;
    try {
      await fetch(`/api/interview/history/${id}`, { method: 'DELETE' });
      setHistoryList(prev => prev.filter(item => item.id !== id));
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = historyList.filter(item => {
    const title = item.title || item.summary || item.module_title || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalQueries = historyList.reduce((sum, item) => {
    const userMsgs = (item.dialog_messages || []).filter(m => m.role === 'user');
    return sum + (item.query_count || userMsgs.length);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{historyList.length}</p>
              <p className="text-[11px] text-slate-500 font-medium">总会话数</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{totalQueries}</p>
              <p className="text-[11px] text-slate-500 font-medium">累计提问对话数</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">
                {historyList.length > 0 ? Math.round(totalQueries / historyList.length) : 0}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">平均轮数 / 会话</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索问答主题..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-72 pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          onClick={loadHistory}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800/50 bg-slate-900/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">问答主题</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">交互轮数</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">时间</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500 text-sm">
                    加载中...
                  </td>
                </tr>
              ) : filteredList.length > 0 ? (
                filteredList.map((item) => {
                  const queryCount = item.query_count || (item.dialog_messages || []).filter(m => m.role === 'user').length;
                  const isSelected = selectedSession?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedSession(item)}
                      className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-500/10' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white truncate max-w-xs">
                          {item.title || item.summary || item.module_title || '知识库问答'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {queryCount} 轮对话
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.created_at}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">暂无问答会话记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 右侧会话详情对话树 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            会话详情预览
          </h3>
          {selectedSession ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <div>
                <h4 className="text-xs font-bold text-indigo-300 mb-1">
                  {selectedSession.title || selectedSession.summary || selectedSession.module_title}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono">{selectedSession.created_at}</p>
              </div>
              <div className="space-y-3">
                {(selectedSession.dialog_messages || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      msg.role === 'user'
                        ? 'bg-indigo-950/30 border border-indigo-500/20 text-slate-200 ml-4'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-semibold text-[10px] block opacity-70">
                      {msg.role === 'user' ? '💬 用户提问' : '🤖 AI 助手解答'}
                    </span>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-600 text-xs">
              在左侧列表中点击任意会话查看问答详情记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
