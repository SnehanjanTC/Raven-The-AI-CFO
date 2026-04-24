import React from 'react';
import { cn } from '@/shared/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className, variant = 'rectangular', width, height, count = 1 }: SkeletonProps) {
  const base = cn(
    'skeleton rounded',
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'h-4 rounded',
    className,
  );

  const style = { width, height };

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={base} style={style} />
        ))}
      </div>
    );
  }

  return <div className={base} style={style} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Loading...</p>
      </div>
    </div>
  );
}
