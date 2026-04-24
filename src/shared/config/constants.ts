export const APP_NAME = 'FinOS';

export const TIMEFRAME_OPTIONS = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'ALL' },
] as const;

export const TRANSACTION_CATEGORIES = [
  'Software', 'Cloud', 'Revenue', 'Payroll', 'Marketing', 'Utilities', 'Taxes'
] as const;

export const REPORT_STATUSES = ['approved', 'generated', 'draft', 'failed'] as const;

export const AGENT_TYPES = [
  { id: 'strategic', label: 'Strategic', color: 'text-tertiary', bg: 'bg-tertiary/10' },
  { id: 'analytical', label: 'Analytical', color: 'text-primary', bg: 'bg-primary/10' },
  { id: 'high-priority', label: 'High Priority', color: 'text-tertiary', bg: 'bg-tertiary/10' },
  { id: 'standard', label: 'Standard', color: 'text-slate-500', bg: 'bg-surface-container-highest' },
] as const;
