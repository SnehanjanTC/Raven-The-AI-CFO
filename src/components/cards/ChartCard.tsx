import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ChartSeries {
  key: string;
  name: string;
  color?: string;
}

interface ChartCardProps {
  type: 'line' | 'bar' | 'area';
  title: string;
  subtitle?: string;
  data: Record<string, any>[];
  series: ChartSeries[];
  xAxisKey?: string;
}

/**
 * ChartCard - Responsive inline chart card using Recharts
 *
 * Features:
 * - Supports line, bar, and area chart types
 * - Card with title and optional subtitle
 * - Auto-sizing responsive container ~200px tall
 * - Proper axis labels, tooltip, legend
 * - Color scheme: teal/green for primary series
 * - Framer Motion entrance animation
 */
const ChartCardInner: React.FC<ChartCardProps> = ({
  type,
  title,
  subtitle,
  data,
  series,
  xAxisKey = 'name',
}) => {
  // Default colors for series
  const defaultColors = [
    '#4edea3', // tertiary (teal)
    '#adc6ff', // primary (light blue)
    '#ffb4ab', // error (red)
    '#b19cd9', // secondary (purple)
  ];

  const getChartComponent = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334155"
                opacity={0.5}
              />
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {series.length > 1 && <Legend />}
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color || defaultColors[idx % defaultColors.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name={s.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334155"
                opacity={0.5}
              />
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {series.length > 1 && <Legend />}
              {series.map((s, idx) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  fill={s.color || defaultColors[idx % defaultColors.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                  name={s.name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {series.map((s, idx) => (
                  <linearGradient
                    key={`grad-${s.key}`}
                    id={`grad-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={s.color || defaultColors[idx % defaultColors.length]}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={s.color || defaultColors[idx % defaultColors.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334155"
                opacity={0.5}
              />
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {series.length > 1 && <Legend />}
              {series.map((s, idx) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color || defaultColors[idx % defaultColors.length]}
                  fill={`url(#grad-${s.key})`}
                  isAnimationActive={false}
                  name={s.name}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        {data && data.length > 0 ? (
          getChartComponent()
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No data available
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const ChartCard = React.memo(ChartCardInner);
export default ChartCard;
