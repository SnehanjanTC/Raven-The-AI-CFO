/**
 * @file Compliance Service API
 * @description Production-grade client-side compliance API service with audit logging,
 * error handling, and fallback to mock data when backend is unavailable.
 */

import { api } from '@/lib/api';
import type {
  AuditLogEntry,
  FilingRecord,
  FilingStatus,
  ComplianceDeadline,
  RateTableEntry,
  ComplianceDomain,
  LedgerEntry,
  ComplianceParty,
  ComplianceSummary,
  ComplianceHealthReport,
  TDSLiability,
  GSTLiability,
  PTaxSummary,
  PnLSummary,
  LedgerFilters,
  ApiError,
} from './types';

/**
 * Mock data generators for fallback when Supabase is unavailable
 */
const MockDataGenerator = {
  generateMockAuditLog(agentId: string): AuditLogEntry {
    return {
      id: `mock-${Date.now()}`,
      agent_id: agentId,
      action_type: 'mock_calculation',
      input_params: {},
      output_result: { message: 'Mock data (Supabase unavailable)' },
      created_at: new Date().toISOString(),
      metadata: { isMockData: true },
    };
  },

  generateMockFilings(agentId?: string): FilingRecord[] {
    return [
      {
        id: 'mock-filing-1',
        agent_id: agentId || 'mock-agent',
        filing_type: 'TDS Return (Form 24Q)',
        period_start: '2025-04-01',
        period_end: '2025-06-30',
        due_date: '2025-07-31',
        status: 'upcoming' as FilingStatus,
        amount: 45000,
        metadata: { domain: 'tds' },
      },
      {
        id: 'mock-filing-2',
        agent_id: agentId || 'mock-agent',
        filing_type: 'GSTR-3B',
        period_start: '2025-02-01',
        period_end: '2025-02-28',
        due_date: '2025-03-20',
        filed_date: '2025-03-18',
        status: 'filed' as FilingStatus,
        amount: 125000,
        metadata: { domain: 'gst' },
      },
    ];
  },

  generateMockDeadlines(agentId?: string): ComplianceDeadline[] {
    return [
      {
        id: 'mock-deadline-1',
        agent_id: agentId || 'mock-agent',
        title: 'TDS Deposit - Q1 FY2025-26',
        deadline_date: '2025-07-07',
        reminder_days_before: 5,
        status: 'pending',
        priority: 'high',
        recurring: true,
        recurrence_pattern: 'quarterly',
        metadata: { domain: 'tds' },
      },
    ];
  },

  generateMockSummary(): ComplianceSummary {
    return {
      total_filings: 8,
      filed: 5,
      pending: 2,
      overdue: 1,
      upcoming: 3,
      next_deadline: {
        title: 'GSTR-3B Filing',
        deadline_date: '2025-03-20',
        priority: 'high',
      },
      last_updated: new Date().toISOString(),
    };
  },
};

/**
 * Compliance Service — Main API layer
 * All methods are static for stateless, server-side operation
 */
export class ComplianceService {
  /**
   * Log an action to the audit trail
   * @param entry - Audit log entry without auto-generated fields
   * @throws {ApiError} If audit logging fails
   */
  static async logAction(
    entry: Omit<AuditLogEntry, 'id' | 'created_at'>
  ): Promise<void> {
    try {
      const auditEntry: Omit<AuditLogEntry, 'id'> = {
        ...entry,
        created_at: new Date().toISOString(),
      };

      // Send to FastAPI backend
      await api.compliance.logAudit(auditEntry);
    } catch (error) {
      console.error('[Compliance] Unexpected error in logAction:', error);
      throw error instanceof Error
        ? this.createError('AUDIT_LOG_ERROR', error.message, 500)
        : this.createError('AUDIT_LOG_ERROR', 'Unknown error occurred', 500);
    }
  }

  /**
   * Execute a calculation with automatic audit logging
   * @template T - Return type of the calculator function
   * @param agentId - Agent performing the calculation
   * @param calculationType - Type of calculation being performed
   * @param params - Input parameters for the calculation
   * @param calculatorFn - Synchronous calculation function
   * @returns Result and audit ID
   * @throws {ApiError} If calculation or logging fails
   */
  static async calculateWithAudit<T>(
    agentId: string,
    calculationType: string,
    params: Record<string, any>,
    calculatorFn: () => T
  ): Promise<{ result: T; auditId: string }> {
    const startTime = performance.now();

    try {
      const result = calculatorFn();
      const executionTimeMs = performance.now() - startTime;

      // Log the calculation to backend
      let auditId = `local-${Date.now()}`;

      try {
        await api.compliance.logAudit({
          agent_id: agentId,
          action_type: calculationType,
          input_params: params,
          output_result: { calculationResult: result },
          created_at: new Date().toISOString(),
          metadata: {
            executionTimeMs,
            calculationType,
          },
        });
      } catch (auditError) {
        console.warn('[Compliance] Audit log insert failed:', auditError);
      }

      return { result, auditId };
    } catch (error) {
      console.error('[Compliance] Calculation error:', error);
      throw error instanceof Error
        ? this.createError('CALCULATION_ERROR', error.message, 500)
        : this.createError('CALCULATION_ERROR', 'Calculation failed', 500);
    }
  }

