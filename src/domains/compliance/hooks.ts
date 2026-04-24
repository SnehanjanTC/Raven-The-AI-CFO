/**
 * @file Compliance React Hooks
 * @description Custom React hooks for compliance operations with loading states,
 * error handling, and automatic data refetching.
 */

import { useState, useEffect, useCallback } from 'react';
import { ComplianceService } from './api';
import type {
  FilingRecord,
  ComplianceDeadline,
  ComplianceSummary,
  ComplianceHealthReport,
  LedgerEntry,
  AuditLogEntry,
  LedgerFilters,
  FilingStatus,
} from './types';

/**
 * Hook for managing compliance filings
 * @param agentId - Optional agent ID to filter filings
 * @returns { filings, loading, error, refetch, updateStatus }
 */
export function useComplianceFilings(agentId?: string) {
  const [filings, setFilings] = useState<FilingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFilings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getFilings(agentId);
      setFilings(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch filings');
      setError(error);
      console.error('[useComplianceFilings] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  const updateStatus = useCallback(
    async (id: string, status: FilingStatus, details?: Partial<FilingRecord>) => {
      try {
        const updated = await ComplianceService.updateFilingStatus(id, status, details);
        setFilings((prev) => prev.map((f) => (f.id === id ? updated : f)));
        return updated;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update filing');
        setError(error);
        throw error;
      }
    },
    []
  );

  return {
    filings,
    loading,
    error,
    refetch: fetchFilings,
    updateStatus,
  };
}

/**
 * Hook for managing compliance deadlines
 * @param agentId - Optional agent ID to filter deadlines
 * @param daysAhead - Number of days to look ahead (default 90)
 * @returns { deadlines, loading, error, refetch, markComplete }
 */
export function useComplianceDeadlines(agentId?: string, daysAhead: number = 90) {
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeadlines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getDeadlines(agentId, daysAhead);
      setDeadlines(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch deadlines');
      setError(error);
      console.error('[useComplianceDeadlines] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId, daysAhead]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const markComplete = useCallback(async (id: string) => {
    try {
      await ComplianceService.markDeadlineComplete(id);
      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'completed' } : d))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark deadline complete');
      setError(error);
      throw error;
    }
  }, []);

  return {
    deadlines,
    loading,
    error,
    refetch: fetchDeadlines,
    markComplete,
  };
}

/**
 * Hook for compliance summary dashboard
 * @param agentId - Optional agent ID
 * @returns { summary, health, loading, error, refetch }
 */
export function useComplianceSummary(agentId?: string) {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [health, setHealth] = useState<ComplianceHealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, healthData] = await Promise.all([
        ComplianceService.getComplianceSummary(agentId),
        ComplianceService.getComplianceHealth(),
      ]);
      setSummary(summaryData);
      setHealth(healthData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch summary');
      setError(error);
      console.error('[useComplianceSummary] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    health,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for ledger data with filtering
 * @param filters - Ledger filters (category, date range, etc.)
 * @returns { entries, loading, error, refetch, totals }
 */
export function useLedgerData(filters: LedgerFilters) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getLedgerEntries(filters);
      setEntries(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch ledger entries');
      setError(error);
      console.error('[useLedgerData] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [
    filters.category,
    filters.dateFrom,
    filters.dateTo,
    filters.status,
    filters.taxSection,
    filters.agentId,
  ]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Calculate totals
  const totals = {
    debit: entries.reduce((sum, e) => sum + e.debit, 0),
    credit: entries.reduce((sum, e) => sum + e.credit, 0),
    balance: entries.length > 0 ? entries[entries.length - 1].running_balance : 0,
  };

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    totals,
  };
}

/**
 * Hook for audit log viewing
 * @param agentId - Optional agent ID to filter by
 * @param limit - Maximum number of log entries to fetch (default 50)
 * @returns { logs, loading, error, refetch }
 */
export function useAuditLog(agentId?: string, limit: number = 50) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Note: This is a simplified implementation.
      // In production, you would need a dedicated method in ComplianceService
      // to fetch audit logs with pagination and filtering.
      // Currently returning empty logs as backend endpoint needs to be implemented
      setLogs([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch audit logs');
      setError(error);
      console.error('[useAuditLog] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}

/**
 * Hook for TDS liability tracking
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns { liability, loading, error, refetch }
 */
export function useTDSLiability(periodStart: string, periodEnd: string) {
  const [liability, setLiability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLiability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getTDSLiability(periodStart, periodEnd);
      setLiability(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch TDS liability');
      setError(error);
      console.error('[useTDSLiability] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchLiability();
  }, [fetchLiability]);

  return {
    liability,
    loading,
    error,
    refetch: fetchLiability,
  };
}

/**
 * Hook for GST liability tracking
 * @param month - Month in YYYY-MM format
 * @returns { liability, loading, error, refetch }
 */
export function useGSTLiability(month: string) {
  const [liability, setLiability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLiability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getGSTLiability(month);
      setLiability(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch GST liability');
      setError(error);
      console.error('[useGSTLiability] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchLiability();
  }, [fetchLiability]);

  return {
    liability,
    loading,
    error,
    refetch: fetchLiability,
  };
}

/**
 * Hook for P-Tax summary
 * @param stateCode - Optional state code filter
 * @returns { summary, loading, error, refetch }
 */
export function usePTaxSummary(stateCode?: string) {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getPTaxSummary(stateCode);
      setSummary(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch P-Tax summary');
      setError(error);
      console.error('[usePTaxSummary] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [stateCode]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}

/**
 * Hook for P&L summary
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns { pnl, loading, error, refetch }
 */
export function usePnLSummary(periodStart: string, periodEnd: string) {
  const [pnl, setPnL] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPnL = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComplianceService.getPnLSummary(periodStart, periodEnd);
      setPnL(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch P&L summary');
      setError(error);
      console.error('[usePnLSummary] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  return {
    pnl,
    loading,
    error,
    refetch: fetchPnL,
  };
}
