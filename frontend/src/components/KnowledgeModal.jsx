import React, { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, RefreshCw, CheckCircle2, AlertCircle, Database, FileText, Sparkles, X, Loader2 } from "lucide-react";
import Modal from "./Modal";

export default function KnowledgeModal({ isOpen, onClose, onKbChange }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [files, setFiles] = useState([]);
  const [kbName, setKbName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kbList, setKbList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedKb, setSelectedKb] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchKbList = useCallback(async () => {
    setLoadingList(true);
    try {
      const resp = await fetch("/api/knowledge/list?page=1&size=50");
      const data = await resp.json();
      setKbList(data.items || []);
    } catch (e) {
      console.error("Failed to fetch KB list:", e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchKbList();
    }
  }, [isOpen, fetchKbList]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(md|txt|pdf)$/i.test(f.name)
    );
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      if (!kbName && droppedFiles[0]) {
        setKbName(droppedFiles[0].name.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(selected);
      if (!kbName && selected[0]) {
        setKbName(selected[0].name.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("请选择要上传的文件");
      return;
    }
    if (!kbName.trim()) {
      alert("请输入知识库名称");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("kb_name", kbName.trim());
    files.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 200);
      const resp = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!resp.ok) throw new Error("上传失败");
      await new Promise((r) => setTimeout(r, 300));
      alert("知识库上传并索引完成！");
      setFiles([]);
      setKbName("");
      setActiveTab("manage");
      fetchKbList();
      onKbChange && onKbChange();
    } catch (err) {
      console.error(err);
      alert(err.message || "上传出错");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (kbId, kbName) => {
    if (!confirm(`确定要删除知识库 "${kbName}" 吗？此操作不可恢复。`)) {
      return;
    }
    try {
      const resp = await fetch(`/api/knowledge/${kbId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("删除失败");
      setKbList((prev) => prev.filter((kb) => kb.id !== kbId));
      if (selectedKb === kbId) setSelectedKb(null);
      onKbChange && onKbChange();
    } catch (e) {
      alert(e.message || "删除失败");
    }
  };

  const handleReindex = async (kbId) => {
    try {
      const formData = new FormData();
      formData.append("kb_id", kbId);
      const resp = await fetch("/api/knowledge/reindex", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("重建索引失败");
      alert("索引重建完成！");
      fetchKbList();
    } catch (e) {
      alert(e.message || "重建索引失败");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="知识库管理中心">
      <div className="w-full max-w-2xl">
        <div className="flex gap-2 mb-5 p-1 bg-slate-900/60 rounded-xl">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "upload"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Upload className="w-4 h-4" />
            上传知识库
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "manage"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Database className="w-4 h-4" />
            管理知识库
            {kbList.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                {kbList.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "upload" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                知识库名称
              </label>
              <input
                type="text"
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="例如：我的项目架构文档"
                disabled={uploading}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
              }`}
            >
              <input
                type="file"
                multiple
                accept=".md,.pdf,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    支持 .md / .txt / .pdf 格式，多文件可同时上传
                  </p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  已选择 {files.length} 个文件
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      {!uploading && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>正在向量化与建立索引...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                uploading || files.length === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传与索引中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始上传并建立 RAG 向量索引
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="space-y-3">
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : kbList.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-slate-800/50 inline-block mb-4">
                  <Database className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 mb-2">暂无自定义知识库</p>
                <p className="text-xs text-slate-500">
                  切换到「上传知识库」标签页，上传你的专属技术文档
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {kbList.map((kb) => (
                  <div
                    key={kb.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedKb === kb.id
                        ? "bg-indigo-500/10 border-indigo-500/50"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                    onClick={() => setSelectedKb(kb.id === selectedKb ? null : kb.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                          <Database className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {kb.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {kb.chunk_count} 个切片
                            </span>
                            {kb.file_size_kb > 0 && (
                              <span>{kb.file_size_kb} KB</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {kb.indexed ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            RAG 索引就绪
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            未索引
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedKb === kb.id && (
                      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReindex(kb.id);
                          }}
                          disabled={!kb.indexed}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          重新索引
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(kb.id, kb.name);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除知识库
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
