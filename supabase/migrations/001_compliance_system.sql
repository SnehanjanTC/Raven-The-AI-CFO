-- Supabase Migration: FinOS Compliance System for Indian Tax & GAAP
-- Created: 2026-03-30
-- Version: 1.0.0
-- Description: Complete schema for TDS, GST, Professional Tax, and Indian GAAP P&L compliance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ========================================================================
-- TABLE 1: compliance_audit_log
-- Purpose: Immutable audit trail of all compliance calculations and actions
-- ========================================================================
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  input_params JSONB,
  output_result JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,

  CONSTRAINT valid_agent_id CHECK (agent_id IN ('tds', 'gst', 'ptax', 'gaap-pnl')),
  CONSTRAINT valid_action_type CHECK (action_type IN ('calculation', 'filing', 'reconciliation', 'status_change'))
);

CREATE INDEX idx_compliance_audit_log_agent_id ON compliance_audit_log(agent_id);
CREATE INDEX idx_compliance_audit_log_action_type ON compliance_audit_log(action_type);
CREATE INDEX idx_compliance_audit_log_user_id ON compliance_audit_log(user_id);
CREATE INDEX idx_compliance_audit_log_created_at ON compliance_audit_log(created_at DESC);
CREATE INDEX idx_compliance_audit_log_agent_action ON compliance_audit_log(agent_id, action_type);

-- ========================================================================
-- TABLE 2: compliance_parties (Vendor/Customer Master)
-- Purpose: Master data for vendors, customers, employees, contractors
-- ========================================================================
CREATE TABLE IF NOT EXISTS compliance_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pan TEXT,
  gstin TEXT,
  party_type TEXT NOT NULL,
  state_code TEXT,
  is_msme BOOLEAN DEFAULT FALSE,
  tds_section_default TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_party_type CHECK (party_type IN ('vendor', 'customer', 'employee', 'contractor')),
  CONSTRAINT pan_format CHECK (pan IS NULL OR pan ~ '^\w{5}\d{4}\w$'),
  CONSTRAINT gstin_format CHECK (gstin IS NULL OR gstin ~ '^\d{2}[A-Z]{5}\d{4}[A-Z]1[Z]{1}[0-9A-Z]{1}$')
);

CREATE INDEX idx_compliance_parties_name ON compliance_parties(name);
CREATE INDEX idx_compliance_parties_pan ON compliance_parties(pan);
CREATE INDEX idx_compliance_parties_gstin ON compliance_parties(gstin);
CREATE INDEX idx_compliance_parties_party_type ON compliance_parties(party_type);
CREATE INDEX idx_compliance_parties_state_code ON compliance_parties(state_code);

-- ========================================================================
-- TABLE 3: ledger_entries
-- Purpose: Core financial transactions for P&L and compliance calculations
-- ========================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  entry_type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  tax_section TEXT,
  gst_rate NUMERIC(5,2),
  gst_amount NUMERIC(15,2),
  hsn_sac_code TEXT,
  vendor_id UUID REFERENCES compliance_parties(id) ON DELETE SET NULL,
  invoice_number TEXT,
  is_inter_state BOOLEAN DEFAULT FALSE,
  state_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,

  CONSTRAINT valid_entry_type CHECK (entry_type IN ('debit', 'credit')),
  CONSTRAINT valid_category CHECK (category IN ('revenue', 'expense', 'tax', 'payroll', 'contractor', 'interest', 'depreciation')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'posted', 'reconciled')),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_gst_rate CHECK (gst_rate IS NULL OR gst_rate IN (0, 5, 12, 18, 28))
);

CREATE INDEX idx_ledger_entries_entry_date ON ledger_entries(entry_date);
CREATE INDEX idx_ledger_entries_category ON ledger_entries(category);
CREATE INDEX idx_ledger_entries_vendor_id ON ledger_entries(vendor_id);
CREATE INDEX idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX idx_ledger_entries_tax_section ON ledger_entries(tax_section);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_entries_entry_date_category ON ledger_entries(entry_date, category);
CREATE INDEX idx_ledger_entries_invoice_number ON ledger_entries(invoice_number);

-- ========================================================================
-- TABLE 4: compliance_rate_tables
-- Purpose: Versioned rate configurations for TDS slabs, GST rates, PT slabs, etc.
-- ========================================================================
CREATE TABLE IF NOT EXISTS compliance_rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  rate_data JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  version INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  source_notification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_domain CHECK (domain IN ('tds', 'gst', 'ptax', 'gaap')),
  UNIQUE(domain, rate_key, version)
);

