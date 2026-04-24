# Raven Control Plane — Implementation Plan

> Transform Raven from a financial dashboard into an **agentic finance control plane** that orchestrates, governs, and automates an organization's entire financial stack.

## Architecture Principles

- **Agent-Native**: Every pillar has a dedicated AI agent that can reason, act, and escalate
- **Human-in-the-Loop**: Agents propose, humans approve (configurable autonomy levels)
- **Event-Driven**: All state changes emit events; agents subscribe and react
- **Policy-as-Code**: Financial rules are declarative, versionable, auditable
- **Multi-Tenant**: Org isolation at every layer (data, agents, policies)

---

## Phase 1: RBAC & Org Structure

**Goal**: Multi-tenant org model with hierarchical roles, teams, and granular permissions.

### 1.1 Data Model

- [ ] `organizations` table — id, name, slug, plan, settings_json, created_at
- [ ] `org_members` table — org_id, user_id, role, department, invited_by, joined_at
- [ ] `roles` table — org_id, name, permissions_json, is_system (built-in vs custom)
- [ ] `invitations` table — org_id, email, role, token, expires_at, accepted_at
- [ ] `departments` table — org_id, name, parent_id (tree structure), head_user_id, budget_id

### 1.2 Built-in Roles

| Role | Permissions |
|------|------------|
| Owner | Full control, billing, delete org |
| CFO | All finance ops, approve any amount, manage policies |
| Controller | Ledger CRUD, approve < policy limit, run reports |
| Analyst | Read-only dashboards, run scenarios, export |
| Auditor | Read-only everything + audit logs, compliance reports |
| Agent Operator | Deploy/manage AI agents, view agent logs |

### 1.3 Backend Endpoints

- [ ] `POST /api/v1/orgs/` — Create organization
- [ ] `GET /api/v1/orgs/:id` — Get org details
- [ ] `POST /api/v1/orgs/:id/invite` — Invite member by email
- [ ] `POST /api/v1/orgs/:id/members` — Accept invite / join
- [ ] `PATCH /api/v1/orgs/:id/members/:uid` — Change role
- [ ] `DELETE /api/v1/orgs/:id/members/:uid` — Remove member
- [ ] `GET /api/v1/orgs/:id/members` — List members with roles
- [ ] `POST /api/v1/orgs/:id/roles` — Create custom role
- [ ] `POST /api/v1/orgs/:id/departments` — Create department

### 1.4 Frontend

- [ ] Org switcher in top nav (for users in multiple orgs)
- [ ] Settings > Team Management page — invite, assign roles, manage departments
- [ ] Permission gate HOC — `<RequireRole role="cfo">` wrapper component
- [ ] Onboarding flow — create org, invite team, connect first integration

### 1.5 Agentic: Org Intelligence Agent

- [ ] Auto-suggest role assignments based on user activity patterns
- [ ] Detect permission gaps ("User X accesses ledger daily but has Analyst role")
- [ ] Onboarding assistant — walks new orgs through setup via chat

---

## Phase 2: Approval Workflows

**Goal**: Configurable, policy-driven approval chains with AI routing and escalation.

### 2.1 Data Model

- [ ] `approval_policies` — org_id, name, entity_type (expense/payment/budget), conditions_json, chain_json, is_active
- [ ] `approval_requests` — org_id, policy_id, entity_type, entity_id, amount, requested_by, status (pending/approved/rejected/escalated), metadata_json
- [ ] `approval_steps` — request_id, step_order, approver_id, status, decided_at, comment, auto_approved_by_agent
- [ ] `approval_delegations` — org_id, delegator_id, delegate_id, valid_from, valid_to, max_amount

### 2.2 Policy Engine

- [ ] Condition DSL: `{ "field": "amount", "op": ">", "value": 10000 }` — composable rules
- [ ] Chain definition: `[{ "role": "manager" }, { "role": "cfo", "if": "amount > 50000" }]`
- [ ] Auto-approve rules: `{ "category": "SaaS", "amount_lt": 500, "action": "auto_approve" }`
- [ ] Escalation rules: `{ "pending_hours": 48, "action": "escalate_to_cfo" }`
- [ ] Delegation support: CFO delegates to Controller for vacation period

