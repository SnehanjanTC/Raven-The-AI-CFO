# Week 3.2 + 3.4 Integration Guide

## What Was Built

This is the implementation of **Week 3.2 + 3.4** of the Raven roadmap:
- Metrics computation engine
- Manual data entry tools
- Real-time financial context injection into Claude's system prompt

## New Files Created

### Backend Services
1. **`backend/app/services/metrics.py`** (NEW)
   - Core metrics computation from transaction data
   - Functions: `compute_all_metrics()`, `compute_monthly_series()`, `get_expense_breakdown()`
   - Uses Supabase REST API (httpx)

2. **`backend/app/services/context_builder.py`** (NEW)
   - Financial context assembly for Claude
   - Functions: `build_financial_context()`, `format_context_for_prompt()`
   - Fetches metrics, recent transactions, user metadata

### Updated Files
3. **`backend/app/services/system_prompt.py`** (UPDATED)
   - Added `financial_snapshot` parameter to `build_system_prompt()`
   - Now supports real-time context injection

4. **`backend/app/services/tools.py`** (UPDATED)
   - Updated `get_metrics()` to use new metrics engine
   - Added `update_metrics()` tool handler
   - Added `add_transaction()` tool handler
   - Both return confirmation cards for manual entry workflows

5. **`backend/app/api/v1/endpoints/chat.py`** (UPDATED)
   - Added `update_metrics` and `add_transaction` tool definitions
   - Updated `execute_tool()` to handle new tools
   - Integrated `build_financial_context()` into `stream_chat_with_tools()`
   - Now injects real financial data into every chat message

6. **`backend/app/core/config.py`** (UPDATED)
   - Added `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` settings

### Tests
7. **`backend/tests/test_metrics.py`** (NEW)
   - Unit tests for metrics computation
   - Tests for classification logic, calculations, context formatting
   - Edge case handling

### Documentation
8. **`backend/METRICS_ENGINE.md`** (NEW)
   - Complete API documentation
   - Architecture overview
   - Data flow diagrams
   - Configuration guide

## How to Integrate

### 1. Update Environment Variables

Add to `.env`:
```env
# Supabase REST API credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

To get these:
- Go to Supabase dashboard → Project Settings → API
- Copy "Project URL" → `SUPABASE_URL`
- Copy "service_role secret" (NOT anon key) → `SUPABASE_SERVICE_KEY`

### 2. Verify Database Schema

Ensure Supabase has these tables (from `supabase_schema.sql`):

```sql
-- transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  status TEXT DEFAULT 'cleared',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- users table (for metadata)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  company_name TEXT,
  startup_stage TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 3. Install Dependencies

No new dependencies needed - `httpx` is already in `requirements.txt`.

```bash
pip install -r backend/requirements.txt
```

### 4. Test the Implementation

Run the test suite:
```bash
pytest backend/tests/test_metrics.py -v
```

Expected output:
```
test_metrics.py::TestComputeAllMetrics::test_compute_metrics_with_no_transactions PASSED
test_metrics.py::TestComputeAllMetrics::test_revenue_classification_logic PASSED
test_metrics.py::TestComputeMonthlySeriesLogic::test_monthly_aggregation PASSED
...
```

## Testing Locally

### 1. Start the Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 2. Test via Chat Endpoint

With curl:
```bash
curl -X POST http://localhost:8000/v1/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is my MRR?"}
    ]
  }'
```

The response will be an SSE stream:
```
data: {"type": "text_delta", "content": "Your MRR is..."}
data: {"type": "done"}
```

### 3. Test Manual Entry

Claude can now call tools directly. In a chat:
```
User: "I just got a $5000 payment from Acme Corp"

Claude will call:
→ add_transaction(
    date="2026-04-23",
    description="Acme Corp Payment",
    amount=5000,
    type="income",
    category="Revenue"
  )

Response: {"status": "confirmed", "message": "Transaction recorded..."}
```

## API Contracts

### New Tools Available to Claude