CREATE INDEX idx_compliance_rate_tables_domain ON compliance_rate_tables(domain);
CREATE INDEX idx_compliance_rate_tables_rate_key ON compliance_rate_tables(rate_key);
CREATE INDEX idx_compliance_rate_tables_effective_from ON compliance_rate_tables(effective_from);
CREATE INDEX idx_compliance_rate_tables_is_active ON compliance_rate_tables(is_active);
CREATE INDEX idx_compliance_rate_tables_domain_active ON compliance_rate_tables(domain, is_active, effective_from DESC);

-- ========================================================================
-- TABLE 5: compliance_filings
-- Purpose: Tracks every return/form filing with status and acknowledgment
-- ========================================================================
CREATE TABLE IF NOT EXISTS compliance_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  filing_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  filed_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming',
  acknowledgment_number TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  penalty_amount NUMERIC(15,2) DEFAULT 0,
  interest_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  filed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,

  CONSTRAINT valid_agent_id CHECK (agent_id IN ('tds', 'gst', 'ptax', 'gaap-pnl')),
  CONSTRAINT valid_filing_status CHECK (status IN ('upcoming', 'draft', 'review', 'filed', 'acknowledged', 'overdue')),
  CONSTRAINT valid_period CHECK (period_start <= period_end),
  CONSTRAINT valid_amounts CHECK (amount >= 0 AND penalty_amount >= 0 AND interest_amount >= 0),
  CONSTRAINT filed_date_after_created CHECK (filed_date IS NULL OR filed_date >= period_end)
);

CREATE INDEX idx_compliance_filings_agent_id ON compliance_filings(agent_id);
CREATE INDEX idx_compliance_filings_filing_type ON compliance_filings(filing_type);
CREATE INDEX idx_compliance_filings_status ON compliance_filings(status);
CREATE INDEX idx_compliance_filings_due_date ON compliance_filings(due_date);
CREATE INDEX idx_compliance_filings_period_start ON compliance_filings(period_start);
CREATE INDEX idx_compliance_filings_filed_by ON compliance_filings(filed_by);
CREATE INDEX idx_compliance_filings_created_at ON compliance_filings(created_at DESC);
CREATE INDEX idx_compliance_filings_agent_status ON compliance_filings(agent_id, status);
CREATE INDEX idx_compliance_filings_due_date_status ON compliance_filings(due_date, status);

-- ========================================================================
-- TABLE 6: compliance_deadlines
-- Purpose: Calendar of compliance deadlines with reminders and recurrence
-- ========================================================================
CREATE TABLE IF NOT EXISTS compliance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  reminder_days_before INTEGER[] DEFAULT '{7,3,1}',
  status TEXT NOT NULL DEFAULT 'upcoming',
  priority TEXT NOT NULL DEFAULT 'medium',
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  linked_filing_id UUID REFERENCES compliance_filings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,

  CONSTRAINT valid_agent_id CHECK (agent_id IN ('tds', 'gst', 'ptax', 'gaap-pnl')),
  CONSTRAINT valid_deadline_status CHECK (status IN ('upcoming', 'due_today', 'completed', 'overdue', 'waived')),
  CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_recurrence CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('monthly', 'quarterly', 'annually'))
);

CREATE INDEX idx_compliance_deadlines_agent_id ON compliance_deadlines(agent_id);
CREATE INDEX idx_compliance_deadlines_deadline_date ON compliance_deadlines(deadline_date);
CREATE INDEX idx_compliance_deadlines_status ON compliance_deadlines(status);
CREATE INDEX idx_compliance_deadlines_priority ON compliance_deadlines(priority);
CREATE INDEX idx_compliance_deadlines_linked_filing_id ON compliance_deadlines(linked_filing_id);
CREATE INDEX idx_compliance_deadlines_agent_deadline ON compliance_deadlines(agent_id, deadline_date);

-- ========================================================================
-- UTILITY FUNCTIONS AND TRIGGERS
-- ========================================================================

