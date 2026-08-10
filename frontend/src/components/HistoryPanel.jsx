import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RefreshCw,
  Trash2,
  Calendar,
  MessageSquare,
  ChevronRight,
  Search,
  Plus,
  MessageSquarePlus,
} from 'lucide-react';

/**
 * 侧边抽屉使用的历史记录面板
 * - 调用 /api/interview/history 获取会话列表
 * - 支持刷新、删除、点击查看详情、新建会话
 * - 父组件可通过 onSelect(session) 接管点击行为
 * - 父组件可通过 onNewSession() 接管新建会话行为
 */
export default function HistoryPanel({ onSelect, onNewSession, refreshKey = 0 }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [keyword, setKeyword] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/interview/history');
      const data = await resp.json();
      setHistoryList(data || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条问答会话记录吗？')) return;
    try {
      await fetch(`/api/interview/history/${id}`, { method: 'DELETE' });
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = keyword.trim()
    ? historyList.filter((item) => {
        const text = `${item.title || ''} ${item.summary || ''} ${item.module_title || ''}`;
        return text.toLowerCase().includes(keyword.toLowerCase());
      })
    : historyList;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* 面板头部 */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <History className="w-4 h-4 text-indigo-400" />
            会话
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (onNewSession) onNewSession(); }}
              title="新建会话"
              className="p-1.5 rounded-lg text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              新建
            </button>
            <button
              onClick={loadHistory}
              disabled={loading}
              title="刷新会话列表"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索会话标题..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 列表区 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin">
        {loading && historyList.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
            正在加载会话记录...
          </div>
        ) : filtered.length === 0 ? (
          keyword ? (
            // 搜索无结果
            <div className="py-10 text-center space-y-2 animate-fade-in">
              <Search className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-slate-500 text-xs">未找到匹配的会话</p>
              <p className="text-slate-600 text-[10px]">换个关键词试试</p>
            </div>
          ) : (
            // 无会话记录（空状态）
            <div className="py-12 px-4 text-center space-y-4 animate-fade-in flex flex-col items-center">
              {/* 渐变光晕 + 图标圆圈 */}
              <div className="relative w-fit">
                <div className="absolute inset-0 blur-2xl opacity-50 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 animate-float-mini">
                  <MessageSquarePlus className="w-7 h-7 text-indigo-300" />
                </div>
              </div>
              {/* 主副标题 */}
              <div className="space-y-1">
                <p className="text-slate-200 text-sm font-bold">暂无会话记录</p>
                <p className="text-slate-500 text-[11px]">开始你的第一次智能对话</p>
              </div>
              {/* CTA 按钮 */}
              {onNewSession && (
                <button
                  onClick={onNewSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-500/30 hover:scale-105"
                >
                  <Plus className="w-3 h-3" />
                  新建会话
                </button>
              )}
            </div>
          )
        ) : (
          filtered.map((item) => {
            const queryCount =
              item.query_count ||
              (item.dialog_messages
                ? item.dialog_messages.filter((m) => m.role === 'user').length
                : 0);
            const active = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  if (onSelect) onSelect(item);
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer group hover-lift animate-fade-in ${
                  active
                    ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-indigo-500/30 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4
                    className={`text-xs font-semibold truncate flex-1 ${
                      active ? 'text-indigo-200' : 'text-slate-200 group-hover:text-indigo-200'
                    }`}
                  >
                    {item.title || item.summary || item.module_title || '知识库问答'}
                  </h4>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    title="删除记录"
                    className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-2.5 h-2.5" />
                    {item.created_at || '未知时间'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {queryCount} 轮
                  </span>
                  {item.module_title && (
                    <span className="ml-auto text-slate-600 truncate max-w-[80px]" title={item.module_title}>
                      {item.module_title}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
        <span>共 {filtered.length} 条记录</span>
        <span className="flex items-center gap-0.5 text-slate-600">
          点击查看详情 <ChevronRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}