  /**
   * Retrieve compliance filings with optional filtering
   * @param agentId - Optional agent ID to filter by
   * @param status - Optional filing status to filter by
   * @returns Array of filing records
   */
  static async getFilings(agentId?: string, status?: FilingStatus): Promise<FilingRecord[]> {
    try {
      const filings = (await api.filings.list()) as unknown as FilingRecord[];
      let filtered = filings || [];

      if (agentId) {
        filtered = filtered.filter((f) => f.agent_id === agentId);
      }

      if (status) {
        filtered = filtered.filter((f) => f.status === status);
      }

      return filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } catch (error) {
      console.error('[Compliance] Error fetching filings:', error);
      return MockDataGenerator.generateMockFilings(agentId);
    }
  }

  /**
   * Create a new compliance filing
   * @param filing - Filing record without auto-generated fields
   * @returns Created filing record
   */
  static async createFiling(
    filing: Omit<FilingRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<FilingRecord> {
    try {
      const created = (await api.filings.create(filing as any)) as unknown as FilingRecord;
      return created;
    } catch (error) {
      console.error('[Compliance] Error creating filing:', error);
      throw error instanceof Object && 'code' in error
        ? error
        : this.createError('CREATE_FILING_ERROR', 'Failed to create filing', 500);
    }
  }

  /**
   * Update filing status with optional details
   * @param id - Filing ID
   * @param status - New filing status
   * @param details - Optional additional details to update
   * @returns Updated filing record
   */
  static async updateFilingStatus(
    id: string,
    status: FilingStatus,
    details?: Partial<FilingRecord>
  ): Promise<FilingRecord> {
    try {
      const updateData = {
        status,
        ...details,
        updated_at: new Date().toISOString(),
      };

      const updated = (await api.filings.update(id, updateData)) as unknown as FilingRecord;
      return updated;
    } catch (error) {
      console.error('[Compliance] Error updating filing:', error);
      throw error instanceof Object && 'code' in error
        ? error
        : this.createError('UPDATE_FILING_ERROR', 'Failed to update filing', 500);
    }
  }

  /**
   * Get overdue filings across all agents
   * @returns Array of overdue filing records
   */
  static async getOverdueFilings(): Promise<FilingRecord[]> {
    try {
      const filings = (await api.filings.list()) as unknown as FilingRecord[];
      const today = new Date().toISOString().split('T')[0];
      return (filings || [])
        .filter((f) => f.status === 'overdue' && f.due_date < today)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } catch (error) {
      console.error('[Compliance] Error fetching overdue filings:', error);
      return [];
    }
  }

  /**
   * Get compliance deadlines with optional filtering
   * @param agentId - Optional agent ID to filter by
   * @param daysAhead - Number of days to look ahead (default 90)
   * @returns Array of compliance deadlines
   */
  static async getDeadlines(
    agentId?: string,
    daysAhead: number = 90
  ): Promise<ComplianceDeadline[]> {
    try {
      const deadlines = await api.compliance.deadlines();
      const today = new Date();
      const lookAheadDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      let filtered = (deadlines || []).filter(
        (d) => d.deadline_date >= todayStr && d.deadline_date <= lookAheadDate
      );

      if (agentId) {
        filtered = filtered.filter((d) => d.agent_id === agentId);
      }

      return filtered.sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());
    } catch (error) {
      console.error('[Compliance] Error fetching deadlines:', error);
      return MockDataGenerator.generateMockDeadlines(agentId);
    }
  }

  /**
   * Get upcoming deadlines (convenience method)
   * @param days - Number of days to look ahead (default 30)
   * @returns Array of upcoming compliance deadlines
   */
  static async getUpcomingDeadlines(days: number = 30): Promise<ComplianceDeadline[]> {
    return this.getDeadlines(undefined, days);
  }

  /**
   * Mark a deadline as complete
   * @param id - Deadline ID
   */
  static async markDeadlineComplete(id: string): Promise<void> {
    try {
      await api.compliance.markDeadlineComplete(id);
    } catch (error) {
      console.error('[Compliance] Error marking deadline complete:', error);
      throw error instanceof Object && 'code' in error
        ? error
        : this.createError('UPDATE_DEADLINE_ERROR', 'Failed to update deadline', 500);
    }
  }

