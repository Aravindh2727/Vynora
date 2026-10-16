import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useVynoraNav } from '../../context/NavigationContext';

export interface MobileHeaderBadge {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
}

interface MobilePageHeaderProps {
  title: string;
  parentLabel?: string;
  fallbackPath?: string;
  onBack?: () => void;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  badges?: Array<MobileHeaderBadge | string>;
  actions?: React.ReactNode;
  className?: string;
}

export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  parentLabel = 'Dashboard',
  fallbackPath = '/',
  onBack,
  subtitle,
  icon,
  badge,
  badges,
  actions,
  className = ''
}) => {
  const { goBack } = useVynoraNav();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack(fallbackPath);
    }
  };

  const getBadgeStyle = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'danger':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'info':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'default':
        return 'bg-surface text-textMuted border-glass';
      case 'primary':
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const normalizedBadges: MobileHeaderBadge[] = [];
  if (badge) {
    normalizedBadges.push({ label: badge, variant: 'primary' });
  }
  if (badges && badges.length > 0) {
    badges.forEach(b => {
      if (typeof b === 'string') {
        normalizedBadges.push({ label: b, variant: 'primary' });
      } else {
        normalizedBadges.push(b as MobileHeaderBadge);
      }
    });
  }

  return (
    <div className={`mb-3.5 sm:mb-4.5 ${className}`}>
      {/* Top row: Minimal Back Navigation & Actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <button
          type="button"
          onClick={handleBack}
          aria-label={`Go back to ${parentLabel}`}
          className="inline-flex items-center gap-1 px-1.5 py-1 -ml-1 rounded-lg text-textMuted hover:text-textMain hover:bg-surface active:scale-95 transition-all min-h-[32px] group"
        >
          <div className="p-1 rounded-md bg-surface border border-glass group-hover:border-primary/50 text-primary transition-colors">
            <ChevronLeft size={14} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-textMuted group-hover:text-primary transition-colors">
            {parentLabel}
          </span>
        </button>

        {actions && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Main Title Row: Balanced readable header, font & icon */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {icon && (
              <span className="p-1.5 rounded-lg bg-surface border border-glass shrink-0 text-primary flex items-center justify-center [&>svg]:w-4.5 [&>svg]:h-4.5">
                {icon}
              </span>
            )}
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-textMain truncate">
              {title}
            </h1>
            {normalizedBadges.map((b, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium border shrink-0 ${getBadgeStyle(b.variant)}`}
              >
                {b.label}
              </span>
            ))}
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-textMuted mt-0.5 leading-snug truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
