import React from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageBannerProps {
  percentage: number; // 0-100
  tokensRemaining: number;
  resetDate: string; // ISO date string
  onUpgrade?: () => void;
}

/**
 * UsageBanner - Shows current token usage status
 *
 * Features:
 * - Hidden when usage < 70%
 * - 70-90%: yellow warning
 * - 90-100%: orange warning with CTA
 * - >100%: red with disabled chat input notice
 *
 * Props:
 * - percentage: Usage percentage (0-100)
 * - tokensRemaining: Tokens left in monthly budget
 * - resetDate: ISO date when usage resets
 * - onUpgrade: Optional callback for upgrade CTA
 */
export const UsageBanner: React.FC<UsageBannerProps> = ({
  percentage,
  tokensRemaining,
  resetDate,
  onUpgrade,
}) => {
  // Hide banner if under 70%
  if (percentage < 70) {
    return null;
  }

  const isOver = percentage > 100;
  const isWarning = percentage >= 70 && percentage < 90;
  const isCritical = percentage >= 90 && percentage <= 100;
  const isExceeded = percentage > 100;

  // Parse reset date
  const resetTime = new Date(resetDate);
  const resetStr = resetTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border text-sm',
        isExceeded
          ? 'bg-red-500/10 border-red-500/20 text-red-300'
          : isCritical
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
      )}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1">
          {isExceeded ? (
            <>
              <p className="font-medium">Monthly limit reached</p>
              <p className="text-xs opacity-75">Usage resets on {resetStr}</p>
            </>
          ) : isCritical ? (
            <>
              <p className="font-medium">You've used {Math.round(percentage)}% of your AI budget</p>
              <p className="text-xs opacity-75">{tokensRemaining.toLocaleString()} tokens remaining</p>
            </>
          ) : (
            <>
              <p className="font-medium">You've used {Math.round(percentage)}% of your AI budget</p>
              <p className="text-xs opacity-75">{tokensRemaining.toLocaleString()} tokens remaining</p>
            </>
          )}
        </div>
      </div>

      {/* CTA buttons */}
      {!isExceeded && isCritical && onUpgrade && (
        <button
          onClick={onUpgrade}
          className={cn(
            'flex-shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors',
            'bg-orange-500/20 hover:bg-orange-500/30 text-orange-200'
          )}
        >
          Upgrade
        </button>
      )}

      {/* Usage indicator bar (optional subtle visual) */}
      <div className="flex-shrink-0 w-16 h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            isExceeded
              ? 'bg-red-500'
              : isCritical
              ? 'bg-orange-500'
              : 'bg-yellow-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default UsageBanner;