#### 1. `update_metrics`
```json
{
  "name": "update_metrics",
  "description": "Update financial metrics manually",
  "input_schema": {
    "properties": {
      "mrr": {"type": "number"},
      "monthly_expenses": {"type": "number"},
      "cash_balance": {"type": "number"},
      "company_name": {"type": "string"},
      "startup_stage": {"type": "string", "enum": ["pre-revenue", "early", "scaling", "growth"]}
    }
  }
}
```

#### 2. `add_transaction`
```json
{
  "name": "add_transaction",
  "description": "Record a new transaction",
  "input_schema": {
    "properties": {
      "date": {"type": "string", "description": "YYYY-MM-DD format"},
      "description": {"type": "string"},
      "amount": {"type": "number"},
      "type": {"type": "string", "enum": ["income", "expense"]},
      "category": {"type": "string"}
    },
    "required": ["date", "description", "amount", "type", "category"]
  }
}
```

### Context Injection Example

Every chat message now includes real financial data:

```
System Prompt:
"You are the AI CFO for a solo founder...

## CURRENT FINANCIAL SNAPSHOT

**MRR**: $24,200.00 (+8.1% MoM)
**Monthly Expenses**: $18,400.00 (+2.3% MoM)
**Net Burn**: -$5,800.00 (revenue exceeds expenses)
**Cash Balance**: $252,000.00
**Runway**: 14.2 months

## RECENT TRANSACTIONS (Last 10)
- 2026-04-20: AWS Infrastructure - $2,400.00 (expense)
- 2026-04-18: Stripe Revenue - $3,200.00 (income)
..."
```

## Architecture Decisions

### Why Supabase REST API instead of SQLAlchemy?

The new metrics engine uses httpx + Supabase REST API instead of SQLAlchemy for:
- **Decoupling**: Metrics engine doesn't depend on FastAPI/SQLAlchemy models
- **Reusability**: Can be called from other contexts (background jobs, webhooks)
- **Consistency**: Direct database access, not through ORM
- **Efficiency**: Simpler query building, no ORM overhead

The tools still use SQLAlchemy as fallback for backwards compatibility.

### Classification System

Transactions are classified by **category keywords** rather than explicit type enums:
- Revenue: contains `revenue`, `subscription`, `stripe`, etc.
- COGS: contains `cogs`, `infrastructure`, `cloud`, etc.
- Expenses: everything with type=`debit`

This is **flexible** (users can enter any category) while still being **smart** (system understands common patterns).

### Financial Context in System Prompt

Rather than passing individual metrics, the system prompt now receives a **formatted snapshot**:
- Makes context more understandable to Claude
- Reduces token usage vs. raw JSON
- Allows highlighting key insights (e.g., "PROFITABLE")
- Is human-readable for debugging

## Data Flow

```
User Message
    ↓
Chat Endpoint (POST /v1/chat)
    ↓
build_financial_context() [Supabase]
    ├→ compute_all_metrics(transactions)
    ├→ fetch_recent_transactions()
    └→ fetch_user_metadata()
    ↓
format_context_for_prompt() [Python]
    ↓
build_system_prompt(financial_snapshot=...)
    ↓
Claude API (with real data injected)
    ├→ Tool: get_metrics → compute_all_metrics()
    ├→ Tool: add_transaction → Supabase INSERT
    ├→ Tool: update_metrics → Supabase PATCH
    └→ Tool: run_scenario → local calculation
    ↓
Response to User
```

## Metrics Computed

| Metric | Formula | Use Case |
|--------|---------|----------|
| MRR | Sum of revenue in current month | Key business metric |
| ARR | MRR × 12 | Annual revenue projection |
| Monthly Expenses | Sum of debits in current month | Burn rate tracking |
| Net Burn | Expenses - Revenue | Profitability indicator |
| Gross Burn | Just expenses | Cash efficiency |
| Cash Balance | Revenue - Expenses (cumulative) | Liquidity check |
| Runway | Cash / Net Burn (months) | Time to profitability |
| Gross Margin | (Revenue - COGS) / Revenue | Product efficiency |
| Net Margin | (Revenue - Expenses) / Revenue | Overall profitability |
| MoM Growth | (Current - Previous) / Previous | Growth trend |