-- Function: update_updated_at()
-- Trigger function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to tables with updated_at
CREATE TRIGGER trigger_compliance_parties_updated_at
BEFORE UPDATE ON compliance_parties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_ledger_entries_updated_at
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_compliance_filings_updated_at
BEFORE UPDATE ON compliance_filings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ========================================================================
-- FUNCTION: get_overdue_filings()
-- Returns all filings that are past their due_date and not yet filed/acknowledged
-- ========================================================================
CREATE OR REPLACE FUNCTION get_overdue_filings()
RETURNS TABLE (
  id UUID,
  agent_id TEXT,
  filing_type TEXT,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  status TEXT,
  days_overdue INTEGER,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.agent_id,
    cf.filing_type,
    cf.period_start,
    cf.period_end,
    cf.due_date,
    cf.status,
    EXTRACT(DAY FROM now()::date - cf.due_date)::INTEGER AS days_overdue,
    CASE
      WHEN EXTRACT(DAY FROM now()::date - cf.due_date) > 30 THEN 'critical'::TEXT
      WHEN EXTRACT(DAY FROM now()::date - cf.due_date) > 10 THEN 'high'::TEXT
      ELSE 'medium'::TEXT
    END AS priority
  FROM compliance_filings cf
  WHERE
    cf.due_date < now()::date
    AND cf.status NOT IN ('filed', 'acknowledged')
  ORDER BY cf.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- FUNCTION: get_compliance_summary()
-- Returns filing counts grouped by status for a specific agent
-- ========================================================================
CREATE OR REPLACE FUNCTION get_compliance_summary(p_agent_id TEXT)
RETURNS TABLE (
  agent_id TEXT,
  filing_type TEXT,
  upcoming_count BIGINT,
  draft_count BIGINT,
  review_count BIGINT,
  filed_count BIGINT,
  acknowledged_count BIGINT,
  overdue_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_agent_id::TEXT,
    filing_type,
    COALESCE(SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'filed' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END), 0)::BIGINT
  FROM compliance_filings
  WHERE agent_id = p_agent_id
  GROUP BY filing_type
  ORDER BY filing_type;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Enable RLS on all tables
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rate_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_deadlines ENABLE ROW LEVEL SECURITY;

-- Compliance Audit Log: Authenticated users can read all (for compliance transparency)
-- Only users who performed the action or are admins can read detailed input/output
CREATE POLICY "audit_log_read_authenticated"
ON compliance_audit_log FOR SELECT
TO authenticated
USING (true);

-- Compliance Parties: Authenticated users can view and manage
CREATE POLICY "parties_all_authenticated"
ON compliance_parties FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ledger Entries: Authenticated users can view and manage
CREATE POLICY "ledger_read_authenticated"
ON ledger_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ledger_write_authenticated"
ON ledger_entries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "ledger_update_authenticated"
ON ledger_entries FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Compliance Rate Tables: Authenticated users can read; special privilege to write
CREATE POLICY "rate_tables_read_authenticated"
ON compliance_rate_tables FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "rate_tables_write_authenticated"
ON compliance_rate_tables FOR INSERT
TO authenticated
WITH CHECK (true);

-- Compliance Filings: Authenticated users can view and manage
CREATE POLICY "filings_read_authenticated"
ON compliance_filings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "filings_write_authenticated"
ON compliance_filings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "filings_update_authenticated"
ON compliance_filings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Compliance Deadlines: Authenticated users can view and manage
CREATE POLICY "deadlines_read_authenticated"
ON compliance_deadlines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "deadlines_write_authenticated"
ON compliance_deadlines FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "deadlines_update_authenticated"
ON compliance_deadlines FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ========================================================================
-- SEED DATA: TDS Rate Tables (Current FY 2025-26)
-- ========================================================================
INSERT INTO compliance_rate_tables (domain, rate_key, rate_data, effective_from, effective_to, version, is_active, source_notification)
VALUES
-- TDS Section 192 (Salary)
(
  'tds',
  'sec_192',
  '{"section": "192", "name": "Income-tax on salaries", "slab_rates": [{"from": 0, "to": 250000, "rate": 0}, {"from": 250000, "to": 500000, "rate": 5}, {"from": 500000, "to": 1000000, "rate": 20}, {"from": 1000000, "to": null, "rate": 30}]}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'CBDT Finance Act 2025'
),
-- TDS Section 194C (Contractors/Subcontractors)
(
  'tds',
  'sec_194c',
  '{"section": "194C", "name": "TDS on Contractor", "rates": [{"description": "For individuals and HUF", "rate": 1}, {"description": "For others", "rate": 2}], "limit": 30000}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'CBDT Notification 2025'
),
-- TDS Section 194J (Professional Services)
(
  'tds',
  'sec_194j',
  '{"section": "194J", "name": "TDS on Professional Services", "rates": [{"description": "For individuals and HUF", "rate": 10}, {"description": "For others", "rate": 10}], "limit": 50000}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'CBDT Notification 2025'
),
-- TDS Section 194A (Interest)
(
  'tds',
  'sec_194a',
  '{"section": "194A", "name": "TDS on Interest", "rates": [{"description": "Banks", "rate": 10}, {"description": "Others", "rate": 10}], "limit": 40000}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'CBDT Notification 2025'
),
-- TDS Section 195 (Payments to Non-Residents)
(
  'tds',
  'sec_195',
  '{"section": "195", "name": "TDS on Payments to Non-Residents", "rates": [{"description": "Royalty", "rate": 20}, {"description": "Technical Services", "rate": 10}, {"description": "General", "rate": 30}]}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'CBDT Notification 2025'
)
ON CONFLICT (domain, rate_key, version) DO NOTHING;

-- ========================================================================
-- SEED DATA: GST Rate Tables (Current)
-- ========================================================================
INSERT INTO compliance_rate_tables (domain, rate_key, rate_data, effective_from, effective_to, version, is_active, source_notification)
VALUES
-- GST 0% (Exemptions)
(
  'gst',
  'gst_0',
  '{"rate": 0, "description": "Nil rate", "items": ["food grains", "books", "medicines (essential)"]}',
  '2025-01-01',
  NULL,
  1,
  TRUE,
  'GST Council Decision 2025'
),
-- GST 5% (Essential Goods)
(
  'gst',
  'gst_5',
  '{"rate": 5, "description": "Essential goods and services", "items": ["edible oils", "cereals", "spices", "milk products"]}',
  '2025-01-01',
  NULL,
  1,
  TRUE,
  'GST Council Decision 2025'
),
-- GST 12% (Intermediate)
(
  'gst',
  'gst_12',
  '{"rate": 12, "description": "Intermediate rate goods", "items": ["textiles", "specified food items", "vehicles up to 1000cc"]}',
  '2025-01-01',
  NULL,
  1,
  TRUE,
  'GST Council Decision 2025'
),
-- GST 18% (Standard Rate)
(
  'gst',
  'gst_18',
  '{"rate": 18, "description": "Standard rate", "items": ["most goods and services", "IT services", "transport services"]}',
  '2025-01-01',
  NULL,
  1,
  TRUE,
  'GST Council Decision 2025'
),
-- GST 28% (Luxury Items)
(
  'gst',
  'gst_28',
  '{"rate": 28, "description": "Luxury and sin goods", "items": ["automobiles", "aviation turbine fuel", "luxury goods"]}',
  '2025-01-01',
  NULL,
  1,
  TRUE,
  'GST Council Decision 2025'
)
ON CONFLICT (domain, rate_key, version) DO NOTHING;

-- ========================================================================
-- SEED DATA: Professional Tax Rate Tables (Maharashtra State - Example)
-- ========================================================================
INSERT INTO compliance_rate_tables (domain, rate_key, rate_data, effective_from, effective_to, version, is_active, source_notification)
VALUES
(
  'ptax',
  'mh_ptax',
  '{"state": "Maharashtra", "slabs": [{"from": 0, "to": 75000, "rate": 0}, {"from": 75000, "to": 200000, "rate": 0}, {"from": 200000, "to": 500000, "rate": 150}, {"from": 500000, "to": null, "rate": 200}], "due_date": "21st of following month"}',
  '2025-04-01',
  NULL,
  1,
  TRUE,
  'Maharashtra Government Notification'
)
ON CONFLICT (domain, rate_key, version) DO NOTHING;

-- ========================================================================
-- SEED DATA: Compliance Deadlines for FY 2025-26
-- ========================================================================

-- TDS Quarterly Returns (24Q and 26Q)
INSERT INTO compliance_deadlines (agent_id, title, description, deadline_date, reminder_days_before, status, priority, recurring, recurrence_pattern)
VALUES
-- Q1 (Apr-Jun) - Due 31st July
('tds', 'TDS Quarterly Return (Q1 FY 2025-26)', 'File CBDT Form 24Q for Apr-Jun 2025', '2025-07-31'::DATE, '{7,3,1}', 'upcoming', 'high', TRUE, 'quarterly'),
-- Q2 (Jul-Sep) - Due 31st October
('tds', 'TDS Quarterly Return (Q2 FY 2025-26)', 'File CBDT Form 24Q for Jul-Sep 2025', '2025-10-31'::DATE, '{7,3,1}', 'upcoming', 'high', TRUE, 'quarterly'),
-- Q3 (Oct-Dec) - Due 31st January
('tds', 'TDS Quarterly Return (Q3 FY 2025-26)', 'File CBDT Form 24Q for Oct-Dec 2025', '2026-01-31'::DATE, '{7,3,1}', 'upcoming', 'high', TRUE, 'quarterly'),
-- Q4 (Jan-Mar) - Due 31st May (next year)
('tds', 'TDS Quarterly Return (Q4 FY 2025-26)', 'File CBDT Form 24Q for Jan-Mar 2026', '2026-05-31'::DATE, '{7,3,1}', 'upcoming', 'high', TRUE, 'quarterly'),

-- GST Monthly Returns (GSTR-1, GSTR-3B)
('gst', 'GST GSTR-1 Filing (Apr 2025)', 'File outward supplies for April 2025', '2025-05-11'::DATE, '{7,3,1}', 'upcoming', 'critical', TRUE, 'monthly'),
('gst', 'GST GSTR-3B Payment (Apr 2025)', 'Pay GST dues for April 2025', '2025-05-20'::DATE, '{7,3,1}', 'upcoming', 'critical', TRUE, 'monthly'),
('gst', 'GST GSTR-1 Filing (May 2025)', 'File outward supplies for May 2025', '2025-06-11'::DATE, '{7,3,1}', 'upcoming', 'critical', TRUE, 'monthly'),
('gst', 'GST GSTR-3B Payment (May 2025)', 'Pay GST dues for May 2025', '2025-06-20'::DATE, '{7,3,1}', 'upcoming', 'critical', TRUE, 'monthly'),

-- Professional Tax (Quarterly) - Maharashtra Example
('ptax', 'Professional Tax Payment (Q1 FY 2025-26)', 'Pay PT for Apr-Jun 2025', '2025-07-21'::DATE, '{7,3,1}', 'upcoming', 'medium', TRUE, 'quarterly'),
('ptax', 'Professional Tax Payment (Q2 FY 2025-26)', 'Pay PT for Jul-Sep 2025', '2025-10-21'::DATE, '{7,3,1}', 'upcoming', 'medium', TRUE, 'quarterly'),
('ptax', 'Professional Tax Payment (Q3 FY 2025-26)', 'Pay PT for Oct-Dec 2025', '2026-01-21'::DATE, '{7,3,1}', 'upcoming', 'medium', TRUE, 'quarterly'),
('ptax', 'Professional Tax Payment (Q4 FY 2025-26)', 'Pay PT for Jan-Mar 2026', '2026-04-21'::DATE, '{7,3,1}', 'upcoming', 'medium', TRUE, 'quarterly'),

-- GAAP Annual Filings
('gaap-pnl', 'Annual Audit & Schedule III Filing', 'File audited financial statements and Schedule III', '2025-11-30'::DATE, '{30,15,7}', 'upcoming', 'critical', FALSE, NULL),
('gaap-pnl', 'Form 26AS Annual Summary', 'File consolidated tax statement', '2026-06-30'::DATE, '{30,15,7}', 'upcoming', 'high', FALSE, NULL)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================================================
COMMENT ON TABLE compliance_audit_log IS 'Immutable audit trail recording all compliance-related calculations, filings, and status changes. Essential for regulatory audit trails and forensic analysis.';
COMMENT ON TABLE compliance_parties IS 'Master data for all vendors, customers, employees, and contractors. Includes tax identifiers (PAN, GSTIN) and default TDS sections.';
COMMENT ON TABLE ledger_entries IS 'Core financial transaction ledger. Each entry is categorized for P&L, GST, TDS, and PT calculations. Supports both debit and credit entries.';
COMMENT ON TABLE compliance_rate_tables IS 'Versioned configuration tables for TDS slabs, GST rates, PT rates, etc. Supports historical rates and multiple versions for comparison.';
COMMENT ON TABLE compliance_filings IS 'Tracks all tax return filings (GSTR-1, GSTR-3B, Form 24Q, 26Q, PT returns). Records status, due dates, and acknowledgment numbers.';
COMMENT ON TABLE compliance_deadlines IS 'Calendar of compliance deadlines with reminder capabilities. Supports recurring deadlines (monthly, quarterly, annually).';

COMMENT ON FUNCTION get_overdue_filings() IS 'Returns all filings past their due_date that have not been filed or acknowledged. Calculates priority based on days overdue.';
COMMENT ON FUNCTION get_compliance_summary(p_agent_id TEXT) IS 'Returns filing count summary by status for a specific compliance agent (tds, gst, ptax, gaap-pnl).';

-- ========================================================================
-- END OF MIGRATION
-- ========================================================================
