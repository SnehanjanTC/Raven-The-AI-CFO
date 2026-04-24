/**
 * @file ComplianceDashboard
 * @description Top-level compliance overview dashboard aggregating across all 4 Indian agents
 * (TDS, GST, P-Tax, GAAP)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useComplianceSummary, useComplianceDeadlines, useComplianceFilings } from '@/domains/compliance/hooks';
import type { ComplianceHealthReport } from '@/domains/compliance/types';
import { isDemoDataLoaded, getDemoComplianceHealth, getDemoComplianceTrend, onDemoDataChange } from '@/lib/demo-data';

interface ComplianceDashboardProps {
  onAgentClick?: (agentId: string) => void;
}


const DOMAIN_INFO: Record<string, { label: string; color: string; icon: string }> = {
  tds: { label: 'TDS', color: 'from-[#e5a764]/20 to-[#d99850]/10', icon: '₹' },
  gst: { label: 'GST', color: 'from-[#c4bdb4]/20 to-[#b5b1a9]/10', icon: 'G' },
  ptax: { label: 'P-Tax', color: 'from-green-500/20 to-green-600/10', icon: 'P' },
  gaap: { label: 'GAAP', color: 'from-orange-500/20 to-orange-600/10', icon: 'A' },
};

const AGENT_IDS = {
  tds: 'tds-agent',
  gst: 'gst-agent',
  ptax: 'ptax-agent',
  gaap: 'gaap-agent',
};

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getHealthBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20';
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

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

function HealthScoreCard({
  domain,
  score,
  status,
  issues,
  recommendations,
  nextDeadline,
  onClick,
  onViewDetails,
}: ComplianceHealthReport & { nextDeadline?: { title: string; deadline_date: string } | null; onClick?: () => void; onViewDetails?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl p-6 border cursor-pointer transition-all relative overflow-hidden',
        getHealthBg(score),
        onClick && 'hover:shadow-lg'
      )}
    >
      {/* Background gradient effect */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-30 -z-10',
        DOMAIN_INFO[domain].color
      )} />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              {DOMAIN_INFO[domain].label} Health
            </p>
            <div className={cn('text-4xl font-headline font-extrabold', getHealthColor(score))}>
              {score}
            </div>
          </div>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold',
            status === 'compliant'
              ? 'bg-green-500/20 text-green-400'
              : status === 'at_risk'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          )}>
            {DOMAIN_INFO[domain].icon}
          </div>
        </div>

        {/* Status */}
        <div>
          <span className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest',
            status === 'compliant'
              ? 'bg-green-500/20 text-green-300'
              : status === 'at_risk'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-red-500/20 text-red-300'
          )}>
            {status === 'compliant' ? 'Compliant' : status === 'at_risk' ? 'At Risk' : 'Non-Compliant'}
          </span>
        </div>

        {/* Issues */}
        {issues && issues.length > 0 && (
          <div className="space-y-1 py-2 border-t border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Issues</p>
            <ul className="space-y-0.5">
              {issues.slice(0, 2).map((issue, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Deadline */}
        {nextDeadline && (
          <div className="space-y-1 py-2 border-t border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Deadline</p>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold text-on-surface truncate pr-2">{nextDeadline.title}</p>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {formatDate(nextDeadline.deadline_date)}
              </span>
            </div>
          </div>
        )}

        {/* View Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
            console.log(`Viewing details for ${domain.toUpperCase()}`);
          }}
          className="w-full mt-2 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-bold transition-all"
        >
          View Details →
        </button>
      </div>
    </motion.div>
  );
}

export function ComplianceDashboard({ onAgentClick }: ComplianceDashboardProps) {
  const { summary, health, loading, error } = useComplianceSummary();
  const { deadlines } = useComplianceDeadlines();
  const { filings } = useComplianceFilings();
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [expandedFiling, setExpandedFiling] = useState<string | null>(null);

  // Initialize with backend data first, then demo data if available
  const [healthData, setHealthData] = useState<ComplianceHealthReport[] | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      setHealthLoading(true);
      try {
        // Try backend first
        const backendHealth = await api.compliance.health();
        if (backendHealth) {
          setHealthData(Array.isArray(backendHealth) ? backendHealth as ComplianceHealthReport[] : []);
          setHealthLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching compliance health from backend:', err);
      }

      // Fall back to demo data
      if (isDemoDataLoaded()) {
        const demoHealth = getDemoComplianceHealth();
        if (demoHealth) {
          setHealthData([
            { domain: 'tds', score: demoHealth.tds.score, status: demoHealth.tds.score >= 80 ? 'compliant' : 'at_risk', issues: [], recommendations: [] },
            { domain: 'gst', score: demoHealth.gst.score, status: demoHealth.gst.score >= 80 ? 'compliant' : 'at_risk', issues: [], recommendations: [] },
            { domain: 'ptax', score: demoHealth.ptax.score, status: demoHealth.ptax.score >= 80 ? 'compliant' : 'at_risk', issues: [], recommendations: [] },
            { domain: 'gaap', score: demoHealth.gaap.score, status: demoHealth.gaap.score >= 80 ? 'compliant' : 'at_risk', issues: [], recommendations: [] },
          ]);
        }
      }
      setHealthLoading(false);
    };

    fetchHealthData();
  }, []);

  const [trendData, setTrendData] = useState<{ month: string; score: number }[]>([]);

  // Fetch trend data
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const trend = await api.compliance.health() as any;
        if (trend) {
          setTrendData(Array.isArray(trend) ? trend : []);
          return;
        }
      } catch (err) {
        console.error('Error fetching compliance trend from backend:', err);
      }

      // Fall back to demo data
      if (isDemoDataLoaded()) {
        const demoTrend = getDemoComplianceTrend();
        if (demoTrend) {
          setTrendData(demoTrend);
        }
      }
    };

    fetchTrendData();

    // Subscribe to demo data changes
    const unsubscribe = onDemoDataChange(() => {
      if (isDemoDataLoaded()) {
        const demoTrend = getDemoComplianceTrend();
        if (demoTrend) {
          setTrendData(demoTrend);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Use backend data if available, otherwise use demo data
  const displayHealth = healthData && healthData.length > 0 ? healthData : (health && health.length > 0 ? health : []);

  // Find next deadline per domain
  const nextDeadlinePerDomain = useMemo(() => {
    const map: Record<string, any> = {};
    deadlines.forEach((d) => {
      const agent = Object.entries(AGENT_IDS).find(([_, id]) => id === d.agent_id)?.[0];
      if (agent && !map[agent]) {
        map[agent] = d;
      }
    });
    return map;
  }, [deadlines]);

  // Calculate overdue count from demo or API
  const overdueCount = useMemo(() => {
    if (isDemoDataLoaded()) {
      return getDemoComplianceHealth().totalOverdue || 0;
    }
    return deadlines.filter((d) => getDaysUntil(d.deadline_date) < 0).length;
  }, [deadlines]);

  // This month filings
  const thisMonthFilings = useMemo(() => {
    const now = new Date();
    return filings.filter((f) => {
      const dueDate = new Date(f.due_date + 'T00:00:00');
      return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
    });
  }, [filings]);

  if ((loading || healthLoading) && displayHealth.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-surface-container rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue Alert Banner */}
      <AnimatePresence>
        {overdueCount > 0 && !dismissedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-300 mb-1">
                {overdueCount} Overdue Filing{overdueCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-200">
                Immediate action required to avoid penalties and legal issues.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs font-bold text-red-300 hover:text-red-200 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                View All
              </button>
              <button
                onClick={() => setDismissedAlert(true)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health Score Cards Grid */}
      {displayHealth.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayHealth.map((report) => (
            <HealthScoreCard
              key={report.domain}
              {...report}
              nextDeadline={nextDeadlinePerDomain[report.domain] || null}
              onClick={() => onAgentClick?.(AGENT_IDS[report.domain])}
              onViewDetails={() => {
                console.log(`Opening detailed view for ${report.domain}`);
                onAgentClick?.(AGENT_IDS[report.domain]);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container rounded-2xl p-8 text-center border border-white/5">
          <p className="text-slate-400">No compliance data available.</p>
        </div>
      )}

      {/* This Month's Filings */}
      {thisMonthFilings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">This Month's Filings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {thisMonthFilings.slice(0, 6).map((filing) => (
              <motion.div
                key={filing.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container rounded-lg p-4 border border-white/5 hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {filing.filing_type}
                    </p>
                    <p className="text-sm font-bold text-on-surface mt-1">{filing.filing_type}</p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
                    filing.status === 'draft' && 'bg-slate-500/20 text-slate-300',
                    filing.status === 'review' && 'bg-yellow-500/20 text-yellow-300',
                    filing.status === 'filed' && 'bg-[#e5a764]/20 text-[#f0c78e]',
                    filing.status === 'acknowledged' && 'bg-green-500/20 text-green-300',
                    filing.status === 'overdue' && 'bg-red-500/20 text-red-300'
                  )}>
                    {filing.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="text-on-surface font-bold">₹{(filing.amount / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due</span>
                    <span className="text-on-surface font-bold">{formatDate(filing.due_date)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFiling(expandedFiling === filing.id ? null : filing.id);
                      console.log(`Toggling edit mode for filing ${filing.id}`);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10 transition-all"
                  >
                    {expandedFiling === filing.id ? 'Save' : 'Update'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Showing details for filing ${filing.id}:`, filing);
                      setExpandedFiling(expandedFiling === `${filing.id}-detail` ? null : `${filing.id}-detail`);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-on-surface hover:bg-white/5 transition-all"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Score Trend */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">6-Month Compliance Trend</h3>
        <div className="bg-surface-container rounded-2xl p-6 border border-white/5">
          <div className="h-40 flex items-end gap-2">
            {(trendData || []).map((point, idx) => {
              const maxScore = 100;
              const height = (point.score / maxScore) * 100;
              const color = point.score >= 85 ? 'bg-green-500' : point.score >= 70 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <motion.div
                  key={idx}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  className={cn('flex-1 rounded-t-lg opacity-80 hover:opacity-100 transition-all relative group cursor-pointer', color)}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-900 rounded-lg px-2 py-1 text-[10px] font-bold text-white whitespace-nowrap">
                      {point.score}%
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-semibold text-slate-400">
            {(trendData || []).map((point) => (
              <span key={point.month}>{point.month}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-container rounded-lg p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total Filings</p>
            <p className="text-2xl font-headline font-bold text-on-surface">{summary.total_filings}</p>
            <p className="text-[10px] text-slate-500 mt-2">All time</p>
          </div>

          <div className="bg-surface-container rounded-lg p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Filed</p>
            <p className="text-2xl font-headline font-bold text-green-400">{summary.filed}</p>
            <p className="text-[10px] text-slate-500 mt-2">{Math.round((summary.filed / Math.max(summary.total_filings, 1)) * 100)}% complete</p>
          </div>

          <div className="bg-surface-container rounded-lg p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pending</p>
            <p className="text-2xl font-headline font-bold text-yellow-400">{summary.pending}</p>
            <p className="text-[10px] text-slate-500 mt-2">Awaiting action</p>
          </div>

          <div className="bg-surface-container rounded-lg p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Overdue</p>
            <p className={cn('text-2xl font-headline font-bold', summary.overdue > 0 ? 'text-error' : 'text-green-400')}>
              {summary.overdue}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Requires attention</p>
          </div>
        </div>
      )}
    </div>
  );
}
