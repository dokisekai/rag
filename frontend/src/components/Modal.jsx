import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal component with glassmorphism styling.
 * Props:
 *   - isOpen: boolean – controls visibility
 *   - onClose: function – called when overlay or close button is clicked
 *   - title: string (optional) – header title
 *   - children: React nodes – modal body content
 */
export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md" onClick={onClose}>
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl relative border border-slate-700/60 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="text-slate-200">{children}</div>
      </div>
    </div>
  );
}
