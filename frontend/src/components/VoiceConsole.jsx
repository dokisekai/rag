import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarkdownRenderer, { extractHighlightPhrases } from './MarkdownRenderer';
import ReasoningStepsBlock from './ReasoningStepsBlock';
import HistoryPanel from './HistoryPanel';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  MessageSquare,
  Database,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Zap,
  Copy,
  Check,
  Bot,
  User,
  Radio,
  RotateCcw,
  Minimize2,
  Maximize2,
  Brain,
  Square,
  Globe,
  ExternalLink,
  Shield,
  Menu,
  PanelLeftClose,
  Lock,
  ArrowLeft
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import InterviewAvatar from './InterviewAvatar';
import SettingsModal from './SettingsModal';
import { getCharacter } from '../data/characters';
import { useApp } from '../context/AppContext';

export default function VoiceConsole({
  module,
  config,
  ragEnabled,
  kbId,
  onEnd,
  onFinishReport,
  avatarType = 'svg',
  onAvatarTypeChange = null,
  onSelectHistory = null,
}) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  });
  const [aiState, setAiState] = useState('idle');
  const [userInputText, setUserInputText] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist chat history automatically
  useEffect(() => {
    try {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [messages]);

  // 当前角色音色：从 characters.js 读取对应的 Edge-TTS 声音 ID
  const character = getCharacter(avatarType);
  const characterVoice = character.voice; // 如 'zh-CN-XiaoxiaoNeural'
  
  const { webSearchEnabled, setWebSearchEnabled, strictKbMode, saveConfig, config: appConfig, setActiveView, setAdminPage, setRagEnabled } = useApp();
  const [isMicListening, setIsMicListening] = useState(false);
  // 语音播报静音：默认跟随全局配置，配置关闭时静音
  const [ttsMuted, setTtsMuted] = useState((config?.ttsEnabled ?? appConfig?.ttsEnabled) ? false : true);
  const [audioUrl, setAudioUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // RAG Chunks & Web Search State
  const [currentRagChunks, setCurrentRagChunks] = useState([]);
  const [currentWebResults, setCurrentWebResults] = useState([]);
  const [currentRagMeta, setCurrentRagMeta] = useState(null);
  const [expandedRagMsgIdx, setExpandedRagMsgIdx] = useState(null);
  const [expandedWebMsgIdx, setExpandedWebMsgIdx] = useState(null);
  // 点击切片高亮：当前高亮的切片下标，null 表示不高亮
  const [highlightChunkIdx, setHighlightChunkIdx] = useState(null);
  
  // Copy feedback & Floating widget collapse state
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [widgetCollapsed, setWidgetCollapsed] = useState(false);

  // 侧边抽屉开关：默认隐藏，localStorage 持久化用户偏好
  const [showSidebar, setShowSidebar] = useState(() => {
    try {
      return localStorage.getItem('vcc_sidebar_open') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vcc_sidebar_open', String(showSidebar));
    } catch (e) {
      console.error('Failed to persist sidebar state:', e);
    }
  }, [showSidebar]);

  // 当前会话 ID：用于后端自动持久化与刷新恢复
  const [sessionId, setSessionId] = useState(() => {
    try {
      return localStorage.getItem('vcc_session_id') || null;
    } catch (e) {
      return null;
    }
  });

  // 历史面板刷新触发器：done 事件后递增，确保新会话立即可见
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // 同步 sessionId 到 localStorage
  useEffect(() => {
    try {
      if (sessionId) {
        localStorage.setItem('vcc_session_id', sessionId);
      } else {
        localStorage.removeItem('vcc_session_id');
      }
    } catch (e) {
      console.error('Failed to persist session id:', e);
    }
  }, [sessionId]);

  // 联动：开启「仅知识库严谨模式」时强制关闭联网搜索（后端已硬性关停，前端同步 UI）
  useEffect(() => {
    if (strictKbMode && webSearchEnabled) {
      setWebSearchEnabled(false);
    }
  }, [strictKbMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载指定历史会话到主聊天区（支持切换会话）
  const loadSession = useCallback(async (id) => {
    if (!id) return;
    setAiState('thinking');
    try {
      const resp = await fetch(`/api/interview/history/${id}`);
      if (!resp.ok) {
        console.warn('Load session failed:', resp.status);
        setAiState('listening');
        return;
      }
      const data = await resp.json();
      // 恢复对话消息（后端存的是非 system 消息，前端展示也过滤 system）
      const restored = (data.dialog_messages || []).filter(m => m.role !== 'system');
      setMessages(restored);
      // 恢复最近一次的 RAG / Web 结果
      setCurrentRagChunks(data.rag_references || []);
      setCurrentWebResults(data.web_results || []);
      setCurrentRagMeta(null);
      setExpandedRagMsgIdx(null);
      setExpandedWebMsgIdx(null);
      setHighlightChunkIdx(null);
      setUserInputText('');
      latestTranscriptRef.current = '';
      setSessionId(id);
      setAiState('listening');
    } catch (e) {
      console.error('Failed to load session:', e);
      setAiState('listening');
    }
  }, []);

  // 初始化：如果 localStorage 中有 sessionId，自动恢复该会话（刷新不丢历史）
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换抽屉的回调：点击历史会话时加载到主聊天区
  const handleSelectHistory = (session) => {
    if (!session || !session.id) return;
    if (onSelectHistory) onSelectHistory(session);
    loadSession(session.id);
    // 选中后自动收起抽屉，让用户聚焦到对话内容
    setShowSidebar(false);
  };

  const audioRef = useRef(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const ttsMutedRef = useRef(false);

  useEffect(() => {
    // 切换模块时开启新会话：清空当前会话状态
    setMessages([]);
    setSessionId(null);
    setCurrentRagChunks([]);
    setCurrentWebResults([]);
    setHighlightChunkIdx(null);
    setAiState('listening');
  }, [module]);

  const autoSubmitVoiceRef = useRef(true);
  const autoSubmitTimerRef = useRef(null);
  const latestTranscriptRef = useRef('');
  const handleSubmitQuestionRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
      abortControllerRef.current = null;
    }
    setAiState('listening');
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }
    sentenceBufferRef.current = '';
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        if (last.content === '🤔 AI 知识库检索并思考中...' || !last.content) {
          last.content = '⏹️ 已中途停止回答生成';
        } else if (!last.content.includes('⏹️')) {
          last.content += ' [⏹️ 已手动停止回答生成]';
        }
      }
      return updated;
    });
  };

  useEffect(() => {
    autoSubmitVoiceRef.current = config?.autoSubmitVoice !== false;
  }, [config?.autoSubmitVoice]);

  const interruptAiAudio = () => {
    sentenceBufferRef.current = '';
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setAiState((prev) => (prev === 'speaking' ? 'listening' : prev));
  };

  const correctTechTermsInSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/\bIG\b|阿哥|拉格|阿G/gi, 'RAG')
      .replace(/NBA电影|NBA/gi, 'BM25/N-gram')
      .replace(/硬编码|因贝丁/gi, 'Embedding')
      .replace(/飞斯|非斯/gi, 'FAISS')
      .replace(/热排/gi, 'Rerank')
      .replace(/色阔/gi, 'SQL');
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'zh-CN';

      rec.onspeechstart = () => {
        interruptAiAudio();
      };

      rec.onresult = (event) => {
        interruptAiAudio();
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          const correctedText = correctTechTermsInSpeech(transcript);
          setUserInputText(correctedText);
          latestTranscriptRef.current = correctedText;

          if (autoSubmitVoiceRef.current) {
            if (autoSubmitTimerRef.current) {
              clearTimeout(autoSubmitTimerRef.current);
            }
            // 说话停顿 1.2 秒无新输入时自动提交提问
            autoSubmitTimerRef.current = setTimeout(() => {
              if (latestTranscriptRef.current && latestTranscriptRef.current.trim()) {
                if (handleSubmitQuestionRef.current) {
                  handleSubmitQuestionRef.current();
                }
              }
            }, 1200);
          }
        }
      };

      rec.onerror = (err) => {
        console.log('Speech recognition info:', err.error);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setIsMicListening(false);
        }
      };

      rec.onend = () => {
        setIsMicListening(false);
        if (autoSubmitVoiceRef.current && latestTranscriptRef.current && latestTranscriptRef.current.trim()) {
          if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
          if (handleSubmitQuestionRef.current) {
            handleSubmitQuestionRef.current();
          }
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startSession = async () => {
    setAiState('thinking');
    try {
      const resp = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_filename: module ? module.filename : '',
          rag_enabled: ragEnabled,
          kb_id: kbId
        }),
      });
      const data = await resp.json();
      setMessages(data.messages || []);
      if (data.rag_chunks && data.rag_chunks.length > 0) {
        setCurrentRagChunks(data.rag_chunks);
      }
      if (data.rag_meta) {
        setCurrentRagMeta(data.rag_meta);
      }

      if (data.audio_url) {
        const fullAudioUrl = data.audio_url;
        setAudioUrl(fullAudioUrl);
        playAiAudio(fullAudioUrl);
      } else {
        setAiState('listening');
      }
    } catch (err) {
      console.error(err);
      setAiState('idle');
    }
  };

  useEffect(() => {
    ttsMutedRef.current = ttsMuted;
  }, [ttsMuted]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiState]);

  const cleanMarkdownForTts = (text) => {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, '代码块已省略。')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_\-`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
  };

  const sentenceBufferRef = useRef('');

  // 缓存最优中文声音，头像切换时重置以重新匹配
  const bestVoiceRef = React.useRef(null);
  // 角色切换时清空缓存，强制重新选择与角色匹配的声音
  React.useEffect(() => { bestVoiceRef.current = null; }, [avatarType]);

  const getBestChineseVoice = () => {
    if (bestVoiceRef.current) return bestVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    // 先尝试精确匹配当前角色声音名称（如 Yunxi / Xiaoxiao / Xiaoyi）
    const charVoiceKeyword = characterVoice.replace('zh-CN-', '').replace('Neural', '');
    const priority = [
      v => v.name.includes(charVoiceKeyword),          // 精确匹配角色声音
      v => v.lang === 'zh-CN' && v.name.includes('Microsoft'),
      v => v.lang === 'zh-CN' && v.localService,
      v => v.lang === 'zh-CN',
      v => v.lang.startsWith('zh'),
    ];
    for (const matcher of priority) {
      const found = voices.find(matcher);
      if (found) { bestVoiceRef.current = found; return found; }
    }
    return null;
  };

  const speakStreamSentence = (sentence) => {
    if (ttsMutedRef.current) return;
    if (!('speechSynthesis' in window)) return;

    const cleanText = cleanMarkdownForTts(sentence);
    if (!cleanText || cleanText.length < 2) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;    // 语速自然，不过快
      utterance.pitch = 1.05;  // 音调略高，清晰明朗
      utterance.volume = 1.0;

      // 挑选最优中文声音
      const bestVoice = getBestChineseVoice();
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onstart = () => {
        setAiState('speaking');
      };
      utterance.onend = () => {
        if (!window.speechSynthesis.speaking) {
          setAiState('listening');
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.log('Stream sentence speech info:', e);
    }
  };

  const processStreamTokenForSpeech = (token) => {
    if (ttsMutedRef.current) return;
    sentenceBufferRef.current += token;

    const matches = sentenceBufferRef.current.match(/[^。！？；\n]+[。！？；\n]+/g);
    if (matches && matches.length > 0) {
      for (const sentence of matches) {
        speakStreamSentence(sentence);
        sentenceBufferRef.current = sentenceBufferRef.current.replace(sentence, '');
      }
    }
  };

  const playWebSpeechFallback = (text) => {
    if (ttsMutedRef.current) return;
    if (!('speechSynthesis' in window)) {
      setAiState('listening');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = cleanMarkdownForTts(text);
      if (!cleanText) {
        setAiState('listening');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setAiState('speaking');
      };
      utterance.onend = () => {
        setAiState('listening');
      };
      utterance.onerror = () => {
        setAiState('listening');
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.log('Web Speech Synthesis fallback info:', e);
      setAiState('listening');
    }
  };

  const playAiAudio = (url, fallbackText = '') => {
    if (ttsMutedRef.current) return;

    if (url) {
      setAiState('speaking');
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.muted = ttsMutedRef.current;
        audioRef.current.play().catch((e) => {
          console.log('Audio play info, using Web Speech fallback:', e);
          if (fallbackText) playWebSpeechFallback(fallbackText);
          else setAiState('listening');
        });
      }
    } else if (fallbackText) {
      playWebSpeechFallback(fallbackText);
    } else {
      setAiState('listening');
    }
  };

  const toggleTtsMute = () => {
    setTtsMuted(prev => {
      const newMuted = !prev;
      ttsMutedRef.current = newMuted;
      if (audioRef.current) {
        audioRef.current.muted = newMuted;
      }
      return newMuted;
    });
  };

  const handleAudioEnded = () => {
    setAiState('listening');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器当前未开启 Web Speech 语音识别接口，可以直接在文本输入框中打字！');
      return;
    }

    if (isMicListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsMicListening(false);
    } else {
      interruptAiAudio();
      try {
        recognitionRef.current.start();
        setIsMicListening(true);
      } catch (e) {
        console.log('Mic start err:', e);
      }
    }
  };

  const handleSubmitQuestion = async () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    const textToSend = latestTranscriptRef.current || userInputText;
    if (!textToSend.trim()) return;

    latestTranscriptRef.current = '';

    if (isMicListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsMicListening(false);
    }

    const currentHistory = messages.filter(m => m.role !== 'system');
    setUserInputText('');
    setAiState('thinking');
    setHighlightChunkIdx(null);
    setCurrentRagChunks([]);
    setCurrentWebResults([]);

    setMessages([
      ...currentHistory,
      { role: 'user', content: textToSend },
      { role: 'assistant', content: '🤔 AI 知识库检索并思考中...' }
    ]);

    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const resp = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: currentHistory,
          user_answer: textToSend,
          rag_enabled: ragEnabled,
          web_search_enabled: webSearchEnabled,
          strict_kb_mode: strictKbMode,
          kb_id: kbId,
          voice: characterVoice,  // 传入当前角色对应的 Edge-TTS 声音
          session_id: sessionId,  // 传入当前会话 ID（首次为 null，后端会自动创建并返回）
        }),
      });

      if (!resp.ok) {
        const fallbackResp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentHistory,
            user_answer: textToSend,
            rag_enabled: ragEnabled,
            web_search_enabled: webSearchEnabled,
            strict_kb_mode: strictKbMode,
            kb_id: kbId
          }),
        });
        const fallbackData = await fallbackResp.json();
        setMessages((fallbackData.messages || []).filter(m => m.role !== 'system'));
        if (fallbackData.rag_chunks && fallbackData.rag_chunks.length > 0) {
          setCurrentRagChunks(fallbackData.rag_chunks);
        }
        if (fallbackData.web_results && fallbackData.web_results.length > 0) {
          setCurrentWebResults(fallbackData.web_results);
        }
        if (fallbackData.audio_url) {
          playAiAudio(fallbackData.audio_url);
        } else {
          setAiState('listening');
        }
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantMessage = '';
      let isFirstToken = true;
      let sseBuffer = '';

      const processSseLine = (line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data: ')) return;
        const jsonStr = trimmedLine.substring(6).trim();
        if (!jsonStr) return;
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'session_created') {
            // 🆕 后端在 stream 开始时就创建了会话记录，立即保存 session_id 并刷新历史面板
            if (data.session_id && data.session_id !== sessionId) {
              setSessionId(data.session_id);
              setHistoryRefreshTrigger(prev => prev + 1);
            }
          } else if (data.type === 'status_step') {
            if (data.steps && data.steps.length > 0) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.steps = data.steps;
                  last.isThinking = data.is_thinking !== false;
                }
                return updated;
              });
            }
          } else if (data.type === 'web_search') {
            if (data.web_results && data.web_results.length > 0) {
              setCurrentWebResults(data.web_results);
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.web_results = data.web_results;
                }
                return updated;
              });
            }
          } else if (data.type === 'rag') {
            if (data.rag_chunks && data.rag_chunks.length > 0) {
              setCurrentRagChunks(data.rag_chunks);
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.rag_chunks = data.rag_chunks;
                }
                return updated;
              });
            }
          } else if (data.type === 'token') {
            if (isFirstToken) {
              isFirstToken = false;
              setAiState('speaking');
              sentenceBufferRef.current = '';
              if ('speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (e) {}
              }
            }
            processStreamTokenForSpeech(data.content);
            currentAssistantMessage += data.content;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                last.content = currentAssistantMessage;
              }
              return updated;
            });
          } else if (data.type === 'done') {
            if (sentenceBufferRef.current.trim()) {
              speakStreamSentence(sentenceBufferRef.current);
              sentenceBufferRef.current = '';
            }
            // 保存后端返回的 session_id（首次问答时后端自动创建会话）
            if (data.session_id && data.session_id !== sessionId) {
              setSessionId(data.session_id);
            }
            // 触发历史面板刷新（后端已持久化，立即可在会话列表看到新记录）
            setHistoryRefreshTrigger(prev => prev + 1);
            // 用 done 事件中完整的 messages 覆盖展示，确保最终消息与后端完全一致
            if (data.messages && data.messages.length > 0) {
              const filtered = data.messages.filter(m => m.role !== 'system');
              const lastMsg = filtered[filtered.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.isThinking = false;
                if (data.rag_chunks && data.rag_chunks.length > 0) {
                  lastMsg.rag_chunks = data.rag_chunks;
                }
                if (data.web_results && data.web_results.length > 0) {
                  lastMsg.web_results = data.web_results;
                }
              }
              setMessages(filtered);
            }
            if (data.rag_chunks && data.rag_chunks.length > 0) {
              setCurrentRagChunks(data.rag_chunks);
            }
            if (data.web_results && data.web_results.length > 0) {
              setCurrentWebResults(data.web_results);
            }
            if (data.audio_url && !('speechSynthesis' in window)) {
              playAiAudio(data.audio_url, currentAssistantMessage);
            }
            setAiState('listening');
          }
        } catch (e) {
          console.warn('SSE stream JSON parse error on line:', jsonStr, e);
        }
      };

      while (true) {
        const { value, done } = await reader.read();

        // 流关闭时，先将剩余缓冲区里未处理完的最后一批数据全部 flush
        if (done) {
          sseBuffer += decoder.decode(new Uint8Array(), { stream: false });
          if (sseBuffer.trim()) {
            for (const line of sseBuffer.split('\n')) {
              processSseLine(line);
            }
          }
          break;
        }

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        // 保留未以 \n 闭合的半截 SSE 数据行，防止 TCP 分包导致 JSON 解析失败
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          processSseLine(line);
        }
      }

      // 若流读取结束但未收到任何有效 Token，且未显示内容，自动提示异常并恢复状态
      if (isFirstToken && !currentAssistantMessage) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant' && (last.content === '🤔 AI 知识库检索并思考中...' || !last.content)) {
            last.content = '⚠️ 模型响应异常，请检查后台模型连通性后重试。';
          }
          return updated;
        });
        setAiState('listening');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user request.');
        setAiState('listening');
        return;
      }
      console.error(err);
      setAiState('listening');
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && (last.content === '🤔 AI 知识库检索并思考中...' || !last.content)) {
          last.content = '⚠️ 请求失败，请检查模型 API 或本地 LM Studio 服务状态。';
        }
        return updated;
      });
    }
  };

  handleSubmitQuestionRef.current = handleSubmitQuestion;

  const handleFinishSession = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // 会话已通过流式接口自动持久化：有 sessionId 时跳过重复保存，直接复用
      if (sessionId) {
        if (onFinishReport) {
          onFinishReport({ id: sessionId, title: module?.title || 'AI 知识库问答' });
        } else if (onEnd) {
          onEnd();
        }
        return;
      }
      const resp = await fetch('/api/chat/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_title: module ? module.title : 'AI 知识库问答',
          module_filename: module ? module.filename : '',
          messages: messages,
          rag_enabled: ragEnabled,
          kb_id: kbId
        }),
      });
      const record = await resp.json();
      if (record && record.id) {
        setSessionId(record.id);
      }
      if (onFinishReport) {
        onFinishReport(record);
      } else if (onEnd) {
        onEnd();
      }
    } catch (e) {
      console.error('Error saving session:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('确定要清空当前问答对话流记录吗？')) {
      setMessages([]);
      setSessionId(null);
      setCurrentRagChunks([]);
      setCurrentWebResults([]);
      setHighlightChunkIdx(null);
      startSession();
    }
  };

  // 新建会话：彻底重置当前会话状态并启动新对话（无 confirm，由按钮显式触发）
  const handleNewSession = () => {
    setMessages([]);
    setCurrentRagChunks([]);
    setCurrentWebResults([]);
    setCurrentRagMeta(null);
    setExpandedRagMsgIdx(null);
    setExpandedWebMsgIdx(null);
    setHighlightChunkIdx(null);
    setUserInputText('');
    latestTranscriptRef.current = '';
    // 清空 sessionId，下次提问时后端会自动创建新会话
    setSessionId(null);
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    setAiState('listening');
  };

  // 点击切片高亮：从选中切片抽取关键术语，用于在 AI 回答正文中高亮对应引用内容
  const highlightPhrases = (
    highlightChunkIdx !== null &&
    highlightChunkIdx >= 0 &&
    highlightChunkIdx < currentRagChunks.length
  )
    ? extractHighlightPhrases(currentRagChunks[highlightChunkIdx].content || '')
    : [];

  const handleChunkClick = (cIdx) => {
    setHighlightChunkIdx(prev => (prev === cIdx ? null : cIdx));
  };

  return (
    /* ChatGPT 风格全屏固定视口：CSS Grid 划分 header / sidebar / main 三块，侧边抽屉默认隐藏 */
    <div className={`voice-console-grid ${showSidebar ? 'sidebar-open' : ''} selection:bg-indigo-500 selection:text-white`}>
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* ===== 顶部固定导航栏 Header (Top Slim Bar) ===== */}
      <header className="vcc-header flex-shrink-0 h-14 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-4 flex items-center justify-between z-10">
        {/* 左侧：抽屉切换按钮 + 数字人小头像 + 角色名 + 状态标 */}
        <div className="flex items-center gap-3">
          {/* 侧边抽屉切换按钮 */}
          <button
            type="button"
            onClick={() => setShowSidebar((prev) => !prev)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center hover-lift ${
              showSidebar
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 neon-glow-indigo'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-300 hover:border-indigo-500/40'
            }`}
            title={showSidebar ? '收起侧边面板' : '展开侧边面板（历史问答）'}
            aria-label="切换侧边面板"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div
            className="relative cursor-pointer group"
            onClick={toggleMic}
            title="点击切换语音/文字交互"
          >
            <div className={`absolute -inset-1 rounded-full blur-md opacity-70 transition-all duration-500 ${
              aiState === 'speaking' ? 'bg-purple-500 animate-pulse' :
              isMicListening ? 'bg-rose-500 animate-pulse' :
              'bg-indigo-500'
            }`} />
            <div className="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-indigo-500/60 overflow-hidden flex items-center justify-center">
              <InterviewAvatar
                aiState={aiState}
                muted={ttsMuted}
                onToggleMute={toggleTtsMute}
                ragEnabled={ragEnabled}
                moduleTitle=""
                avatarType={avatarType}
                onAvatarTypeChange={onAvatarTypeChange}
                audioUrl={audioUrl}
                compact={true}
              />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
              aiState === 'speaking' ? 'bg-purple-400 animate-ping' :
              isMicListening ? 'bg-rose-400 animate-pulse' :
              'bg-emerald-400'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{character.name}</span>
              <span className="text-[11px] text-slate-400 font-normal">{character.title}</span>
              {ragEnabled && (
                <span className="hidden sm:flex text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> RAG 召回
                </span>
              )}
              <button
                type="button"
                onClick={() => saveConfig({ strictKbMode: !strictKbMode })}
                className={`hidden sm:flex text-[9px] font-bold border px-2 py-0.5 rounded-full items-center gap-1 transition-all cursor-pointer ${
                  strictKbMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 ring-1 ring-amber-400/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={strictKbMode ? "仅知识库严谨模式已开启（查无资料直接回答未检索到，绝对零幻觉）" : "点击开启仅知识库严谨模式（无资料即回答未找到）"}
              >
                <Shield className="w-2.5 h-2.5 text-amber-400" />
                {strictKbMode ? '🛡 仅知识库 (严谨)' : '仅知识库'}
              </button>
            </div>
          </div>
        </div>

        {/* 右侧：快捷工具组（静音/清空/返回） */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTtsMute}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all cursor-pointer"
            title={ttsMuted ? "取消朗读静音" : "朗读静音"}
          >
            {ttsMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all cursor-pointer"
            title="清空当前对话记录"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-bold transition-all cursor-pointer"
            title="返回主页"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回
          </button>
        </div>
      </header>

      {/* ===== 侧边抽屉 Sidebar Drawer（历史问答面板） ===== */}
      <aside className={`vcc-sidebar ${showSidebar ? 'open' : ''}`}>
        {showSidebar && (
          <HistoryPanel
            onSelect={handleSelectHistory}
            onNewSession={handleNewSession}
            refreshKey={historyRefreshTrigger}
          />
        )}
      </aside>

      {/* ===== 主区域：消息滚动区 + 输入栏 ===== */}
      <div className="vcc-main">
      {/* ===== 中间核心对话滚动区 Messages Scroll Container (ChatGPT Style) ===== */}
      <main
        className="flex-1 overflow-y-auto min-h-0 py-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
      >
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          {messages.filter(m => m.role !== 'system').length === 0 ? (
            /* 首页空状态欢迎卡片 */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">欢迎使用 AI 知识库智能问答</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  您可以直接在下方输入框中打字提问，或者点击语音按钮/直接与 {character.name} 进行连续语音对话。
                </p>
              </div>

              {/* 推荐提示词快捷入口 */ }
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-2">
                {[
                  'Java 高并发线程池底层机制',
                  'JVM 垃圾回收算法与 GC 调优',
                  'Spring Boot 自动装配原理',
                  'FAISS 向量检索与 RRF 重排'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      latestTranscriptRef.current = prompt;
                      setUserInputText('');
                      if (handleSubmitQuestionRef.current) {
                        handleSubmitQuestionRef.current();
                      }
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-900/80 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 text-left text-xs text-slate-300 hover:text-indigo-200 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 消息流 Rendering */
            messages
              .filter(m => m.role !== 'system')
              .map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLast = idx === messages.filter(m => m.role !== 'system').length - 1;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-2 ${
                      isUser ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {/* 头像 */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* 消息气泡 */}
                    <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-indigo-600/90 text-white border-indigo-500/50 rounded-tr-none'
                          : 'bg-slate-900/90 border-slate-800 text-slate-100 rounded-tl-none'
                      }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <>
                            <ReasoningStepsBlock
                              steps={msg.steps || (isLast && aiState === 'thinking' ? [
                                { id: 'start', text: '🎯 收到提问，分析问题意图与多源数据...', status: 'done' },
                                { id: 'reasoning', text: '🧠 AI 知识库检索并整合思考中...', status: 'active' }
                              ] : [])}
                              isThinking={msg.isThinking ?? (isLast && aiState === 'thinking')}
                              ragCount={msg.rag_chunks ? msg.rag_chunks.length : (isLast ? currentRagChunks.length : 0)}
                              webCount={msg.web_results ? msg.web_results.length : (isLast ? currentWebResults.length : 0)}
                            />
                            <MarkdownRenderer
                              content={msg.content}
                              ragChunks={msg.rag_chunks || (isLast ? currentRagChunks : [])}
                              webResults={msg.web_results || (isLast ? currentWebResults : [])}
                              highlightPhrases={isLast ? highlightPhrases : []}
                            />
                          </>
                        )}
                      </div>

                      {/* AI 助手消息下的操作按钮 */}
                      {!isUser && (
                        <div className="flex items-center gap-2 px-1">
                          <button
                            onClick={() => navigator.clipboard?.writeText(msg.content)}
                            className="p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                            title="复制内容"
                          >
                            <Copy className="w-3 h-3" />
                            复制
                          </button>

                          {audioUrl && isLast && (
                            <button
                              onClick={() => playAiAudio(audioUrl)}
                              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                              title="重新朗读"
                            >
                              <Volume2 className="w-3 h-3" />
                              朗读
                            </button>
                          )}

                          {/* RAG 引用切片按钮 */}
                          {(() => {
                            const chunksToRender = (msg.rag_chunks && msg.rag_chunks.length > 0) ? msg.rag_chunks : (isLast ? currentRagChunks : []);
                            if (chunksToRender.length === 0) return null;
                            return (
                              <button
                                onClick={() => setExpandedRagMsgIdx(expandedRagMsgIdx === idx ? null : idx)}
                                className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Database className="w-3 h-3" />
                                引用 RAG 知识切块 ({chunksToRender.length})
                                {expandedRagMsgIdx === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            );
                          })()}
                          {/* 实时联网搜索引用按钮 */}
                          {(() => {
                            const webToRender = (msg.web_results && msg.web_results.length > 0) ? msg.web_results : (isLast ? currentWebResults : []);
                            if (webToRender.length === 0) return null;
                            return (
                              <button
                                onClick={() => setExpandedWebMsgIdx(expandedWebMsgIdx === idx ? null : idx)}
                                className="text-[10px] text-sky-400 font-bold bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Globe className="w-3 h-3" />
                                实时联网检索来源 ({webToRender.length})
                                {expandedWebMsgIdx === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {/* RAG 召回切片下拉展开面板 */}
                      {!isUser && expandedRagMsgIdx === idx && (() => {
                        const chunksToRender = (msg.rag_chunks && msg.rag_chunks.length > 0) ? msg.rag_chunks : (isLast ? currentRagChunks : []);
                        if (chunksToRender.length === 0) return null;
                        return (
                          <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2 animate-in fade-in">
                            <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" /> 检索增强参考知识源 ({chunksToRender.length}) · 与正文 [N] 角标一一对应
                              </span>
                              {highlightChunkIdx !== null && (
                                <button
                                  onClick={() => setHighlightChunkIdx(null)}
                                  className="text-[9px] text-amber-300 hover:text-amber-200 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" /> 清除高亮
                                </button>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-500 -mt-1">💡 点击任意切片可在上方回答正文中高亮对应的引用内容</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {chunksToRender.map((chunk, cIdx) => {
                                const active = highlightChunkIdx === cIdx;
                                return (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => handleChunkClick(cIdx)}
                                    className={`w-full text-left p-2 rounded-lg text-[10px] font-mono transition-all cursor-pointer border ${
                                      active
                                        ? 'bg-amber-500/15 border-amber-400/60 ring-1 ring-amber-400/40'
                                        : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/60'
                                    }`}
                                  >
                                    <div className={`font-bold mb-1 flex items-center gap-1.5 ${active ? 'text-amber-300' : 'text-emerald-500'}`}>
                                      <span className={`px-1 py-0.5 rounded border text-[9px] ${active ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}`}>[{cIdx + 1}]</span>
                                      <span className="truncate">{chunk.source || '参考文档'}</span>
                                      {active && <span className="ml-auto text-[9px] text-amber-300">已高亮</span>}
                                    </div>
                                    <p className="line-clamp-2 text-slate-400">{chunk.content}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 实时联网搜索下拉展开面板 */}
                      {!isUser && expandedWebMsgIdx === idx && (() => {
                        const webToRender = (msg.web_results && msg.web_results.length > 0) ? msg.web_results : (isLast ? currentWebResults : []);
                        if (webToRender.length === 0) return null;
                        return (
                          <div className="p-3 bg-slate-950/80 border border-sky-500/30 rounded-2xl space-y-2 animate-in fade-in">
                            <div className="text-[10px] font-bold text-sky-400 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" /> 全网实时检索相关网页 ({webToRender.length})
                              </span>
                            </div>
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                              {webToRender.map((item, wIdx) => (
                                <a
                                  key={wIdx}
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-800/60 transition-all text-[10px] font-sans group cursor-pointer"
                                >
                                  <div className="font-bold text-sky-300 flex items-center justify-between gap-1 mb-0.5">
                                    <span className="truncate group-hover:underline flex items-center gap-1">
                                      <span className="px-1 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[9px]">[{wIdx + 1}]</span>
                                      {item.title}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 flex-shrink-0" />
                                  </div>
                                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-normal">{item.snippet}</p>
                                  <span className="text-[9px] text-slate-500 font-mono mt-1 block truncate">🔗 {item.domain || item.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ===== 底部固定输入栏 Input Bar (ChatGPT Style) ===== */}
      <footer className="flex-shrink-0 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* 输入主控制行 */}
          <div className="flex items-end gap-2.5 bg-slate-950/80 border border-slate-800 focus-within:border-indigo-500/60 p-2.5 rounded-2xl shadow-inner transition-all">
            {/* 麦克风开关 */}
            <button
              type="button"
              onClick={toggleMic}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-lg ${
                isMicListening
                  ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
              title={isMicListening ? '点击关闭麦克风' : '点击开启语音识别'}
            >
              {isMicListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-indigo-400" />}
            </button>

            {/* 输入框 */}
            <textarea
              value={isMicListening ? latestTranscriptRef.current : userInputText}
              onChange={(e) => setUserInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (handleSubmitQuestionRef.current) {
                    handleSubmitQuestionRef.current();
                  }
                }
              }}
              placeholder={isMicListening ? '🎙️ 正在实时识别语音... 随时停止说话提交' : '输入您的提问... (Enter 发送，Shift+Enter 换行)'}
              rows={1}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 placeholder-slate-500 text-xs sm:text-sm resize-none max-h-32 leading-relaxed"
              style={{ minHeight: '28px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />

            {/* 发送 / 停止生成 按钮 */}
            {aiState === 'thinking' || aiState === 'speaking' ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-lg shadow-rose-500/30 animate-pulse"
                title="点击立刻停止 AI 回答与 LLM 算力生成"
              >
                <Square className="w-4 h-4 fill-current text-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (handleSubmitQuestionRef.current) {
                    handleSubmitQuestionRef.current();
                  }
                }}
                disabled={!userInputText.trim() && !isMicListening}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
                title="发送消息 (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 底部状态指示与配置 */}
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              {isMicListening ? (
                <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  🎙️ 正在监听您的说话... 说话停顿 1.2 秒将自动提交
                </span>
              ) : (
                <span className="text-slate-500 font-mono">
                  💡 提示：按 Enter 发送 | 点击麦克风/数字人按钮语音对答
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {userInputText && (
                <button
                  type="button"
                  onClick={() => setUserInputText('')}
                  className="text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
                >
                  清空
                </button>
              )}

              <button
                type="button"
                onClick={() => setRagEnabled(!ragEnabled)}
                className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  ragEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}
                title="开启/关闭 RAG 知识库检索增强"
              >
                <Zap className="w-2.5 h-2.5" />
                {ragEnabled ? 'RAG: 开' : 'RAG: 关'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (strictKbMode) return; // 仅知识库模式下禁用
                  setWebSearchEnabled(!webSearchEnabled);
                }}
                className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition-all ${
                  strictKbMode
                    ? 'bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed opacity-60'
                    : webSearchEnabled
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 cursor-pointer'
                      : 'bg-slate-950 text-slate-500 border border-slate-800 cursor-pointer'
                }`}
                title={strictKbMode ? '已开启「仅知识库」严谨模式，请先关闭该模式再启用联网搜索' : '开启/关闭全网实时联网检索'}
              >
                {strictKbMode ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                {webSearchEnabled ? '联网搜索: 开' : '联网搜索: 关'}
              </button>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
