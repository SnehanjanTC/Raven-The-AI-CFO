import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * InputBar - Chat input with pill-style design
 *
 * Features:
 * - Rounded pill-shaped input with send button
 * - Enter to send, Shift+Enter for newline
 * - Send button disabled when input empty or disabled prop set
 * - Auto-resize textarea for multi-line input
 */
export const InputBar: React.FC<InputBarProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask your AI CFO anything...',
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = React.useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || !input.trim();
  const charCount = input.length;
  const showCharCounter = charCount > 2000;

  return (
    <div
      className={cn(
        'w-full max-w-[680px]',
        'px-4 lg:px-0'
      )}
    >
      <motion.div
        className={cn(
          'flex items-end gap-2',
          'px-4 py-2 rounded-full',
          'bg-white/[0.04] border border-white/[0.08]',
          'transition-all duration-200',
          isFocused && 'bg-white/[0.06] border-white/[0.12]'
        )}
        animate={{
          boxShadow: isFocused
            ? '0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2)'
            : '0 0 0 0px rgba(255, 255, 255, 0)',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Textarea input */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={disabled ? 'Waiting for response...' : placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 outline-none resize-none max-h-30',
            disabled
              ? 'bg-white/[0.02] text-slate-500 placeholder-slate-500 cursor-not-allowed'
              : 'bg-transparent text-sm text-slate-200 placeholder-slate-500'
          )}
          rows={1}
        />

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={isDisabled}
          whileHover={!isDisabled ? { scale: 1.05 } : undefined}
          whileTap={!isDisabled ? { scale: 0.95 } : undefined}
          className={cn(
            'flex items-center justify-center',
            'h-8 w-8 rounded-full flex-shrink-0',
            'transition-all duration-200',
            !isDisabled
              ? 'bg-primary hover:bg-primary-light text-on-primary cursor-pointer'
              : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Helper text and character counter */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-600">
          Shift + Enter for newline
        </p>
        {showCharCounter && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-slate-500"
          >
            {charCount}/3000
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default InputBar;
