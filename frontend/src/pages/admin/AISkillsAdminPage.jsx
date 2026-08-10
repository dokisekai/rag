import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Bot, Zap, Globe, Key, Play, Power, Code, Database, Sparkles,
  Check, AlertTriangle, Plus, Trash2, RefreshCw, Server, Wrench,
  Loader2, Plug, PlugZap, X, Pencil, Save, MessageSquare,
  Settings, Volume2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from '../../components/Modal';

const TABS = [
  { id: 'general', label: '通用设置', icon: Settings },
  { id: 'skills', label: 'Skill 技能', icon: Zap },
  { id: 'mcp', label: 'MCP 管理', icon: Server },
  { id: 'agent', label: '智能体管理', icon: Bot },
];

const CATEGORY_LABEL = {
  knowledge: '知识增强',
  code: '代码能力',
  evaluation: '技术评估',
  hr: '人力资源',
  custom: '自定义',
  other: '其他',
};

export default function AISkillsAdminPage() {
  const { config } = useApp();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-400" />
            AI 能力中心
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            统一管理通用配置、技能模块、MCP 工具服务与智能体人设
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-0 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all cursor-pointer -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'text-purple-400 border-purple-500 bg-slate-900/30'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSettingsTab config={config} />}
      {activeTab === 'skills' && <SkillsTab />}
      {activeTab === 'mcp' && <McpTab />}
      {activeTab === 'agent' && <AgentTab config={config} />}
    </div>
  );
}

/* ============================== 通用设置 ============================== */

