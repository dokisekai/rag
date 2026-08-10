import os

filepath = '/Users/xiuxiuxiu/Documents/rag/frontend/src/components/MarkdownRenderer.jsx'
with open(filepath, 'r') as f:
    content = f.read()

# Update signature
content = content.replace(
    "export default function MarkdownRenderer({ content = '', isStreaming = false, ragChunks = [], highlightPhrases = [] }) {",
    "export default function MarkdownRenderer({ content = '', isStreaming = false, ragChunks = [], webResults = [], highlightPhrases = [] }) {"
)

# Update all formatInlineText calls
content = content.replace(
    ", ragChunks, highlightPhrases)",
    ", ragChunks, webResults, highlightPhrases)"
)

# Add WebCitationBadge
web_citation_badge = """
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
"""

# Insert WebCitationBadge before extractHighlightPhrases
content = content.replace(
    "export function extractHighlightPhrases",
    web_citation_badge + "\nexport function extractHighlightPhrases"
)

# Update formatInlineText signature
content = content.replace(
    "function formatInlineText(text, ragChunks = [], highlightPhrases = []) {",
    "function formatInlineText(text, ragChunks = [], webResults = [], highlightPhrases = []) {"
)

# Update formatInlineText logic
old_logic = """    } else if (token.startsWith('[') && token.endsWith(']')) {
      const numMatches = token.match(/\d+/g);
      if (numMatches && numMatches.length > 0) {
        const nums = numMatches.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          parts.push(
            <CitationBadge key={`cite-${match.index}`} numbers={nums} chunks={ragChunks} />
          );
        } else {
          parts.push(token);
        }
      } else {
        parts.push(token);
      }"""

new_logic = """    } else if (token.startsWith('[') && token.endsWith(']')) {
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
      }"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w') as f:
    f.write(content)

# Update MessageBubble.jsx
bubble_filepath = '/Users/xiuxiuxiu/Documents/rag/frontend/src/components/voice/MessageBubble.jsx'
with open(bubble_filepath, 'r') as f:
    bubble = f.read()

bubble_old = """              <MarkdownRenderer
                content={msg.content}
                ragChunks={currentRagChunks}
                highlightPhrases={isLast ? highlightPhrases : []}
              />"""

bubble_new = """              <MarkdownRenderer
                content={msg.content}
                ragChunks={msg.rag_chunks || (isLast ? currentRagChunks : [])}
                webResults={msg.web_results || (isLast ? currentWebResults : [])}
                highlightPhrases={isLast ? highlightPhrases : []}
              />"""

bubble = bubble.replace(bubble_old, bubble_new)

with open(bubble_filepath, 'w') as f:
    f.write(bubble)

print("Updates applied successfully.")
