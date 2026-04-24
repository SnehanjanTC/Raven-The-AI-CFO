-- Agents table schema for FinOS
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'syncing')),
  last_active TEXT,
  last_active_type TEXT CHECK (last_active_type IN ('error', 'success', 'warning', 'info')),
  type TEXT NOT NULL CHECK (type IN ('strategic', 'analytical', 'high-priority', 'standard')),
  icon_name TEXT NOT NULL,
  bg TEXT,
  color TEXT,
  insight TEXT,
  is_priority BOOLEAN DEFAULT false,
  metrics JSONB
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- metrics table: Real-time financial data
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  change TEXT,
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  subtext TEXT,
  category TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reports table: Generated documents
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  period TEXT,
  version TEXT,
  status TEXT CHECK (status IN ('generated', 'approved', 'draft', 'failed')),
  date DATE DEFAULT CURRENT_DATE,
  icon TEXT DEFAULT 'FileText',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- scenarios table: Projected stress tests
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  probability TEXT,
  impact TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'pending')),
  description TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- transactions table: Audit ledger entries
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared', 'pending', 'flagged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- activity_log table: Platform-wide events
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT DEFAULT 'info'
);

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users only
-- Read access for authenticated users
CREATE POLICY "Authenticated read agents" ON agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write agents" ON agents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read metrics" ON metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read reports" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write reports" ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read scenarios" ON scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write scenarios" ON scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read activity_log" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write activity_log" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read transactions" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write transactions" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon read-only for public demo (remove in production if not needed)
CREATE POLICY "Anon read metrics" ON metrics FOR SELECT TO anon USING (true);

-- Seed Initial Data
INSERT INTO metrics (label, value, change, trend, subtext, category) VALUES
('Cash Balance', '$4,280,450.00', '12.4%', 'up', 'vs. last month', 'financial'),
('Monthly Burn', '$232,500.00', '-2.1%', 'down', 'optimized', 'financial'),
('Runway', '18.4 Mo', 'Stable', 'stable', 'at current burn', 'financial'),
('ARR Projection', '$10.7M', '+5.2%', 'up', 'Q4 target', 'financial')
ON CONFLICT (label) DO NOTHING;

INSERT INTO reports (name, type, period, version, status, date, icon) VALUES
('Monthly Financial Operations Review', 'Master Audit Document', 'Jun 2024 - Jul 2024', 'v4.2.0', 'approved', '2024-07-15', 'FileText'),
('Tax Compliance & Liability Table', 'Government Submission Draft', 'FY 2023 - 2024', 'v1.0.4', 'generated', '2024-07-12', 'Table'),
('Asset Depreciation Spreadsheet', 'Fixed Assets Ledger', 'Q4 2023', 'v2.1.0', 'draft', '2024-07-10', 'FileSpreadsheet')
ON CONFLICT DO NOTHING;

-- Seed transaction data
INSERT INTO transactions (date, description, category, amount, type, status) VALUES
('2024-07-20', 'AWS Infrastructure', 'Cloud', 1240.50, 'expense', 'cleared'),
('2024-07-19', 'Stripe Payout', 'Revenue', 45000.00, 'income', 'cleared'),
('2024-07-18', 'Office Rent - WeWork', 'Utilities', 4500.00, 'expense', 'pending'),
('2024-07-17', 'Google Cloud Platform', 'Cloud', 890.00, 'expense', 'cleared'),
('2024-07-16', 'Customer Payment - Acme Corp', 'Revenue', 12500.00, 'income', 'cleared')
ON CONFLICT DO NOTHING;
