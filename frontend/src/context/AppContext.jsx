import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [config, setConfig] = useState({
    apiKey: '',
    apiBase: 'http://127.0.0.1:1234/v1',
    model: 'liquid/lfm2-24b-a2b',
    voice: 'zh-CN-XiaoxiaoNeural',
    temperature: 1.0,
    avatarType: 'svg',
    ttsEnabled: false,
    autoSubmitVoice: true,
    searchEngine: 'auto',
    searchTopK: 5,
    searchRetryEnabled: true,
    searchFilterPortals: true,
    searchLlmExtraction: true,
  });

  const [ragEnabled, setRagEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [strictKbMode, setStrictKbMode] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState(null);
  const [customKBs, setCustomKBs] = useState([]);
  const [avatarType, setAvatarType] = useState('svg');

  const [activeView, setActiveView] = useState('user');
  const [adminPage, setAdminPage] = useState('dashboard');

  const fetchModules = useCallback(() => {
    fetch('/api/modules')
      .then((res) => res.json())
      .then((data) => {
        setModules(data || []);
        if (data && data.length > 0 && !selectedModule) {
          setSelectedModule(data[0]);
        }
      })
      .catch((err) => console.error('Error fetching modules:', err));
  }, [selectedModule]);

  const fetchCustomKBs = useCallback(() => {
    return fetch('/api/knowledge/list')
      .then(res => res.json())
      .then(data => {
        const items = data.items || data || [];
        setCustomKBs(items);
        if (items.length > 0 && !selectedKbId) {
          setSelectedKbId(items[0].id);
        }
        return items;
      })
      .catch(err => {
        console.error('Error fetching KBs:', err);
        return [];
      });
  }, [selectedKbId]);

  useEffect(() => {
    fetchModules();
    fetchCustomKBs();
  }, []);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('avatar_type');
    if (savedAvatar) {
      setAvatarType(savedAvatar);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('avatar_type', avatarType);
  }, [avatarType]);

  const saveConfig = useCallback(async (newCfg) => {
    setConfig(prev => ({ ...prev, ...newCfg }));
    if (newCfg.strictKbMode !== undefined) {
      setStrictKbMode(!!newCfg.strictKbMode);
    }
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: newCfg.apiKey,
          api_base: newCfg.apiBase,
          model: newCfg.model,
          voice: newCfg.voice,
          temperature: parseFloat(newCfg.temperature),
          tts_enabled: !!newCfg.ttsEnabled,
          auto_submit_voice: newCfg.autoSubmitVoice !== undefined ? !!newCfg.autoSubmitVoice : true,
          strict_kb_mode: newCfg.strictKbMode !== undefined ? !!newCfg.strictKbMode : false,
          search_engine: newCfg.searchEngine || 'auto',
          search_top_k: newCfg.searchTopK ? parseInt(newCfg.searchTopK, 10) : 5,
          search_retry_enabled: newCfg.searchRetryEnabled !== undefined ? !!newCfg.searchRetryEnabled : true,
          search_filter_portals: newCfg.searchFilterPortals !== undefined ? !!newCfg.searchFilterPortals : true,
          search_llm_extraction: newCfg.searchLlmExtraction !== undefined ? !!newCfg.searchLlmExtraction : true,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const value = {
    modules,
    selectedModule,
    setSelectedModule,
    config,
    setConfig,
    saveConfig,
    ragEnabled,
    setRagEnabled,
    webSearchEnabled,
    setWebSearchEnabled,
    strictKbMode,
    setStrictKbMode,
    selectedKbId,
    setSelectedKbId,
    customKBs,
    setCustomKBs,
    avatarType,
    setAvatarType,
    activeView,
    setActiveView,
    adminPage,
    setAdminPage,
    fetchModules,
    fetchCustomKBs,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
