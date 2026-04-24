/**
 * @file ComplianceCalendar
 * @description Compliance deadline calendar and filing tracker with timeline view,
 * filing status pipeline, and summary stats
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useComplianceFilings, useComplianceDeadlines } from '@/domains/compliance/hooks';
import type { FilingRecord, ComplianceDeadline, ComplianceDomain } from '@/domains/compliance/types';

interface ComplianceCalendarProps {
  agentId?: string;
  onFilingClick?: (filing: FilingRecord) => void;
}


const DOMAIN_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  tds: { bg: 'bg-[#e5a764]/10', text: 'text-[#e5a764]', icon: '₹' },
  gst: { bg: 'bg-[#c4bdb4]/10', text: 'text-[#c4bdb4]', icon: 'G' },
  ptax: { bg: 'bg-green-500/10', text: 'text-green-400', icon: 'P' },
  gaap: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'A' },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300',
  review: 'bg-yellow-500/20 text-yellow-300',
  filed: 'bg-green-500/20 text-green-300',
  acknowledged: 'bg-emerald-500/20 text-emerald-300',
  overdue: 'bg-red-500/20 text-red-300',
  upcoming: 'bg-[#e5a764]/20 text-[#f0c78e]',
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  high: <Zap className="w-3.5 h-3.5 text-orange-400" />,
  medium: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  low: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr + 'T00:00:00');
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isOverdue(dateStr: string): boolean {
  return getDaysUntil(dateStr) < 0;
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function groupByMonth(items: (FilingRecord | ComplianceDeadline)[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  items.forEach((item) => {
    const dateStr = 'due_date' in item ? item.due_date : item.deadline_date;
    const date = new Date(dateStr + 'T00:00:00');
    const monthKey = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(item);
  });
  return grouped;
}

export function ComplianceCalendar({ agentId, onFilingClick }: ComplianceCalendarProps) {
  const { filings, loading: filingsLoading } = useComplianceFilings(agentId);
  const { deadlines, loading: deadlinesLoading } = useComplianceDeadlines(agentId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<'timeline' | 'pipeline'>('timeline');

  // Use data from hooks, empty array if none available
  const displayFilings = filings;
  const displayDeadlines = deadlines;

  // Separate overdue and upcoming
  const overdue = displayDeadlines.filter((d) => isOverdue(d.deadline_date));
  const upcoming = displayDeadlines.filter((d) => !isOverdue(d.deadline_date));

  // Group upcoming by month
  const groupedUpcoming = useMemo(() => groupByMonth(upcoming), [upcoming]);

  // Stats calculation
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthFilings = displayFilings.filter((f) => {
      const dueDate = new Date(f.due_date + 'T00:00:00');
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });

    const onTimeCount = displayFilings.filter((f) => f.status === 'acknowledged').length;
    const totalComplete = displayFilings.filter((f) => f.status === 'acknowledged' || f.status === 'filed').length;
    const filedCount = totalComplete || 1;
    const onTimeRate = Math.round((onTimeCount / Math.max(filedCount, 1)) * 100);

    const nextDeadline = [...overdue, ...upcoming].sort(
      (a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
    )[0];

    return {
      thisMonth: thisMonthFilings.length,
      onTimeRate,
      overdue: overdue.length,
      nextDeadline,
    };
  }, [displayFilings, overdue, upcoming]);

  const daysUntilNext = stats.nextDeadline
    ? getDaysUntil(stats.nextDeadline.deadline_date)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                This Month
              </p>
              <p className="text-2xl font-headline font-bold text-on-surface">{stats.thisMonth}</p>
            </div>
            <Calendar className="w-5 h-5 text-primary/40" />
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                On-Time Rate
              </p>
              <p className="text-2xl font-headline font-bold text-tertiary">{stats.onTimeRate}%</p>
            </div>
            <TrendingUp className="w-5 h-5 text-tertiary/40" />
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Overdue
              </p>
              <p className={cn(
                'text-2xl font-headline font-bold',
                stats.overdue > 0 ? 'text-error' : 'text-green-400'
              )}>
                {stats.overdue}
              </p>
            </div>
            <AlertTriangle className={cn('w-5 h-5', stats.overdue > 0 ? 'text-error/40' : 'text-green-400/40')} />
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Next Deadline
              </p>
              <p className="text-sm font-headline font-bold text-on-surface">
                {daysUntilNext !== null ? (
                  daysUntilNext < 0 ? (
                    <span className="text-error">{Math.abs(daysUntilNext)}d ago</span>
                  ) : daysUntilNext === 0 ? (
                    <span className="text-yellow-400">Today</span>
                  ) : (
                    `${daysUntilNext}d left`
                  )
                ) : (
                  'None'
                )}
              </p>
            </div>
            <Clock className="w-5 h-5 text-primary/40" />
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 border-b border-white/5">
        <button
          onClick={() => setView('timeline')}
          className={cn(
            'px-4 py-3 font-semibold text-sm transition-all border-b-2',
            view === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          )}
        >
          Timeline
        </button>
        <button
          onClick={() => setView('pipeline')}
          className={cn(
            'px-4 py-3 font-semibold text-sm transition-all border-b-2',
            view === 'pipeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          )}
        >
          Pipeline
        </button>
      </div>

      {/* Timeline View */}
      <AnimatePresence mode="wait">
        {view === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Overdue Section */}
            {overdue.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-error uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                  Overdue ({overdue.length})
                </h3>
                <div className="space-y-2">
                  {overdue.map((deadline) => (
                    <motion.div
                      key={deadline.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-surface-container-high/50 border border-error/20 rounded-lg p-3 cursor-pointer hover:border-error/40 transition-all"
                      onClick={() => setExpandedId(expandedId === deadline.id ? null : deadline.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-error">OVERDUE</span>
                            {PRIORITY_ICONS[deadline.priority]}
                          </div>
                          <p className="text-sm font-semibold text-on-surface">{deadline.title}</p>
                          <p className="text-xs text-error mt-1">
                            Due {Math.abs(getDaysUntil(deadline.deadline_date))} days ago
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-slate-500 transition-transform shrink-0',
                            expandedId === deadline.id && 'rotate-90'
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {expandedId === deadline.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400"
                          >
                            <p>{deadline.description || 'No description'}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming by Month */}
            {Object.entries(groupedUpcoming).map(([month, items]) => (
              <div key={month} className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{month}</h3>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
                    .map((deadline) => {
                      const daysLeft = getDaysUntil(deadline.deadline_date);
                      const today = isToday(deadline.deadline_date);
                      return (
                        <motion.div
                          key={deadline.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            'rounded-lg p-3 cursor-pointer transition-all',
                            today
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-surface-container-high/50 border border-white/5 hover:border-primary/20'
                          )}
                          onClick={() => setExpandedId(expandedId === deadline.id ? null : deadline.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {today && <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 bg-primary/20 rounded">TODAY</span>}
                                {PRIORITY_ICONS[deadline.priority]}
                              </div>
                              <p className="text-sm font-semibold text-on-surface truncate">{deadline.title}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Due {formatDate(deadline.deadline_date)} ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
                              </p>
                            </div>
                            <ChevronRight
                              className={cn(
                                'w-5 h-5 text-slate-500 transition-transform shrink-0',
                                expandedId === deadline.id && 'rotate-90'
                              )}
                            />
                          </div>
                          <AnimatePresence>
                            {expandedId === deadline.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400"
                              >
                                <p>{deadline.description || 'No description'}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}

            {overdue.length === 0 && upcoming.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No deadlines scheduled</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Pipeline View */}
        {view === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {['draft', 'review', 'filed', 'acknowledged'].map((status) => {
              const filingsByStatus = displayFilings.filter((f) => f.status === status);
              return (
                <div key={status}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    {status === 'draft' && <FileCheck className="w-4 h-4" />}
                    {status === 'review' && <Clock className="w-4 h-4" />}
                    {status === 'filed' && <FileCheck className="w-4 h-4" />}
                    {status === 'acknowledged' && <CheckCircle2 className="w-4 h-4" />}
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({filingsByStatus.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filingsByStatus.map((filing) => {
                      const domain = filing.metadata?.domain || 'tds';
                      const colors = DOMAIN_COLORS[domain];
                      return (
                        <motion.div
                          key={filing.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            'rounded-lg p-4 border cursor-pointer transition-all hover:border-primary/30',
                            colors.bg,
                            'border-white/5'
                          )}
                          onClick={() => onFilingClick?.(filing)}
                        >
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn('text-[10px] font-bold uppercase tracking-widest', colors.text)}>
                                {filing.filing_type}
                              </span>
                              <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold', STATUS_COLORS[status])}>
                                {status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {filing.period_start} to {filing.period_end}
                            </p>
                          </div>
                          <div className="space-y-2 py-3 border-t border-white/5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Amount</span>
                              <span className="font-bold text-on-surface">₹{(filing.amount / 100000).toFixed(1)}L</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Due</span>
                              <span className="font-bold text-on-surface">{formatDate(filing.due_date)}</span>
                            </div>
                            {filing.acknowledgment_number && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Ack#</span>
                                <span className="font-mono text-green-400">{filing.acknowledgment_number}</span>
                              </div>
                            )}
                          </div>
                          <button
                            className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilingClick?.(filing);
                            }}
                          >
                            View Details
                          </button>
                        </motion.div>
                      );
                    })}
                    {filingsByStatus.length === 0 && (
                      <div className="col-span-full text-center py-8">
                        <p className="text-slate-500 text-xs">No filings in this status</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
