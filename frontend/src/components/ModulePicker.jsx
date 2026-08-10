import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

export default function ModulePicker({
  modules,
  selectedModule,
  onSelect,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {modules.map((item, index) => {
          const isSelected = selectedModule?.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`card-enter glass-card p-2 rounded-xl cursor-pointer relative flex flex-col justify-between group transition-all hover-lift ${
                isSelected
                  ? 'ring-2 ring-indigo-500 bg-slate-800/90 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/40 hover:bg-slate-800/50 border border-slate-800/80'
              }`}
              style={{ animationDelay: `${0.04 * index}s` }}
            >
              <div>
                <div className="flex items-start justify-between mb-1">
                  <div className={`p-1 rounded-lg transition-colors ${
                    isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/50 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400'
                  }`}>
                    <FileText className="w-3 h-3" />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-3 h-3 text-indigo-400 animate-scale-in" />
                  )}
                </div>
                <h3 className="font-semibold text-white text-[11px] line-clamp-1 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {item.summary || '暂无描述'}
                </p>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-800/50 flex items-center justify-between text-[8px] text-slate-600">
                <span className="truncate font-mono">{item.filename}</span>
                <span className="font-mono bg-slate-900/50 px-1 py-0.5 rounded flex-shrink-0 ml-1">
                  {item.size_kb}KB
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
