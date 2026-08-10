import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wrench,
  Bot,
  Plus,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Code,
  FileText,
  Database,
  Sparkles,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Link,
  Power,
  Key,
  Globe,
  Cpu,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  MessageSquare,
  Palette,
  Edit3,
  Save,
  Terminal,
  Send,
  Copy
} from "lucide-react";
import Modal from "./Modal";

const PAGE_AGENT_CONFIG_KEY = "page_agent_config";

const defaultPageAgentConfig = {
  enabled: false,
  useSystemConfig: false,
  useProxy: true,
  apiKey: "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen3.5-plus",
  showPanel: false,
  maxSteps: 40,
  stepDelay: 0.4,
  language: "zh-CN"
};

export default function SkillModal({ isOpen, onClose, onOpenAgent, systemConfig }) {
  const [activeTab, setActiveTab] = useState("skills");
  const [skills, setSkills] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [showAiGenerateForm, setShowAiGenerateForm] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState(null);
  const [expandedMcp, setExpandedMcp] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [editingMcp, setEditingMcp] = useState(null);

  const [newSkill, setNewSkill] = useState({
    name: "",
    display_name: "",
    description: "",
    category: "custom",
    version: "1.0.0",
  });
  const [editSkillForm, setEditSkillForm] = useState({
    name: "",
    display_name: "",
    description: "",
    category: "custom",
    version: "1.0.0",
  });

  const [newMcp, setNewMcp] = useState({
    name: "",
    type: "stdio",
    command: "",
    args: "",
    url: "",
  });
  const [editMcpForm, setEditMcpForm] = useState({
    name: "",
    type: "stdio",
    command: "",
    args: "",
    url: "",
  });

  const [aiDescription, setAiDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  const [pageAgentConfig, setPageAgentConfig] = useState(defaultPageAgentConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState("");

  const [toolTestResult, setToolTestResult] = useState(null);
  const [testingTool, setTestingTool] = useState(false);
  const [testToolInput, setTestToolInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(PAGE_AGENT_CONFIG_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPageAgentConfig({ ...defaultPageAgentConfig, ...parsed });
        } catch (e) {
          console.error("Failed to parse PageAgent config:", e);
        }
      }
      fetchSkills();
      fetchMcpServers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (pageAgentConfig.useSystemConfig && systemConfig) {
      setPageAgentConfig(prev => ({
        ...prev,
        apiKey: systemConfig.apiKey || "lm-studio",
        baseURL: systemConfig.apiBase || "",
        model: systemConfig.model || "",
      }));
    }
  }, [systemConfig?.apiKey, systemConfig?.apiBase, systemConfig?.model, pageAgentConfig.useSystemConfig]);

  const fetchSkills = useCallback(async () => {
    try {
      const resp = await fetch("/api/skills");
      const data = await resp.json();
      setSkills(data || []);
    } catch (e) {
      console.error("Failed to fetch skills:", e);
    }
  }, []);

  const fetchMcpServers = useCallback(async () => {
    try {
      const resp = await fetch("/api/mcp/servers");
      const data = await resp.json();
      setMcpServers(data || []);
    } catch (e) {
      console.error("Failed to fetch MCP servers:", e);
    }
  }, []);

  const handleCreateSkill = async () => {
    if (!newSkill.name.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });
      if (resp.ok) {
        setNewSkill({ name: "", display_name: "", description: "", category: "custom", version: "1.0.0" });
        setShowCreateForm(false);
        fetchSkills();
      }
    } catch (e) {
      alert("创建失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSkill = async () => {
    if (!aiDescription.trim()) return;
    setGenerating(true);
    try {
      const resp = await fetch("/api/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription }),
      });
      if (resp.ok) {
        setAiDescription("");
        setShowAiGenerateForm(false);
        fetchSkills();
      } else {
        const data = await resp.json();
        alert("生成失败: " + (data.detail || "未知错误"));
      }
    } catch (e) {
      alert("生成失败: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSkill = async (id) => {
    try {
      await fetch(`/api/skills/${id}/toggle`, { method: "POST" });
      fetchSkills();
    } catch (e) {
      console.error("Failed to toggle skill:", e);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!confirm("确定删除这个 Skill 吗？")) return;
    try {
      await fetch(`/api/skills/${id}`, { method: "DELETE" });
      fetchSkills();
    } catch (e) {
      console.error("Failed to delete skill:", e);
    }
  };

  const startEditSkill = (skill) => {
    setEditingSkill(skill.id);
    setEditSkillForm({
      name: skill.name,
      display_name: skill.display_name || skill.name,
      description: skill.description,
      category: skill.category,
      version: skill.version,
    });
  };

  const handleSaveSkill = async () => {
    if (!editingSkill) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/skills/${editingSkill}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSkillForm),
      });
      if (resp.ok) {
        setEditingSkill(null);
        fetchSkills();
      }
    } catch (e) {
      alert("保存失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMcpServer = async () => {
    if (!newMcp.name.trim()) return;
    setLoading(true);
    try {
      const body = {
        name: newMcp.name,
        type: newMcp.type,
        command: newMcp.command,
        args: newMcp.args ? newMcp.args.split(" ").filter(Boolean) : [],
        url: newMcp.url,
      };
      const resp = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        setNewMcp({ name: "", type: "stdio", command: "", args: "", url: "" });
        setShowMcpForm(false);
        fetchMcpServers();
      }
    } catch (e) {
      alert("添加失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditMcp = (server) => {
    setEditingMcp(server.id);
    setEditMcpForm({
      name: server.name,
      type: server.type,
      command: server.command || "",
      args: (server.args || []).join(" "),
      url: server.url || "",
    });
  };

  const handleSaveMcp = async () => {
    if (!editingMcp) return;
    setLoading(true);
    try {
      const body = {
        name: editMcpForm.name,
        type: editMcpForm.type,
        command: editMcpForm.command,
        args: editMcpForm.args ? editMcpForm.args.split(" ").filter(Boolean) : [],
        url: editMcpForm.url,
      };
      const resp = await fetch(`/api/mcp/servers/${editingMcp}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        setEditingMcp(null);
        fetchMcpServers();
      }
    } catch (e) {
      alert("保存失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMcp = async (id) => {
    try {
      const resp = await fetch(`/api/mcp/servers/${id}/connect`, { method: "POST" });
      if (resp.ok) {
        setTimeout(fetchMcpServers, 1000);
      }
      fetchMcpServers();
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  const handleDisconnectMcp = async (id) => {
    try {
      await fetch(`/api/mcp/servers/${id}/disconnect`, { method: "POST" });
      fetchMcpServers();
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  };

  const handleDeleteMcp = async (id) => {
    if (!confirm("确定删除这个 MCP 服务器吗？")) return;
    try {
      await fetch(`/api/mcp/servers/${id}`, { method: "DELETE" });
      fetchMcpServers();
    } catch (e) {
      console.error("Failed to delete MCP server:", e);
    }
  };

  const handleTestTool = async (serverId, toolName) => {
    setTestingTool(true);
    setToolTestResult(null);
    try {
      let input = {};
      if (testToolInput.trim()) {
        try {
          input = JSON.parse(testToolInput);
        } catch (e) {
          input = { input: testToolInput };
        }
      }
      const resp = await fetch(`/api/mcp/servers/${serverId}/tools/${toolName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      setToolTestResult({ success: resp.ok, data });
    } catch (e) {
      setToolTestResult({ success: false, data: { error: e.message } });
    } finally {
      setTestingTool(false);
    }
  };

  const handleSavePageAgentConfig = () => {
    setConfigError("");
    if (pageAgentConfig.enabled && !pageAgentConfig.apiKey.trim()) {
      setConfigError("启用 PageAgent 时必须填写 API Key");
      return;
    }
    if (pageAgentConfig.enabled && !pageAgentConfig.baseURL.trim()) {
      setConfigError("启用 PageAgent 时必须填写 Base URL");
      return;
    }
    localStorage.setItem(PAGE_AGENT_CONFIG_KEY, JSON.stringify(pageAgentConfig));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "code": return <Code className="w-4 h-4" />;
      case "analysis": return <Sparkles className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      case "data": return <Database className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "code": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "analysis": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "document": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "data": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI 能力中心">
      <div className="w-full max-w-4xl">
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-xl">
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "skills"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Skills 技能
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "mcp"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Link className="w-4 h-4" />
            MCP 服务器
          </button>
          <button
            onClick={() => setActiveTab("pageagent")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "pageagent"
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Bot className="w-4 h-4" />
            PageAgent 设置
          </button>
        </div>

        {activeTab === "skills" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setShowAiGenerateForm(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  showCreateForm
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30"
                }`}
              >
                <Plus className="w-4 h-4" />
                新建 Skill
              </button>
              <button
                onClick={() => {
                  setShowAiGenerateForm(!showAiGenerateForm);
                  setShowCreateForm(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  showAiGenerateForm
                    ? "bg-purple-600 text-white"
                    : "bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI 生成 Skill
              </button>
              <button
                onClick={fetchSkills}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>

            {showCreateForm && (
              <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    创建新 Skill
                  </span>
                  <button onClick={() => setShowCreateForm(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Skill 名称</label>
                    <input
                      type="text"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                      placeholder="英文标识，如: code-review"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">显示名称</label>
                    <input
                      type="text"
                      value={newSkill.display_name}
                      onChange={(e) => setNewSkill({ ...newSkill, display_name: e.target.value })}
                      placeholder="中文名称，如: 代码审查"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">分类</label>
                    <select
                      value={newSkill.category}
                      onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="custom">自定义</option>
                      <option value="code">代码开发</option>
                      <option value="analysis">分析处理</option>
                      <option value="document">文档处理</option>
                      <option value="data">数据处理</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">版本</label>
                    <input
                      type="text"
                      value={newSkill.version}
                      onChange={(e) => setNewSkill({ ...newSkill, version: e.target.value })}
                      placeholder="1.0.0"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">描述</label>
                  <textarea
                    value={newSkill.description}
                    onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                    placeholder="详细描述这个 Skill 的功能和用途..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleCreateSkill}
                  disabled={loading || !newSkill.name.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  创建 Skill
                </button>
              </div>
            )}

            {showAiGenerateForm && (
              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI 生成 Skill
                  </span>
                  <button onClick={() => setShowAiGenerateForm(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="描述你想要的 Skill 功能，AI 将自动生成...
例如：一个用于代码审查的 Skill，可以检查代码质量、发现潜在 bug、给出优化建议"
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button
                  onClick={handleGenerateSkill}
                  disabled={generating || !aiDescription.trim()}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {generating ? "AI 生成中..." : "开始生成"}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border transition-all ${
                    skill.enabled
                      ? "bg-slate-900/60 border-slate-700/50 hover:border-indigo-500/30"
                      : "bg-slate-900/30 border-slate-800/50 opacity-60"
                  }`}
                >
                  {editingSkill === skill.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg border ${getCategoryColor(editSkillForm.category)}`}>
                          {getCategoryIcon(editSkillForm.category)}
                        </div>
                        <span className="text-sm font-semibold text-white">编辑 Skill</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">名称</label>
                          <input
                            type="text"
                            value={editSkillForm.name}
                            onChange={(e) => setEditSkillForm({ ...editSkillForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">显示名称</label>
                          <input
                            type="text"
                            value={editSkillForm.display_name}
                            onChange={(e) => setEditSkillForm({ ...editSkillForm, display_name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">分类</label>
                          <select
                            value={editSkillForm.category}
                            onChange={(e) => setEditSkillForm({ ...editSkillForm, category: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="custom">自定义</option>
                            <option value="code">代码开发</option>
                            <option value="analysis">分析处理</option>
                            <option value="document">文档处理</option>
                            <option value="data">数据处理</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">版本</label>
                          <input
                            type="text"
                            value={editSkillForm.version}
                            onChange={(e) => setEditSkillForm({ ...editSkillForm, version: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">描述</label>
                        <textarea
                          value={editSkillForm.description}
                          onChange={(e) => setEditSkillForm({ ...editSkillForm, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveSkill}
                          disabled={loading}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          保存
                        </button>
                        <button
                          onClick={() => setEditingSkill(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg border ${getCategoryColor(skill.category)}`}>
                            {getCategoryIcon(skill.category)}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{skill.display_name || skill.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{skill.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                                v{skill.version}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                                {skill.category}
                              </span>
                              {skill.tools && skill.tools.length > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                  {skill.tools.length} 工具
                                </span>
                              )}
                              {skill.enabled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                  已启用
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditSkill(skill)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleSkill(skill.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              skill.enabled
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-slate-500 hover:bg-slate-800"
                            }`}
                            title={skill.enabled ? "禁用" : "启用"}
                          >
                            {skill.enabled ? <Power className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                            title="详情"
                          >
                            {expandedSkill === skill.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {expandedSkill === skill.id && (
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                          {skill.tools && skill.tools.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-400">可用工具 ({skill.tools.length}):</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {skill.tools.map((tool, i) => (
                                  <div
                                    key={i}
                                    className="text-[11px] px-2 py-1.5 rounded-md bg-slate-800 text-slate-300 flex items-center gap-1.5"
                                    title={tool.description}
                                  >
                                    <Terminal className="w-3 h-3 text-blue-400" />
                                    {tool.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {skill.prompts && skill.prompts.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-400">提示词模板 ({skill.prompts.length}):</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {skill.prompts.map((p, i) => (
                                  <span key={i} className="text-[11px] px-2 py-1.5 rounded-md bg-purple-500/10 text-purple-300">
                                    {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {skill.resources && skill.resources.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-400">资源 ({skill.resources.length}):</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {skill.resources.map((r, i) => (
                                  <span key={i} className="text-[11px] px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-300">
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-[11px] text-slate-500">
                            <span>创建: {new Date(skill.created_at * 1000).toLocaleString()}</span>
                            <span>更新: {new Date(skill.updated_at * 1000).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {skills.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">还没有 Skill</p>
                  <p className="text-xs mt-1">点击上方按钮创建或生成第一个 Skill</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "mcp" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex gap-3">
              <button
                onClick={() => setShowMcpForm(!showMcpForm)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  showMcpForm
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30"
                }`}
              >
                <Plus className="w-4 h-4" />
                添加 MCP 服务器
              </button>
              <button
                onClick={fetchMcpServers}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>

            {showMcpForm && (
              <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    添加 MCP 服务器
                  </span>
                  <button onClick={() => setShowMcpForm(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">服务器名称</label>
                  <input
                    type="text"
                    value={newMcp.name}
                    onChange={(e) => setNewMcp({ ...newMcp, name: e.target.value })}
                    placeholder="例如：文件系统、数据库等"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">连接方式</label>
                  <select
                    value={newMcp.type}
                    onChange={(e) => setNewMcp({ ...newMcp, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="stdio">Stdio (本地子进程)</option>
                    <option value="sse">SSE (远程 HTTP)</option>
                  </select>
                </div>
                {newMcp.type === "stdio" ? (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">启动命令</label>
                      <input
                        type="text"
                        value={newMcp.command}
                        onChange={(e) => setNewMcp({ ...newMcp, command: e.target.value })}
                        placeholder="如: npx、python、uvx"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">参数 (空格分隔)</label>
                      <input
                        type="text"
                        value={newMcp.args}
                        onChange={(e) => setNewMcp({ ...newMcp, args: e.target.value })}
                        placeholder="如: -m mcp_server_filesystem"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">SSE URL</label>
                    <input
                      type="text"
                      value={newMcp.url}
                      onChange={(e) => setNewMcp({ ...newMcp, url: e.target.value })}
                      placeholder="http://localhost:3000/sse"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                )}
                <button
                  onClick={handleAddMcpServer}
                  disabled={loading || !newMcp.name.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  添加服务器
                </button>
              </div>
            )}

            <div className="space-y-3">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className={`p-4 rounded-xl border transition-all ${
                    server.status === "connected"
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : server.status === "connecting"
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-slate-900/60 border-slate-700/50 hover:border-indigo-500/30"
                  }`}
                >
                  {editingMcp === server.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-semibold text-white">编辑 MCP 服务器</span>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">服务器名称</label>
                        <input
                          type="text"
                          value={editMcpForm.name}
                          onChange={(e) => setEditMcpForm({ ...editMcpForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">连接方式</label>
                        <select
                          value={editMcpForm.type}
                          onChange={(e) => setEditMcpForm({ ...editMcpForm, type: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="stdio">Stdio (本地子进程)</option>
                          <option value="sse">SSE (远程 HTTP)</option>
                        </select>
                      </div>
                      {editMcpForm.type === "stdio" ? (
                        <>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">启动命令</label>
                            <input
                              type="text"
                              value={editMcpForm.command}
                              onChange={(e) => setEditMcpForm({ ...editMcpForm, command: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">参数 (空格分隔)</label>
                            <input
                              type="text"
                              value={editMcpForm.args}
                              onChange={(e) => setEditMcpForm({ ...editMcpForm, args: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">SSE URL</label>
                          <input
                            type="text"
                            value={editMcpForm.url}
                            onChange={(e) => setEditMcpForm({ ...editMcpForm, url: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveMcp}
                          disabled={loading}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          保存
                        </button>
                        <button
                          onClick={() => setEditingMcp(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg border ${
                            server.status === "connected"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : server.status === "connecting"
                              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                              : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                          }`}>
                            <Link className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">{server.name}</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                server.status === "connected"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : server.status === "connecting"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : server.status === "error"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-700 text-slate-400"
                              }`}>
                                {server.status === "connected" ? "已连接" :
                                 server.status === "connecting" ? "连接中" :
                                 server.status === "error" ? "错误" : "未连接"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-mono">
                                {server.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">
                              {server.type === "stdio"
                                ? `${server.command} ${(server.args || []).join(" ")}`
                                : server.url}
                            </p>
                            {server.error && (
                              <p className="text-xs text-red-400 mt-1">{server.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditMcp(server)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {server.status === "connected" ? (
                            <button
                              onClick={() => handleDisconnectMcp(server.id)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all"
                              title="断开连接"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectMcp(server.id)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
                              title="连接"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMcp(server.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedMcp(expandedMcp === server.id ? null : server.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                            title="详情"
                          >
                            {expandedMcp === server.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {expandedMcp === server.id && (
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                          {server.tools && server.tools.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-400">
                                  可用工具 ({server.tools.length})
                                </span>
                                {server.status === "connected" && (
                                  <span className="text-[10px] text-emerald-400">可测试</span>
                                )}
                              </div>
                              <div className="space-y-2">
                                {server.tools.map((tool, i) => (
                                  <div
                                    key={i}
                                    className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-700/50"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Terminal className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                          <span className="text-xs font-medium text-white font-mono truncate">
                                            {tool.name}
                                          </span>
                                        </div>
                                        {tool.description && (
                                          <p className="text-[11px] text-slate-500 mt-1 ml-5">
                                            {tool.description}
                                          </p>
                                        )}
                                      </div>
                                      {server.status === "connected" && (
                                        <button
                                          onClick={() => handleTestTool(server.id, tool.name)}
                                          disabled={testingTool}
                                          className="px-2 py-1 text-[10px] bg-blue-500/20 text-blue-300 rounded-md hover:bg-blue-500/30 transition-all flex-shrink-0 flex items-center gap-1"
                                        >
                                          <Send className="w-3 h-3" />
                                          测试
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {server.status === "connected" && (
                                <div className="mt-3">
                                  <label className="text-xs text-slate-400 mb-1 block">测试工具输入 (JSON)</label>
                                  <textarea
                                    value={testToolInput}
                                    onChange={(e) => setTestToolInput(e.target.value)}
                                    placeholder='{"path": "/tmp"}'
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                                  />
                                </div>
                              )}
                              {toolTestResult && (
                                <div className={`mt-3 p-3 rounded-lg ${
                                  toolTestResult.success
                                    ? "bg-emerald-500/10 border border-emerald-500/20"
                                    : "bg-red-500/10 border border-red-500/20"
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium ${
                                      toolTestResult.success ? "text-emerald-300" : "text-red-300"
                                    }`}>
                                      {toolTestResult.success ? "执行成功" : "执行失败"}
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(toolTestResult.data, null, 2))}
                                      className="p-1 text-slate-400 hover:text-white"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto max-h-32 overflow-y-auto">
                                    {JSON.stringify(toolTestResult.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                          {server.resources && server.resources.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-400">资源 ({server.resources.length}):</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {server.resources.map((r, i) => (
                                  <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-300">
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {server.prompts && server.prompts.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-400">提示词 ({server.prompts.length}):</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {server.prompts.map((p, i) => (
                                  <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-purple-500/10 text-purple-300">
                                    {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {mcpServers.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Link className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">还没有 MCP 服务器</p>
                  <p className="text-xs mt-1">点击上方按钮添加第一个 MCP 服务器</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "pageagent" && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            <div className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-pink-500/20">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">阿里 PageAgent</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    让网页自动化从「编写脚本」变成「下达指令」。基于大模型的 GUI Agent，用自然语言操作当前页面。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                    pageAgentConfig.enabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-700/50 text-slate-400 border border-slate-600"
                  }`}>
                    {pageAgentConfig.enabled ? "已启用" : "未启用"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-sm font-medium text-white">启用 PageAgent</span>
                  <p className="text-xs text-slate-500 mt-0.5">开启后可通过 AI Agent 使用自然语言操作页面</p>
                </div>
                <button
                  onClick={() => setPageAgentConfig({ ...pageAgentConfig, enabled: !pageAgentConfig.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    pageAgentConfig.enabled ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    pageAgentConfig.enabled ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-sm font-medium text-white">复用系统 LLM 配置</span>
                  <p className="text-xs text-slate-500 mt-0.5">使用系统设置中已配置的大模型 API</p>
                </div>
                <button
                  onClick={() => {
                    const useSystem = !pageAgentConfig.useSystemConfig;
                    if (useSystem && systemConfig) {
                      setPageAgentConfig({
                        ...pageAgentConfig,
                        useSystemConfig: true,
                        apiKey: systemConfig.apiKey || "lm-studio",
                        baseURL: systemConfig.apiBase || "",
                        model: systemConfig.model || "",
                      });
                    } else {
                      setPageAgentConfig({
                        ...pageAgentConfig,
                        useSystemConfig: false,
                      });
                    }
                  }}
                  disabled={!systemConfig}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    pageAgentConfig.useSystemConfig ? "bg-purple-600" : "bg-slate-700"
                  } ${!systemConfig ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    pageAgentConfig.useSystemConfig ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              {pageAgentConfig.useSystemConfig && systemConfig && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300">
                      <p className="text-purple-300 font-medium mb-1">已复用系统配置</p>
                      <p className="text-slate-400">接口：<span className="font-mono text-purple-300">{systemConfig.apiBase || "未设置"}</span></p>
                      <p className="text-slate-400">模型：<span className="font-mono text-purple-300">{systemConfig.model || "未设置"}</span></p>
                      <p className="text-slate-500 mt-1">
                        {systemConfig.apiKey ? "API Key 已从系统配置同步" : "API Key 为空，已自动填充占位值 lm-studio（本地模型可正常使用）"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-sm font-medium text-white">通过后端代理转发</span>
                  <p className="text-xs text-slate-500 mt-0.5">解决浏览器 CORS 跨域问题，更安全</p>
                </div>
                <button
                  onClick={() => setPageAgentConfig({ ...pageAgentConfig, useProxy: !pageAgentConfig.useProxy })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    pageAgentConfig.useProxy ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    pageAgentConfig.useProxy ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              {pageAgentConfig.useProxy && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300">
                      <p className="text-emerald-300 font-medium mb-1">已启用后端代理</p>
                      <p className="text-slate-400">请求将通过 <span className="font-mono text-emerald-300">/api/llm-proxy</span> 转发</p>
                      <p className="text-slate-500 mt-1">自动解决 CORS 跨域 + API Key 保护 + 本地模型兼容性处理</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-pink-400" />
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={pageAgentConfig.apiKey}
                    onChange={(e) => setPageAgentConfig({ ...pageAgentConfig, apiKey: e.target.value })}
                    disabled={pageAgentConfig.useSystemConfig}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                    className={`w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono ${
                      pageAgentConfig.useSystemConfig ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-pink-400" />
                  Base URL (兼容 OpenAI 接口)
                </label>
                <input
                  type="text"
                  value={pageAgentConfig.baseURL}
                  onChange={(e) => setPageAgentConfig({ ...pageAgentConfig, baseURL: e.target.value })}
                  disabled={pageAgentConfig.useSystemConfig}
                  placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                  className={`w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono ${
                    pageAgentConfig.useSystemConfig ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-pink-400" />
                  模型名称
                </label>
                <input
                  type="text"
                  value={pageAgentConfig.model}
                  onChange={(e) => setPageAgentConfig({ ...pageAgentConfig, model: e.target.value })}
                  disabled={pageAgentConfig.useSystemConfig}
                  placeholder="qwen3.5-plus"
                  className={`w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono ${
                    pageAgentConfig.useSystemConfig ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  支持兼容 OpenAI 接口的任意大模型
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    最大步数 (maxSteps)
                  </label>
                  <input
                    type="number"
                    value={pageAgentConfig.maxSteps}
                    onChange={(e) => setPageAgentConfig({ ...pageAgentConfig, maxSteps: parseInt(e.target.value) || 40 })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    步间延迟 (秒)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pageAgentConfig.stepDelay}
                    onChange={(e) => setPageAgentConfig({ ...pageAgentConfig, stepDelay: parseFloat(e.target.value) || 0.4 })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-sm font-medium text-white">显示内置面板</span>
                  <p className="text-xs text-slate-500 mt-0.5">显示 PageAgent 自带的浮动控制面板</p>
                </div>
                <button
                  onClick={() => setPageAgentConfig({ ...pageAgentConfig, showPanel: !pageAgentConfig.showPanel })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    pageAgentConfig.showPanel ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    pageAgentConfig.showPanel ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              {configError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-300">{configError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSavePageAgentConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  {configSaved ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                  {configSaved ? "已保存！" : "保存配置"}
                </button>
                {pageAgentConfig.enabled && pageAgentConfig.apiKey && onOpenAgent && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAgent();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    打开 AI Agent
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                使用示例
              </h4>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-900/60 rounded-lg">
                  <p className="text-xs text-slate-300">💬 "点击开启 AI 智能问答按钮"</p>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg">
                  <p className="text-xs text-slate-300">💬 "分析当前页面有哪些可操作的元素"</p>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg">
                  <p className="text-xs text-slate-300">💬 "搜索知识库中关于 RAG 架构的内容"</p>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg">
                  <p className="text-xs text-slate-300">💬 "打开知识库管理，列出所有知识库"</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
