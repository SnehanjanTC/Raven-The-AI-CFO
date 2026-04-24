import React from 'react';
import {
  BarChart3,
  GitBranch,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Capability {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tryPrompt: string;
  locked?: boolean;
  lockReason?: string;
}

interface CapabilityCardProps {
  capabilities: Capability[];
  onAction: (prompt: string) => void;
}

/**
 * CapabilityCard - 2x2 grid of AI CFO capabilities with unlock states
 *
 * Features:
 * - 2x2 responsive grid of capability tiles
 * - Each tile: icon, title, description, "Try" button
 * - Locked state: muted colors, lock icon overlay, unlock reason text
 * - Green "Try" text (clickable) for unlocked tiles
 * - Framer Motion stagger animation
 * - Accessible and responsive
 */
const CapabilityCardInner: React.FC<CapabilityCardProps> = ({
  capabilities,
  onAction,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.02,
      },
    },
  };

  const tileVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm"
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-200 mb-5">
        What I can help with
      </h3>

      {/* Grid Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4"
      >
        {capabilities.map((capability, idx) => {
          const Icon = capability.icon;
          const isLocked = capability.locked ?? false;

          return (
            <motion.div
              key={idx}
              variants={tileVariants}
              whileHover={!isLocked ? { scale: 1.02 } : {}}
              className={cn(
                'relative p-4 rounded-xl border',
                'transition-all duration-200',
                isLocked
                  ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                  : 'bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.16]'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
                  isLocked
                    ? 'bg-white/[0.04] text-slate-600'
                    : 'bg-primary/20 text-primary'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Title */}
              <h4
                className={cn(
                  'text-sm font-bold mb-1',
                  isLocked ? 'text-slate-500' : 'text-slate-100'
                )}
              >
                {capability.title}
              </h4>

              {/* Description */}
              <p
                className={cn(
                  'text-[11px] leading-snug mb-3',
                  isLocked ? 'text-slate-700' : 'text-slate-400'
                )}
              >
                {capability.description}
              </p>

              {/* Try button or lock reason */}
              {!isLocked ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onAction(capability.tryPrompt)}
                  className={cn(
                    'text-[11px] font-semibold text-tertiary hover:text-tertiary/80 transition-colors duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-tertiary disabled:pointer-events-none'
                  )}
                >
                  Try →
                </motion.button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-600" />
                  <p className="text-[10px] text-slate-600">
                    {capability.lockReason || 'Unlock with data'}
                  </p>
                </div>
              )}

              {/* Lock overlay for locked state */}
              {isLocked && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-xl',
                    'flex items-center justify-center',
                    'bg-gradient-to-br from-white/[0.02] to-transparent'
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Help text for locked features */}
      {capabilities.some((c) => c.locked) && (
        <p className="text-[11px] text-slate-500 mt-4 text-center">
          Upload transactions to unlock advanced features
        </p>
      )}
    </motion.div>
  );
};

export const CapabilityCard = React.memo(CapabilityCardInner);
export default CapabilityCard;
