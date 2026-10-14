import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-xl font-bold text-textMain">{title}</h3>
            </div>
            <button onClick={onCancel} className="text-textMuted hover:text-textMain p-1 transition-colors">
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-textMuted leading-relaxed">{message}</p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-glass">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-glass text-textMuted hover:text-textMain hover:bg-surface transition-colors font-medium text-sm"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${
                isDestructive
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  : 'bg-primary text-background hover:bg-primary/90 shadow-neon-primary-sm'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
