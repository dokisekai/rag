import React, { useState, useEffect, useRef } from 'react';
import { Mail, X, CheckCheck, Trash2, FileText, Calendar, Sparkles, MessageSquare } from 'lucide-react';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const iconRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const resp = await fetch('/api/notifications');
      const data = await resp.json();
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const resp = await fetch('/api/notifications/unread-count');
      const data = await resp.json();
      setUnreadCount(data.count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        iconRef.current &&
        !iconRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const wasUnread = notifications.find(n => n.id === id && !n.read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <button
        ref={iconRef}
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer group"
      >
        <Mail className={`w-5 h-5 transition-transform ${isOpen ? 'scale-110 text-indigo-400' : 'group-hover:scale-105'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-[10px] font-bold shadow-lg shadow-rose-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-[380px] max-w-[90vw] glass-panel rounded-2xl border border-slate-700/60 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">消息通知中心</h3>
                <p className="text-[10px] text-slate-500">{unreadCount > 0 ? `${unreadCount} 条未读消息` : '暂无未读消息'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  title="全部标为已读"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 text-sm">暂无消息通知</p>
                <p className="text-slate-600 text-xs font-sans">会话保存与知识库更新通知将显示在这里</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {notifications.map((notif) => {
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.read && handleMarkRead(notif.id)}
                      className={`p-3 transition-all group ${
                        notif.read
                          ? 'bg-transparent hover:bg-slate-800/30'
                          : 'bg-gradient-to-r from-indigo-500/5 to-purple-500/5 hover:from-indigo-500/10 hover:to-purple-500/10 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400">
                          <MessageSquare className="w-4 h-4" />
                          {!notif.read && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900 animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-xs font-semibold leading-tight ${
                              notif.read ? 'text-slate-400' : 'text-white'
                            }`}>
                              {notif.title}
                            </h4>
                            <button
                              onClick={(e) => handleDelete(notif.id, e)}
                              className="flex-shrink-0 p-1 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              title="删除通知"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${
                            notif.read ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {notif.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                              <Calendar className="w-3 h-3" />
                              {notif.created_at}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/30 text-center">
              <p className="text-[10px] text-slate-600">— 共 {notifications.length} 条通知 —</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
