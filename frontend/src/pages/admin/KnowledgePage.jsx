import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  Edit3,
  RefreshCw, 
  FileText, 
  Upload, 
  Eye, 
  HardDrive, 
  Clock, 
  Zap, 
  X, 
  Check, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Sliders, 
  ArrowRight,
  FileCode,
  File,
  CheckCircle2,
  FolderPlus,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function KnowledgePage() {
  const { customKBs, fetchCustomKBs, selectedKbId, setSelectedKbId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'search'

  // Modals & State
  const [showCreateKbModal, setShowCreateKbModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameKbId, setRenameKbId] = useState(null);
  const [renameKbName, setRenameKbName] = useState('');
  const [renameKbDesc, setRenameKbDesc] = useState('');

  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Selected KB Documents State
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Live RAG Search Test State
  const [searchQuery, setSearchQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [enableRerank, setEnableRerank] = useState(true);
  const [enableRewrite, setEnableRewrite] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  // 向量可视化 State
  const [vectorData, setVectorData] = useState(null);
  const [loadingVectors, setLoadingVectors] = useState(false);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [vectorLimit, setVectorLimit] = useState(20);

  const activeKb = customKBs.find(kb => kb.id === selectedKbId) || (customKBs.length > 0 ? customKBs[0] : null);

  useEffect(() => {
    fetchCustomKBs();
  }, []);

  useEffect(() => {
    if (activeKb) {
      loadDocuments(activeKb.id);
    }
  }, [selectedKbId, activeKb?.id]);

  const loadDocuments = async (kbId) => {
    if (!kbId) return;
    setLoadingDocs(true);
    try {
      const resp = await fetch(`/api/knowledge/${kbId}/documents`);
      if (resp.ok) {
        const data = await resp.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  // 1. 新建知识库分类（支持可选初始文档上传）
  const handleCreateEmptyKb = async (e) => {
    e.preventDefault();
    if (!newKbName.trim()) {
      setModalError('请输入知识库分类名称');
      return;
    }
    setIsSubmitting(true);
    setModalError('');

    try {
      let result;
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('kb_name', newKbName.trim());
        formData.append('description', newKbDesc.trim());
        selectedFiles.forEach(f => formData.append('files', f));
        const resp = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.detail || '创建知识库及上传文档失败');
        }
        result = await resp.json();
      } else {
        const formData = new FormData();
        formData.append('name', newKbName.trim());
        formData.append('description', newKbDesc.trim());

        const resp = await fetch('/api/knowledge/create', {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.detail || '新建知识库失败');
        }

        result = await resp.json();
      }

      setShowCreateKbModal(false);
      setNewKbName('');
      setNewKbDesc('');
      setSelectedFiles([]);
      await fetchCustomKBs();
      if (result.kb_id) {
        setSelectedKbId(result.kb_id);
      }
    } catch (err) {
      setModalError(err.message || '创建异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. 向当前知识库追加上传文档
  const handleUploadDocsToCurrentKb = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeKb) return;
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const resp = await fetch(`/api/knowledge/${activeKb.id}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      if (resp.ok) {
        await loadDocuments(activeKb.id);
        await fetchCustomKBs();
      } else {
        alert('文件上传解析失败');
      }
    } catch (err) {
      console.error(err);
      alert('上传异常: ' + err.message);
    }
    e.target.value = '';
  };

  // 3. 重命名知识库
  const openRenameModal = (kb, e) => {
    e?.stopPropagation();
    setRenameKbId(kb.id);
    setRenameKbName(kb.name || '');
    setRenameKbDesc(kb.description || '');
    setModalError('');
    setShowRenameModal(true);
  };

  const handleSaveRenameKb = async (e) => {
    e.preventDefault();
    if (!renameKbName.trim()) {
      setModalError('知识库名称不能为空');
      return;
    }
    setIsSubmitting(true);
    setModalError('');
    try {
      const formData = new FormData();
      formData.append('name', renameKbName.trim());
      formData.append('description', renameKbDesc.trim());

      const resp = await fetch(`/api/knowledge/${renameKbId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || '重命名失败');
      }

      setShowRenameModal(false);
      await fetchCustomKBs();
    } catch (err) {
      setModalError(err.message || '重命名操作异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKb = async (kbId, e) => {
    e?.stopPropagation();
    const targetKb = customKBs.find(k => k.id === kbId);
    const targetName = targetKb ? targetKb.name : kbId;
    if (!confirm(`确定要彻底删除知识库【${targetName}】及其所有关联文档与切片吗？`)) return;
    try {
      await fetch(`/api/knowledge/${kbId}`, { method: 'DELETE' });
      await fetchCustomKBs();
      if (selectedKbId === kbId) {
        setSelectedKbId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!activeKb) return;
    if (!confirm('确定要删除该文档吗？')) return;
    try {
      await fetch(`/api/knowledge/${activeKb.id}/documents/${docId}`, { method: 'DELETE' });
      loadDocuments(activeKb.id);
      fetchCustomKBs();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePreviewDoc = async (doc) => {
    if (!activeKb) return;
    setPreviewDoc(doc);
    setLoadingPreview(true);
    try {
      const resp = await fetch(`/api/knowledge/${activeKb.id}/documents/${doc.doc_id}/preview`);
      if (resp.ok) {
        const data = await resp.json();
        setPreviewContent(data.content || '无预览内容');
      }
    } catch (e) {
      setPreviewContent('预览失败');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleReindex = async () => {
    if (!activeKb) return;
    setIsReindexing(true);
    try {
      const formData = new FormData();
      formData.append('kb_id', activeKb.id);
      const resp = await fetch('/api/knowledge/reindex', {
        method: 'POST',
        body: formData,
      });
      if (resp.ok) {
        alert(`知识库【${activeKb.name}】重新构建向量索引完成！`);
        fetchCustomKBs();
        loadDocuments(activeKb.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleLiveSearch = async (e) => {
    e?.preventDefault();
    if (!activeKb || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const url = `/api/knowledge/${activeKb.id}/search?query=${encodeURIComponent(searchQuery)}&top_k=${topK}&enable_rerank=${enableRerank}&enable_rewrite=${enableRewrite}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const loadVectorData = async () => {
    if (!activeKb) return;
    setLoadingVectors(true);
    setSelectedChunkIdx(0);
    try {
      const resp = await fetch(`/api/knowledge/${activeKb.id}/vectors?limit=${vectorLimit}`);
      if (resp.ok) {
        const data = await resp.json();
        setVectorData(data);
      } else {
        setVectorData(null);
      }
    } catch (e) {
      console.error('Failed to load vectors:', e);
      setVectorData(null);
    } finally {
      setLoadingVectors(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'visualize' && activeKb && !vectorData) {
      loadVectorData();
    }
  }, [activeTab, activeKb?.id]);

  const filteredKBs = customKBs.filter(kb => 
    kb.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kb.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* 顶部标题与新建知识库入口 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">AI 知识库与向量管理</h1>
            <span className="text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
              FAISS + BM25 RAG
            </span>
          </div>
          <p className="text-xs text-slate-400">
            分类管理领域知识文档，直观监控各文件 RAG Chunk 切片与 FAISS 向量 Emb 状态。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setModalError('');
              setNewKbName('');
              setNewKbDesc('');
              setShowCreateKbModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-md"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" />
            新建知识库分类
          </button>
        </div>
      </div>

      {/* 主面板 Grid：左侧知识库分类列表，右侧文档明细与 RAG 检索 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：知识库分类列表 */}
        <div className="lg:col-span-4 space-y-3">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" /> 知识库分类 ({customKBs.length})
              </span>
              <button
                onClick={fetchCustomKBs}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="刷新列表"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="搜索知识库..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredKBs.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 text-slate-500 text-xs">
                暂无分类，点击上方【新建知识库分类】进行创建
              </div>
            ) : (
              filteredKBs.map((kb) => {
                const isSelected = activeKb?.id === kb.id;
                return (
                  <div
                    key={kb.id}
                    onClick={() => setSelectedKbId(kb.id)}
                    className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-sky-500/50 bg-sky-950/20 shadow-lg shadow-sky-500/5'
                        : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-14">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          {kb.name}
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {kb.description || `ID: ${kb.id}`}
                        </p>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 absolute right-3 top-3 transition-all">
                        <button
                          onClick={(e) => openRenameModal(kb, e)}
                          className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 transition-all"
                          title="重命名知识库"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteKb(kb.id, e)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                          title="删除知识库"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-sky-400" />
                        {kb.doc_count || kb.documents_count || 0} 篇文件
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-400" />
                        {kb.total_chunks || kb.chunk_count || 0} Chunks
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-emerald-400" />
                        {formatSize(kb.total_size || kb.file_size)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧：当前所选知识库的文档管理与 RAG 向量测试 */}
        <div className="lg:col-span-8 space-y-4">
          {activeKb ? (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{activeKb.name}</h2>
                    <button
                      onClick={(e) => openRenameModal(activeKb, e)}
                      className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 transition-colors"
                      title="重命名当前知识库"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      ID: {activeKb.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    已加载 {documents.length} 篇知识文档 · 向量切片 Chunk 数: {activeKb.total_chunks || activeKb.chunk_count || 0}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    上传文档文件
                    <input
                      type="file"
                      multiple
                      accept=".md,.txt,.json,.docx"
                      onChange={handleUploadDocsToCurrentKb}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleReindex}
                    disabled={isReindexing}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                    重新向量构建
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: 文档管理 vs RAG 向量检索测试 vs 向量可视化 */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'documents'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  文档文件列表 ({documents.length})
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'search'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  RAG 向量检索测试
                </button>
                <button
                  onClick={() => setActiveTab('visualize')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'visualize'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  向量维度可视化
                </button>
              </div>

              {/* Tab Content 1: 文档明细列表 */}
              {activeTab === 'documents' && (
                <div className="space-y-3">
                  {loadingDocs ? (
                    <div className="py-12 text-center text-slate-500 text-xs">加载文档明细中...</div>
                  ) : documents.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
                      <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">当前知识库暂无文档文件</p>
                      <label className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        上传 Markdown / 文本文档
                        <input
                          type="file"
                          multiple
                          accept=".md,.txt,.json,.docx"
                          onChange={handleUploadDocsToCurrentKb}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                            <th className="p-3 pl-4">文档名称</th>
                            <th className="p-3">文件大小</th>
                            <th className="p-3">RAG 切片 Chunk</th>
                            <th className="p-3">RAG Embed 向量状态</th>
                            <th className="p-3 text-right pr-4">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {documents.map((doc) => (
                            <tr key={doc.doc_id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="p-3 pl-4 font-medium text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                <span className="truncate max-w-[220px]">{doc.filename}</span>
                              </td>
                              <td className="p-3 font-mono text-slate-400">{formatSize(doc.file_size)}</td>
                              <td className="p-3 font-mono">
                                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                                  {doc.chunk_count || doc.total_chunks || 0} Chunks
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {doc.emb_status || '已向量化 (1536d)'}
                                </span>
                              </td>
                              <td className="p-3 text-right pr-4 space-x-2">
                                <button
                                  onClick={() => handlePreviewDoc(doc)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> 预览原文本
                                </button>
                                <button
                                  onClick={() => handleDeleteDoc(doc.doc_id)}
                                  className="px-2 py-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 3: 向量维度可视化 */}
              {activeTab === 'visualize' && (
                <div className="space-y-4">
                  {loadingVectors ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-400" />
                      正在加载真实向量数据...
                    </div>
                  ) : !vectorData ? (
                    <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">无法加载向量数据</p>
                      <p className="text-[10px] text-slate-500">请确认该知识库已完成向量索引构建</p>
                      <button onClick={loadVectorData} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">
                        重新加载
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* 顶部统计卡片 */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="glass-panel p-3 rounded-2xl border border-slate-800 bg-gradient-to-br from-purple-950/30 to-slate-950/50">
                          <span className="text-[10px] text-slate-400 font-semibold">向量维度</span>
                          <p className="text-2xl font-bold text-purple-400 font-mono">{vectorData.emb_dim}</p>
                        </div>
                        <div className="glass-panel p-3 rounded-2xl border border-slate-800 bg-gradient-to-br from-sky-950/30 to-slate-950/50">
                          <span className="text-[10px] text-slate-400 font-semibold">总切片数</span>
                          <p className="text-2xl font-bold text-sky-400 font-mono">{vectorData.total_chunks}</p>
                        </div>
                        <div className="glass-panel p-3 rounded-2xl border border-slate-800 bg-gradient-to-br from-amber-950/30 to-slate-950/50">
                          <span className="text-[10px] text-slate-400 font-semibold">展示数量</span>
                          <p className="text-2xl font-bold text-amber-400 font-mono">{vectorData.showing}</p>
                        </div>
                        <div className="glass-panel p-3 rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-950/30 to-slate-950/50">
                          <span className="text-[10px] text-slate-400 font-semibold">索引类型</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono">{vectorData.vector_type}</p>
                        </div>
                        <div className="glass-panel p-3 rounded-2xl border border-slate-800 bg-gradient-to-br from-rose-950/30 to-slate-950/50">
                          <span className="text-[10px] text-slate-400 font-semibold">Embed模型</span>
                          <p className="text-sm font-bold text-rose-400 font-mono">{vectorData.model}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-400">展示切片数:</label>
                          <select
                            value={vectorLimit}
                            onChange={(e) => {
                              setVectorLimit(Number(e.target.value));
                              setVectorData(null);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                          </select>
                        </div>
                        <button
                          onClick={() => { setVectorData(null); loadVectorData(); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> 刷新数据
                        </button>
                      </div>

                      {/* 图表区：相似度矩阵 + 维度分布 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 相似度矩阵热力图 */}
                        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            向量间相似度矩阵 ({vectorData.showing}×{vectorData.showing})
                          </h4>
                          <div className="relative w-full bg-slate-950/60 rounded-xl overflow-hidden p-2">
                            <svg viewBox={`0 0 ${vectorData.showing * 16 + 40} ${vectorData.showing * 16 + 40}`} className="w-full">
                              {/* 列标签 */}
                              {Array.from({ length: vectorData.showing }).map((_, j) => (
                                <text key={`col-${j}`} x={j * 16 + 28} y={20} fill="#64748b" fontSize="7" textAnchor="middle">{j}</text>
                              ))}
                              {/* 行标签 */}
                              {Array.from({ length: vectorData.showing }).map((_, i) => (
                                <text key={`row-${i}`} x={22} y={i * 16 + 32} fill="#64748b" fontSize="7" textAnchor="end">{i}</text>
                              ))}
                              {/* 矩阵单元格 */}
                              {vectorData.similarity_matrix.map((row, i) =>
                                row.map((sim, j) => {
                                  const intensity = Math.max(0, Math.min(1, (sim + 1) / 2));
                                  const hue = intensity > 0.5 ? 260 : 0;
                                  const opacity = 0.2 + intensity * 0.8;
                                  const isDiagonal = i === j;
                                  return (
                                    <rect
                                      key={`sim-${i}-${j}`}
                                      x={j * 16 + 28}
                                      y={i * 16 + 24}
                                      width="14"
                                      height="14"
                                      fill={isDiagonal ? `hsla(140, 70%, 50%, 0.9)` : `hsla(${hue}, 70%, 50%, ${opacity})`}
                                      stroke="rgba(15,23,42,0.5)"
                                      strokeWidth="0.5"
                                    >
                                      <title>{`Chunk ${i} ↔ Chunk ${j}\n相似度: ${sim}`}</title>
                                    </rect>
                                  );
                                })
                              )}
                            </svg>
                            <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-slate-500">
                              <span>低</span>
                              <div className="w-20 h-2 rounded bg-gradient-to-r from-slate-700 via-purple-700 to-purple-400"></div>
                              <span>高</span>
                              <span className="ml-2 text-emerald-400">■ 对角线(自相似=1.0)</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            颜色越深表示两个切片的语义相似度越高。对角线为自相似（=1.0）。可用于发现知识库中的重复或相关内容。
                          </p>
                        </div>

                        {/* 维度分布柱状图 */}
                        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                            向量维度分布 ({vectorData.emb_dim}维 → 64桶统计)
                          </h4>
                          <div className="relative w-full bg-slate-950/60 rounded-xl overflow-hidden p-3">
                            <svg viewBox="0 0 320 160" className="w-full">
                              {/* 坐标轴 */}
                              <line x1="30" y1="140" x2="310" y2="140" stroke="#475569" strokeWidth="0.5" />
                              <line x1="30" y1="20" x2="30" y2="140" stroke="#475569" strokeWidth="0.5" />
                              <text x="170" y="155" fill="#64748b" fontSize="7" textAnchor="middle">维度桶 (共64桶)</text>
                              <text x="10" y="80" fill="#64748b" fontSize="7" textAnchor="middle" transform="rotate(-90 10 80)">均值</text>
                              {/* 柱状图 */}
                              {(() => {
                                const stats = vectorData.dim_stats || [];
                                const maxAbs = Math.max(...stats.map(s => Math.max(Math.abs(s.mean), Math.abs(s.max), Math.abs(s.min)))) || 1;
                                const barWidth = 280 / 64;
                                const midY = 80;
                                return stats.map((s, i) => {
                                  const h = (Math.abs(s.mean) / maxAbs) * 55;
                                  const y = s.mean >= 0 ? midY - h : midY;
                                  const color = s.mean >= 0 ? '#38bdf8' : '#f472b6';
                                  return (
                                    <g key={`dim-${i}`}>
                                      <rect
                                        x={30 + i * barWidth}
                                        y={y}
                                        width={barWidth - 0.5}
                                        height={h}
                                        fill={color}
                                        opacity={0.8}
                                      >
                                        <title>{`维度 ${s.range[0]}-${s.range[1]}\n均值: ${s.mean.toFixed(4)}\n最大: ${s.max.toFixed(4)}\n最小: ${s.min.toFixed(4)}`}</title>
                                      </rect>
                                      {/* 最大最小范围线 */}
                                      <line
                                        x1={30 + i * barWidth + barWidth / 2}
                                        y1={midY - (Math.abs(s.max) / maxAbs) * 55}
                                        x2={30 + i * barWidth + barWidth / 2}
                                        y2={midY + (Math.abs(s.min) / maxAbs) * 55}
                                        stroke="#475569"
                                        strokeWidth="0.3"
                                        opacity="0.5"
                                      />
                                    </g>
                                  );
                                });
                              })()}
                              {/* 中线 */}
                              <line x1="30" y1="80" x2="310" y2="80" stroke="#64748b" strokeWidth="0.3" strokeDasharray="2,2" />
                            </svg>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            将 {vectorData.emb_dim} 维向量分成 64 个桶统计均值。蓝色为正值，粉色为负值。展示了向量在不同维度区间的分布特征。
                          </p>
                        </div>
                      </div>

                      {/* 单个切片向量详情 */}
                      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            单切片向量详情 (前64维预览)
                          </h4>
                          <select
                            value={selectedChunkIdx}
                            onChange={(e) => setSelectedChunkIdx(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white"
                          >
                            {(vectorData.chunks || []).map((c, i) => (
                              <option key={i} value={i}>Chunk #{c.chunk_index} - {c.source}</option>
                            ))}
                          </select>
                        </div>

                        {vectorData.chunks && vectorData.chunks[selectedChunkIdx] && (() => {
                          const chunk = vectorData.chunks[selectedChunkIdx];
                          const vec = chunk.vector_preview || [];
                          const stats = chunk.vector_stats || {};
                          return (
                            <>
                              <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2">
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                    #{chunk.chunk_index}
                                  </span>
                                  <span className="text-slate-400">来源: <span className="text-slate-300">{chunk.source || '未知'}</span></span>
                                  {chunk.heading_path && (
                                    <span className="text-slate-400">路径: <span className="text-slate-300">{chunk.heading_path}</span></span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{chunk.node_type}</span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2 font-mono">{chunk.content}</p>
                              </div>

                              {/* 向量数值可视化（前64维） */}
                              <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] text-slate-400 font-semibold">前64维数值条形图</span>
                                  <div className="flex gap-2 text-[9px]">
                                    <span className="text-sky-400">■ 正值</span>
                                    <span className="text-rose-400">■ 负值</span>
                                  </div>
                                </div>
                                <svg viewBox="0 0 640 80" className="w-full">
                                  <line x1="0" y1="40" x2="640" y2="40" stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" />
                                  {vec.map((v, i) => {
                                    const maxAbs = Math.max(...vec.map(Math.abs)) || 1;
                                    const h = (Math.abs(v) / maxAbs) * 30;
                                    const barW = 640 / 64 - 1;
                                    return (
                                      <rect
                                        key={i}
                                        x={i * (640 / 64)}
                                        y={v >= 0 ? 40 - h : 40}
                                        width={barW}
                                        height={h}
                                        fill={v >= 0 ? '#38bdf8' : '#f472b6'}
                                        opacity={0.85}
                                      >
                                        <title>{`维度[${i}]: ${v.toFixed(6)}`}</title>
                                      </rect>
                                    );
                                  })}
                                </svg>
                                <div className="flex justify-between text-[8px] text-slate-600 mt-1">
                                  <span>dim[0]</span><span>dim[16]</span><span>dim[32]</span><span>dim[48]</span><span>dim[63]</span>
                                </div>
                              </div>

                              {/* 统计信息 */}
                              <div className="grid grid-cols-5 gap-2">
                                {[
                                  { label: '最小值', value: stats.min, color: 'text-rose-400' },
                                  { label: '最大值', value: stats.max, color: 'text-emerald-400' },
                                  { label: '均值', value: stats.mean, color: 'text-sky-400' },
                                  { label: '标准差', value: stats.std, color: 'text-purple-400' },
                                  { label: 'L2范数', value: stats.norm, color: 'text-amber-400' },
                                ].map(s => (
                                  <div key={s.label} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                                    <p className="text-[9px] text-slate-500">{s.label}</p>
                                    <p className={`text-[11px] font-mono font-bold ${s.color}`}>{typeof s.value === 'number' ? s.value.toFixed(4) : '--'}</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* 切片列表 */}
                      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          切片列表 ({vectorData.showing} / {vectorData.total_chunks})
                        </h4>
                        <div className="max-h-64 overflow-y-auto space-y-1.5">
                          {(vectorData.chunks || []).map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedChunkIdx(i)}
                              className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                                selectedChunkIdx === i
                                  ? 'bg-amber-500/10 border-amber-500/40'
                                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-amber-400 flex-shrink-0">#{c.chunk_index}</span>
                                <span className="text-[10px] text-slate-400 truncate flex-1">{c.source}</span>
                                <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">L2={c.vector_stats?.norm?.toFixed(3)}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{c.content}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 text-slate-500 space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm">暂无选中的知识库，请在左侧选择或新建一个知识库</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: 新建知识库分类 Modal */}
      {showCreateKbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl space-y-5 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-sky-400" />
                新建知识库分类
              </h3>
              <button
                onClick={() => setShowCreateKbModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmptyKb} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">知识库分类名称</label>
                <input
                  type="text"
                  placeholder="例如: Java高并发与JVM专栏"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">分类说明 / 备注 (可选)</label>
                <textarea
                  placeholder="简单说明该知识库涵盖的技术范畴..."
                  rows={2}
                  value={newKbDesc}
                  onChange={(e) => setNewKbDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">初始化文档文件 (.md, .txt, .docx, .json - 可选)</label>
                <input
                  type="file"
                  multiple
                  accept=".md,.txt,.json,.docx"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-[10px] text-emerald-400 mt-1">
                    已选择 {selectedFiles.length} 个初始文件: {selectedFiles.map(f => f.name).join(', ')}
                  </p>
                )}
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateKbModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? '创建处理中...' : '确认创建知识库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: 重命名知识库 Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl space-y-5 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                重命名知识库分类
              </h3>
              <button
                onClick={() => setShowRenameModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameKb} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">知识库名称 *</label>
                <input
                  type="text"
                  required
                  value={renameKbName}
                  onChange={(e) => setRenameKbName(e.target.value)}
                  placeholder="请输入新的知识库名称..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">知识库描述说明</label>
                <textarea
                  rows={3}
                  value={renameKbDesc}
                  onChange={(e) => setRenameKbDesc(e.target.value)}
                  placeholder="简单说明该知识库涵盖的技术范畴..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? '保存中...' : '保存修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 文档内容预览 Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl space-y-4 border border-slate-700/50 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                {previewDoc.filename}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {loadingPreview ? (
                <div className="py-12 text-center text-slate-500">正在读取文档预览...</div>
              ) : (
                previewContent
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
