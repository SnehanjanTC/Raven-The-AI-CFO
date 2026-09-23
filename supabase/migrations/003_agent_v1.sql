-- Agentic v1 — ports Conformity's safety-rail patterns onto Raven's chat agent.
--
-- Two new tables:
--   agent_actions   — audit log of every tool call the agent makes
--   agent_proposals — pending AI writes; a proposal must be human-approved
--                     before it commits to the real transactions/metrics tables.
--
-- The service-layer invariant (see backend/app/services/proposals.py) is that
-- committed writes to transactions/metrics happen ONLY when a proposal is
-- approved. This mirrors Conformity's "OrgControlStatus.compliant is written
-- only in review.ts" rule.

-- ---------------------------------------------------------------------------
-- agent_actions: append-only audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,                       -- e.g. 'agent:claude', 'user:<uuid>'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,                   -- e.g. 'get_metrics', 'add_transaction'
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,                              -- null if the call errored
  error TEXT,                                -- populated when the tool errored
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_created
  ON agent_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_conversation
  ON agent_actions(conversation_id, created_at DESC);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agent_actions" ON agent_actions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Only the service role writes here (backend uses SUPABASE_SERVICE_KEY).
-- No client-side INSERT policy on purpose.


-- ---------------------------------------------------------------------------
-- agent_proposals: pending AI writes awaiting human sign-off
-- ---------------------------------------------------------------------------
CREATE TYPE agent_proposal_kind AS ENUM (
  'add_transaction',
  'update_metric'
);

CREATE TYPE agent_proposal_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

CREATE TABLE IF NOT EXISTS agent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  kind agent_proposal_kind NOT NULL,
  status agent_proposal_status NOT NULL DEFAULT 'pending',
  proposed_by TEXT NOT NULL,                 -- e.g. 'agent:claude'
  reason TEXT,                               -- the agent's rationale (audit)
  payload JSONB NOT NULL,                    -- the actual write we would make
  committed_id UUID,                         -- the resulting row's id, once approved
  reviewed_by TEXT,                          -- e.g. 'user:<uuid>' when approved/rejected
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,                        -- optional human comment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_proposals_user_status
  ON agent_proposals(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_pending
  ON agent_proposals(user_id, created_at DESC) WHERE status = 'pending';

ALTER TABLE agent_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agent_proposals" ON agent_proposals
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Writes go through the service role. Approve/reject happens via a backend
-- endpoint that verifies the auth.uid() and then calls the service role.


-- ---------------------------------------------------------------------------
-- Optional: seed a "recently reviewed" convenience view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW agent_proposals_recent AS
  SELECT
    id, user_id, conversation_id, kind, status,
    proposed_by, reason, payload, reviewed_by, reviewed_at,
    created_at
  FROM agent_proposals
  WHERE created_at > now() - interval '30 days'
  ORDER BY created_at DESC;