function GeneralSettingsTab({ config }) {
  const { saveConfig } = useApp();
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [apiBase, setApiBase] = useState(config.apiBase || '');
  const [model, setModel] = useState(config.model || '');
  const [voice, setVoice] = useState(config.voice || '');
  const [temperature, setTemperature] = useState(config.temperature ?? 1.0);
  const [ttsEnabled, setTtsEnabled] = useState(config.ttsEnabled ?? false);
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(config.autoSubmitVoice !== false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig({ apiKey, apiBase, model, voice, temperature, ttsEnabled, autoSubmitVoice });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          模型与语音配置
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" /> API Base URL
            </label>
            <input type="text" value={apiBase} onChange={(e) => setApiBase(e.target.value)} className={inputCls} placeholder="https://api.example.com/v1" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" /> API Key
            </label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={inputCls} placeholder="sk-..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> 模型名称
            </label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className={inputCls} placeholder="如 gpt-4o / glm-4 / qwen-plus" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" /> 默认语音 (Edge TTS)
            </label>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="zh-CN-XiaoxiaoNeural">微软晓晓 (女声)</option>
              <option value="zh-CN-XiaoyiNeural">微软晓伊 (女声)</option>
              <option value="zh-CN-YunxiNeural">微软云希 (男声)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>模型温度 (Temperature)</span>
              <span className="font-mono text-amber-400">{temperature}</span>
            </label>
            <input type="range" min="0.0" max="1.0" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-purple-500 h-2 rounded-lg cursor-pointer" />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>严谨 (0.0)</span><span>平衡 (0.5)</span><span>发散 (1.0)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Volume2 className={`w-4 h-4 ${ttsEnabled ? 'text-emerald-400' : 'text-slate-600'}`} />
              <div>
                <p className="text-xs font-semibold text-white">语音播报 (Edge TTS)</p>
                <p className="text-[10px] text-slate-500">{ttsEnabled ? '已开启：回答将合成语音播放' : '已关闭：仅文字回答，不生成音频'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTtsEnabled(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${ttsEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
              title={ttsEnabled ? '点击关闭' : '点击开启'}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ttsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${autoSubmitVoice ? 'text-emerald-400' : 'text-slate-600'}`} />
              <div>
                <p className="text-xs font-semibold text-white">语音自动提交 (停顿 1.2s)</p>
                <p className="text-[10px] text-slate-500">{autoSubmitVoice ? '已开启：说话停顿 1.2 秒自动提交' : '已关闭：需手动点击发送按钮'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSubmitVoice(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${autoSubmitVoice ? 'bg-emerald-600' : 'bg-slate-700'}`}
              title={autoSubmitVoice ? '点击关闭' : '点击开启'}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoSubmitVoice ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? '已保存！' : saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30">
        <h3 className="text-sm font-bold text-white mb-4">系统信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-500">系统版本</p>
            <p className="text-slate-300">v1.0.0</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-500">构建时间</p>
            <p className="text-slate-300">2026-07-23</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-500">前端框架</p>
            <p className="text-slate-300">React 19 + Vite</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-500">后端框架</p>
            <p className="text-slate-300">FastAPI (Python)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== 技能管理 ============================== */

function SkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [genDesc, setGenDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2200);
  };

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/skills');
      const data = await resp.json();
      setSkills(data || []);
    } catch (e) {
      showToast('加载技能失败', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const handleToggle = async (skill) => {
    try {
      await fetch(`/api/skills/${skill.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      fetchSkills();
    } catch (e) {
      showToast('切换失败', false);
    }
  };

  const handleDelete = async (skill) => {
    if (!confirm(`确定删除技能「${skill.name}」？${skill.is_builtin ? '（内置技能不可删除）' : ''}`)) return;
    try {
      const resp = await fetch(`/api/skills/${skill.id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || '删除失败');
      showToast('已删除');
      fetchSkills();
    } catch (e) {
      showToast(e.message || '删除失败', false);
    }
  };

  const handleGenerate = async () => {
    if (!genDesc.trim()) return;
    setGenerating(true);
    try {
      const resp = await fetch('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: genDesc }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || '生成失败');
      showToast('AI 已生成新技能');
      setGenDesc('');
      fetchSkills();
    } catch (e) {
      showToast(e.message || '生成失败', false);
    } finally {
      setGenerating(false);
    }
  };

  const totalEnabled = skills.filter(s => s.enabled).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Zap} color="text-purple-400" label="技能总数" value={skills.length} />
        <StatCard icon={Check} color="text-emerald-400" label="已启用" value={totalEnabled} />
        <StatCard icon={Code} color="text-sky-400" label="内置技能" value={skills.filter(s => s.is_builtin).length} />
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">AI 一键生成技能</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={genDesc}
            onChange={(e) => setGenDesc(e.target.value)}
            placeholder="用自然语言描述一个技能，如：分析 Git 提交历史生成变更摘要"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !genDesc.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-all"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? '生成中' : '生成'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-purple-400" /> 技能列表
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchSkills} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors" title="刷新">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> 新建技能
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && skills.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> 加载中...
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">暂无技能，点击右上角新建</div>
        ) : (
          skills.map(skill => (
            <div key={skill.id} className="glass-panel rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3 flex items-center justify-between hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg flex-shrink-0 ${skill.enabled ? 'bg-purple-500/15 text-purple-400' : 'bg-slate-800 text-slate-600'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${skill.enabled ? 'text-white' : 'text-slate-500'}`}>{skill.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{CATEGORY_LABEL[skill.category] || skill.category}</span>
                    {skill.is_builtin && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">内置</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{skill.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                    <span className="flex items-center gap-0.5"><Wrench className="w-2.5 h-2.5" /> {skill.tool_count} 工具</span>
                    <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" /> {skill.prompt_count} 模板</span>
                    <span className="flex items-center gap-0.5"><Database className="w-2.5 h-2.5" /> {skill.resource_count} 资源</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setEditing(skill)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-400 cursor-pointer transition-colors" title="查看/编辑">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(skill)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggle(skill)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${skill.enabled ? 'bg-purple-600' : 'bg-slate-700'}`}
                  title={skill.enabled ? '点击禁用' : '点击启用'}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${skill.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {(showCreate || editing) && (
        <SkillEditModal
          skill={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); fetchSkills(); }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SkillEditModal({ skill, onClose, onSaved }) {
  const isEdit = !!skill;
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [category, setCategory] = useState(skill?.category || 'custom');
  const [toolsJson, setToolsJson] = useState(skill ? JSON.stringify(skill.tools, null, 2) : '[]');
  const [promptsJson, setPromptsJson] = useState(skill ? JSON.stringify(skill.prompts, null, 2) : '[]');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    let tools, prompts;
    try {
      tools = JSON.parse(toolsJson || '[]');
      prompts = JSON.parse(promptsJson || '[]');
    } catch (e) {
      setError('工具/模板 JSON 格式错误：' + e.message);
      return;
    }
    if (!name.trim()) { setError('技能名称不能为空'); return; }
    setSaving(true);
    try {
      const payload = { name, description, category, tools, prompts, resources: [], config: { type: 'custom' } };
      const resp = await fetch(isEdit ? `/api/skills/${skill.id}` : '/api/skills', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || '保存失败');
      onSaved();
    } catch (e) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? '编辑技能' : '新建技能'}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
        <Field label="技能名称">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
        </Field>
        <Field label="描述">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-base resize-none" />
        </Field>
        <Field label="分类">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="工具 (JSON 数组)">
          <textarea value={toolsJson} onChange={(e) => setToolsJson(e.target.value)} rows={6} className="input-base font-mono text-[10px]" spellCheck="false" />
        </Field>
        <Field label="Prompt 模板 (JSON 数组)">
          <textarea value={promptsJson} onChange={(e) => setPromptsJson(e.target.value)} rows={5} className="input-base font-mono text-[10px]" spellCheck="false" />
        </Field>
        {error && <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer">取消</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 保存
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== MCP 管理 ============================== */

function McpTab() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2200); };

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/mcp/servers');
      const data = await resp.json();
      setServers(data || []);
    } catch (e) {
      showToast('加载失败', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handleAction = async (server, action) => {
    setActing(server.id);
    try {
      let resp;
      if (action === 'connect') {
        resp = await fetch(`/api/mcp/servers/${server.id}/connect`, { method: 'POST' });
      } else if (action === 'disconnect') {
        resp = await fetch(`/api/mcp/servers/${server.id}/disconnect`, { method: 'POST' });
      } else if (action === 'delete') {
        if (!confirm(`确定删除 MCP 服务「${server.name}」？`)) { setActing(null); return; }
        resp = await fetch(`/api/mcp/servers/${server.id}`, { method: 'DELETE' });
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || '操作失败');
      showToast(action === 'connect' ? '已连接' : action === 'disconnect' ? '已断开' : '已删除');
      fetchServers();
    } catch (e) {
      showToast(e.message || '操作失败', false);
    } finally {
      setActing(null);
    }
  };

  const statusColor = (s) => s === 'connected' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : s === 'error' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    : 'text-slate-400 bg-slate-700/30 border-slate-600/40';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Server} color="text-sky-400" label="MCP 服务" value={servers.length} />
        <StatCard icon={Plug} color="text-emerald-400" label="已连接" value={servers.filter(s => s.status === 'connected').length} />
        <StatCard icon={Wrench} color="text-amber-400" label="可用工具总数" value={servers.reduce((a, s) => a + (s.tool_count || 0), 0)} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" /> MCP 服务列表
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchServers} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors" title="刷新">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition-colors">
            <Plus className="w-3.5 h-3.5" /> 添加服务
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && servers.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> 加载中...</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">暂无 MCP 服务，点击右上角添加</div>
        ) : (
          servers.map(s => (
            <div key={s.id} className="glass-panel rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${s.type === 'sse' ? 'bg-sky-500/15 text-sky-400' : 'bg-purple-500/15 text-purple-400'}`}>
                    {s.type === 'sse' ? <Globe className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{s.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${statusColor(s.status)}`}>{s.status}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">{s.type}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">{s.type === 'sse' ? s.url : `${s.command} ${(s.args || []).join(' ')}`}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                      <span className="flex items-center gap-0.5"><Wrench className="w-2.5 h-2.5" /> {s.tool_count} 工具</span>
                      <span className="flex items-center gap-0.5"><Database className="w-2.5 h-2.5" /> {s.resource_count} 资源</span>
                    </div>
                    {s.error && <p className="text-[10px] text-rose-400 mt-1 truncate">⚠ {s.error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {s.status === 'connected' ? (
                    <button onClick={() => handleAction(s, 'disconnect')} disabled={acting === s.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold hover:bg-amber-500/20 cursor-pointer disabled:opacity-50">
                      {acting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />} 断开
                    </button>
                  ) : (
                    <button onClick={() => handleAction(s, 'connect')} disabled={acting === s.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50">
                      {acting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlugZap className="w-3 h-3" />} 连接
                    </button>
                  )}
                  <button onClick={() => handleAction(s, 'delete')} disabled={acting === s.id} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors" title="删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <McpAddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchServers(); }} />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {toast.msg}
        </div>
      )}
    </div>
  );
}

function McpAddModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('服务名称不能为空'); return; }
    if (type === 'stdio' && !command.trim()) { setError('stdio 类型必须填写启动命令'); return; }
    if (type === 'sse' && !url.trim()) { setError('SSE 类型必须填写 URL'); return; }
    setSaving(true);
    try {
      const argList = args.trim() ? args.split(/\s+/).filter(Boolean) : [];
      const resp = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, command, args: argList, url }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || '添加失败');
      onSaved();
    } catch (e) {
      setError(e.message || '添加失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="添加 MCP 服务">
      <div className="space-y-3">
        <Field label="服务名称">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：filesystem-mcp" className="input-base" />
        </Field>
        <Field label="类型">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-base">
            <option value="stdio">stdio (本地进程)</option>
            <option value="sse">sse (远程 HTTP)</option>
          </select>
        </Field>
        {type === 'stdio' ? (
          <>
            <Field label="启动命令">
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="如：npx 或 python" className="input-base font-mono text-[11px]" />
            </Field>
            <Field label="参数 (空格分隔)">
              <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="如：-y @modelcontextprotocol/server-filesystem /path" className="input-base font-mono text-[11px]" />
            </Field>
          </>
        ) : (
          <Field label="URL">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp/sse" className="input-base font-mono text-[11px]" />
          </Field>
        )}
        {error && <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer">取消</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} 添加
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== 智能体管理 ============================== */

const AGENT_STORAGE_KEY = 'voicerag_agents';
const ACTIVE_AGENT_KEY = 'voicerag_active_agent';

const DEFAULT_AGENTS = [
  { id: 'strict', name: '资深智库专家', color: 'purple', desc: '深度剖析，严谨权威的学术/技术解答', prompt: '你是一位资深智库专家。请基于知识库进行严谨、权威、深入的技术解答，注重原理剖析与逻辑推导，语言专业精炼。' },
  { id: 'friendly', name: '导学答疑助手', color: 'emerald', desc: '通俗易懂，循序渐进的知识讲解', prompt: '你是一位耐心亲和的导学答疑助手。请用通俗易懂、循序渐进的方式讲解知识，多用类比和示例，帮助用户建立完整理解。' },
  { id: 'professional', name: '技术架构导师', color: 'sky', desc: '注重实战落地，提供具体代码与配置方案', prompt: '你是一位技术架构导师。请注重实战落地，结合具体代码、配置与工程实践给出可落地的方案，突出架构权衡与最佳实践。' },
];

const COLOR_MAP = {
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', dot: 'bg-purple-500', ring: 'ring-purple-500' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  sky: { text: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', dot: 'bg-sky-500', ring: 'ring-sky-500' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500', ring: 'ring-amber-500' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-500', ring: 'ring-rose-500' },
};

function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_AGENTS;
}

function AgentTab({ config }) {
  const [agents, setAgents] = useState(loadAgents);
  const [activeId, setActiveId] = useState(localStorage.getItem(ACTIVE_AGENT_KEY) || 'friendly');
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2200); };

  const persist = (list) => {
    setAgents(list);
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(list));
  };

  const handleSetActive = (id) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_AGENT_KEY, id);
    showToast('已设为当前智能体，新对话生效');
  };

  const handleDelete = (agent) => {
    if (agent.isDefault) { showToast('默认预设不可删除', false); return; }
    if (!confirm(`确定删除智能体「${agent.name}」？`)) return;
    persist(agents.filter(a => a.id !== agent.id));
    if (activeId === agent.id) handleSetActive('friendly');
    showToast('已删除');
  };

  const handleSaveAgent = (agent) => {
    if (editing && agents.find(a => a.id === editing.id)) {
      persist(agents.map(a => a.id === agent.id ? agent : a));
      showToast('已更新');
    } else {
      persist([...agents, agent]);
      showToast('已创建');
    }
    setEditing(null);
    setShowCreate(false);
  };

  const activeAgent = agents.find(a => a.id === activeId) || agents[0];

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${COLOR_MAP[activeAgent.color]?.bg}`}>
          <Bot className={`w-5 h-5 ${COLOR_MAP[activeAgent.color]?.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">当前生效智能体</p>
          <p className={`text-sm font-bold ${COLOR_MAP[activeAgent.color]?.text}`}>{activeAgent.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{activeAgent.desc}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 已激活
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" /> 智能体人设预设
        </h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> 新建智能体
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map(agent => {
          const c = COLOR_MAP[agent.color] || COLOR_MAP.purple;
          const isActive = agent.id === activeId;
          return (
            <div key={agent.id} className={`glass-panel rounded-2xl border p-4 transition-all ${isActive ? `${c.bg} ring-2 ${c.ring} ring-offset-2 ring-offset-slate-950 ring-opacity-40` : 'border-slate-800/50 bg-slate-900/30 hover:border-slate-700'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <p className={`text-sm font-bold ${c.text}`}>{agent.name}</p>
                  {agent.isDefault && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">内置</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(agent)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 cursor-pointer" title="编辑">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(agent)} className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer" title="删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-2">{agent.desc}</p>
              <p className="text-[10px] text-slate-600 line-clamp-2 font-mono bg-slate-950/50 rounded p-2 border border-slate-800">{agent.prompt}</p>
              <button
                onClick={() => handleSetActive(agent.id)}
                disabled={isActive}
                className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive ? 'bg-slate-800 text-slate-500 cursor-default' : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                }`}
              >
                {isActive ? <><Check className="w-3.5 h-3.5" /> 当前已激活</> : <><Power className="w-3.5 h-3.5" /> 设为当前智能体</>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
        <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-amber-400" /> 当前模型配置</h4>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div><span className="text-slate-500">模型：</span><span className="text-slate-200 font-mono">{config.model || '-'}</span></div>
          <div><span className="text-slate-500">温度：</span><span className="text-slate-200 font-mono">{config.temperature ?? '-'}</span></div>
          <div className="col-span-2"><span className="text-slate-500">API：</span><span className="text-slate-200 font-mono truncate">{config.apiBase || '-'}</span></div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">模型配置请在「系统设置」页修改。</p>
      </div>

      {(showCreate || editing) && (
        <AgentEditModal
          agent={editing}
          existingIds={agents.map(a => a.id)}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSave={handleSaveAgent}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {toast.msg}
        </div>
      )}
    </div>
  );
}

function AgentEditModal({ agent, existingIds, onClose, onSave }) {
  const isEdit = !!agent;
  const [name, setName] = useState(agent?.name || '');
  const [desc, setDesc] = useState(agent?.desc || '');
  const [color, setColor] = useState(agent?.color || 'purple');
  const [prompt, setPrompt] = useState(agent?.prompt || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('名称不能为空'); return; }
    if (!prompt.trim()) { setError('人设 Prompt 不能为空'); return; }
    const id = agent?.id || `agent_${Date.now()}`;
    onSave({ id, name, desc, color, prompt, isDefault: agent?.isDefault || false });
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? '编辑智能体' : '新建智能体'}>
      <div className="space-y-3">
        <Field label="智能体名称">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
        </Field>
        <Field label="简短描述">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input-base" />
        </Field>
        <Field label="主题色">
          <div className="flex items-center gap-2">
            {Object.entries(COLOR_MAP).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setColor(k)} className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-all ${color === k ? `${v.bg} border-current ${v.text}` : 'border-slate-700 hover:border-slate-500'}`}>
                <span className={`block w-3 h-3 rounded-full mx-auto ${v.dot}`} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="人设 System Prompt">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className="input-base resize-none font-mono text-[11px]" spellCheck="false" />
        </Field>
        {error && <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer">取消</button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer">
            <Save className="w-3.5 h-3.5" /> 保存
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== 通用小组件 ============================== */

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-semibold text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