### 2.3 Backend Endpoints

- [ ] `POST /api/v1/approvals/policies` — Create/update approval policy
- [ ] `GET /api/v1/approvals/policies` — List active policies
- [ ] `POST /api/v1/approvals/request` — Submit for approval (auto-routes based on policy)
- [ ] `POST /api/v1/approvals/:id/approve` — Approve step
- [ ] `POST /api/v1/approvals/:id/reject` — Reject with reason
- [ ] `GET /api/v1/approvals/pending` — My pending approvals
- [ ] `GET /api/v1/approvals/history` — Audit trail of all decisions
- [ ] `POST /api/v1/approvals/delegate` — Set delegation

### 2.4 Frontend

- [ ] Approval inbox — pending items with one-click approve/reject
- [ ] Policy builder UI — visual drag-and-drop chain constructor
- [ ] Approval status badges on transactions, expenses, payments
- [ ] Push notifications for pending approvals
- [ ] Approval timeline view — who approved what, when, with comments

### 2.5 Agentic: Approval Agent

- [ ] Pre-screen requests: flag anomalies before human review ("This vendor invoice is 3x the usual amount")
- [ ] Auto-approve low-risk items based on learned patterns + policy
- [ ] Smart routing: route to available approver (skip OOO, respect delegation)
- [ ] Escalation bot: nudge approvers after SLA, auto-escalate if overdue
- [ ] Summary digest: daily email/Slack with pending approvals and recommended actions

---

## Phase 3: Budget & Policy Engine

**Goal**: Set, track, and enforce budgets at org/department/project level with AI-powered forecasting.

### 3.1 Data Model

- [ ] `budgets` — org_id, department_id, category, period (monthly/quarterly/annual), amount, spent, remaining, status
- [ ] `budget_rules` — budget_id, rule_type (hard_cap/soft_cap/alert), threshold_percent, action (block/alert/escalate)
- [ ] `spending_policies` — org_id, name, rules_json (max per transaction, allowed categories, vendor whitelist)
- [ ] `policy_violations` — org_id, policy_id, entity_type, entity_id, violation_type, severity, resolved_by, resolved_at
- [ ] `forecasts` — org_id, department_id, period, predicted_spend, confidence, model_version, factors_json

### 3.2 Policy Types

| Policy | Description | Action |
|--------|-------------|--------|
| Hard Budget Cap | Block spending over limit | Reject transaction |
| Soft Budget Cap | Allow but alert | Notify CFO + log violation |
| Per-Transaction Limit | Max single spend | Route to approval if exceeded |
| Category Restriction | Block certain categories | Reject + notify |
| Vendor Whitelist | Only approved vendors | Block + flag for review |
| Velocity Check | Too many transactions in period | Pause + alert |

### 3.3 Backend Endpoints

- [ ] `POST /api/v1/budgets/` — Create budget for department/category
- [ ] `GET /api/v1/budgets/` — List budgets with burn-down
- [ ] `GET /api/v1/budgets/:id/forecast` — AI-generated spend forecast
- [ ] `POST /api/v1/policies/spending` — Create spending policy
- [ ] `GET /api/v1/policies/violations` — List policy violations
- [ ] `POST /api/v1/policies/check` — Pre-check a transaction against all policies
- [ ] `GET /api/v1/budgets/health` — Org-wide budget health score

### 3.4 Frontend

- [ ] Budget dashboard — per-department burn-down charts, forecasts, variance
- [ ] Policy management page — create/edit spending policies with visual rule builder
- [ ] Violation feed — real-time stream of policy violations with severity
- [ ] Budget allocation view — treemap of org spending by department
- [ ] Forecast overlay on Scenarios page — "what if engineering budget increases 20%?"

### 3.5 Agentic: Budget Guardian Agent

- [ ] Proactive alerts: "Engineering is at 82% of Q2 budget with 6 weeks left"
- [ ] Forecast accuracy: continuously train on historical spend patterns
- [ ] Anomaly detection: "Marketing spend spiked 40% vs. prior month — investigate?"
- [ ] Reallocation suggestions: "Sales is 30% under budget — reallocate $50k to Engineering?"
- [ ] Policy recommendations: "Based on last 6 months, suggest adding a $5k per-transaction limit for Contractors"

