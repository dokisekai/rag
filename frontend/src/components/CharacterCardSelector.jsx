import React, { useState } from 'react';
import { Check, Volume2, Sparkles, Info, ChevronRight } from 'lucide-react';
import { getCharacterList, getCharacter } from '../data/characters';
import SvgAvatar from './avatars/SvgAvatar';
import WarashiAvatar from './avatars/WarashiAvatar';
import DHLiveAvatar from './avatars/DHLiveAvatar';

export default function CharacterCardSelector({ selectedId, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);
  const characters = getCharacterList();

  const renderAvatarPreview = (char, size = 'normal') => {
    const avatarProps = {
      aiState: 'idle',
      muted: false,
      bars: [0.3, 0.5, 0.4, 0.6, 0.3],
      getStateColor: () => '#818cf8',
    };

    switch (char.id) {
      case 'warashi':
        return <WarashiAvatar {...avatarProps} />;
      case 'dh_live':
        return <DHLiveAvatar {...avatarProps} />;
      case 'svg':
      default:
        return <SvgAvatar {...avatarProps} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {characters.map((char) => {
          const isSelected = selectedId === char.id;
          const isHovered = hoveredId === char.id;
          const Icon = char.icon;

          return (
            <div
              key={char.id}
              onMouseEnter={() => setHoveredId(char.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect && onSelect(char.id)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${
                isSelected
                  ? `ring-2 ring-offset-2 ring-offset-slate-900 ${char.borderColor.replace('border-', 'ring-')} scale-[1.02]`
                  : 'hover:scale-[1.02]'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${char.bgColor} opacity-60`} />
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${char.color} opacity-10`} />
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <div className={`p-1.5 rounded-full bg-gradient-to-br ${char.color} text-white shadow-lg`}>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div className="relative p-5 space-y-4">
                <div className="flex justify-center">
                  <div className="transform group-hover:scale-110 transition-transform duration-300">
                    {renderAvatarPreview(char)}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className={`text-lg font-bold bg-gradient-to-r ${char.color} bg-clip-text text-transparent`}>
                      {char.name}
                    </h3>
                    {isSelected && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${char.color} text-white font-bold`}>
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{char.title}</p>
                </div>

                <div className="flex items-center justify-center gap-1">
                  {char.tags.map((tag, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${char.textColor} bg-white/5 border border-white/10`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">性格</span>
                    <span className="text-slate-300">{char.personality}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      声优
                    </span>
                    <span className="text-slate-300">{char.voiceName}</span>
                  </div>
                </div>

                <div className={`pt-2 text-center transition-all duration-300 ${
                  isHovered || isSelected ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0'
                } overflow-hidden`}>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {char.description}
                  </p>
                </div>
              </div>

              <div className={`h-1 bg-gradient-to-r ${char.color} transition-all duration-300 ${
                isSelected ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </div>
          );
        })}
      </div>

      {selectedId && (
        <div className={`glass-panel rounded-2xl p-5 border border-slate-700/50 bg-gradient-to-br ${getCharacter(selectedId).bgColor}`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {(() => {
                const char = getCharacter(selectedId);
                const avatarProps = {
                  aiState: 'thinking',
                  muted: false,
                  bars: [0.4, 0.6, 0.8, 0.5, 0.3],
                  getStateColor: () => '#a78bfa',
                  size: 80,
                };
                switch (char.id) {
                  case 'warashi':
                    return <WarashiAvatar {...avatarProps} />;
                  case 'dh_live':
                    return <DHLiveAvatar {...avatarProps} />;
                  default:
                    return <SvgAvatar {...avatarProps} />;
                }
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`text-base font-bold bg-gradient-to-r ${getCharacter(selectedId).color} bg-clip-text text-transparent`}>
                  {getCharacter(selectedId).name}
                </h4>
                <span className="text-[11px] text-slate-500">{getCharacter(selectedId).title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {getCharacter(selectedId).background}
              </p>
              <div className="flex flex-wrap gap-2">
                {getCharacter(selectedId).features.map((feat, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-800/50 text-slate-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
