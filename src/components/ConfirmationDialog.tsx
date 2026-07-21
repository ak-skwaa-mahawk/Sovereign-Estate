import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert, X, Terminal, Check } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireTextConfirm?: string; // Optional text required to unlock confirmation (e.g. "OVERHAUL")
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  requireTextConfirm
}: ConfirmationDialogProps) {
  const [typedValue, setTypedValue] = useState('');

  // Reset input when dialog closes/opens
  useEffect(() => {
    if (!isOpen) {
      setTypedValue('');
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isUnlocked = !requireTextConfirm || typedValue.trim().toUpperCase() === requireTextConfirm.toUpperCase();

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          glow: 'shadow-[0_0_25px_rgba(239,68,68,0.15)]',
          border: 'border-red-500/30 focus-within:border-red-500/50',
          accentColor: 'text-red-400',
          bgGradient: 'from-red-950/20 via-slate-950 to-slate-950',
          btnConfirm: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-500/50',
          icon: <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
        };
      case 'info':
        return {
          glow: 'shadow-[0_0_25px_rgba(59,130,246,0.15)]',
          border: 'border-blue-500/30 focus-within:border-blue-500/50',
          accentColor: 'text-blue-400',
          bgGradient: 'from-blue-950/20 via-slate-950 to-slate-950',
          btnConfirm: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 hover:border-blue-500/50',
          icon: <Terminal className="w-6 h-6 text-blue-500" />
        };
      case 'warning':
      default:
        return {
          glow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
          border: 'border-amber-500/30 focus-within:border-amber-500/50',
          accentColor: 'text-amber-400',
          bgGradient: 'from-amber-950/20 via-slate-950 to-slate-950',
          btnConfirm: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/50',
          icon: <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} />
        };
    }
  };

  const style = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative w-full max-w-md overflow-hidden rounded-sm border border-white/10 bg-gradient-to-b ${style.bgGradient} p-6 font-mono text-xs text-slate-300 ${style.glow}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Tactical Lines */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Abort Action"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Content */}
            <div className="flex gap-4 items-start mb-4">
              <div className="p-2 bg-white/5 rounded border border-white/10">
                {style.icon}
              </div>
              <div className="flex-1">
                <h2 className={`text-[13px] font-extrabold uppercase tracking-widest ${style.accentColor} mb-1 flex items-center gap-2`}>
                  ⚠️ SYSTEM AUTHORIZATION REQUIRED
                </h2>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  ACTION: {title}
                </div>
              </div>
            </div>

            {/* Warning Message Box */}
            <div className="bg-black/40 border border-white/5 rounded-sm p-4.5 mb-5 space-y-2 leading-relaxed text-[11px] text-slate-400">
              <p className="text-white font-medium uppercase text-[10px] tracking-wide">Commander Directive Alert:</p>
              <p>{description}</p>
            </div>

            {/* Text Input Validation Box */}
            {requireTextConfirm && (
              <div className="mb-5 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Type <span className="text-white font-extrabold select-all px-1.5 py-0.5 bg-white/5 rounded border border-white/10">{requireTextConfirm}</span> to authorize overwrite:
                </label>
                <div className={`flex items-center gap-2 bg-black/60 border rounded-sm px-2.5 py-1.5 transition-all ${style.border}`}>
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder="ENTER AUTHORIZATION CODE"
                    className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-slate-600 tracking-widest uppercase font-mono text-[11px]"
                    autoFocus
                  />
                  {isUnlocked && typedValue && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-400"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Tactical Footer Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/5 font-mono text-[10px] tracking-widest font-bold">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-sm transition-all duration-200 uppercase cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (isUnlocked) {
                    onConfirm();
                    onClose();
                  }
                }}
                disabled={!isUnlocked}
                className={`px-5 py-2 border rounded-sm uppercase tracking-widest font-extrabold flex items-center gap-1.5 transition-all duration-200 select-none ${
                  isUnlocked 
                    ? `${style.btnConfirm} cursor-pointer` 
                    : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
