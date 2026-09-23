/**
 * ProposalDrawer — bell + slide-out review panel for agent proposals.
 *
 * Ports Conformity's "AI proposes, human approves" pattern. Every AI-drafted
 * write (transactions, metrics) lands here first. The founder approves or
 * rejects with one click; nothing changes the books without their tap.
 *
 * Keep it BORING: crisp language, no jargon. A founder should understand
 * "Raven wants to add an expense" without knowing what a proposal is.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProposals, type Proposal } from '@/hooks/useProposals';

interface ProposalDrawerProps {
  className?: string;
}

export const ProposalDrawer: React.FC<ProposalDrawerProps> = ({ className }) => {
  const { proposals, pendingCount, isLoading, error, approve, reject } =
    useProposals();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handle(action: 'approve' | 'reject', p: Proposal) {
    setBusyId(p.id);
    setActionError(null);
    try {
      if (action === 'approve') await approve(p.id);
      else await reject(p.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] hover:text-primary transition-colors"
        aria-label={`Raven's proposals${pendingCount ? ` (${pendingCount} pending)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-semibold text-black flex items-center justify-center leading-none">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop, closes on click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 right-0 z-50 h-full w-[min(420px,100vw)] bg-[#0A0A0F] border-l border-white/[0.08] shadow-2xl flex flex-col"
              role="dialog"
              aria-label="Raven's proposals"
            >
              <header className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Raven's proposals
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nothing changes until you approve.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {actionError && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {actionError}
                  </div>
                )}

                {isLoading && proposals.length === 0 && (
                  <div className="text-sm text-slate-500">Loading…</div>
                )}

                {error && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error.message}
                  </div>
                )}

                {!isLoading && proposals.length === 0 && !error && (
                  <div className="text-sm text-slate-500 text-center py-8">
                    Nothing pending. Raven will queue any writes it wants to
                    make here so you can review them before they land.
                  </div>
                )}

                {proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    busy={busyId === p.id}
                    onApprove={() => handle('approve', p)}
                    onReject={() => handle('reject', p)}
                  />
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ProposalCardProps {
  proposal: Proposal;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  busy,
  onApprove,
  onReject,
}) => {
  const isTx = proposal.kind === 'add_transaction';
  const p = proposal.payload || {};

  return (
    <article className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-3">
        {isTx ? (
          <Receipt className="h-4 w-4 text-primary" />
        ) : (
          <BarChart3 className="h-4 w-4 text-primary" />
        )}
        <span className="text-xs uppercase tracking-wider text-slate-500">
          {isTx ? 'Wants to record' : 'Wants to update metric'}
        </span>
      </div>

      {isTx ? (
        <div className="space-y-1">
          <div className="text-sm text-slate-200 font-medium">
            {p.description || '(no description)'}
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>
              {p.type === 'income' ? '+' : '−'}
              {typeof p.amount === 'number'
                ? p.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : p.amount}
            </span>
            <span>{p.category || 'Uncategorised'}</span>
            <span>{p.date}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-sm text-slate-200 font-medium">
            {p.label || '(unnamed metric)'}
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>New value: <span className="text-slate-200">{p.value}</span></span>
            {p.change && <span>Δ {p.change}</span>}
            {p.subtext && <span>{p.subtext}</span>}
          </div>
        </div>
      )}

      {proposal.reason && (
        <p className="text-xs text-slate-500 mt-3 italic border-l-2 border-white/[0.08] pl-2">
          {proposal.reason}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-black text-xs font-semibold disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
        <span className="ml-auto text-[10px] text-slate-500">
          {new Date(proposal.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>
    </article>
  );
};

export default ProposalDrawer;
