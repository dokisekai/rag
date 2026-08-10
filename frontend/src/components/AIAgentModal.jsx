import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Loader2,
  Settings,
  X,
  Square,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";
import Modal from "./Modal";

const PAGE_AGENT_CONFIG_KEY = "page_agent_config";

const DEFAULT_PAGE_AGENT_CONFIG = {
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

export default function AIAgentModal({ isOpen, onClose, onOpenSettings, systemConfig }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState("idle");
  const [currentActivity, setCurrentActivity] = useState(null);
  const [configError, setConfigError] = useState("");
  const [agentReady, setAgentReady] = useState(false);

  const agentRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentConfigRef = useRef(null);
  const eventListenersRef = useRef({ status: null, activity: null, history: null });
  const isDisposedRef = useRef(false);

  const disposeAgent = useCallback(() => {
    if (agentRef.current) {
      try {
        if (eventListenersRef.current.status && agentRef.current.removeEventListener) {
          agentRef.current.removeEventListener("statuschange", eventListenersRef.current.status);
        }
        if (eventListenersRef.current.activity && agentRef.current.removeEventListener) {
          agentRef.current.removeEventListener("activity", eventListenersRef.current.activity);
        }
        if (eventListenersRef.current.history && agentRef.current.removeEventListener) {
          agentRef.current.removeEventListener("historychange", eventListenersRef.current.history);
        }
        agentRef.current.dispose();
      } catch (e) {
        console.warn("Dispose agent error:", e);
      }
      agentRef.current = null;
      isDisposedRef.current = true;
    }
  }, []);

  const isAgentHealthy = useCallback(() => {
    return agentRef.current && !isDisposedRef.current;
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (!isAgentHealthy()) {
        initAgent();
      }
    }
  }, [isOpen, isAgentHealthy]);

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(PAGE_AGENT_CONFIG_KEY);
    if (!saved) return;
    try {
      const config = { ...DEFAULT_PAGE_AGENT_CONFIG, ...JSON.parse(saved) };
      if (config.useSystemConfig) {
        initAgent();
      }
    } catch (e) {
      // ignore
    }
  }, [systemConfig?.apiKey, systemConfig?.apiBase, systemConfig?.model, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentActivity]);

  const initAgent = async () => {
    const saved = localStorage.getItem(PAGE_AGENT_CONFIG_KEY);
    if (!saved) {
      setConfigError("请先在 AI 能力中心配置 PageAgent");
      setAgentReady(false);
      return;
    }

    let config;
    try {
      config = { ...DEFAULT_PAGE_AGENT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      setConfigError("配置解析失败，请重新配置");
      setAgentReady(false);
      return;
    }

    if (config.useSystemConfig && systemConfig) {
      config = {
        ...config,
        apiKey: systemConfig.apiKey || "lm-studio",
        baseURL: systemConfig.apiBase || config.baseURL,
        model: systemConfig.model || config.model,
      };
    }

    const effectiveBaseURL = config.useProxy ? "/api/llm-proxy" : config.baseURL;
    const effectiveApiKey = config.useProxy ? "proxy" : config.apiKey;

    if (!config.enabled || !config.apiKey || !config.baseURL) {
      setConfigError("PageAgent 未启用或配置不完整");
      setAgentReady(false);
      return;
    }

    setConfigError("");

    try {
      const { PageAgent } = await import("page-agent");

      disposeAgent();

      const agent = new PageAgent({
        apiKey: effectiveApiKey,
        baseURL: effectiveBaseURL,
        model: config.model,
        maxSteps: config.maxSteps || 40,
        stepDelay: config.stepDelay || 0.4,
        language: config.language || "zh-CN",
      });

      const onStatusChange = (e) => setAgentStatus(e.detail);
      const onActivity = (e) => setCurrentActivity(e.detail);
      const onHistoryChange = () => {};

      agent.addEventListener("statuschange", onStatusChange);
      agent.addEventListener("activity", onActivity);
      agent.addEventListener("historychange", onHistoryChange);

      eventListenersRef.current = {
        status: onStatusChange,
        activity: onActivity,
        history: onHistoryChange,
      };

      agentRef.current = agent;
      isDisposedRef.current = false;
      currentConfigRef.current = {
        baseURL: config.baseURL,
        effectiveBaseURL,
        model: config.model,
        useSystemConfig: config.useSystemConfig,
        useProxy: config.useProxy,
      };
      setAgentReady(true);

      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            type: "info",
            content: "你好！我是基于阿里 PageAgent 的 AI 自动化助手 🤖\n\n我可以帮你用自然语言操作当前页面，例如：\n• 点击按钮、填写表单\n• 分析页面元素\n• 导航到不同功能\n• 调整设置参数\n\n请告诉我你想让我做什么？"
          }
        ]);
      }
    } catch (e) {
      console.error("Failed to init PageAgent:", e);
      setConfigError("PageAgent 初始化失败: " + e.message);
      setAgentReady(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    if (!isAgentHealthy()) {
      setConfigError("Agent 实例已失效，正在重新初始化...");
      await initAgent();
      if (!isAgentHealthy()) {
        setConfigError("Agent 初始化失败，请检查配置");
        return;
      }
      setConfigError("");
    }

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const taskText = input;
    setInput("");
    setIsProcessing(true);
    setCurrentActivity({ type: "thinking" });

    abortControllerRef.current = new AbortController();

    try {
      const result = await agentRef.current.execute(taskText);

      const stepCount = result.history.filter(h => h.type === "step").length;
      const tokenInfo = result.history
        .filter(h => h.type === "step" && h.usage)
        .reduce((acc, h) => ({
          prompt: acc.prompt + (h.usage.promptTokens || 0),
          completion: acc.completion + (h.usage.completionTokens || 0),
          total: acc.total + (h.usage.totalTokens || 0),
        }), { prompt: 0, completion: 0, total: 0 });

      const assistantMsg = {
        role: "assistant",
        type: result.success ? "success" : "error",
        content: result.data,
        steps: stepCount,
        tokens: tokenInfo,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Execute error:", e);
      let errorMsg = "执行失败: " + (e.message || "未知错误");
      let isAuthError = false;
      let isNetworkError = false;
      let isDisposedError = false;
      const cfg = currentConfigRef.current;
      const configInfo = cfg
        ? `\n\n📡 当前配置:\n   模型: ${cfg.model}\n   接口: ${cfg.baseURL}${cfg.useProxy ? `\n   代理: → ${cfg.effectiveBaseURL} (后端代理)` : ""}${cfg.useSystemConfig ? "\n   (复用系统配置)" : ""}`
        : "";

      if (e.message && e.message.toLowerCase().includes("disposed")) {
        isDisposedError = true;
        isDisposedRef.current = true;
        errorMsg = `♻️ Agent 实例已失效，正在自动重建...\n\n请稍候重新发送您的请求。`;
      } else if (e.message && (
        e.message.toLowerCase().includes("authentication failed") ||
        e.message.toLowerCase().includes("incorrect api key") ||
        e.message.toLowerCase().includes("401") ||
        e.message.toLowerCase().includes("unauthorized")
      )) {
        isAuthError = true;
        errorMsg = `❌ API 鉴权失败${configInfo}\n\n可能的原因:\n• API Key 不正确或已过期\n• 使用了阿里云接口但未配置正确的 DashScope API Key\n• 模型名称与接口不匹配\n\n建议:\n1. 点击右上角 ⚙️ 检查 API Key 配置\n2. 如使用本地模型（LM Studio），请确认 Base URL 指向本地地址\n3. 确认模型名称与接口兼容`;
      } else if (e.message && (
        e.message.toLowerCase().includes("network") ||
        e.message.toLowerCase().includes("failed to fetch") ||
        e.message.toLowerCase().includes("connection") ||
        e.message.toLowerCase().includes("timeout") ||
        e.message.toLowerCase().includes("econnrefused") ||
        e.message.toLowerCase().includes("enetunreach")
      )) {
        isNetworkError = true;
        errorMsg = `🌐 网络连接失败${configInfo}\n\n无法连接到模型服务器，请检查:\n\n1️⃣ 本地模型是否启动?\n   • LM Studio: 确认已点击 Start Server\n   • Ollama: 确认 ollama serve 正在运行\n\n2️⃣ Base URL 是否正确?\n   • LM Studio 默认: http://127.0.0.1:1234/v1\n   • Ollama 默认: http://127.0.0.1:11434/v1\n   • 阿里云: https://dashscope.aliyuncs.com/compatible-mode/v1\n\n3️⃣ 端口是否被占用?\n   • 可以在浏览器中访问 Base URL 测试连通性\n\n4️⃣ 点击右上角 ⚙️ 进入设置检查配置`;
      } else if (e.message && (
        e.message.toLowerCase().includes("model") ||
        e.message.toLowerCase().includes("not found") ||
        e.message.toLowerCase().includes("404")
      )) {
        errorMsg = `🤖 模型调用失败${configInfo}\n\n模型名称可能不正确或模型未加载。\n\n请检查:\n• 模型名称是否拼写正确\n• 本地模型是否已加载到内存中\n• 点击右上角 ⚙️ 进入设置检查模型名称`;
      }
      
      setMessages((prev) => [...prev, {
        role: "assistant",
        type: "error",
        content: errorMsg,
        isAuthError,
        isNetworkError,
        isDisposedError,
      }]);
    } finally {
      setIsProcessing(false);
      setCurrentActivity(null);
      setAgentStatus("idle");
      abortControllerRef.current = null;
    }
  }, [input, isProcessing, agentReady]);

  const handleStop = useCallback(async () => {
    if (agentRef.current && isProcessing) {
      try {
        await agentRef.current.stop();
      } catch (e) {
        console.error("Stop error:", e);
      }
    }
  }, [isProcessing]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    "分析当前页面有哪些可操作元素",
    "点击开启 AI 语音面试按钮",
    "打开 AI 能力中心",
    "把严格度调到最高",
  ];

  const getStatusText = () => {
    if (!agentReady) return "未就绪";
    if (currentActivity) {
      switch (currentActivity.type) {
        case "thinking": return "AI 思考中...";
        case "executing": return `执行: ${currentActivity.tool}`;
        case "executed": return `已完成: ${currentActivity.tool}`;
        case "retrying": return `重试中 (${currentActivity.attempt}/${currentActivity.maxAttempts})`;
        case "error": return "出错了";
        default: return "处理中...";
      }
    }
    if (isProcessing) return "处理中...";
    return "就绪";
  };

  const getStatusColor = () => {
    if (!agentReady) return "text-slate-500";
    if (currentActivity?.type === "error") return "text-red-400";
    if (isProcessing) return "text-pink-400";
    return "text-emerald-400";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Agent 自动化助手">
      <div className="w-full max-w-2xl flex flex-col h-[600px]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Bot className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">PageAgent · 阿里</h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  agentReady && !isProcessing ? "bg-emerald-400" : isProcessing ? "bg-pink-400 animate-pulse" : "bg-slate-500"
                }`} />
                <span className={`text-[11px] ${getStatusColor()}`}>{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title="设置"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {configError && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-200 font-medium">配置异常</p>
              <p className="text-xs text-amber-300/80 mt-0.5">{configError}</p>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="mt-2 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2"
                >
                  去配置 →
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-tr-none"
                    : msg.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-tl-none"
                    : msg.type === "error"
                    ? "bg-red-500/10 border border-red-500/20 text-red-100 rounded-tl-none"
                    : "bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                {msg.steps !== undefined && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-current/10">
                    <span className="text-[10px] flex items-center gap-1 opacity-70">
                      <Sparkles className="w-3 h-3" />
                      {msg.steps} 步
                    </span>
                    {msg.tokens && (
                      <span className="text-[10px] flex items-center gap-1 opacity-70">
                        <Zap className="w-3 h-3" />
                        {msg.tokens.total} tokens
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && currentActivity && currentActivity.type === "executing" && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl rounded-tl-none">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                  <span>
                    执行工具: <code className="text-pink-300 font-mono text-xs bg-pink-500/10 px-1.5 py-0.5 rounded">
                      {currentActivity.tool}
                    </code>
                  </span>
                </div>
              </div>
            </div>
          )}

          {isProcessing && currentActivity && currentActivity.type === "thinking" && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-slate-400">AI 思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && agentReady && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">快捷指令：</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action);
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs bg-slate-900/60 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-800 hover:border-pink-500/30 hover:text-pink-300 transition-all disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agentReady ? "告诉 AI 你想做什么...（例如：点击开始按钮）" : "请先配置 PageAgent"}
              disabled={!agentReady || isProcessing}
              className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
            />
            {isProcessing ? (
              <button
                onClick={handleStop}
                className="px-5 py-3 rounded-xl font-medium flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                <Square className="w-4 h-4" />
                停止
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!agentReady || isProcessing || !input.trim()}
                className={`px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  !agentReady || isProcessing || !input.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20"
                }`}
              >
                <Send className="w-4 h-4" />
                发送
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
            <span>基于阿里 PageAgent · 自然语言驱动页面操作</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {agentStatus === "running" ? "执行中" : "空闲"}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
