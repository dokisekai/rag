import React from 'react';
import { X, User, Volume2, Sparkles, Check } from 'lucide-react';
import CharacterCardSelector from './CharacterCardSelector';

export default function UserPreferencesModal({ 
  isOpen, 
  onClose, 
  avatarType, 
  onAvatarTypeChange,
  voice,
  onVoiceChange,
}) {
  const [saved, setSaved] = React.useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl p-6 rounded-3xl space-y-6 relative border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <User className="w-5 h-5 text-purple-400" />
            我的偏好设置
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI 面试官角色
            </label>
            <CharacterCardSelector
              selectedId={avatarType}
              onSelect={(id) => onAvatarTypeChange && onAvatarTypeChange(id)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50">
              <label className="block text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                语音发音人
              </label>
              <select
                value={voice}
                onChange={(e) => onVoiceChange && onVoiceChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              >
                <option value="zh-CN-XiaoxiaoNeural">👩 微软晓晓 (知性自然女声)</option>
                <option value="zh-CN-XiaoyiNeural">👩 微软晓伊 (严谨干练女声)</option>
                <option value="zh-CN-YunxiNeural">👨 微软云希 (沉稳专业男声)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                选择你喜欢的 AI 面试官声音
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50">
              <label className="block text-xs font-semibold text-slate-400 mb-3">
                关于
              </label>
              <div className="space-y-2 text-xs text-slate-400">
                <p>版本：<span className="text-slate-300">v1.0.0</span></p>
                <p>技术栈：<span className="text-slate-300">React + FastAPI</span></p>
                <p>特色：<span className="text-slate-300">本地 LLM + 实时数字人</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? '已保存！' : '保存偏好'}
          </button>
        </div>
      </div>
    </div>
  );
}
