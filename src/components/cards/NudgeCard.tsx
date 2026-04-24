import React from 'react';
import {
  AlertTriangle,
  Lightbulb,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NudgeCardProps {
  type: 'alert' | 'insight' | 'tip';
  message: string;
  detail?: string;
  actions?: { label: string; action: string }[];
  onAction?: (action: string) => void;
  onDismiss?: () => void;
}

/**
 * NudgeCard - Proactive notification/nudge card with three variants
 *
 * Features:
 * - Three types: alert (red), insight (teal), tip (blue)
 * - Left border accent, icon, message + optional detail
 * - Action buttons row (1-2 buttons)
 * - Dismissible via X button
 * - Framer Motion entrance animation
 */
const NudgeCardInner: React.FC<NudgeCardProps> = ({
  type,
  message,
  detail,
  actions,
  onAction,
  onDismiss,
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'alert':
        return {
          bg: 'bg-error/10',
          border: 'border-error/30',
          leftBorder: 'bg-error',
          iconColor: 'text-error',
          icon: AlertTriangle,
        };
      case 'insight':
        return {
          bg: 'bg-tertiary/10',
          border: 'border-tertiary/30',
          leftBorder: 'bg-tertiary',
          iconColor: 'text-tertiary',
          icon: Lightbulb,
        };
      case 'tip':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          leftBorder: 'bg-blue-500',
          iconColor: 'text-blue-400',
          icon: Info,
        };
    }
  };

  const typeConfig = getTypeConfig();
  const Icon = typeConfig.icon;

  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 150);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-xl border',
        typeConfig.bg,
        typeConfig.border
      )}
    >
      {/* Left accent border */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', typeConfig.leftBorder)} />

      <div className="pl-4 pr-4 py-4 flex gap-4">
        {/* Icon */}
        <div className="shrink-0 pt-0.5">
          <Icon className={cn('w-5 h-5', typeConfig.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message */}
          <p className="text-sm font-semibold text-slate-100 mb-1">{message}</p>

          {/* Detail text */}
          {detail && <p className="text-xs text-slate-400 leading-relaxed mb-3">{detail}</p>}

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onAction?.(action.action)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:pointer-events-none',
                    idx === 0
                      ? cn('bg-white/[0.12] text-slate-100 hover:bg-white/[0.16] border border-white/[0.1] disabled:hover:bg-white/[0.12]')
                      : 'text-slate-300 hover:text-slate-100 disabled:hover:text-slate-300'
                  )}
                >
                  {action.label}
                  {idx === 0 && <ChevronRight className="w-3 h-3" />}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDismiss}
            className={cn(
              'shrink-0 p-1.5 rounded-lg',
              'text-slate-500 hover:text-slate-300',
              'bg-white/[0.04] hover:bg-white/[0.08]',
              'transition-all duration-200'
            )}
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export const NudgeCard = React.memo(NudgeCardInner);
export default NudgeCard;
