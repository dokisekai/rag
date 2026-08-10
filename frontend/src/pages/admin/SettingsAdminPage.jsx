import React, { useState } from 'react';
import { Settings, Key, Globe, Cpu, Volume2, Flame, Save, Check, Shield, RefreshCw, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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

export default function SettingsAdminPage() {
  const { config, saveConfig, avatarType, setAvatarType } = useApp();

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

  const [saved, setSaved] = useState(false);

  // 在线模型拉取与测试连接状态
  const [onlineModels, setOnlineModels] = useState([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testState, setTestState] = useState({ loading: false, success: null, message: '', latencyMs: null });

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
    };
    await saveConfig(newCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in">
      {/* 头部标题区域 */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-400" />
            系统核心参数与全局配置 (System Settings)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            在此管理大模型 API 连接、模型选择、零幻觉严谨问答模式及双引擎联网搜索策略。
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-sky-500/25 cursor-pointer hover:scale-[1.02]"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? '全局配置已保存！' : '保存全局配置'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 🤖 大模型服务配置 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-sky-400" />
              大模型服务 API 配置 (LLM Endpoint)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  API 服务地址 (Base URL)
                </label>
                <input
                  type="text"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  placeholder="http://127.0.0.1:1234/v1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  API 密钥 (API Key)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="如 sk-xxxx (本地 LM Studio 免填)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            {/* 模型选择与在线拉取 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  选择或自定义模型名称 (Model)
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetchingModels}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                  {fetchingModels ? '拉取中...' : '动态拉取在线模型'}
                </button>
              </div>

              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
              >
                {onlineModels.length > 0 ? (
                  <optgroup label="🌐 服务器在线拉取到的模型列表">
                    {onlineModels.map((m) => (
                      <option key={m} value={m}>
                        ⚡️ {m}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="⭐ 推荐常用预设大模型">
                  {PRESET_MODELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 连通性测试按钮与反馈面板 */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.loading}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <Activity className={`w-3.5 h-3.5 text-sky-400 ${testState.loading ? 'animate-pulse' : ''}`} />
                {testState.loading ? '正在测试 API 连通性...' : '⚡️ 测试当前配置连接'}
              </button>

              {testState.success !== null && (
                <div className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
                  testState.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testState.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{testState.message}</span>
                  {testState.latencyMs && <span className="font-mono text-[10px] opacity-80">({testState.latencyMs}ms)</span>}
                </div>
              )}
            </div>
          </div>

          {/* 🛡 仅知识库严格回答模式 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-3 shadow-lg shadow-amber-500/5">
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
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              开启后系统强制禁止使用 LLM 外部泛化知识；若知识库中未检索到相关资料，大模型将直接且仅能回答 <code className="text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">“⚠️ 抱歉，当前知识库中未检索到相关资料”</code>，绝对零幻觉、零胡编乱造！没有就是没有！
            </p>
          </div>

          {/* 🌐 实时联网搜索管理 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-sky-400" />
                实时联网搜索管理 (Web Search & Retry Filters)
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-mono border border-slate-700">
                双引擎自动降级
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  🔍 搜索引擎切换
                </label>
                <select
                  value={searchEngine}
                  onChange={(e) => setSearchEngine(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                >
                  <option value="auto">⚡️ Bing + 百度双引擎自动降级 (推荐)</option>
                  <option value="bing">🌐 仅 Bing 中国 (cn.bing.com)</option>
                  <option value="baidu">🇨🇳 仅 百度搜索 (baidu.com)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
            <div className="space-y-3 pt-2 border-t border-slate-800/60">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">⚡️ 容错重试轮询</span>
                  <span className="text-[11px] text-slate-400">(效果不佳时自动轮询专业技术类名)</span>
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
                  <span className="text-emerald-400 font-semibold">🚫 过滤下载/入门门户</span>
                  <span className="text-[11px] text-slate-400">(自动排除 oracle.com/redis.io 网页)</span>
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
                  <span className="text-purple-400 font-semibold">🧠 大模型智能提取</span>
                  <span className="text-[11px] text-slate-400">(提取技术主干，如“java高并发”)</span>
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
        </div>

        {/* 右侧面板：语音与系统概览 */}
        <div className="space-y-6">
          {/* 🎙 语音播报音色 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-purple-400" />
              默认语音音色 (Edge-TTS)
            </h3>

            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="zh-CN-XiaoxiaoNeural">微软晓晓 (女声 · 自然柔和)</option>
              <option value="zh-CN-XiaoyiNeural">微软晓伊 (女声 · 清晰明亮)</option>
              <option value="zh-CN-YunxiNeural">微软云希 (男声 · 沉稳专业)</option>
              <option value="zh-CN-YunjianNeural">微软云健 (男声 · 活力自然)</option>
            </select>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>模型采样温度 (Temperature)</span>
                <span className="font-mono text-amber-400 font-bold">{temperature}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">值越低回答越精准确定；值越高越具创意。</p>
            </div>
          </div>

          {/* 💻 系统运行环境 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              系统服务信息
            </h3>
            <div className="space-y-2 text-xs divide-y divide-slate-800/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">前端版本</span>
                <span className="font-mono text-slate-200">v2.4.0 (React 19 + Vite)</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">后端引擎</span>
                <span className="font-mono text-slate-200">FastAPI + FAISS + PyMuPDF</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">检索融合算法</span>
                <span className="font-mono text-emerald-400">RRF (Reciprocal Rank Fusion)</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">知识库隔离</span>
                <span className="font-mono text-sky-400">Physical KB Isolation (ACL)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
