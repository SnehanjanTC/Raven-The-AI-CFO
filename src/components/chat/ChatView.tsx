import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageRenderer } from './MessageRenderer';
import { InputBar } from './InputBar';
import { SuggestionChips } from './SuggestionChips';
import { TypingIndicator } from './TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { useSession } from '@/hooks/useSession';
import { NudgeCard } from '@/components/cards/NudgeCard';

// Message virtualization constants
const VIEWPORT_BUFFER_PX = 500;
const ESTIMATED_MESSAGE_HEIGHT_USER = 60;
const ESTIMATED_MESSAGE_HEIGHT_ASSISTANT = 120;
const ESTIMATED_MESSAGE_HEIGHT_CARD = 200;
const VIRTUALIZATION_THRESHOLD = 50; // Only virtualize if > 50 messages

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  card_data?: {
    type: string;
    [key: string]: any;
  };
}

interface ChatViewProps {
  onMessageSend?: (message: string) => void;
}

export interface ChatViewRef {
  sendImportMessage: (count: number) => void;
}

/**
 * ChatView - Main chat composition component
 *
 * Features:
 * - Manages chat state via useChat hook
 * - Connects to Claude backend streaming API
 * - Welcome state with greeting and suggestion chips
 * - Auto-scroll to latest message
 * - Scrollable message list
 * - Anchored input bar at bottom
 * - Error handling and loading states
 */