## Error Handling

The engine gracefully handles:
- No transactions → all metrics = 0
- Division by zero → safe defaults
- Supabase API errors → logged, continues
- Invalid dates → skipped with logging
- Missing categories → defaults to "Other"
- Profitable companies → runway = ∞

## Performance Considerations

### Supabase Queries
- `fetch_from_supabase()` uses simple REST API calls
- No complex joins or aggregations (done in Python)
- ~50-100ms per user per chat message (Supabase latency)

### Optimization Opportunities
1. **Caching**: Cache metrics for 5-10 minutes per user
2. **Batch Aggregation**: Pre-compute daily rollups in Supabase
3. **Materialized Views**: Pre-aggregated monthly summaries
4. **Background Jobs**: Compute metrics async, cache result

For MVP, the current implementation is sufficient. Optimize if needed.

## Security Considerations

### API Authentication
- Supabase service key is server-side only (never exposed to client)
- All requests include user_id filtering
- RLS policies enforce user isolation in Supabase

### Data Validation
- Amount must be numeric
- Date must be valid ISO format
- Category is user-provided (allow flexibility)
- Type must be "income" or "expense"

### Sensitive Data
- No SSN, bank account numbers, or PII in transactions
- Transactions are financial data only
- User can control what's recorded

## Next Steps

### Week 3.3 (following)
- CSV import with reconciliation
- Data validation and cleanup
- Bulk transaction upload

### Week 4.1
- Dashboard with metric cards
- Trend charts and visualizations
- Spending analysis

### Week 4.2+
- Alerts and thresholds
- Forecasting and projections
- Report generation

## Rollback Plan

If needed, the system is backwards compatible:
- `get_metrics()` falls back to SQLAlchemy if Supabase credentials missing
- System prompt still works without `financial_snapshot`
- `execute_tool()` returns error if Supabase unavailable

To disable new features:
```bash
# Don't set SUPABASE_URL and SUPABASE_SERVICE_KEY
# System reverts to legacy mode automatically
```

## Questions & Troubleshooting

### Q: Why does the context change every message?
A: It's recomputed fresh from Supabase every chat. This is intentional - real-time data is more valuable than cached data. Can optimize with caching if needed.

### Q: Can I use this without Supabase?
A: Yes, the old SQLAlchemy path still works. Set `compute_all_metrics()` is Supabase-specific, but tools still work via SQLAlchemy fallback.

### Q: What transaction categories are supported?
A: Any text is valid. Recommended: "Revenue", "SaaS", "Salary", "AWS", "Stripe", "Office Rent", "Marketing", etc. The engine recognizes common keywords for classification.

### Q: How does the engine know what's revenue vs. expense?
A: By transaction type (`income`/`expense`) and category keywords. If the system misclassifies, just edit the transaction category.

## Files Reference

```
backend/
├── app/
│   ├── services/
│   │   ├── metrics.py              [NEW] Computation engine
│   │   ├── context_builder.py       [NEW] Context assembly
│   │   ├── system_prompt.py         [UPDATED] Prompt building
│   │   └── tools.py                 [UPDATED] Tool handlers
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           └── chat.py          [UPDATED] Chat integration
│   └── core/
│       └── config.py                [UPDATED] Settings
├── tests/
│   └── test_metrics.py              [NEW] Unit tests
├── METRICS_ENGINE.md                [NEW] API docs
└── INTEGRATION_GUIDE.md             [NEW] This file
```

## Support

For issues:
1. Check logs: `uvicorn app.main:app --reload --log-level debug`
2. Run tests: `pytest backend/tests/test_metrics.py -v`
3. Verify Supabase connection: Check env vars and RLS policies
4. Review METRICS_ENGINE.md for detailed API docs
