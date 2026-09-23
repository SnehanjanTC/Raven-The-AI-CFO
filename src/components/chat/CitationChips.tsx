/**
 * CitationChips — inline links to the metrics or transactions an
 * assistant message cited. Founders click a chip to jump to the source.
 *
 * Ports Conformity's audit trail idea: every claim has receipts, one click away.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, BarChart3 } from 'lucide-react';
import type { Citations } from '@/services/claude';

interface CitationChipsProps {
  citations?: Citations;
}

export const CitationChips: React.FC<CitationChipsProps> = ({ citations }) => {
  if (!citations) return null;
  const txns = citations.transaction_ids ?? [];
  const metrics = citations.metric_labels ?? [];
  if (txns.length === 0 && metrics.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1 mt-1">
        Sources
      </span>

      {metrics.map((label) => (
        <Link
          key={`metric:${label}`}
          to={`/dashboard?highlight=${encodeURIComponent(label)}`}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:bg-white/[0.10] hover:text-primary transition-colors"
          title={`View metric: ${label}`}
        >
          <BarChart3 className="h-3 w-3" />
          {label}
        </Link>
      ))}

      {txns.map((id) => (
        <Link
          key={`tx:${id}`}
          to={`/ledger?tx=${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:bg-white/[0.10] hover:text-primary transition-colors font-mono"
          title="View transaction in ledger"
        >
          <Receipt className="h-3 w-3" />
          {id.slice(0, 8)}
        </Link>
      ))}
    </div>
  );
};

export default CitationChips;

/**
 * Strip the ```raven fenced JSON trailer from a message so users see
 * only the human-readable answer.
 */
export function stripRavenTrailer(text: string): string {
  return text.replace(/```raven\s*\n[\s\S]*?\n```/g, '').trim();
}
