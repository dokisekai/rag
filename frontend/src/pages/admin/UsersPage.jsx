import React from 'react';
import { Users, UserPlus, Search, MoreVertical, Crown, Shield } from 'lucide-react';

const MOCK_USERS = [
  { id: 1, name: 'Admin', role: '超级管理员', email: 'admin@example.com', status: 'active', avatar: 'A' },
  { id: 2, name: '张小明', role: '普通用户', email: 'zhang@example.com', status: 'active', avatar: '张' },
  { id: 3, name: '李华', role: '普通用户', email: 'li@example.com', status: 'active', avatar: '李' },
  { id: 4, name: '王芳', role: 'VIP用户', email: 'wang@example.com', status: 'active', avatar: '王' },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索用户..."
              className="w-64 pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50"
            />
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium transition-all cursor-pointer shadow-lg shadow-pink-500/20">
          <UserPlus className="w-4 h-4" />
          添加用户
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 mb-1">总用户数</p>
          <p className="text-2xl font-bold text-white">128</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 mb-1">VIP用户</p>
          <p className="text-2xl font-bold text-amber-400">23</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 mb-1">活跃用户</p>
          <p className="text-2xl font-bold text-emerald-400">89</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 mb-1">今日新增</p>
          <p className="text-2xl font-bold text-sky-400">5</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800/50 bg-slate-900/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">用户</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">角色</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">状态</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">面试次数</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {MOCK_USERS.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      user.role === '超级管理员' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                      user.role === 'VIP用户' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                      'bg-gradient-to-br from-slate-500 to-slate-600'
                    }`}>
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-1.5">
                        {user.name}
                        {user.role === '超级管理员' && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                        {user.role === 'VIP用户' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      </p>
                      <p className="text-[11px] text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    user.role === '超级管理员' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    user.role === 'VIP用户' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    活跃
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-300">{Math.floor(Math.random() * 50) + 5} 次</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
