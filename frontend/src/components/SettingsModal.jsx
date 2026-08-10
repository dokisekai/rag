import React, { useState } from 'react';
import { Settings, X, Key, Globe, Cpu, Volume2, Flame, Check, User, Activity, RefreshCw, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import CharacterCardSelector from './CharacterCardSelector';

const PRESET_MODELS = [
  { label: '🤖 Local LM Studio (默认)', value: 'liquid/lfm2-24b-a2b' },
  { label: '💎 Gemma 26B QAT (Google 极致量化模型)', value: 'google/gemma-4-26b-a4b-qat' },
  { label: '⚡ DeepSeek-V3 (通用大语言模型)', value: 'deepseek-chat' },
  { label: '🧠 DeepSeek-R1 (深度逻辑推理)', value: 'deepseek-reasoner' },
  { label: '💻 Qwen 2.5 Coder (代码能力强化)', value: 'qwen2.5-coder-32b-instruct' },
  { label: '🦙 Llama 3.3 70B (开源模型)', value: 'llama-3.3-70b-instruct' },
  { label: '🌟 GPT-4o (OpenAI 旗舰)', value: 'gpt-4o' },
  { label: '⚡ GPT-4o Mini (极速轻量)', value: 'gpt-4o-mini' },
];

export default function SettingsModal({ isOpen, onClose, config, onSave, avatarType, onAvatarTypeChange }) {
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [apiBase, setApiBase] = useState(config.apiBase || 'http://127.0.0.1:1234/v1');
  const [model, setModel] = useState(config.model || 'liquid/lfm2-24b-a2b');
  const [voice, setVoice] = useState(config.voice || 'zh-CN-XiaoxiaoNeural');
  const [temperature, setTemperature] = useState(config.temperature ?? 1.0);

  // 仅知识库严谨模式与联网配置
  const [strictKbMode, setStrictKbMode] = useState(config.strictKbMode ?? false);
  const [searchEngine, setSearchEngine] = useState(config.searchEngine || 'auto');
  const [searchTopK, setSearchTopK] = useState(config.searchTopK ?? 5);
  const [searchRetryEnabled, setSearchRetryEnabled] = useState(config.searchRetryEnabled ?? true);
  const [searchFilterPortals, setSearchFilterPortals] = useState(config.searchFilterPortals ?? true);
  const [searchLlmExtraction, setSearchLlmExtraction] = useState(config.searchLlmExtraction ?? true);

  // TTS 语音合成开关与语音自动提交
  const [ttsEnabled, setTtsEnabled] = useState(config.ttsEnabled ?? false);
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(config.autoSubmitVoice ?? false);

  const [saved, setSaved] = useState(false);

  // 在线模型拉取与测试连接状态
  const [onlineModels, setOnlineModels] = useState([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testState, setTestState] = useState({ loading: false, success: null, message: '', latencyMs: null });

  if (!isOpen) return null;

  // 动态拉取服务器在线模型列表
  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const resp = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_base: apiBase }),
      });
      const data = await resp.json();
      if (data.status === 'success' && data.models && data.models.length > 0) {
        setOnlineModels(data.models);
        if (!model || !data.models.includes(model)) {
          setModel(data.models[0]);
        }
        setTestState({
          loading: false,
          success: true,
          message: `已成功获取 ${data.models.length} 个在线模型`,
          latencyMs: null
        });
      } else {
        setTestState({
          loading: false,
          success: false,
          message: data.message || '获取模型列表失败，请检查 API 地址及 Key',
          latencyMs: null
        });
      }
    } catch (e) {
      setTestState({
        loading: false,
        success: false,
        message: `无法连接服务器拉取模型: ${e.message}`,
        latencyMs: null
      });
    } finally {
      setFetchingModels(false);
    }
  };

  // 测试当前模型与 API 配置的连通性
  const handleTestConnection = async () => {
    setTestState({ loading: true, success: null, message: '正在测试 API 连通性...', latencyMs: null });
    try {
      const resp = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_base: apiBase, model }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setTestState({
          loading: false,
          success: true,
          message: data.message || '连接正常！',
          latencyMs: data.latency_ms
        });
      } else {
        setTestState({
          loading: false,
          success: false,
          message: data.message || '连接测试异常',
          latencyMs: null
        });
      }
    } catch (e) {
      setTestState({
        loading: false,
        success: false,
        message: `网络测试失败: ${e.message}`,
        latencyMs: null
      });
    }
  };

  const handleSave = async () => {
    const newCfg = {
      apiKey,
      apiBase,
      model,
      voice,
      temperature,
      strictKbMode,
      searchEngine,
      searchTopK,
      searchRetryEnabled,
      searchFilterPortals,
      searchLlmExtraction,
      ttsEnabled,
      autoSubmitVoice,
    };
    onSave(newCfg);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          api_base: apiBase,
          model,
          voice,
          temperature: parseFloat(temperature),
          strict_kb_mode: !!strictKbMode,
          search_engine: searchEngine,
          search_top_k: parseInt(searchTopK, 10),
          search_retry_enabled: !!searchRetryEnabled,
          search_filter_portals: !!searchFilterPortals,
          search_llm_extraction: !!searchLlmExtraction,
          tts_enabled: !!ttsEnabled,
          auto_submit_voice: !!autoSubmitVoice,
        }),
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-xl p-6 rounded-3xl space-y-6 relative border border-slate-700/50 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
            配置 LLM API 参数与测试
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              AI 面试官声音发音人 (TTS Voice)
            </label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            >
              <option value="zh-CN-XiaoxiaoNeural">👩 微软晓晓 (知性自然女声 - 推荐)</option>
              <option value="zh-CN-XiaoyiNeural">👩 微软晓伊 (严谨干练女声)</option>
              <option value="zh-CN-YunxiNeural">👨 微软云希 (沉稳专业男声)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              AI 面试官角色卡
            </label>
            <CharacterCardSelector
              selectedId={avatarType}
              onSelect={(id) => onAvatarTypeChange && onAvatarTypeChange(id)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                模型温度参数 (Temperature)
              </span>
              <span className="font-mono text-amber-400 font-bold">{temperature}</span>
            </label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-900 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.0 (极冷酷 · 严遵仿真禁令)</span>
              <span>0.5 (标准)</span>
              <span>1.0 (发散创造)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              API Key (本地 LM Studio / Ollama 可填 not-needed)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="本地 LM Studio / Ollama 无需填写"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              API Base URL (兼容 OpenAI 接口)
            </label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://127.0.0.1:1234/v1"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* 模型选择与在线获取 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                模型选择与配置 (Model Choice)
              </label>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                {fetchingModels ? '拉取中...' : '动态拉取在线模型'}
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              >
                {onlineModels.length > 0 && (
                  <optgroup label="🌐 服务器在线拉取模型">
                    {onlineModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="✨ 主流预设模型">
                  {PRESET_MODELS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                  ))}
                </optgroup>
              </select>

              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="或自定义输入模型名称 (如: deepseek-chat)"
                className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* 🛡 仅知识库严格回答模式 */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-amber-400" />
                仅知识库严格回答模式 (Zero Hallucination Mode)
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictKbMode}
                  onChange={(e) => setStrictKbMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              开启后系统强制禁止使用 LLM 外部泛化知识；若知识库中未检索到相关资料，大模型将直接且仅能回答 <code className="text-amber-300 font-bold bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">“⚠️ 抱歉，当前知识库中未检索到相关资料”</code>，绝对零幻觉、零胡编乱造！
            </p>
          </div>

          {/* 🌐 实时联网搜索管理 */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-sky-400" />
                实时联网搜索管理 (Web Search & Retry Filters)
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-mono border border-slate-700/50">
                双引擎自动切换
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 搜索引擎选择 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  🔍 搜索引擎切换
                </label>
                <select
                  value={searchEngine}
                  onChange={(e) => setSearchEngine(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                >
                  <option value="auto">⚡️ Bing + 百度双引擎自动降级 (推荐中国网络)</option>
                  <option value="bing">🌐 仅 Bing 中国 (cn.bing.com)</option>
                  <option value="baidu">🇨🇳 仅 百度搜索 (baidu.com)</option>
                </select>
              </div>

              {/* 检索条数 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  📊 单次检索条数 (Top-K)
                </label>
                <select
                  value={searchTopK}
                  onChange={(e) => setSearchTopK(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                >
                  <option value={3}>3 条 (极速响应)</option>
                  <option value={5}>5 条 (标准推荐)</option>
                  <option value={8}>8 条 (深度丰富)</option>
                  <option value={10}>10 条 (最大容量)</option>
                </select>
              </div>
            </div>

            {/* 容错与过滤高级开关 */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">⚡️ 容错重试轮询</span>
                  <span className="text-[10px] text-slate-400">(效果不佳时自动轮询专业技术类名)</span>
                </span>
                <input
                  type="checkbox"
                  checked={searchRetryEnabled}
                  onChange={(e) => setSearchRetryEnabled(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded bg-slate-950 border-slate-800 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">🛡 品牌门面与纯安装包强过滤</span>
                  <span className="text-[10px] text-slate-400">(屏蔽 oracle.com, redis.io 泛首页页)</span>
                </span>
                <input
                  type="checkbox"
                  checked={searchFilterPortals}
                  onChange={(e) => setSearchFilterPortals(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded bg-slate-950 border-slate-800 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span className="text-purple-400 font-semibold">🧠 LLM 大模型关键词提炼</span>
                  <span className="text-[10px] text-slate-400">(使用大模型重写口语化关键词)</span>
                </span>
                <input
                  type="checkbox"
                  checked={searchLlmExtraction}
                  onChange={(e) => setSearchLlmExtraction(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded bg-slate-950 border-slate-800 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 连通性测试区 */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">配置测试与连通校验</span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.loading}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${testState.loading ? 'animate-pulse' : ''}`} />
                {testState.loading ? '正在连通测试...' : '⚡️ 测试当前配置连接'}
              </button>
            </div>

            {testState.message && (
              <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                testState.success === true
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : testState.success === false
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                {testState.success === true && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {testState.success === false && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                {testState.loading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium">{testState.message}</p>
                  {testState.latencyMs !== null && (
                    <p className="text-[10px] text-emerald-400/80 mt-0.5 font-mono">
                      响应耗时: {testState.latencyMs}ms | API Base: {apiBase}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? '已保存！' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}

