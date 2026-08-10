import React from 'react';

/**
 * 结构化 Markdown 实时流式渲染组件
 * 支持流式 Token 边传输边实时渲染 Markdown 表格、标题、粗体、代码块与列表
 * 支持内容引用角标 [1] [1,3] 渲染为可悬停查看的引用徽章
 * 支持点击 RAG 切片后高亮正文中对应的引用内容（基于关键术语匹配，不依赖 LLM 输出角标）
 */
export default function MarkdownRenderer({ content = '', isStreaming = false, ragChunks = [], webResults = [], highlightPhrases = [] }) {
  if (!content) return null;

  // 将文本按多行块分割
  const lines = content.split('\n');
  const elements = [];

  let inTable = false;
  let tableHeader = [];
  let tableRows = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';

  const flushTable = (key) => {
    if (!inTable) return;
    elements.push(
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700/80 glass-panel shadow-lg transition-all">
        <table className="w-full text-xs text-left border-collapse">
          {tableHeader.length > 0 && (
            <thead className="bg-slate-800/90 text-sky-300 border-b border-slate-700">
              <tr>
                {tableHeader.map((th, i) => (
                  <th key={i} className="px-3 py-2 font-bold whitespace-nowrap border-r last:border-r-0 border-slate-700/50">
                    {formatInlineText(th, ragChunks, webResults, highlightPhrases)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-800">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-900/40 hover:bg-slate-800/50' : 'bg-slate-950/40 hover:bg-slate-800/50'}>
                {row.map((td, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 text-slate-200 border-r last:border-r-0 border-slate-800/50 leading-relaxed">
                    {formatInlineText(td, ragChunks, webResults, highlightPhrases)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  const flushCode = (key) => {
    if (!inCodeBlock) return;
    const codeText = codeBuffer.join('\n');
    elements.push(
      <div key={`code-${key}`} className="my-3 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl transition-all">
        {codeLang && (
          <div className="px-3.5 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>{codeLang}</span>
            <span className="text-slate-500 font-bold">CODE</span>
          </div>
        )}
        <pre className="p-3 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed scrollbar-thin">
          <code>{codeText}</code>
        </pre>
      </div>
    );
    inCodeBlock = false;
    codeBuffer = [];
    codeLang = '';
  };

  // 预处理：合并被换行打断的孤立序号 (如 "1." 与下一行的 "核心指标监控")
  const processedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    if (/^\d+\.$/.test(cur) && i + 1 < lines.length && lines[i + 1].trim()) {
      processedLines.push(`${cur} ${lines[i + 1].trim()}`);
      i++;
    } else {
      processedLines.push(lines[i]);
    }
  }

  processedLines.forEach((line, idx) => {
    const trimmed = line.trim();

    // 忽略孤立的空列表/引用标记 (如单独的 "-" 或 "* ")
    if (trimmed === '-' || trimmed === '*' || (trimmed.startsWith('- ') && !trimmed.slice(2).trim()) || (trimmed.startsWith('* ') && !trimmed.slice(2).trim())) {
      return;
    }

    // 1. 代码块处理 ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode(idx);
      } else {
        if (inTable) flushTable(idx);
        inCodeBlock = true;
        codeLang = trimmed.replace('```', '').trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // 2. 表格行处理 (支持流式传输中未以 | 结尾的未完成行)
    if (trimmed.startsWith('|')) {
      if (inTable) flushCode(idx);
      // 忽略纯分隔行 |---|---|
      if (trimmed.includes('---') && !trimmed.match(/[a-zA-Z0-9\u4e00-\u9fff]/)) return;

      const rawCells = trimmed.split('|');
      const cells = (rawCells[0] === '' ? rawCells.slice(1) : rawCells)
        .map(c => c.trim())
        .filter((c, i, arr) => i < arr.length - 1 || c !== '');

      if (cells.length > 0) {
        if (!inTable) {
          inTable = true;
          tableHeader = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      }
    } else if (inTable) {
      flushTable(idx);
    }

    // 3. 标题处理 ### / ####
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-white mt-3 mb-1 flex items-center gap-1.5 border-l-2 border-purple-500 pl-2">
          {formatInlineText(trimmed.replace('#### ', ''), ragChunks, webResults, highlightPhrases)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-sky-400 mt-3.5 mb-1.5 flex items-center gap-2 border-b border-slate-800 pb-1">
          {formatInlineText(trimmed.replace('### ', ''), ragChunks, webResults, highlightPhrases)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-base font-bold text-white mt-4 mb-2 border-b border-sky-500/30 pb-1">
          {formatInlineText(trimmed.replace('## ', ''), ragChunks, webResults, highlightPhrases)}
        </h2>
      );
      return;
    }

    // 4. 引用块 >
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} className="my-2 p-2.5 rounded-r-xl border-l-4 border-sky-500 bg-sky-950/40 text-xs text-sky-200 leading-relaxed shadow-inner">
          {formatInlineText(trimmed.replace('> ', ''), ragChunks, webResults, highlightPhrases)}
        </blockquote>
      );
      return;
    }

    // 5. 列表项 - 或 1.
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 pl-1 text-xs leading-relaxed text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
          <span>{formatInlineText(trimmed.slice(2), ragChunks, webResults, highlightPhrases)}</span>
        </div>
      );
      return;
    }

    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numListMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 pl-1 text-xs leading-relaxed text-slate-200">
          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-[10px] font-bold flex-shrink-0">
            {numListMatch[1]}
          </span>
          <span>{formatInlineText(numListMatch[2], ragChunks, webResults, highlightPhrases)}</span>
        </div>
      );
      return;
    }

    // 6. 普通段落
    if (trimmed === '') {
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    elements.push(
      <p key={idx} className="text-xs leading-relaxed text-slate-200 my-1 font-sans">
        {formatInlineText(line, ragChunks, webResults, highlightPhrases)}
      </p>
    );
  });

  // 流式刷新尚未闭合的表格或代码块，确保边输出边渲染！
  if (inTable) flushTable('streaming-table');
  if (inCodeBlock) flushCode('streaming-code');

  return <div className="space-y-1">{elements}</div>;
}

/**
 * 引用角标徽章：悬停/点击展示对应 RAG 切片来源与内容预览
 * 编号 N 对应 ragChunks[N-1]
 */
function CitationBadge({ numbers, chunks }) {
  const [open, setOpen] = React.useState(false);
  const valid = numbers.filter(n => n >= 1 && n <= (chunks?.length || 0));
  const display = numbers.join(',');
  return (
    <span
      className="relative inline-flex align-baseline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="mx-0.5 px-1 min-w-[16px] h-[16px] inline-flex items-center justify-center text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40 hover:text-emerald-200 hover:border-emerald-400 cursor-pointer transition-all align-super leading-none"
        title={valid.length ? `引用参考资料 ${display}` : `引用 ${display}（无对应切片）`}
      >
        {display}
      </button>
      {open && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-72 max-w-[80vw] p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-left">
          <div className="text-[9px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1 border-b border-emerald-500/20 pb-1">
            📖 内容引用出处
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {numbers.map(n => {
              const chunk = chunks?.[n - 1];
              const hasChunk = !!chunk;
              return (
                <div key={n} className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-bold text-emerald-400 mb-0.5 flex items-center gap-1">
                    <span className="px-1 rounded bg-emerald-500/20 border border-emerald-500/40">[{n}]</span>
                    {hasChunk ? (
                      <span className="text-slate-300 truncate">{chunk.source || '参考文档'}</span>
                    ) : (
                      <span className="text-slate-500 italic">无对应切片</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4">
                    {hasChunk ? chunk.content : '该编号暂无对应的 RAG 切片数据。'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * 从 RAG 切片内容中抽取用于高亮匹配的关键术语短语
 * - 英文/数字标识符：长度 >=3 (如 corePoolSize, ArrayBlockingQueue, JDK 21)
 * - 中文短语：连续中文长度 >=4 (如 核心线程、拒绝策略、线程池)
 * 返回去重后按长度降序的数组（长的优先匹配）
 */

function WebCitationBadge({ numbers, results }) {
  const [open, setOpen] = React.useState(false);
  const valid = numbers.filter(n => n >= 1 && n <= (results?.length || 0));
  const display = numbers.join(',');
  return (
    <span
      className="relative inline-flex align-baseline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="mx-0.5 px-1 min-w-[16px] h-[16px] inline-flex items-center justify-center text-[9px] font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/40 hover:text-sky-200 hover:border-sky-400 cursor-pointer transition-all align-super leading-none"
        title={valid.length ? `网页引用 ${display}` : `网页引用 ${display}（无对应结果）`}
      >
        网页 {display}
      </button>
      {open && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-72 max-w-[80vw] p-2.5 rounded-xl bg-slate-900 border border-sky-500/40 shadow-2xl shadow-sky-500/10 text-left">
          <div className="text-[9px] font-bold text-sky-400 mb-1.5 flex items-center gap-1 border-b border-sky-500/20 pb-1">
            🌐 网页引用出处
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {numbers.map(n => {
              const res = results?.[n - 1];
              const hasRes = !!res;
              return (
                <div key={n} className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-bold text-sky-400 mb-0.5 flex items-center gap-1">
                    <span className="px-1 rounded bg-sky-500/20 border border-sky-500/40">[{n}]</span>
                    {hasRes ? (
                      <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 truncate hover:text-sky-400 hover:underline">{res.title || res.url}</a>
                    ) : (
                      <span className="text-slate-500 italic">无对应结果</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4">
                    {hasRes ? (res.snippet || res.content) : '该编号暂无对应的网页数据。'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

export function extractHighlightPhrases(chunkContent) {
  if (!chunkContent) return [];
  const phrases = new Set();
  // 英文/数字/下划线标识符
  const enMatches = chunkContent.match(/[A-Za-z][A-Za-z0-9_]{2,}/g) || [];
  for (const m of enMatches) phrases.add(m);
  // 中文连续片段
  const zhMatches = chunkContent.match(/[\u4e00-\u9fff]{4,}/g) || [];
  for (const m of zhMatches) phrases.add(m);
  // 过滤常见无意义词
  const stop = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were']);
  const list = [...phrases].filter(p => !stop.has(p.toLowerCase()));
  list.sort((a, b) => b.length - a.length);
  return list.slice(0, 30);
}

/**
 * 格式化行内元素 (加粗 **bold**、行内代码 `code`、引用角标 [1] [1,3]、引用高亮短语)
 */
function formatInlineText(text, ragChunks = [], webResults = [], highlightPhrases = []) {
  if (!text) return '';
  const parts = [];

  // 构建合并正则：粗体 / 行内代码 / 引用角标 (支持 [1] [1,3] [参考资料 1] [网页 1] [资料 1]) / 高亮短语
  const alternatives = [
    '\\*\\*[^*]+\\*\\*',                                       // **bold**
    '`[^`]+`',                                                  // `code`
    '\\[(?:参考资料|网页|资料)?\\s*\\d+(?:\\s*,\\s*\\d+)*\\]'  // [1] [1,3] [参考资料 1] [网页 1]
  ];
  if (highlightPhrases && highlightPhrases.length > 0) {
    const escaped = highlightPhrases
      .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    if (escaped) alternatives.push(`(${escaped})`);
  }
  const regex = new RegExp(alternatives.join('|'), 'g');

  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-sky-300">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`c-${match.index}`} className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono text-[11px] border border-slate-700">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const numMatches = token.match(/\d+/g);
      const isWeb = token.includes('网页') || token.includes('资料') || token.includes('参考资料');
      if (numMatches && numMatches.length > 0) {
        const nums = numMatches.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          if (isWeb) {
            parts.push(
              <WebCitationBadge key={`cite-${match.index}`} numbers={nums} results={webResults} />
            );
          } else {
            parts.push(
              <CitationBadge key={`cite-${match.index}`} numbers={nums} chunks={ragChunks} />
            );
          }
        } else {
          parts.push(token);
        }
      } else {
        parts.push(token);
      }
    } else {
      // 高亮短语命中
      parts.push(
        <mark key={`h-${keyCounter++}-${match.index}`} className="bg-amber-400/30 text-amber-200 rounded px-0.5 ring-1 ring-amber-400/40 animate-in fade-in">
          {token}
        </mark>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
