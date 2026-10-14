import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  color?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  color = 'text-primary'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-glass bg-surface/20 my-4">
      <div className={`p-4 rounded-2xl bg-surface border border-glass mb-4 shadow-glass ${color}`}>
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-bold text-textMain mb-1">{title}</h3>
      <p className="text-sm text-textMuted max-w-md mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium text-sm"
        >
          <Plus size={16} /> {actionText}
        </button>
      )}
    </div>
  );
};