export const ChatView = forwardRef<ChatViewRef, ChatViewProps>(
  ({ onMessageSend }, ref) => {
    const { messages, isStreaming, error, suggestions, sendMessage, clearError } = useChat();
    const { sessionData, isLoading: sessionLoading } = useSession();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const scrollRafRef = useRef<number | null>(null);
    const [onboardingState, setOnboardingState] = useState<any>(null);
    const [onboardingSuggestions, setOnboardingSuggestions] = useState<string[]>([]);
    const [displayedNudges, setDisplayedNudges] = useState<string[]>([]);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

    // Estimate message height based on type and content
    const estimateMessageHeight = useCallback((msg: ChatMessage): number => {
      if (msg.role === 'user') return ESTIMATED_MESSAGE_HEIGHT_USER;
      if (msg.card_data) return ESTIMATED_MESSAGE_HEIGHT_CARD;
      // Rough estimate: ~120px base + ~0.5px per character
      const contentLength = msg.content.length;
      return Math.min(ESTIMATED_MESSAGE_HEIGHT_ASSISTANT + (contentLength * 0.1), 400);
    }, []);

    // Calculate which messages should be visible based on scroll position
    const handleScroll = useCallback(() => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        if (!messagesContainerRef.current || messages.length < VIRTUALIZATION_THRESHOLD) {
          return;
        }

        const container = messagesContainerRef.current;
        const scrollTop = container.scrollTop;
        const viewportHeight = container.clientHeight;

        let accumulatedHeight = 0;
        let startIdx = 0;
        let endIdx = messages.length - 1;

        // Find start index
        for (let i = 0; i < messages.length; i++) {
          if (accumulatedHeight + estimateMessageHeight(messages[i]) >= scrollTop - VIEWPORT_BUFFER_PX) {
            startIdx = Math.max(0, i);
            break;
          }
          accumulatedHeight += estimateMessageHeight(messages[i]);
        }

        // Find end index
        accumulatedHeight = 0;
        for (let i = 0; i < messages.length; i++) {
          accumulatedHeight += estimateMessageHeight(messages[i]);
          if (accumulatedHeight >= scrollTop + viewportHeight + VIEWPORT_BUFFER_PX) {
            endIdx = i;
            break;
          }
        }

        setVisibleRange({ start: startIdx, end: endIdx });
      });
    }, [messages, estimateMessageHeight]);

    // Get visible messages
    const visibleMessages = useMemo(() => {
      if (messages.length < VIRTUALIZATION_THRESHOLD) {
        return messages;
      }
      return messages.slice(visibleRange.start, visibleRange.end + 1);
    }, [messages, visibleRange]);

    // Expose sendImportMessage method via ref
    useImperativeHandle(ref, () => ({
      sendImportMessage: (count: number) => {
        const message = `I just imported ${count} transaction${count !== 1 ? 's' : ''} from a CSV file. Can you help me review them?`;
        handleSendMessage(message);
      },
    }));

    const scrollToBottom = () => {
      const isMobile = window.innerWidth < 768;
      messagesEndRef.current?.scrollIntoView({
        behavior: isMobile ? 'auto' : 'smooth'
      });
    };

    // Attach scroll listener for virtualization
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (messages.length < VIRTUALIZATION_THRESHOLD) {
        // No need to virtualize for short conversations
        setVisibleRange({ start: 0, end: messages.length - 1 });
        return;
      }

      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollRafRef.current) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
      };
    }, [handleScroll, messages.length]);

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    // Check onboarding state on mount
    useEffect(() => {
      const checkOnboarding = async () => {
        try {
          const response = await fetch('/api/v1/onboarding', {
            method: 'GET',
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setOnboardingState(data.state);
            setOnboardingSuggestions(data.suggestions || []);
          }
        } catch (error) {
          console.error('Error checking onboarding state:', error);
        }
      };

      if (messages.length === 0) {
        checkOnboarding();
      }
    }, [messages.length]);

    const handleSendMessage = async (message: string) => {
      if (onMessageSend) {
        onMessageSend(message);
      }
      await sendMessage(message);
    };

    const handleChipSelect = (chip: string) => {
      handleSendMessage(chip);
    };

    const handleCardAction = (action: string) => {
      handleSendMessage(action);
    };

    const handleNudgeDismiss = (nudgeIndex: number) => {
      setDisplayedNudges(prev => [...prev, nudgeIndex.toString()]);
    };

    // Use session suggestions if available, fallback to onboarding suggestions
    const welcomeSuggestions = sessionData?.suggestions?.length > 0
      ? sessionData.suggestions.map(s => s.text)
      : onboardingSuggestions.length > 0
      ? onboardingSuggestions
      : [
          'What is my current runway?',
          'Analyze my burn rate',
          'Show me top expenses',
          'What is my ARR forecast?',
        ];

    // Track which suggestion chips are marked as new
    const newChipIndices = sessionData?.suggestions
      ? sessionData.suggestions
          .map((s, idx) => s.is_new ? idx : -1)
          .filter(idx => idx !== -1)
      : [];

    const isWelcomeState = messages.length === 0;

    // Get time-based greeting
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    };

    // Get display name from session or fallback
    const getDisplayName = () => {
      const greeting = sessionData?.greeting || 'Snehanjan';
      // Extract name if greeting includes a comma (e.g., "Good morning, Snehanjan")
      if (greeting.includes(',')) {
        return greeting.split(',')[1]?.trim() || greeting;
      }
      return greeting;
    };

    // Get metrics from session or demo data
    const getMetricsDisplay = () => {
      if (sessionData?.metrics_snapshot) {
        const m = sessionData.metrics_snapshot;
        return [
          {
            label: 'MRR',
            value: m.mrr?.value || '₹8.00L',
            delta: m.mrr?.change || '+12%',
            trend: m.mrr?.trend || 'up' as const,
          },
          {
            label: 'Burn Rate',
            value: m.burn?.value || '₹5.20L',
            delta: m.burn?.change || '-3%',
            trend: m.burn?.trend || 'down' as const,
          },
          {
            label: 'Runway',
            value: m.runway?.value || '18 months',
            delta: m.runway?.change || '+2%',
            trend: m.runway?.trend || 'up' as const,
          },
          {
            label: 'Cash Balance',
            value: m.cash?.value || '₹93.6L',
            delta: m.cash?.change || '+8.2%',
            trend: m.cash?.trend || 'up' as const,
          },
        ];
      }
      // Fallback demo metrics
      return [
        {
          label: 'MRR',
          value: '₹8.00L',
          delta: '+12%',
          trend: 'up' as const,
        },
        {
          label: 'Burn Rate',
          value: '₹5.20L',
          delta: '-3%',
          trend: 'down' as const,
        },
        {
          label: 'Runway',
          value: '18 months',
          delta: '+2%',
          trend: 'up' as const,
        },
        {
          label: 'Cash Balance',
          value: '₹93.6L',
          delta: '+8.2%',
          trend: 'up' as const,
        },
      ];
    };

    // Get quick insights
    const getQuickInsights = () => {
      const insights = [
        { dot: 'green', text: 'Revenue grew 12% MoM' },
        { dot: 'red', text: '3 invoices overdue (₹2.4L)' },
        { dot: 'amber', text: 'GST filing due in 5 days' },
      ];
      return insights;
    };

    return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-4" style={{ scrollbarGutter: 'stable' }}>
        {isWelcomeState ? (
          // Welcome state with proactive CFO briefing
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-full text-center py-8 space-y-6"
          >
            {/* Time-based greeting */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-100">
                {getGreeting()}, {getDisplayName()}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Here's your financial pulse for today
              </p>
            </div>

            {/* Metrics Overview Section */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn(
                'w-full max-w-2xl',
                'bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6',
                'backdrop-blur-sm'
              )}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {getMetricsDisplay().map((metric, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 + idx * 0.05 }}
                    className="flex flex-col items-start text-left"
                  >
                    {/* Label */}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      {metric.label}
                    </span>

                    {/* Value */}
                    <h4 className="text-lg font-bold text-white mb-2 leading-tight">
                      {metric.value}
                    </h4>

                    {/* Delta Badge */}
                    {metric.delta && (
                      <div
                        className={cn(
                          'flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          metric.trend === 'up'
                            ? 'bg-green-500/20 text-green-400'
                            : metric.trend === 'down'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-400'
                        )}
                      >
                        <span>
                          {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                        </span>
                        {metric.delta}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Insights / Activity */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="w-full max-w-md space-y-2"
            >
              {getQuickInsights().map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg',
                    'bg-white/[0.02] border border-white/[0.04]'
                  )}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      insight.dot === 'green'
                        ? 'bg-green-500'
                        : insight.dot === 'red'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    )}
                  />
                  <span className="text-xs text-slate-300 text-left">
                    {insight.dot === 'green' && '↑ '}
                    {insight.dot === 'red' && '! '}
                    {insight.dot === 'amber' && '⏳ '}
                    {insight.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Proactive nudge cards */}
            {sessionData?.nudges && sessionData.nudges.length > 0 && (
              <div className="w-full max-w-md mx-auto space-y-3">
                {sessionData.nudges.map((nudge, idx) => (
                  !displayedNudges.includes(idx.toString()) && (
                    <NudgeCard
                      key={idx}
                      type={nudge.type as 'alert' | 'insight' | 'tip'}
                      message={nudge.message}
                      detail={nudge.detail}
                      actions={nudge.actions}
                      onAction={handleCardAction}
                      onDismiss={() => handleNudgeDismiss(idx)}
                    />
                  )
                ))}
              </div>
            )}

            {/* Onboarding card for new users */}
            {onboardingState?.is_new_user && !sessionData?.nudges?.length && (
              <div className="w-full max-w-md mx-auto">
                <div className="px-4">
                  <div className="text-xs text-slate-500 text-center">
                    Setting up your onboarding experience...
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion chips */}
            <div className="w-full">
              <SuggestionChips
                chips={welcomeSuggestions}
                onSelect={handleChipSelect}
                newChipIndices={newChipIndices}
              />
            </div>
          </motion.div>
        ) : (
          // Messages list
          <div>
            {/* Error message */}
            {error && (
              <div className="flex mb-4 justify-center">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 max-w-md">
                  <p className="text-sm text-red-200">
                    {error.message}
                  </p>
                  <button
                    onClick={clearError}
                    className="text-xs text-red-300 hover:text-red-200 mt-2 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Messages - virtualized for performance */}
            {visibleMessages.map((msg, displayIdx) => {
              const actualIdx = messages.length < VIRTUALIZATION_THRESHOLD
                ? displayIdx
                : visibleRange.start + displayIdx;
              return (
                <MessageRenderer
                  key={actualIdx}
                  message={msg}
                  onCardAction={handleCardAction}
                />
              );
            })}

            {/* Loading indicator */}
            {isStreaming && <TypingIndicator />}

            {/* Message end marker */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestion chips after response */}
      {!isWelcomeState && (
        <>
          {suggestions.length > 0 && !isStreaming && (
            <div className="mb-4">
              <SuggestionChips
                chips={suggestions}
                onSelect={handleChipSelect}
                newChipIndices={[]}
              />
            </div>
          )}
          {isStreaming && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex gap-2 px-4 justify-center"
            >
              {[0, 1, 2, 3].map((idx) => (
                <motion.div
                  key={idx}
                  className="h-8 w-24 rounded-full bg-white/[0.06] skeleton"
                  style={{
                    animation: 'shimmer 2s infinite',
                    animationDelay: `${idx * 100}ms`,
                  }}
                />
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Input bar */}
      <InputBar
        onSend={handleSendMessage}
        disabled={isStreaming}
      />
    </div>
    );
  }
);

ChatView.displayName = 'ChatView';

export default ChatView;
