import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  subtext?: string;
  icon?: React.ElementType;
  className?: string;
  variant?: 'default' | 'high';
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  subtext,
  icon: Icon,
  className,
  variant = 'default',
  onClick
}: MetricCardProps) {
  const isPlaceholder = !value || value === 'N/A';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
      "rounded-xl p-6 flex flex-col justify-between relative overflow-hidden",
      variant === 'default' ? "bg-surface-container" : "bg-surface-container-high",
      onClick && "cursor-pointer hover:ring-1 hover:ring-primary/30 hover:bg-surface-container-high transition-all active:scale-[0.98]",
      className
    )}>
      {variant === 'high' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
          {Icon && <Icon className="w-5 h-5 text-primary/60" />}
        </div>
        {isPlaceholder ? (
          <div className="h-9 w-32 skeleton rounded-lg"></div>
        ) : (
          <h3 className="text-3xl font-headline font-extrabold text-on-background tracking-tighter">{value}</h3>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 relative z-10">
        {isPlaceholder ? (
          <div className="h-4 w-20 skeleton rounded"></div>
        ) : (
          <>
            {change && (
              <span className={cn(
                "text-xs font-bold flex items-center gap-0.5",
                trend === 'up' ? "text-tertiary" : trend === 'down' ? "text-error" : "text-slate-500"
              )}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend === 'stable' && <Minus className="w-3 h-3" />}
                {change}
              </span>
            )}
            {subtext && <span className="text-slate-500 text-xs font-medium italic">{subtext}</span>}
          </>
        )}
      </div>
    </div>
  );
}
