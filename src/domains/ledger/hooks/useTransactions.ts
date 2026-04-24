import { useState, useEffect, useCallback } from 'react';
import { fetchTransactions as fetchTxQuery, createTransaction as createTxQuery, logActivity } from '@/shared/services/supabase/queries';
import { subscribeLedger } from '@/shared/services/supabase/subscriptions';
import type { Transaction } from '@/shared/types';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-07-20', description: 'AWS Infrastructure', category: 'Cloud', amount: 1240.50, type: 'expense', status: 'cleared' },
  { id: '2', date: '2024-07-19', description: 'Stripe Payout', category: 'Revenue', amount: 45000.00, type: 'income', status: 'cleared' },
  { id: '3', date: '2024-07-18', description: 'Office Rent - WeWork', category: 'Utilities', amount: 4500.00, type: 'expense', status: 'pending' },
];

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await fetchTxQuery();
      setTransactions(data || MOCK_TRANSACTIONS);
    } catch {
      setTransactions(MOCK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const cleanup = subscribeLedger(fetch);
    return cleanup;
  }, [fetch]);

  const create = useCallback(async (tx: Omit<Transaction, 'id' | 'status'>) => {
    const payload = { ...tx, status: 'cleared' as const, id: Math.random().toString(36).substring(7) };
    try {
      const ok = await createTxQuery(payload);
      if (!ok) {
        setTransactions(prev => [payload, ...prev]);
      }
      await logActivity('System', `recorded new transaction: ${tx.description}`);
    } catch (err) {
      console.error('Error creating transaction:', err);
      throw err;
    }
  }, []);

  return { transactions, loading, fetch, create };
}