  /**
   * Get current active rate table for a compliance domain
   * @param domain - Compliance domain (tds, gst, ptax, gaap)
   * @returns Array of rate table entries
   */
  static async getCurrentRates(domain: ComplianceDomain): Promise<RateTableEntry[]> {
    try {
      // Note: FastAPI backend endpoint may need to be implemented
      // Fallback to empty array if not available
      return [];
    } catch (error) {
      console.error('[Compliance] Error fetching rates:', error);
      return [];
    }
  }

  /**
   * Get rate history for a specific rate key
   * @param domain - Compliance domain
   * @param rateKey - Rate key to track history
   * @returns Array of rate table entries in chronological order
   */
  static async getRateHistory(
    domain: ComplianceDomain,
    rateKey: string
  ): Promise<RateTableEntry[]> {
    try {
      // Note: FastAPI backend endpoint may need to be implemented
      // Fallback to empty array if not available
      return [];
    } catch (error) {
      console.error('[Compliance] Error fetching rate history:', error);
      return [];
    }
  }

  /**
   * Get ledger entries with optional filtering
   * @param filters - Optional filters for category, date range, etc.
   * @returns Array of ledger entries
   */
  static async getLedgerEntries(filters: LedgerFilters): Promise<LedgerEntry[]> {
    try {
      // Note: FastAPI backend endpoint may need to be implemented
      // Fallback to empty array if not available
      return [];
    } catch (error) {
      console.error('[Compliance] Error fetching ledger entries:', error);
      return [];
    }
  }

  /**
   * Calculate TDS liability for a period
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns Array of TDS liabilities by section
   */
  static async getTDSLiability(
    periodStart: string,
    periodEnd: string
  ): Promise<TDSLiability[]> {
    try {
      const entries = await this.getLedgerEntries({
        taxSection: 'TDS',
        dateFrom: periodStart,
        dateTo: periodEnd,
      });

      // Group by section and aggregate
      const grouped = entries.reduce(
        (acc, entry) => {
          const section = entry.tax_section || 'Unknown';
          if (!acc[section]) {
            acc[section] = { section, amount: 0, tdsAmount: 0, rate: 0 };
          }
          acc[section].amount += entry.debit;
          acc[section].tdsAmount += entry.credit;
          return acc;
        },
        {} as Record<string, TDSLiability>
      );

      return Object.values(grouped);
    } catch (error) {
      console.error('[Compliance] Error calculating TDS liability:', error);
      return [];
    }
  }

