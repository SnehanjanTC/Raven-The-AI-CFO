import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

export interface MetricItem {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  sparkline?: number[];
}

interface MetricsCardProps {
  metrics: MetricItem[];
}

/**
 * MetricsCard - Compact inline metrics summary card for the chat
 *
 * Features:
 * - 2-4 column responsive grid of metric items
 * - Each item: muted label (12px), bold value (20px), delta badge
 * - Optional mini sparkline using Recharts
 * - Dark mode card background with subtle border
 * - Framer Motion entrance animation
 */
const MetricsCardInner: React.FC<MetricsCardProps> = ({ metrics }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          // Convert sparkline to chart data format
          const sparklineData = metric.sparkline?.map((val, i) => ({
            i,
            v: val,
          })) || [];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex flex-col"
            >
              {/* Label */}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {metric.label}
              </span>

              {/* Value */}
              <h4 className="text-xl font-bold text-white mb-3">
                {metric.value}
              </h4>

              {/* Delta Badge + Sparkline */}
              <div className="flex flex-col gap-2">
                {metric.delta && (
                  <div
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-semibold w-fit px-2 py-1 rounded-full',
                      metric.trend === 'up'
                        ? 'bg-tertiary/15 text-tertiary'
                        : metric.trend === 'down'
                        ? 'bg-error/15 text-error'
                        : 'bg-slate-500/15 text-slate-400'
                    )}
                  >
                    {metric.trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                    {metric.trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                    {metric.trend === 'flat' && <Minus className="w-2.5 h-2.5" />}
                    {metric.delta}
                  </div>
                )}

                {/* Mini sparkline chart */}
                {sparklineData.length > 1 && (
                  <div className="h-8 w-full -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sparklineData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={
                            metric.trend === 'up'
                              ? '#4edea3'
                              : metric.trend === 'down'
                              ? '#ffb4ab'
                              : '#94a3b8'
                          }
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export const MetricsCard = React.memo(MetricsCardInner);
export default MetricsCard;