---

## Phase 4: Unified Ledger & Bidirectional Sync

**Goal**: Raven as the **source of truth** for all financial data, with bidirectional sync to external systems.

### 4.1 Data Model

- [ ] `ledger_entries` — org_id, entry_id, date, account_debit, account_credit, amount, currency, description, source (manual/sync/agent), external_refs_json, reconciliation_status
- [ ] `chart_of_accounts` — org_id, code, name, type (asset/liability/equity/revenue/expense), parent_id, is_active
- [ ] `sync_connections` — org_id, provider, direction (inbound/outbound/bidirectional), last_sync, status, config_json, error_log
- [ ] `sync_queue` — connection_id, operation (create/update/delete), entity_type, entity_id, payload_json, status (pending/synced/failed/conflict), retry_count
- [ ] `reconciliation_rules` — org_id, name, match_criteria_json (amount tolerance, date window, description fuzzy match), auto_reconcile

### 4.2 Sync Architecture

```
External Systems                    Raven Control Plane
+-----------+                       +------------------+
| Tally     | <--- Sync Agent --->  | Unified Ledger   |
| Zoho      | <--- Sync Agent --->  | (Source of Truth) |
| QuickBooks| <--- Sync Agent --->  |                  |
| Stripe    | <--- Webhook ------>  | Reconciliation   |
| Bank Feed | <--- Import ------->  | Engine           |
+-----------+                       +------------------+
```

### 4.3 Backend Endpoints

- [ ] `POST /api/v1/ledger/entries` — Create ledger entry (double-entry)
- [ ] `GET /api/v1/ledger/entries` — Query with filters, date range, account
- [ ] `GET /api/v1/ledger/trial-balance` — Generated trial balance
- [ ] `GET /api/v1/ledger/p-and-l` — Generated P&L statement
- [ ] `GET /api/v1/ledger/balance-sheet` — Generated balance sheet
- [ ] `POST /api/v1/sync/connections` — Set up sync connection
- [ ] `POST /api/v1/sync/trigger/:connection_id` — Manual sync trigger
- [ ] `GET /api/v1/sync/status` — All connection statuses
- [ ] `GET /api/v1/sync/conflicts` — Unresolved sync conflicts
- [ ] `POST /api/v1/reconciliation/auto` — Run auto-reconciliation
- [ ] `POST /api/v1/reconciliation/manual` — Manual match/unmatch
- [ ] `GET /api/v1/accounts/chart` — Chart of accounts

### 4.4 Frontend

- [ ] Ledger view — double-entry journal with drill-down
- [ ] Chart of Accounts manager — tree view, create/edit accounts
- [ ] Reconciliation workspace — side-by-side unmatched entries, drag-to-match
- [ ] Sync dashboard — connection health, last sync, error counts, queue depth
- [ ] Conflict resolution UI — show diffs, pick winner, bulk resolve

### 4.5 Agentic: Sync Orchestrator Agent

- [ ] Auto-reconcile: match entries across systems using fuzzy logic + ML
- [ ] Conflict resolution: "Tally says $5,000, Stripe says $4,980 — likely FX difference, auto-adjust?"
- [ ] Sync health monitoring: detect drift, alert on failures, auto-retry with backoff
- [ ] Data enrichment: auto-categorize imported transactions using LLM
- [ ] Schema mapping: learn field mappings between Raven and external systems

---

## Phase 5: Audit & Compliance Automation

**Goal**: Immutable audit trail, automated compliance checks, and agent-driven filing workflows.

### 5.1 Data Model

- [ ] `audit_log` — org_id, timestamp, actor_id, actor_type (user/agent/system), action, entity_type, entity_id, before_json, after_json, ip_address, session_id (immutable, append-only)
- [ ] `compliance_rules` — org_id, jurisdiction, rule_code, description, check_fn, severity, auto_fix_fn
- [ ] `compliance_checks` — org_id, rule_id, entity_type, entity_id, status (pass/fail/warning), details_json, checked_at, checked_by (agent_id)
- [ ] `filing_workflows` — org_id, filing_type (GST/TDS/PT/ROC), period, status (upcoming/in_progress/filed/overdue), due_date, filed_date, agent_id, documents_json
- [ ] `compliance_score` — org_id, period, score, breakdown_json (per-rule scores), trend

