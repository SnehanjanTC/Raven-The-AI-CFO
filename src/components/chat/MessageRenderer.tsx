import React, { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy-load card components to reduce initial bundle and improve performance
const MetricsCard = lazy(() => import('../cards/MetricsCard').then(m => ({ default: m.MetricsCard })));
const ScenarioCard = lazy(() => import('../cards/ScenarioCard').then(m => ({ default: m.ScenarioCard })));
const ChartCard = lazy(() => import('../cards/ChartCard').then(m => ({ default: m.ChartCard })));
const TransactionListCard = lazy(() => import('../cards/TransactionListCard').then(m => ({ default: m.TransactionListCard })));
const ReportCard = lazy(() => import('../cards/ReportCard').then(m => ({ default: m.ReportCard })));
const NudgeCard = lazy(() => import('../cards/NudgeCard').then(m => ({ default: m.NudgeCard })));
const OnboardingCard = lazy(() => import('../cards/OnboardingCard').then(m => ({ default: m.OnboardingCard })));
const CapabilityCard = lazy(() => import('../cards/CapabilityCard').then(m => ({ default: m.CapabilityCard })));

// Generic loading skeleton for lazy-loaded card components
const CardSkeleton = () => (
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm skeleton">
    <div className="h-6 bg-white/[0.08] rounded mb-3 w-1/3" />
    <div className="space-y-2">
      <div className="h-4 bg-white/[0.08] rounded w-full" />
      <div className="h-4 bg-white/[0.08] rounded w-5/6" />
      <div className="h-4 bg-white/[0.08] rounded w-3/4" />
    </div>
  </div>
);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  card_data?: {
    type: string;
    [key: string]: any;
  };
}

interface MessageRendererProps {
  message: ChatMessage;
  onCardAction?: (action: string) => void;
}

/**
 * Render card component based on card_data type
 * Cards are lazy-loaded and wrapped in Suspense for performance
 */
const renderCard = (
  cardData: ChatMessage['card_data'],
  onCardAction?: (action: string) => void
) => {
  if (!cardData) return null;

  const card = (() => {
    switch (cardData.type) {
      case 'metrics':
        return <MetricsCard metrics={cardData.metrics} />;

      case 'scenario':
        return (
          <ScenarioCard
            title={cardData.title}
            risk={cardData.risk}
            comparisons={cardData.comparisons}
            actions={cardData.actions}
            onAction={onCardAction}
          />
        );

      case 'chart':
        return (
          <ChartCard
            type={cardData.chartType}
            title={cardData.title}
            subtitle={cardData.subtitle}
            data={cardData.data}
            series={cardData.series}
            xAxisKey={cardData.xAxisKey}
          />
        );

      case 'transactions':
        return (
          <TransactionListCard
            transactions={cardData.transactions}
            limit={cardData.limit}
            title={cardData.title}
          />
        );

      case 'report':
        return (
          <ReportCard
            title={cardData.title}
            type={cardData.reportType}
            generatedAt={cardData.generatedAt}
            sections={cardData.sections}
            onExport={cardData.onExport}
          />
        );

      case 'nudge':
        return (
          <NudgeCard
            type={cardData.nudgeType}
            message={cardData.message}
            detail={cardData.detail}
            actions={cardData.actions}
            onAction={onCardAction}
            onDismiss={cardData.onDismiss}
          />
        );

      case 'onboarding':
        return (
          <OnboardingCard
            currentStep={cardData.currentStep}
            completedSteps={cardData.completedSteps}
          />
        );

      case 'demo_loaded':
        return (
          <NudgeCard
            type="insight"
            message="Demo data loaded!"
            detail={cardData.detail || 'I\'ve loaded sample transactions so you can explore the product. When you\'re ready for your real data, just say "clear demo data".'}
            actions={[
              { label: 'What can I see?', action: 'What features should I try first?' },
              { label: 'Back to real data', action: 'clear demo data' },
            ]}
            onAction={onCardAction}
          />
        );

      case 'capabilities':
        return (
          <CapabilityCard
            capabilities={cardData.capabilities}
            onAction={onCardAction}
          />
        );

      default:
        // Fallback for unknown card types
        return (
          <div className="bg-white/[0.04] rounded p-2 text-xs text-slate-400">
            <p className="font-mono">Card: {cardData.type}</p>
          </div>
        );
    }
  })();

  // Wrap all lazy-loaded card components in Suspense for performance
  const lazyCardTypes = ['metrics', 'scenario', 'chart', 'transactions', 'report', 'nudge', 'onboarding', 'capabilities'];
  if (lazyCardTypes.includes(cardData.type)) {
    return (
      <Suspense fallback={<CardSkeleton />}>
        {card}
      </Suspense>
    );
  }

  return card;
};

