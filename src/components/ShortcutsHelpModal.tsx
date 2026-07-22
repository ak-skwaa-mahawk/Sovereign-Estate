import React, { useState, useEffect } from 'react';
import { Keyboard, X, Command, Wrench, Lock, Unlock, Eye, HelpCircle, Search } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Diagnostics & Repair' | 'System';
  icon: React.ReactNode;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search on modal close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    {
      keys: ['Ctrl', 'T'],
      description: 'Switch between Sovereign Council Dashboard and FPT-Ω Vessel Bridge views',
      category: 'Navigation',
      icon: <Eye className="w-3.5 h-3.5 text-amber-400" />
    },
    {
      keys: ['Shift', 'R'],
      description: 'Initiate Nanite Structural Restoration (Hull Repair routine)',
      category: 'Diagnostics & Repair',
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" />
    },
    {
      keys: ['Shift', 'L'],
      description: 'Batch lock all diagnostic nodes exceeding 85% stress threshold',
      category: 'Diagnostics & Repair',
      icon: <Lock className="w-3.5 h-3.5 text-blue-400" />
    },
    {
      keys: ['Shift', 'U'],
      description: 'Batch unlock all locked diagnostic nodes in current selection',
      category: 'Diagnostics & Repair',
      icon: <Unlock className="w-3.5 h-3.5 text-rose-400" />
    },
    {
      keys: ['?'],
      description: 'Toggle this Shortcuts & Hotkeys reference modal',
      category: 'System',
      icon: <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: ['Esc'],
      description: 'Close active overlay dialogs and system modals',
      category: 'System',
      icon: <X className="w-3.5 h-3.5 text-slate-400" />
    }
  ];

  const filteredShortcuts = shortcuts.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchDesc = item.description.toLowerCase().includes(q);
    const matchCat = item.category.toLowerCase().includes(q);
    const matchKeys = item.keys.some(k => k.toLowerCase().includes(q)) || item.keys.join('+').toLowerCase().includes(q);
    return matchDesc || matchCat || matchKeys;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0a0a12] border border-amber-500/30 rounded-md shadow-2xl z-10 overflow-hidden font-mono text-xs">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
              <Keyboard className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-serif">Command Hotkeys & Shortcuts</h3>
              <p className="text-[9px] text-slate-400 font-sans">Bridge Command Operational Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-3 pb-1 border-b border-white/5 bg-slate-900/30">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. repair, lock, Ctrl+T)..."
              className="w-full pl-8 pr-7 py-1.5 bg-black/50 border border-white/10 focus:border-amber-500/50 rounded text-[11px] text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {filteredShortcuts.length > 0 ? (
            <div className="space-y-2">
              {filteredShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-white/5 hover:border-amber-500/20 rounded transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 pr-2">
                    <span className="p-1 bg-black/40 border border-white/5 rounded">
                      {item.icon}
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans">
                      {item.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        <kbd className="px-2 py-1 bg-slate-950 border border-amber-500/40 text-amber-300 rounded font-mono text-[10px] font-bold shadow-inner uppercase tracking-wider">
                          {k}
                        </kbd>
                        {kIdx < item.keys.length - 1 && (
                          <span className="text-[9px] text-slate-500 font-bold">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-[11px] space-y-1">
              <p className="font-semibold text-slate-300">No shortcuts found</p>
              <p className="text-[10px] text-slate-500">No hotkeys match "{searchQuery}"</p>
            </div>
          )}

          {/* Context tip */}
          <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded text-[10px] text-amber-200/80 flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Shortcuts are active globally across Bridge and Council views (except when editing text fields).</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-2.5 bg-slate-950/90 border-t border-white/10 text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {filteredShortcuts.length} OF {shortcuts.length} SHORTCUTS ACTIVE
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white border border-amber-500/40 rounded font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Acknowledge [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