### 5.2 Compliance Rules Engine

| Rule | Jurisdiction | Auto-Check | Agent Action |
|------|-------------|------------|-------------|
| GST return filed | India | Monthly | Prepare GSTR-1/3B draft, alert if overdue |
| TDS deposited by 7th | India | Monthly | Calculate, prepare challan, alert |
| Invoice numbering sequential | Universal | Real-time | Flag gaps, suggest corrections |
| Revenue recognition (AS-9) | India | Quarterly | Validate recognition timing |
| Expense documentation | Universal | Real-time | Flag expenses without receipts |
| Related party transactions | India | Real-time | Detect and flag for Board review |
| Transfer pricing compliance | India | Annual | Alert for international transactions |

### 5.3 Backend Endpoints

- [ ] `GET /api/v1/audit/log` — Query audit log (immutable, never delete)
- [ ] `GET /api/v1/audit/entity/:type/:id` — Full history of an entity
- [ ] `GET /api/v1/audit/actor/:id` — All actions by a user/agent
- [ ] `POST /api/v1/compliance/check/run` — Run all compliance checks
- [ ] `GET /api/v1/compliance/score` — Org compliance health score
- [ ] `GET /api/v1/compliance/violations` — Active compliance violations
- [ ] `POST /api/v1/filings/` — Create filing workflow
- [ ] `GET /api/v1/filings/calendar` — Filing calendar with deadlines
- [ ] `POST /api/v1/filings/:id/submit` — Mark filing as submitted
- [ ] `GET /api/v1/filings/overdue` — Overdue filings

### 5.4 Frontend

- [ ] Audit log viewer — searchable, filterable, with entity drill-down and diff view
- [ ] Compliance dashboard — health score gauge, rule-by-rule breakdown, trend chart
- [ ] Filing calendar — visual calendar with color-coded status, countdown timers
- [ ] Violation resolution center — grouped by severity, one-click fix for auto-fixable
- [ ] Compliance report generator — board-ready compliance summary PDF

### 5.5 Agentic: Compliance Agent

- [ ] Continuous monitoring: run checks on every ledger entry, flag instantly
- [ ] Filing autopilot: prepare filing drafts automatically, submit for CFO review
- [ ] Deadline management: progressive alerts (7 days, 3 days, 1 day, overdue)
- [ ] Regulatory updates: monitor for rule changes, suggest policy updates
- [ ] Audit preparation: when auditor role user logs in, pre-generate audit packages
- [ ] Cross-check agent: verify internal records match government portal data

---

## Phase 6: Observability & Alerts

**Goal**: Real-time financial observability with intelligent alerting and agent-triggered remediation.

### 6.1 Data Model

- [ ] `alert_rules` — org_id, name, metric, condition_json, severity (info/warning/critical), channels_json (email/slack/in-app), cooldown_minutes, is_active
- [ ] `alerts` — org_id, rule_id, triggered_at, severity, title, details_json, status (active/acknowledged/resolved), resolved_by, resolved_at
- [ ] `metric_snapshots` — org_id, metric_name, value, timestamp (time-series for trend analysis)
- [ ] `anomaly_detections` — org_id, metric, expected_value, actual_value, deviation_percent, confidence, agent_analysis, recommended_action
- [ ] `remediation_actions` — alert_id, action_type (notify/pause/escalate/auto_fix), status, executed_by (agent_id), result_json

### 6.2 Built-in Alert Rules

| Alert | Condition | Severity | Agent Action |
|-------|-----------|----------|-------------|
| Burn rate spike | >20% increase MoM | Critical | Analyze top expense categories, suggest cuts |
| Budget breach | Department >90% of budget | Warning | Notify dept head + CFO, project overage date |
| Cash runway low | <6 months at current burn | Critical | Generate emergency report, suggest actions |
| Invoice overdue | >30 days past due | Warning | Send reminder, escalate to collections agent |
| Unusual transaction | Amount >3 std dev from mean | Warning | Hold for review, enrich with context |
| Sync failure | Integration down >1 hour | Critical | Auto-retry, alert ops, activate fallback |
| Compliance deadline | Filing due in <3 days | Warning | Prepare draft, notify responsible party |
| Revenue drop | MRR decreased >10% | Critical | Analyze churn, segment impact, alert CEO |