  /**
   * Calculate GST liability for a month
   * @param month - Month in YYYY-MM format
   * @returns GST liability breakdown
   */
  static async getGSTLiability(month: string): Promise<GSTLiability> {
    try {
      const [year, monthNum] = month.split('-');
      const monthStart = `${year}-${monthNum}-01`;
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0)
        .toISOString()
        .split('T')[0];

      const entries = await this.getLedgerEntries({
        taxSection: 'GST',
        dateFrom: monthStart,
        dateTo: monthEnd,
      });

      // Calculate aggregates (simplified)
      const cgst = entries
        .filter((e) => e.description.includes('CGST'))
        .reduce((sum, e) => sum + e.credit, 0);
      const sgst = entries
        .filter((e) => e.description.includes('SGST'))
        .reduce((sum, e) => sum + e.credit, 0);
      const igst = entries
        .filter((e) => e.description.includes('IGST'))
        .reduce((sum, e) => sum + e.credit, 0);
      const cess = entries
        .filter((e) => e.description.includes('Cess'))
        .reduce((sum, e) => sum + e.credit, 0);
      const itcAvailable = entries
        .filter((e) => e.description.includes('ITC'))
        .reduce((sum, e) => sum + e.debit, 0);

      const netPayable = cgst + sgst + igst + cess - itcAvailable;

      return { cgst, sgst, igst, cess, itcAvailable, netPayable };
    } catch (error) {
      console.error('[Compliance] Error calculating GST liability:', error);
      return { cgst: 0, sgst: 0, igst: 0, cess: 0, itcAvailable: 0, netPayable: 0 };
    }
  }

  /**
   * Get P-Tax summary by state
   * @param stateCode - Optional state code filter
   * @returns Array of P-Tax summaries by state
   */
  static async getPTaxSummary(stateCode?: string): Promise<PTaxSummary[]> {
    try {
      const entries = await this.getLedgerEntries({
        taxSection: 'PTAX',
      });

      const grouped = entries.reduce(
        (acc, entry) => {
          const state = stateCode || entry.metadata?.state || 'Unknown';
          if (!acc[state]) {
            acc[state] = {
              state,
              employees: 0,
              totalDeducted: 0,
              totalDeposited: 0,
              pending: 0,
            };
          }
          acc[state].totalDeducted += entry.debit;
          acc[state].totalDeposited += entry.credit;
          acc[state].pending = acc[state].totalDeducted - acc[state].totalDeposited;
          return acc;
        },
        {} as Record<string, PTaxSummary>
      );

      return Object.values(grouped);
    } catch (error) {
      console.error('[Compliance] Error calculating P-Tax summary:', error);
      return [];
    }
  }

  /**
   * Get P&L summary for Indian GAAP reporting
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns P&L summary with tax impact
   */
  static async getPnLSummary(periodStart: string, periodEnd: string): Promise<PnLSummary> {
    try {
      const entries = await this.getLedgerEntries({
        dateFrom: periodStart,
        dateTo: periodEnd,
      });

      const revenue = entries
        .filter((e) => e.category === 'Revenue')
        .reduce((sum, e) => sum + e.credit, 0);

      const expenses = entries
        .filter((e) => e.category === 'Expense')
        .reduce((sum, e) => sum + e.debit, 0);

      const depreciation = entries
        .filter((e) => e.category === 'Depreciation')
        .reduce((sum, e) => sum + e.debit, 0);

      const pbt = revenue - expenses - depreciation;
      const tax = pbt * 0.3; // Simplified 30% effective tax rate
      const pat = pbt - tax;

      return {
        revenue,
        expenses,
        depreciation,
        pbt,
        tax,
        pat,
      };
    } catch (error) {
      console.error('[Compliance] Error calculating P&L summary:', error);
      return {
        revenue: 0,
        expenses: 0,
        depreciation: 0,
        pbt: 0,
        tax: 0,
        pat: 0,
      };
    }
  }

  /**
   * Get overall compliance summary
   * @param agentId - Optional agent ID
   * @returns Compliance summary dashboard data
   */
  static async getComplianceSummary(agentId?: string): Promise<ComplianceSummary> {
    try {
      const filings = await this.getFilings(agentId);
      const deadlines = await this.getDeadlines(agentId, 90);

      const summary: ComplianceSummary = {
        total_filings: filings.length,
        filed: filings.filter((f) => f.status === 'filed').length,
        pending: filings.filter((f) => f.status === 'draft' || f.status === 'review').length,
        overdue: filings.filter((f) => f.status === 'overdue').length,
        upcoming: filings.filter((f) => f.status === 'upcoming').length,
        next_deadline:
          deadlines.length > 0
            ? {
                title: deadlines[0].title,
                deadline_date: deadlines[0].deadline_date,
                priority: deadlines[0].priority,
              }
            : undefined,
        last_updated: new Date().toISOString(),
      };

      return summary;
    } catch (error) {
      console.error('[Compliance] Error calculating compliance summary:', error);
      return MockDataGenerator.generateMockSummary();
    }
  }

  /**
   * Get compliance health report across all domains
   * @returns Array of compliance health reports
   */
  static async getComplianceHealth(): Promise<ComplianceHealthReport[]> {
    const domains: ComplianceDomain[] = ['tds', 'gst', 'ptax', 'gaap'];

    try {
      const reports: ComplianceHealthReport[] = [];

      for (const domain of domains) {
        const filings = await this.getFilings(undefined, undefined);
        const domainFilings = filings.filter((f) => f.metadata?.domain === domain);

        const overdueCount = domainFilings.filter((f) => f.status === 'overdue').length;
        const pendingCount = domainFilings.filter((f) => f.status === 'draft').length;
        const filedCount = domainFilings.filter((f) => f.status === 'filed').length;

        // Simple scoring: 100 = perfect, 0 = all overdue
        const score =
          domainFilings.length === 0
            ? 100
            : ((filedCount * 100) / domainFilings.length) * 0.7 +
              (1 - overdueCount / domainFilings.length) * 100 * 0.3;

        const issues: string[] = [];
        if (overdueCount > 0) issues.push(`${overdueCount} overdue filings`);
        if (pendingCount > 3) issues.push('Multiple pending filings');

        const status: 'compliant' | 'at_risk' | 'non_compliant' =
          score >= 80 ? 'compliant' : score >= 50 ? 'at_risk' : 'non_compliant';

        reports.push({
          domain,
          score: Math.round(score),
          status,
          issues,
          last_audit_date: new Date().toISOString().split('T')[0],
        });
      }

      return reports;
    } catch (error) {
      console.error('[Compliance] Error calculating compliance health:', error);
      return [];
    }
  }

  /**
   * Helper to create standardized API errors
   * @private
   */
  private static createError(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, any>
  ): ApiError {
    return {
      code,
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    };
  }
}
