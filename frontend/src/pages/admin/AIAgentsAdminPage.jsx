import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Volume2, 
  Sliders, 
  Check, 
  RefreshCw, 
  Play, 
  Save, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  User, 
  MessageSquare,
  Radio
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import CharacterCardSelector from '../../components/CharacterCardSelector';
import { CHARACTERS, getCharacter } from '../../data/characters';

export default function AIAgentsAdminPage() {
  const {
    config,
    saveConfig,
    avatarType,
    setAvatarType,
  } = useApp();

  const [currentVoice, setCurrentVoice] = useState(config.voice || 'zh-CN-XiaoxiaoNeural');
  const [currentTemp, setCurrentTemp] = useState(config.temperature ?? 1.0);
  const [currentModel, setCurrentModel] = useState(config.model || 'liquid/lfm2-24b-a2b');
  const [systemPrompt, setSystemPrompt] = useState(
    '你是一个专业的 AI 知识库与技术面试官，能够准确检索文档内容，回答精准严谨，有条理。'
  );
  const [saved, setSaved] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const activeCharacter = getCharacter(avatarType);

  const handleSaveAgentConfig = () => {
    saveConfig({
      voice: currentVoice,
      temperature: currentTemp,
      model: currentModel,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      const sampleText = `你好！我是当前启用的 AI 智能体【${activeCharacter.name}】，很高兴在 VoiceRAG 系统中为你服务！`;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.lang = 'zh-CN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsTestingVoice(false), 1200);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 头部标题 Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bot className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">AI 智能体 / 面试官管理中心</h2>
            </div>
            <p className="text-xs text-slate-400 pl-9">
              统一配置与管理系统内的数字人智能体形象、音色人设、推理模型及全局对话提示词
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAgentConfig}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
              {saved ? '智能体配置已生效！' : '保存当前智能体设置'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid 布局：左侧形象卡片切换，右侧参数控制 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：智能体数字人卡片列表 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                切换与选择默认 AI 智能体形象
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                当前启用: <strong className="text-emerald-400 font-bold">{activeCharacter.name}</strong> ({activeCharacter.title})
              </span>
            </div>

            <CharacterCardSelector
              selectedId={avatarType}
              onSelect={(id) => setAvatarType(id)}
            />
          </div>
        </div>

        {/* 右侧：音色发音人与 AI 智能体参数面板 */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. 音色与语音选择 */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                智能体语音音色 (Edge TTS)
              </span>
              <button
                onClick={handleTestVoice}
                disabled={isTestingVoice}
                className="px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className={`w-3 h-3 ${isTestingVoice ? 'animate-spin' : ''}`} />
                试听音色
              </button>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">合成发音人角色</label>
                <select
                  value={currentVoice}
                  onChange={(e) => setCurrentVoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="zh-CN-XiaoxiaoNeural">👩 微软晓晓 (知性自然女声 - 推荐)</option>
                  <option value="zh-CN-XiaoyiNeural">👩 微软晓伊 (严谨干练女声)</option>
                  <option value="zh-CN-YunxiNeural">👨 微软云希 (沉稳专业男声)</option>
                  <option value="zh-CN-YunjianNeural">👨 微软云健 (活泼热情男声)</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>当前绑定声优：</span>
                  <span className="text-indigo-300 font-bold">{activeCharacter.voiceName}</span>
                </div>
                <div className="flex justify-between">
                  <span>性格特征：</span>
                  <span className="text-slate-300">{activeCharacter.personality}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 智能体会话与推理参数 */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              模型推理与对话调节
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">推理调用模型</label>
                <input
                  type="text"
                  value={currentModel}
                  onChange={(e) => setCurrentModel(e.target.value)}
                  placeholder="例如: liquid/lfm2-24b-a2b 或 deepseek-chat"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400">生成随机度 (Temperature)</label>
                  <span className="text-xs font-mono font-bold text-purple-300">{currentTemp}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={currentTemp}
                  onChange={(e) => setCurrentTemp(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>0.0 (精准严格)</span>
                  <span>0.3 (默认平衡)</span>
                  <span>1.0 (富有创意)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">智能体人设系统提示词 (System Prompt)</label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
