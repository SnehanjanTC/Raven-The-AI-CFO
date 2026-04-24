import React from 'react';
import { ArrowRight, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Comparison {
  label: string;
  current: string;
  projected: string;
}

interface ScenarioCardProps {
  title: string;
  risk: 'low' | 'moderate' | 'high';
  comparisons: Comparison[];
  actions?: { label: string; action: string }[];
  onAction?: (action: string) => void;
}

/**
 * ScenarioCard - What-if scenario comparison card
 *
 * Features:
 * - Header: scenario title + risk badge
 * - Comparison rows: label, current → projected values
 * - Highlighted changed values in amber
 * - Action buttons at bottom
 * - Framer Motion entrance animation
 */
const ScenarioCardInner: React.FC<ScenarioCardProps> = ({
  title,
  risk,
  comparisons,
  actions,
  onAction,
}) => {
  const getRiskConfig = () => {
    switch (risk) {
      case 'low':
        return {
          bg: 'bg-tertiary/10',
          text: 'text-tertiary',
          border: 'border-tertiary/30',
          label: 'Low Risk',
          icon: CheckCircle2,
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          label: 'Moderate Risk',
          icon: AlertCircle,
        };
      case 'high':
        return {
          bg: 'bg-error/10',
          text: 'text-error',
          border: 'border-error/30',
          label: 'High Risk',
          icon: AlertTriangle,
        };
    }
  };

  const riskConfig = getRiskConfig();
  const RiskIcon = riskConfig.icon;

  // Detect which comparisons changed
  const hasChanges = comparisons.some((c) => c.current !== c.projected);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
            riskConfig.bg,
            riskConfig.text,
            riskConfig.border
          )}
        >
          <RiskIcon className="w-3 h-3" />
          {riskConfig.label}
        </div>
      </div>

      {/* Comparisons */}
      <div className="divide-y divide-white/[0.06]">
        {comparisons.map((comparison, idx) => {
          const isChanged = comparison.current !== comparison.projected;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="px-5 py-4 flex items-center justify-between gap-4"
            >
              <span className="text-xs font-medium text-slate-400 min-w-fit">
                {comparison.label}
              </span>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <span
                  className={cn(
                    'text-xs font-semibold text-right',
                    isChanged ? 'text-slate-300' : 'text-slate-400'
                  )}
                >
                  {comparison.current}
                </span>

                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />

                <span
                  className={cn(
                    'text-xs font-semibold text-right min-w-[80px]',
                    isChanged
                      ? 'bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md'
                      : 'text-slate-300'
                  )}
                >
                  {comparison.projected}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {actions && actions.length > 0 && (
        <div className="border-t border-white/[0.06] p-5 flex gap-3">
          {actions.map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction?.(action.action)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:pointer-events-none',
                idx === 0
                  ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 disabled:hover:bg-primary/20'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] disabled:hover:bg-white/[0.06]'
              )}
            >
              {action.label}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export const ScenarioCard = React.memo(ScenarioCardInner);
export default ScenarioCard;
