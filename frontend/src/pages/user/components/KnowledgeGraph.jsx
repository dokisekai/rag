import { useState, useEffect, useMemo } from 'react';
import { Network, Database } from 'lucide-react';

export default function KnowledgeGraph({ modules, customKBs, onNodeClick }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [focusNode, setFocusNode] = useState(null);
  const [detailNode, setDetailNode] = useState(null);
  const [kbDocs, setKbDocs] = useState({});

  // 拉取每个 KB 的文档列表
  useEffect(() => {
    const kbs = customKBs || [];
    if (kbs.length === 0) return;
    let cancelled = false;
    Promise.all(
      kbs.map(kb =>
        fetch(`/api/knowledge/${kb.id}/documents`)
          .then(r => r.json())
          .then(data => ({ kbId: kb.id, docs: data.documents || [] }))
          .catch(() => ({ kbId: kb.id, docs: [] }))
      )
    ).then(results => {
      if (cancelled) return;
      const map = {};
      results.forEach(r => { map[r.kbId] = r.docs; });
      setKbDocs(map);
    });
    return () => { cancelled = true; };
  }, [customKBs]);

  // 关闭详情��板
  useEffect(() => {
    if (!focusNode) setDetailNode(null);
  }, [focusNode]);

  // 根据 focusNode 计算当前星系
  const galaxy = useMemo(() => {
    const center = { cx: 200, cy: 210 };
    const orbitRadius = 140;

    if (!focusNode) {
      const kbList = (customKBs || []).slice(0, 5).map(kb => ({
        id: `kb-${kb.id}`,
        rawId: String(kb.id),
        label: (kb.name || 'KB').substring(0, 6),
        subtitle: (kb.doc_count || 0) > 0 ? `${kb.doc_count} 文档` : '空知识库',
        type: 'kb',
        size: 16,
        color: '#34d399', glow: '#10b981',
        docCount: kb.doc_count || 0,
        chunkCount: kb.chunk_count || 0,
        data: kb,
      }));

      const modList = (modules || []).slice(0, Math.max(0, 7 - kbList.length)).map(mod => ({
        id: `mod-${mod.id}`,
        rawId: String(mod.id),
        label: (mod.title || mod.filename || '').substring(0, 6),
        subtitle: mod.size_kb ? `${mod.size_kb}KB` : '',
        type: 'module',
        size: 12,
        color: '#a78bfa', glow: '#8b5cf6',
        data: mod,
      }));

      const allOrbits = [...kbList, ...modList].slice(0, 7);
      const count = allOrbits.length;

      const placed = allOrbits.map((node, i) => {
        const angle = count <= 1 ? -Math.PI / 2 : (i / count) * 2 * Math.PI - Math.PI / 2;
        return { ...node, x: center.cx + orbitRadius * Math.cos(angle), y: center.cy + orbitRadius * Math.sin(angle) };
      });

      const totalDocs = kbList.reduce((s, n) => s + (n.docCount || 0), 0);

      return {
        center: {
          id: 'center-root',
          label: 'VoiceRAG',
          subtitle: totalDocs > 0 ? `${totalDocs} 文档` : 'RAG AI',
          type: 'root',
          size: 30,
          color: '#818cf8', glow: '#6366f1',
          x: center.cx, y: center.cy,
        },
        orbiter: placed,
        hasOrbiters: placed.length > 0,
        prevCenter: null,
      };
    }

    if (focusNode.type === 'kb') {
      const docs = kbDocs[focusNode.rawId] || [];
      const placed = docs.slice(0, 8).map((doc, i) => {
        const angle = (i / Math.max(docs.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const r = orbitRadius - 10 + (i % 3) * 12;
        return {
          id: `doc-${doc.id || i}`,
          label: (doc.filename || doc.name || '').substring(0, 10),
          fullName: doc.filename || doc.name || '',
          type: 'doc',
          size: 8,
          color: '#fbbf24', glow: '#f59e0b',
          x: center.cx + r * Math.cos(angle),
          y: center.cy + r * Math.sin(angle),
          data: doc,
          orbitR: r,
        };
      });

      return {
        center: {
          id: `kb-${focusNode.rawId}`,
          label: focusNode.data.name ? focusNode.data.name.substring(0, 8) : 'KB',
          subtitle: `${focusNode.data.doc_count || docs.length} 文档 · ${focusNode.data.chunk_count || 0} 分块`,
          type: 'kb',
          size: 30,
          color: '#34d399', glow: '#10b981',
          x: center.cx, y: center.cy,
        },
        orbiter: placed,
        hasOrbiters: placed.length > 0,
        prevCenter: { type: 'root' },
      };
    }

    if (focusNode.type === 'module') {
      return {
        center: {
          id: `mod-${focusNode.rawId}`,
          label: (focusNode.data.title || focusNode.data.filename || '').substring(0, 8),
          subtitle: focusNode.data.size_kb ? `${focusNode.data.size_kb}KB` : '本地模块',
          type: 'module',
          size: 28,
          color: '#a78bfa', glow: '#8b5cf6',
          x: center.cx, y: center.cy,
        },
        orbiter: [],
        hasOrbiters: false,
        prevCenter: { type: 'root' },
      };
    }

    return null;
  }, [focusNode, customKBs, modules, kbDocs]);

  const [orbitAngle, setOrbitAngle] = useState(0);
  useEffect(() => {
    let frame;
    const animate = () => {
      setOrbitAngle(prev => (prev + 0.3) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const orbitalDots = [0, 45, 90, 135, 180, 225, 270, 315];

  // 空状态
  if (!galaxy || (!galaxy.hasOrbiters && !focusNode)) {
    return (
      <div className="glass-panel rounded-2xl p-5 card-enter card-enter-delay-2 overflow-hidden relative" style={{ height: 400 }}>
        <div className="flex items-center gap-2 mb-1 relative z-10">
          <div className="p-1.5 rounded-lg bg-indigo-500/10">
            <Network className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-white">知识宇宙</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-[calc(100%-28px)] text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <Database className="w-9 h-9 text-slate-600" />
          </div>
          <p className="text-base text-slate-400 font-medium mb-1">尚未创建知识库</p>
          <p className="text-xs text-slate-600 max-w-[260px]">上传文档或添加模块后，知识节点将自动在此呈现</p>
        </div>
      </div>
    );
  }

  const center = galaxy.center;
  const orbiters = galaxy.orbiter;

  return (
    <div className="glass-panel rounded-2xl p-5 card-enter card-enter-delay-2 overflow-hidden relative" style={{ height: 400 }}>
      {/* 扫描线 */}
      <div className="scan-line" style={{ animationDelay: '0s' }} />
      <div className="scan-line" style={{ animationDelay: '2s', opacity: 0.4 }} />
      {/* 光点拖尾 */}
      <div className="light-trail" style={{ top: '35%' }} />
      <div className="light-trail" style={{ top: '65%', animationDelay: '1.5s', animationDuration: '4.5s' }} />
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-1 relative z-10">
        <div className="p-1.5 rounded-lg bg-indigo-500/10">
          <Network className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-white">
          {focusNode ? center.label : '知识宇宙'}
        </h3>
        {focusNode && galaxy.prevCenter && (
          <button
            onClick={(e) => { e.stopPropagation(); setFocusNode(null); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-full transition-colors ml-1"
          >
            ← 返回全览
          </button>
        )}
        <span className="text-xs text-slate-600 ml-auto">{orbiters.length} 节点</span>
      </div>

      <svg viewBox="0 0 400 440" className="w-full h-[calc(100%-28px)]" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={center.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={center.color} stopOpacity="0" />
          </radialGradient>
          {orbiters.map((node, i) => (
            <linearGradient key={`lg-${i}`} id={`lineGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={node.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={center.color} stopOpacity="0.2" />
            </linearGradient>
          ))}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 中心光晕 */}
        <circle cx={center.x} cy={center.y} r="80" fill="url(#centerGlow)">
          <animate attributeName="r" values="70;80;70" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* 轨道环 */}
        <circle cx={center.x} cy={center.y} r="110" fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="1" />
        <circle cx={center.x} cy={center.y} r="155" fill="none" stroke="rgba(99,102,241,0.04)" strokeWidth="1" strokeDasharray="4 8" />

        {/* 中心 → 环绕节点的连线 */}
        {orbiters.map((node, i) => (
          <g key={`conn-${i}`}>
            <line x1={center.x} y1={center.y} x2={node.x} y2={node.y}
              stroke={`url(#lineGrad-${i})`} strokeWidth="1" strokeDasharray="3 6" opacity="0.5">
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2s" repeatCount="indefinite" />
            </line>
            <circle r="2.5" fill={node.color} opacity="0.8" filter="url(#glow)">
              <animateMotion dur={`${2 + i * 0.4}s`} repeatCount="indefinite"
                path={`M${center.x},${center.y} L${node.x},${node.y}`} />
            </circle>
          </g>
        ))}

        {/* 轨道旋转光点 */}
        {orbitalDots.map((angle, i) => {
          const rad = ((angle + orbitAngle * 0.5) * Math.PI) / 180;
          return <circle key={`od-${i}`} cx={center.x + 110 * Math.cos(rad)} cy={center.y + 110 * Math.sin(rad)}
            r="1.5" fill={center.color} opacity="0.5" />;
        })}
        {orbitalDots.map((angle, i) => {
          const rad = ((-angle - orbitAngle * 0.3) * Math.PI) / 180;
          return <circle key={`od2-${i}`} cx={center.x + 160 * Math.cos(rad)} cy={center.y + 160 * Math.sin(rad)}
            r="1" fill={center.color} opacity="0.25" />;
        })}

        {/* 环绕节点 */}
        {orbiters.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          const radius = isHovered ? node.size + 3 : node.size;
          const mainOpacity = isHovered ? 1 : 0.85;
          const glowOpacity = isHovered ? 0.35 : 0.15;

          return (
            <g key={node.id} filter="url(#glow)" style={{ cursor: 'pointer' }}
              onClick={() => {
                if (node.type === 'kb' || node.type === 'module') {
                  setFocusNode({ type: node.type, rawId: node.rawId, data: node.data });
                } else if (node.type === 'doc') {
                  setDetailNode({ node, center: galaxy.center });
                }
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {isHovered && (
                <circle cx={node.x} cy={node.y} r={radius + 8} fill="none"
                  stroke={node.color} strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="r" values={`${radius + 8};${radius + 12};${radius + 8}`} dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={node.x} cy={node.y} r={node.size + 5} fill={node.color} opacity={glowOpacity}>
                <animate attributeName="r" values={`${node.size + 5};${node.size + 8};${node.size + 5}`} dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values={`${glowOpacity};${glowOpacity + 0.1};${glowOpacity}`} dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={node.x} cy={node.y} r={radius} fill={node.color} opacity={mainOpacity} />
              {node.type === 'kb' && node.docCount > 0 && (
                <text x={node.x} y={node.y + 4.5} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11" fontFamily="system-ui" fontWeight="700">
                  {node.docCount}
                </text>
              )}
              <text x={node.x} y={node.y + radius + 14} textAnchor="middle"
                fill={isHovered ? '#f1f5f9' : '#cbd5e1'} fontSize="11" fontFamily="system-ui" fontWeight={600}>
                {node.label}
              </text>
              {node.subtitle && (
                <text x={node.x} y={node.y + radius + 26} textAnchor="middle"
                  fill={node.color} fontSize="9" fontFamily="system-ui" opacity={0.7}>
                  {node.subtitle}
                </text>
              )}
            </g>
          );
        })}

        {/* 中心节点 */}
        <g filter="url(#glow)"
          style={{ cursor: focusNode ? 'default' : 'pointer' }}
          onClick={() => { if (focusNode) setFocusNode(null); }}
          onMouseEnter={() => setHoveredNode('center')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle cx={center.x} cy={center.y} r={center.size + 12} fill={center.color}
            opacity={hoveredNode === 'center' || !focusNode ? 0.25 : 0.15}>
            <animate attributeName="r" values={`${center.size + 12};${center.size + 18};${center.size + 12}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values={`${hoveredNode === 'center' ? 0.35 : 0.2};${hoveredNode === 'center' ? 0.5 : 0.35};${hoveredNode === 'center' ? 0.35 : 0.2}`} dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={center.x} cy={center.y} r={center.size} fill="url(#centerGlow)" stroke={center.color} strokeWidth="2" />
          <text x={center.x} y={center.y - 5} textAnchor="middle" fill="#e0e7ff" fontSize="16" fontFamily="system-ui" fontWeight="700">
            {center.label}
          </text>
          {center.subtitle && (
            <text x={center.x} y={center.y + 15} textAnchor="middle" fill={center.glow} fontSize="11" fontFamily="system-ui" fontWeight="600">
              {center.subtitle}
            </text>
          )}
        </g>

        {/* 文档详情弹窗 */}
        {detailNode && (
          <g>
            <rect x={detailNode.node.x + 15} y={detailNode.node.y - 40}
              width="140" height="80" rx="6"
              fill="rgba(15,23,42,0.95)" stroke={detailNode.node.color} strokeWidth="1" />
            <text x={detailNode.node.x + 148} y={detailNode.node.y - 28}
              textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui"
              style={{ cursor: 'pointer' }} onClick={() => setDetailNode(null)}>✕</text>
            <text x={detailNode.node.x + 24} y={detailNode.node.y - 22}
              fill="#f1f5f9" fontSize="10" fontFamily="system-ui" fontWeight="600">
              {detailNode.node.fullName.substring(0, 14)}
            </text>
            <text x={detailNode.node.x + 24} y={detailNode.node.y - 6}
              fill="#94a3b8" fontSize="9" fontFamily="system-ui">
              来源: {detailNode.center.label}
            </text>
            <text x={detailNode.node.x + 24} y={detailNode.node.y + 10}
              fill="#94a3b8" fontSize="9" fontFamily="system-ui">
              {detailNode.node.data.size ? `${Math.round(detailNode.node.data.size / 1024)}KB` : ''}
              {detailNode.node.data.chunk_count ? ` · ${detailNode.node.data.chunk_count} 分块` : ''}
            </text>
            <text x={detailNode.node.x + 24} y={detailNode.node.y + 26}
              fill={detailNode.node.color} fontSize="9" fontFamily="system-ui" style={{ cursor: 'pointer' }}
              onClick={() => {
                setDetailNode(null);
                if (detailNode.center.type === 'kb' && focusNode?.type !== 'kb') {
                  const kb = (customKBs || []).find(k => k.name === detailNode.center.label);
                  if (kb) setFocusNode({ type: 'kb', rawId: String(kb.id), data: kb });
                }
              }}
            >点击跳转至知识库 →</text>
          </g>
        )}
      </svg>
    </div>
  );
}
