/**
 * @file Compliance Domain Types
 * @description Comprehensive TypeScript interfaces for compliance operations including
 * TDS, GST, P-Tax, and Indian GAAP audit trails, filings, deadlines, and ledger entries.
 */

/**
 * Supported compliance domains
 */
export type ComplianceDomain = 'tds' | 'gst' | 'ptax' | 'gaap';

/**
 * Filing statuses throughout the compliance lifecycle
 */
export type FilingStatus = 'upcoming' | 'draft' | 'review' | 'filed' | 'acknowledged' | 'overdue';

/**
 * Deadline priority levels
 */
export type DeadlinePriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Deadline status
 */
export type DeadlineStatus = 'pending' | 'in_progress' | 'completed' | 'missed' | 'on_hold';

/**
 * Recurrence patterns for recurring compliance deadlines
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

/**
 * Audit log entry — complete audit trail for compliance actions
 * Maps to DB schema: audit_logs table
 */
export interface AuditLogEntry {
  id: string;
  agent_id: string;
  action_type: string;
  input_params: Record<string, any>;
  output_result: Record<string, any>;
  user_id?: string;
  created_at: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    executionTimeMs?: number;
    [key: string]: any;
  };
}

/**
 * Compliance filing record
 * Maps to DB schema: compliance_filings table
 */
export interface FilingRecord {
  id: string;
  agent_id: string;
  filing_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  filed_date?: string;
  status: FilingStatus;
  acknowledgment_number?: string;
  amount: number;
  penalty_amount?: number;
  interest_amount?: number;
  notes?: string;
  metadata?: {
    domain?: ComplianceDomain;
    frequency?: string;
    notificationDetails?: string;
    calculationMethod?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Rate table entry for compliance calculations
 * Stores versioned rate tables for all compliance domains
 */
export interface RateTableEntry {
  id?: string;
  domain: ComplianceDomain;
  rate_key: string;
  rate_data: Record<string, any>;
  effective_from: string;
  effective_to?: string;
  version: number;
  is_active: boolean;
  source_notification?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Compliance deadline with optional recurring schedule
 * Maps to DB schema: compliance_deadlines table
 */
export interface ComplianceDeadline {
  id: string;
  agent_id: string;
  title: string;
  description?: string;
  deadline_date: string;
  reminder_days_before?: number;
  status: DeadlineStatus;
  priority: DeadlinePriority;
  recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  linked_filing_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Ledger entry for transaction tracking
 * Maps to DB schema: ledger_entries table
 */
export interface LedgerEntry {
  id: string;
  date: string;
  category: string;
  tax_section?: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: 'posted' | 'draft' | 'reversed';
  reference_document?: string;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Compliance party (vendor, customer, etc.)
 * Maps to DB schema: compliance_parties table
 */
export interface ComplianceParty {
  id: string;
  name: string;
  party_type: 'vendor' | 'customer' | 'employee' | 'intermediary' | 'other';
  pan?: string;
  gstin?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * High-level compliance summary dashboard
 */
export interface ComplianceSummary {
  total_filings: number;
  filed: number;
  pending: number;
  overdue: number;
  upcoming: number;
  next_deadline?: {
    title: string;
    deadline_date: string;
    priority: DeadlinePriority;
  };
  last_updated: string;
}

/**
 * Compliance health report with scores and issues
 */
export interface ComplianceHealthReport {
  domain: ComplianceDomain;
  score: number; // 0-100
  status: 'compliant' | 'at_risk' | 'non_compliant';
  issues: string[];
  recommendations?: string[];
  last_audit_date?: string;
}

/**
 * Generic calculation request wrapper
 */
export interface CalculationRequest<T = Record<string, any>> {
  calculationType: string;
  domain: ComplianceDomain;
  period: {
    startDate: string;
    endDate: string;
  };
  parameters: T;
}

/**
 * Generic calculation response with audit trail
 */
export interface CalculationResponse<T = Record<string, any>> {
  result: T;
  auditId: string;
  calculatedAt: string;
  domain: ComplianceDomain;
}

/**
 * TDS Liability summary
 */
export interface TDSLiability {
  section: string;
  amount: number;
  tdsAmount: number;
  rate: number;
}

/**
 * GST Liability summary
 */
export interface GSTLiability {
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  itcAvailable: number;
  netPayable: number;
}

/**
 * P-Tax summary by state
 */
export interface PTaxSummary {
  state: string;
  employees: number;
  totalDeducted: number;
  totalDeposited: number;
  pending: number;
}

/**
 * P&L Summary for Indian GAAP
 */
export interface PnLSummary {
  revenue: number;
  expenses: number;
  depreciation: number;
  pbt: number; // Profit Before Tax
  tax: number;
  pat: number; // Profit After Tax
}

/**
 * Ledger filter options for queries
 */
export interface LedgerFilters {
  category?: string;
  taxSection?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  agentId?: string;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: string;
}