/**
 * MessageRenderer - Single message bubble with markdown support
 *
 * Features:
 * - User messages: right-aligned, subtle background
 * - Assistant messages: left-aligned, markdown rendered
 * - Card data: renders financial card components for structured responses
 * - Card actions: onClick handlers for card buttons send new messages
 * - Feedback: thumbs up/down rating for assistant messages
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({ message, onCardAction }) => {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <motion.div
      initial={isUser ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <motion.div
        className={cn(
          'max-w-[90%] sm:max-w-[70%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary/20 border border-primary/30 text-slate-200'
            : 'bg-white/[0.04] border border-white/[0.06] text-slate-300'
        )}
      >
        {/* Markdown content */}
        {message.content && (
          <div className="prose prose-invert prose-sm max-w-none">
            {isUser ? (
              <p className="text-sm m-0">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }: any) => (
                    <p className="text-sm m-0 leading-relaxed" {...props} />
                  ),
                  a: ({ node, ...props }: any) => (
                    <a className="text-primary hover:text-primary-light underline" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code
                        className="bg-white/[0.08] rounded px-1.5 py-0.5 text-xs font-mono"
                        {...props}
                      />
                    ) : (
                      <code
                        className="block bg-white/[0.04] rounded p-2 text-xs font-mono overflow-x-auto my-2"
                        {...props}
                      />
                    ),
                  ul: ({ node, ...props }: any) => (
                    <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                  ),
                  ol: ({ node, ...props }: any) => (
                    <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                  ),
                  li: ({ node, ...props }: any) => (
                    <li className="text-sm" {...props} />
                  ),
                  h3: ({ node, ...props }: any) => (
                    <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />
                  ),
                  h4: ({ node, ...props }: any) => (
                    <h4 className="text-xs font-semibold mt-1.5 mb-0.5" {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Card data rendering */}
        {message.card_data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-4 pt-4 border-t border-white/[0.08]"
          >
            {renderCard(message.card_data, onCardAction)}
          </motion.div>
        )}
      </motion.div>

      {/* Feedback buttons for assistant messages */}
      {!isUser && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="flex gap-2 mt-2 ml-0"
        >
          <button
            onClick={() => {
              setFeedback(feedback === 'up' ? null : 'up');
            }}
            disabled={feedback !== null && feedback !== 'up'}
            className={cn(
              'p-1.5 rounded transition-all duration-200',
              feedback === 'up'
                ? 'bg-green-500/20 text-green-400'
                : feedback !== null
                ? 'opacity-30 cursor-not-allowed pointer-events-none'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            )}
            title="Helpful"
          >
            <ThumbsUp className="w-4 h-4" fill={feedback === 'up' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => {
              setFeedback(feedback === 'down' ? null : 'down');
            }}
            disabled={feedback !== null && feedback !== 'down'}
            className={cn(
              'p-1.5 rounded transition-all duration-200',
              feedback === 'down'
                ? 'bg-red-500/20 text-red-400'
                : feedback !== null
                ? 'opacity-30 cursor-not-allowed pointer-events-none'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            )}
            title="Not helpful"
          >
            <ThumbsDown className="w-4 h-4" fill={feedback === 'down' ? 'currentColor' : 'none'} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MessageRenderer;
