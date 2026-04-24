import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, X, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CFOFloatingTriggerProps {
  isOpen: boolean;
  onClick: () => void;
  hasAlert?: boolean;
  alertMessage?: string;
}

export function CFOFloatingTrigger({ isOpen, onClick, hasAlert, alertMessage }: CFOFloatingTriggerProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Periodically pulse to draw attention when there's an alert
  useEffect(() => {
    if (hasAlert) {
      const interval = setInterval(() => setPulseKey(k => k + 1), 4000);
      return () => clearInterval(interval);
    }
  }, [hasAlert]);

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          className="fixed bottom-6 right-6 z-[9998] flex flex-col items-end gap-3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Tooltip / Alert bubble */}
          <AnimatePresence>
            {(showTooltip || hasAlert) && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="bg-surface-container-high border border-white/10 rounded-2xl px-4 py-3 max-w-[240px] shadow-2xl shadow-black/40"
              >
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {hasAlert && alertMessage
                    ? alertMessage
                    : 'Ask your CFO anything — tax, compliance, runway...'}
                </p>
                {hasAlert && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Action needed</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main floating button */}
          <motion.button
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={cn(
              "relative w-14 h-14 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary via-primary to-primary/80",
              "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
              "transition-shadow duration-300 group"
            )}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              y: {
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Alert ping */}
            {hasAlert && (
              <motion.div
                key={pulseKey}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-40" />
              </motion.div>
            )}

            {/* Icon */}
            <Brain className="w-6 h-6 text-on-primary relative z-10 group-hover:hidden" />
            <MessageSquare className="w-6 h-6 text-on-primary relative z-10 hidden group-hover:block" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
