import React, { useState, useEffect } from 'react';
import { History, X, Calendar, Trash2, FileText, MessageSquare } from 'lucide-react';

export default function HistoryModal({ isOpen, onClose }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-3xl p-6 rounded-3xl space-y-4 relative border border-slate-700/50 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <History className="w-5 h-5 text-indigo-400" />
            AI 知识库问答历史记录
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">正在加载问答会话...</div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">暂无历史问答记录</p>
              <p className="text-slate-500 text-xs">智能对话完成后，会话摘要将自动保存在此处。</p>
            </div>
          ) : selectedSession ? (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedSession(null)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← 返回历史会话列表
              </button>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div>
                  <h3 className="font-bold text-white text-sm">{selectedSession.title || selectedSession.summary || selectedSession.module_title}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedSession.created_at}</p>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {(selectedSession.dialog_messages || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        msg.role === 'user'
                          ? 'bg-indigo-950/30 border border-indigo-500/20 text-slate-200 ml-4'
                          : 'bg-slate-900/80 border border-slate-800 text-slate-300'
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
            </div>
          ) : (
            historyList.map((item) => {
              const queryCount = item.query_count || (item.dialog_messages ? item.dialog_messages.filter(m => m.role === 'user').length : 0);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedSession(item)}
                  className="p-4 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all flex items-center justify-between group bg-slate-900/50 border border-slate-800"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-3">
                    <h4 className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors truncate">
                      {item.title || item.summary || item.module_title || '知识库问答'}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {item.created_at}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        交互轮次: <strong className="text-slate-200">{queryCount}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      title="删除记录"
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
