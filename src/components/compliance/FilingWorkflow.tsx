/**
 * @file FilingWorkflow
 * @description Detailed filing workflow panel with progress stepper, status transitions,
 * audit trail, and notes management
 */

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuditLog } from '@/domains/compliance/hooks';
import type { FilingRecord, FilingStatus, AuditLogEntry } from '@/domains/compliance/types';

interface FilingWorkflowProps {
  filing: FilingRecord;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => void;
}

const STATUS_SEQUENCE: FilingStatus[] = ['draft', 'review', 'filed', 'acknowledged'];

const STATUS_LABELS: Record<FilingStatus, string> = {
  draft: 'Draft',
  review: 'Under Review',
  filed: 'Filed',
  acknowledged: 'Acknowledged',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
};

const STATUS_COLORS: Record<FilingStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-300',
    icon: <Clock className="w-4 h-4" />,
  },
  review: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  filed: {
    bg: 'bg-[#e5a764]/20',
    text: 'text-[#f0c78e]',
    icon: <Download className="w-4 h-4" />,
  },
  acknowledged: {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  upcoming: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    icon: <Clock className="w-4 h-4" />,
  },
  overdue: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr + 'T00:00:00');
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function FilingWorkflow({ filing, onClose, onStatusChange }: FilingWorkflowProps) {
  const { logs: auditLogs } = useAuditLog(filing.agent_id, 20);
  const [notes, setNotes] = useState(filing.notes || '');
  const [showAckForm, setShowAckForm] = useState(false);
  const [ackNumber, setAckNumber] = useState(filing.acknowledgment_number || '');
  const [filedDate, setFiledDate] = useState(filing.filed_date || new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const isOverdue = getDaysUntil(filing.due_date) < 0;
  const daysUntil = getDaysUntil(filing.due_date);

  const currentStatusIndex = STATUS_SEQUENCE.indexOf(filing.status as FilingStatus);
  const canAdvance = currentStatusIndex < STATUS_SEQUENCE.length - 1;

  const handleStatusTransition = async (newStatus: FilingStatus) => {
    setIsSaving(true);
    try {
      const details: Partial<FilingRecord> = { notes };
      if (newStatus === 'filed') {
        details.filed_date = filedDate;
      }
      if (newStatus === 'acknowledged') {
        details.acknowledgment_number = ackNumber;
      }
      onStatusChange(filing.id, newStatus, details);
      if (newStatus === 'acknowledged') {
        setShowAckForm(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const nextStatus = canAdvance ? STATUS_SEQUENCE[currentStatusIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative bg-surface-container rounded-2xl border border-white/10 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-xl font-headline font-bold text-white mb-1">{filing.filing_type}</h2>
            <p className="text-xs text-slate-400">
              {filing.period_start} to {filing.period_end}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="overflow-y-auto flex-1 custom-scrollbar p-6 space-y-6">
          {/* Status Badge & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={cn(
              'rounded-lg p-4 border',
              STATUS_COLORS[filing.status].bg,
              'border-white/5'
            )}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Current Status
              </p>
              <div className="flex items-center gap-2">
                {STATUS_COLORS[filing.status].icon}
                <p className={cn('text-sm font-bold', STATUS_COLORS[filing.status].text)}>
                  {STATUS_LABELS[filing.status]}
                </p>
              </div>
            </div>

            <div className={cn(
              'rounded-lg p-4 border',
              isOverdue
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-surface-container-high/50 border-white/5'
            )}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Due Date
              </p>
              <div className="flex items-baseline gap-2">
                <p className={cn(
                  'text-sm font-bold',
                  isOverdue ? 'text-red-400' : 'text-on-surface'
                )}>
                  {formatDate(filing.due_date)}
                </p>
                <span className={cn(
                  'text-xs font-semibold',
                  isOverdue ? 'text-red-400' : 'text-slate-400'
                )}>
                  {isOverdue ? `(${Math.abs(daysUntil)}d overdue)` : `(${daysUntil}d left)`}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filing Progress</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {STATUS_SEQUENCE.map((status, index) => {
                const isActive = STATUS_SEQUENCE.indexOf(filing.status as FilingStatus) >= index;
                const isCurrent = filing.status === status;
                return (
                  <div key={status} className="flex items-center gap-2 flex-shrink-0">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.2 : 1,
                        boxShadow: isCurrent ? '0 0 0 8px rgba(59, 130, 246, 0.1)' : 'none',
                      }}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all',
                        isCurrent
                          ? 'bg-primary text-white'
                          : isActive
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-slate-700/30 text-slate-500'
                      )}
                    >
                      {isActive && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </motion.div>
                    <span className={cn(
                      'text-xs font-semibold whitespace-nowrap',
                      isCurrent
                        ? 'text-primary'
                        : isActive
                          ? 'text-green-400'
                          : 'text-slate-500'
                    )}>
                      {STATUS_LABELS[status]}
                    </span>
                    {index < STATUS_SEQUENCE.length - 1 && (
                      <ChevronRight className={cn(
                        'w-4 h-4 mx-1 flex-shrink-0',
                        isActive && STATUS_SEQUENCE.indexOf(filing.status as FilingStatus) > index
                          ? 'text-green-400'
                          : 'text-slate-600'
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-surface-container-high/50 rounded-lg p-4 border border-white/5 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filing Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Amount</p>
                <p className="text-sm font-bold text-on-surface">{formatCurrency(filing.amount)}</p>
              </div>
              {filing.penalty_amount && filing.penalty_amount > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Penalty</p>
                  <p className="text-sm font-bold text-error">{formatCurrency(filing.penalty_amount)}</p>
                </div>
              )}
              {filing.interest_amount && filing.interest_amount > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Interest</p>
                  <p className="text-sm font-bold text-orange-400">{formatCurrency(filing.interest_amount)}</p>
                </div>
              )}
              {filing.filed_date && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Filed Date</p>
                  <p className="text-sm font-bold text-green-400">{formatDate(filing.filed_date)}</p>
                </div>
              )}
              {filing.acknowledgment_number && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-slate-500 mb-1">Ack Number</p>
                  <p className="text-sm font-mono font-bold text-tertiary">{filing.acknowledgment_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Based on Status */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</p>

            {/* Overdue Alert */}
            {isOverdue && filing.status !== 'acknowledged' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-300 mb-2">This filing is overdue!</p>
                  <p className="text-xs text-red-200">
                    {filing.penalty_amount && filing.penalty_amount > 0
                      ? `Penalty accrued: ${formatCurrency(filing.penalty_amount)}`
                      : 'Immediate action required to avoid penalties.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Status Transition Buttons */}
            {filing.status === 'draft' && (
              <button
                disabled={isSaving}
                onClick={() => handleStatusTransition('review')}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isSaving ? 'Processing...' : 'Submit for Review'}
              </button>
            )}

            {filing.status === 'review' && (
              <button
                disabled={isSaving}
                onClick={() => setShowAckForm(true)}
                className="w-full py-2.5 rounded-lg bg-[#e5a764] text-white font-bold text-sm hover:bg-[#d99850] disabled:opacity-50 transition-all"
              >
                {isSaving ? 'Processing...' : 'Mark as Filed'}
              </button>
            )}

            {filing.status === 'filed' && (
              <button
                disabled={isSaving}
                onClick={() => setShowAckForm(true)}
                className="w-full py-2.5 rounded-lg bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-all"
              >
                {isSaving ? 'Processing...' : 'Record Acknowledgment'}
              </button>
            )}

            {filing.status === 'upcoming' && (
              <button
                disabled={isSaving}
                onClick={() => handleStatusTransition('draft')}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isSaving ? 'Processing...' : 'Start Filing'}
              </button>
            )}

            {/* Acknowledgment Form */}
            <AnimatePresence>
              {showAckForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 border-t border-white/5 pt-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      {filing.status === 'review' ? 'Filed Date' : 'Acknowledgment Number'}
                    </label>
                    {filing.status === 'review' ? (
                      <input
                        type="date"
                        value={filedDate}
                        onChange={(e) => setFiledDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-on-surface text-sm focus:border-primary outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g., ACK-2026-03-TDS-001"
                        value={ackNumber}
                        onChange={(e) => setAckNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-on-surface text-sm focus:border-primary outline-none"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isSaving || (filing.status !== 'review' && !ackNumber)}
                      onClick={() => handleStatusTransition(filing.status === 'review' ? 'filed' : 'acknowledged')}
                      className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-all"
                    >
                      {isSaving ? 'Saving...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowAckForm(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-600 text-white font-bold text-sm hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add filing notes, comments, or internal reminders..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-on-surface text-sm focus:border-primary outline-none resize-none h-24"
            />
            <p className="text-[10px] text-slate-500">{notes.length} characters</p>
          </div>

          {/* Audit Trail */}
          {auditLogs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</p>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="bg-slate-900/30 rounded-lg p-3 border border-white/5 text-xs">
                    <div className="flex justify-between mb-1">
                      <p className="font-semibold text-on-surface">{log.action_type}</p>
                      <p className="text-slate-500">
                        {new Date(log.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <p className="text-slate-400">
                      {log.user_id && `By: ${log.user_id}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
