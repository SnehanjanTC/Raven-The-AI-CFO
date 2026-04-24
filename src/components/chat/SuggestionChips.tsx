import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
  newChipIndices?: number[]; // Array of indices marked as new
}

/**
 * SuggestionChips - Horizontal row of pill-shaped suggestion buttons
 *
 * Features:
 * - Flex row layout
 * - Pill-shaped styling with border
 * - Hover effects
 * - Optional green dot indicator for "new" feature
 * - Supports multiple new chips via newChipIndices
 * - Keyboard navigation with arrow keys (roving tabindex)
 * - Proper ARIA labels and group role
 */
export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  chips,
  onSelect,
  newChipIndices = [],
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      x: -10,
      transition: { duration: 0.2 },
    },
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (idx + 1) % chips.length;
      setFocusedIndex(nextIdx);
      // Focus the next button
      setTimeout(() => {
        const button = document.querySelector(`[data-chip-idx="${nextIdx}"]`) as HTMLButtonElement;
        button?.focus();
      }, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (idx - 1 + chips.length) % chips.length;
      setFocusedIndex(prevIdx);
      // Focus the previous button
      setTimeout(() => {
        const button = document.querySelector(`[data-chip-idx="${prevIdx}"]`) as HTMLButtonElement;
        button?.focus();
      }, 0);
    }
  };

  return (
    <motion.div
      className="flex flex-wrap gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="group"
      aria-label="Suggested questions"
    >
      <AnimatePresence mode="popLayout">
        {chips.map((chip, idx) => {
          const isNew = newChipIndices.includes(idx);

          return (
            <motion.button
              key={`${chip}-${idx}`}
              data-chip-idx={idx}
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(chip)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              tabIndex={focusedIndex === idx ? 0 : -1}
              className={cn(
                'flex items-center gap-2',
                'px-4 py-2 rounded-full',
                'border border-white/[0.12]',
                'bg-white/[0.02] hover:bg-white/[0.06]',
                'text-xs font-medium text-slate-300 hover:text-slate-100',
                'transition-all duration-200',
                'group'
              )}
            >
              <span>{chip}</span>
              {isNew && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuggestionChips;
