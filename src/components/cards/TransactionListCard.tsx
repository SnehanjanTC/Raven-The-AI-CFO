import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

interface TransactionListCardProps {
  transactions: Transaction[];
  limit?: number;
  title?: string;
}

/**
 * TransactionListCard - Compact transaction list for inline display
 *
 * Features:
 * - Compact rows: date, description, category pill, amount
 * - Shows `limit` transactions with "Show N more" expansion button
 * - Category color mapping (SaaS=blue, Payroll=purple, Infrastructure=amber, etc)
 * - Green for income, red for expense amounts
 * - Framer Motion entrance animation
 */
const TransactionListCardInner: React.FC<TransactionListCardProps> = ({
  transactions,
  limit = 5,
  title = 'Recent Transactions',
}) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('saas') || cat.includes('software'))
      return { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' };
    if (cat.includes('payroll') || cat.includes('salary'))
      return { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' };
    if (cat.includes('infrastructure') || cat.includes('cloud') || cat.includes('hosting'))
      return { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' };
    if (cat.includes('revenue') || cat.includes('income'))
      return { bg: 'bg-tertiary/15', text: 'text-tertiary', border: 'border-tertiary/30' };
    if (cat.includes('marketing'))
      return { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' };
    return { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' };
  };

  const displayedTransactions = expanded ? transactions : transactions.slice(0, limit);
  const hiddenCount = Math.max(0, transactions.length - limit);
  const hasMore = hiddenCount > 0 && !expanded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      {/* Transaction rows */}
      <div className="divide-y divide-white/[0.06]">
        <AnimatePresence>
          {displayedTransactions.map((tx, idx) => {
            const categoryColor = getCategoryColor(tx.category);
            const date = new Date(tx.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const amountStr = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(tx.amount);

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                {/* Left: Date + Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">{dateStr}</p>
                  <p className="text-sm font-medium text-slate-200 truncate">{tx.description}</p>
                </div>

                {/* Middle: Category pill */}
                <div
                  className={cn(
                    'px-2 py-1 rounded text-xs font-semibold shrink-0 border',
                    categoryColor.bg,
                    categoryColor.text,
                    categoryColor.border
                  )}
                >
                  {tx.category}
                </div>

                {/* Right: Amount */}
                <div className="text-right shrink-0 min-w-[90px]">
                  <p
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      tx.type === 'income' ? 'text-tertiary' : 'text-error'
                    )}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {amountStr.replace('₹', '')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Expand button */}
      {hasMore && (
        <motion.button
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:bg-white/[0.04] border-t border-white/[0.06] transition-colors duration-200"
        >
          Show {hiddenCount} more
          <ChevronDown className="w-3 h-3" />
        </motion.button>
      )}
    </motion.div>
  );
};

export const TransactionListCard = React.memo(TransactionListCardInner);
export default TransactionListCard;
