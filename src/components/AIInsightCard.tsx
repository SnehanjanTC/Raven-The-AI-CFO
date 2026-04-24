import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightCardProps {
  title?: string;
  insight: string;
  type?: 'suggestion' | 'warning' | 'opportunity';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * AIInsightCard - A reusable inline AI suggestion/insight card component
 *
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Gradient left accent border
 * - Type-based color coding (suggestion, warning, opportunity)
 * - Optional action button and dismiss functionality
 * - Subtle fade-in animation on mount
 * - Compact and responsive design
 */
export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title = 'AI Insight',
  insight,
  type = 'suggestion',
  actionLabel,
  onAction,
  onDismiss,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const timer = setTimeout(() => setIsVisible(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Determine accent color based on type
  const getAccentColors = () => {
    switch (type) {
      case 'warning':
        return {
          border: 'from-amber-400 to-yellow-500',
          iconColor: 'text-amber-400',
          accentBg: 'bg-amber-400/5',
        };
      case 'opportunity':
        return {
          border: 'from-emerald-400 to-teal-500',
          iconColor: 'text-emerald-400',
          accentBg: 'bg-emerald-400/5',
        };
      case 'suggestion':
      default:
        return {
          border: 'from-amber-300 to-orange-400',
          iconColor: 'text-amber-300',
          accentBg: 'bg-amber-300/5',
        };
    }
  };

  const { border, iconColor, accentBg } = getAccentColors();

  const handleDismiss = () => {
    setIsVisible(false);
    // Allow animation to complete before calling callback
    setTimeout(() => onDismiss?.(), 150);
  };

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm',
          accentBg,
          'py-3 px-4'
        )}
      >
        {/* Left gradient accent border */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-[2px]',
            `bg-gradient-to-b ${border}`,
            'rounded-l-2xl'
          )}
        />

        {/* Content with left padding for accent border */}
        <div className="pl-2">
          {/* Header with title and icon */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4', iconColor)} />
              <span className="text-xs font-medium text-slate-300">{title}</span>
            </div>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className={cn(
                  'ml-auto inline-flex items-center justify-center',
                  'h-6 w-6 rounded-lg',
                  'text-slate-500 hover:text-slate-300',
                  'bg-white/[0.03] hover:bg-white/[0.06]',
                  'transition-colors duration-200'
                )}
                aria-label="Dismiss insight"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Body text */}
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
            {insight}
          </p>

          {/* Action button if provided */}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={cn(
                'mt-2 inline-flex items-center justify-center',
                'px-3 py-1.5 rounded-full',
                'text-xs font-medium',
                'bg-white/[0.06] text-slate-200',
                'border border-white/[0.08]',
                'hover:bg-white/[0.1] hover:border-white/[0.12]',
                'transition-all duration-200',
                'active:scale-95'
              )}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
