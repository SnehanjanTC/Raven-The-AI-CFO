/**
 * useProposals — reads pending agent proposals and lets the founder
 * approve or reject them.
 *
 * Polls every 15s so the bell count stays fresh without spamming the
 * backend. Bumps immediately after the founder acts.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/shared/services/supabase/client';

export type ProposalKind = 'add_transaction' | 'update_metric';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Proposal {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  kind: ProposalKind;
  status: ProposalStatus;
  proposed_by: string;
  reason?: string | null;
  payload: Record<string, any>;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
  created_at: string;
}

const POLL_MS = 15_000;

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string) || window.location.origin;
}

async function authHeaders(): Promise<Record<string, string>> {
  // Prefer Supabase session (matches how the rest of the app authenticates).
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(await authHeaders())) headers.set(k, v);
  return fetch(`${apiBase()}${path}`, { ...init, headers });
}

interface UseProposalsReturn {
  proposals: Proposal[];
  pendingCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  approve: (id: string, note?: string) => Promise<void>;
  reject: (id: string, note?: string) => Promise<void>;
}

export function useProposals(): UseProposalsReturn {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/agent/proposals/pending');
      if (!res.ok) {
        // 503 when Supabase isn't configured — surface as a soft state.
        if (res.status === 503) {
          setProposals([]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const body = await res.json();
      setProposals(body.proposals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approve = useCallback(
    async (id: string, note?: string) => {
      const res = await apiFetch(`/api/v1/agent/proposals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note: note ?? null }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  const reject = useCallback(
    async (id: string, note?: string) => {
      const res = await apiFetch(`/api/v1/agent/proposals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: note ?? null }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return {
    proposals,
    pendingCount: proposals.length,
    isLoading,
    error,
    refresh,
    approve,
    reject,
  };
}