### 6.3 Backend Endpoints

- [ ] `POST /api/v1/alerts/rules` — Create alert rule
- [ ] `GET /api/v1/alerts/rules` — List alert rules
- [ ] `GET /api/v1/alerts/active` — Active alerts
- [ ] `POST /api/v1/alerts/:id/acknowledge` — Acknowledge alert
- [ ] `POST /api/v1/alerts/:id/resolve` — Resolve with notes
- [ ] `GET /api/v1/observability/metrics` — Current metric values
- [ ] `GET /api/v1/observability/timeline/:metric` — Time-series for a metric
- [ ] `GET /api/v1/observability/anomalies` — Detected anomalies with agent analysis
- [ ] `POST /api/v1/observability/snapshot` — Trigger metric snapshot (cron or manual)

### 6.4 Frontend

- [ ] Alert center — grouped by severity, acknowledge/resolve flow, timeline
- [ ] Observability dashboard — real-time metric cards with sparklines and trend arrows
- [ ] Anomaly feed — AI-analyzed anomalies with recommended actions
- [ ] Alert rule builder — visual condition builder with preview
- [ ] Notification preferences — per-user channel config (email, Slack, in-app, SMS)
- [ ] Status page — system health, integration statuses, agent uptime

### 6.5 Agentic: Watchdog Agent

- [ ] Real-time metric monitoring with sliding window analysis
- [ ] Anomaly detection using statistical + LLM reasoning ("This isn't just a spike — vendor X changed pricing")
- [ ] Root cause analysis: trace anomaly back to specific transactions/events
- [ ] Remediation suggestions: "Pause non-essential SaaS subscriptions to extend runway by 2 months"
- [ ] Predictive alerts: "At current trajectory, Engineering will breach budget by March 15"
- [ ] Cross-metric correlation: "Revenue dip correlates with support ticket spike — possible product issue"

---

## Agent Architecture

All agents share a common runtime:

```
+-----------------------------------------------------+
|                   Agent Runtime                       |
|  +----------+  +----------+  +----------+            |
|  | Org Intel |  | Approval |  | Budget   |            |
|  | Agent     |  | Agent    |  | Guardian |            |
|  +----------+  +----------+  +----------+            |
|  +----------+  +----------+  +----------+            |
|  | Sync      |  | Compliance| | Watchdog |            |
|  | Orchestr. |  | Agent    |  | Agent    |            |
|  +----------+  +----------+  +----------+            |
|                                                       |
|  Shared: Event Bus | Tool Registry | Memory Store     |
|  Shared: Permission Boundary | Audit Logger           |
+-----------------------------------------------------+
```

### Agent Capabilities

- [ ] **Event Subscriptions**: Each agent subscribes to relevant domain events
- [ ] **Tool Use**: Agents can call internal APIs, run queries, send notifications
- [ ] **Memory**: Per-agent memory for learned patterns, preferences, context
- [ ] **Autonomy Levels**: Configurable per-org (inform only / suggest / act with approval / fully autonomous)
- [ ] **Agent-to-Agent**: Agents can delegate to each other (Watchdog detects anomaly -> Budget Guardian investigates)
- [ ] **Human Escalation**: All agents can escalate to humans with full context

---

## Implementation Order

```
Phase 1 (RBAC)           ████████░░░░░░░░░░░░  Foundation
Phase 2 (Approvals)      ░░░░████████░░░░░░░░  Depends on Phase 1
Phase 3 (Budgets)        ░░░░░░░░████████░░░░  Depends on Phase 1
Phase 4 (Ledger)         ░░░░░░░░████████░░░░  Parallel with Phase 3
Phase 5 (Compliance)     ░░░░░░░░░░░░████████  Depends on Phase 4
Phase 6 (Observability)  ░░░░░░░░░░░░░░██████  Depends on all
Agent Runtime            ░░░░████████████████  Incremental across all
```

Phase 1 is the foundation — everything else depends on org/role scoping.
Phases 3 & 4 can run in parallel.
Phase 6 ties everything together.
Agent runtime grows incrementally with each phase.
