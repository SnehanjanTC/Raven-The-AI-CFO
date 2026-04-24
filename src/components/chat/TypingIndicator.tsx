import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * TypingIndicator - Animated typing indicator with bouncing dots and elapsed time
 *
 * Features:
 * - Three dots that bounce/pulse sequentially
 * - AI icon (Sparkles) to the left
 * - Wrapped in assistant-message-style bubble (left-aligned)
 * - "Analyzing..." text in muted color
 * - Shows elapsed time counter after 3 seconds
 * - Framer Motion staggered children animation
 */
export const TypingIndicator: React.FC = () => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 },
  };

  const containerVariants = {
    initial: { opacity: 0, x: -10 },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className="flex mb-4 justify-start"
    >
      <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 max-w-fit">
        {/* AI Icon */}
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />

        {/* Thinking text with elapsed time */}
        <span className="text-sm text-slate-400 font-medium">
          Analyzing your finances
          {elapsedSeconds >= 3 && (
            <span className="text-slate-500 ml-1">({elapsedSeconds}s)</span>
          )}
        </span>

        {/* Bouncing dots */}
        <div className="flex gap-1.5 items-center ml-1">
          {[0, 1, 2].map((idx) => (
            <motion.div
              key={idx}
              variants={dotVariants}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: idx * 0.15,
              }}
              className="w-2 h-2 rounded-full bg-primary/60"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
