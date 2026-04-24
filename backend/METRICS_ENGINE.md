# Raven Metrics Computation Engine

## Overview

The metrics computation engine is the financial brain of Raven. It automatically computes key financial metrics from raw transaction data in Supabase and injects real-time financial context into Claude's system prompt.

## Architecture

### Three-Tier System

1. **Metrics Engine** (`backend/app/services/metrics.py`)
   - Computes financial metrics from transaction data
   - Handles data aggregation, classification, and calculations
   - Works with Supabase REST API

2. **Context Builder** (`backend/app/services/context_builder.py`)
   - Builds complete financial snapshots for Claude
   - Fetches metrics, recent transactions, and user metadata
   - Formats context as readable text for system prompt injection

3. **System Prompt Integration** (`backend/app/services/system_prompt.py`)
   - Updated to accept and inject financial context
   - Maintains CFO persona while providing real data

## Core Metrics Computed

### MRR (Monthly Recurring Revenue)
- Sum of revenue transactions in current month
- Classifies based on category keywords: `revenue`, `subscription`, `recurring`, `stripe`, `payment`, `customer`, `sales`
- Excludes non-revenue credits: `refund`, `loan`, `grant`, `investment`, `capital`

### ARR (Annual Recurring Revenue)
- MRR × 12

### Monthly Expenses
- Sum of all debit transactions in current month

### Net Burn
- `monthly_expenses - monthly_revenue`
- **Negative = Profitable** (revenue exceeds expenses)
- **Positive = Burning** (expenses exceed revenue)

### Gross Burn
- Just monthly expenses (total cash outflow)

### Cash Balance
- Estimated from total revenue - total expenses
- Tracks cumulative profitability/deficit
- *In production, integrate with actual balance sheet*

### Runway (months)
- `cash_balance / net_burn` (if burning)
- `∞` (infinity) if profitable

### Margins
- **Gross Margin**: `(revenue - COGS) / revenue`
  - COGS identified by keywords: `cogs`, `cost of goods`, `cost of revenue`, `infrastructure`, `cloud`, `hosting`
- **Net Margin**: `(revenue - total_expenses) / revenue`

### Month-over-Month (MoM) Changes
- **Revenue Growth**: `(current_MRR - previous_MRR) / previous_MRR × 100`
- **Expense Change**: `(current_expenses - previous_expenses) / previous_expenses × 100`

## API Functions

### `compute_all_metrics(supabase_url, supabase_key, user_id) → dict`

Computes all financial metrics for a user.

**Returns:**
```python
{
    "mrr": 24200.50,
    "arr": 290406.00,
    "monthly_expenses": 18400.75,
    "gross_burn": 18400.75,
    "net_burn": -5800.25,  # Profitable!
    "cash_balance": 252000.00,
    "runway_months": 14.2,
    "mom_revenue_growth_pct": 8.1,
    "mom_expense_change_pct": 2.3,
    "gross_margin_pct": 62.5,
    "net_margin_pct": 24.0,
    "total_revenue": 150000.00,
    "total_expenses": 125000.00,
    "total_cogs": 37500.00,
    "last_updated": "2026-04-23T14:30:00Z"
}
```

**Handles edge cases:**
- No transactions → all metrics = 0
- Profitable company → runway = ∞
- Insufficient data → safe defaults

### `compute_monthly_series(supabase_url, supabase_key, user_id, months=12) → list`

Returns last N months of revenue + expenses for charting.

**Returns:**
```python
[
    {"month": "2026-03", "revenue": 22000.00, "expenses": 17500.00, "net": 4500.00},
    {"month": "2026-04", "revenue": 24200.00, "expenses": 18400.00, "net": 5800.00},
]
```

**Use case:** Revenue trend charts, burn rate visualization

### `get_expense_breakdown(supabase_url, supabase_key, user_id) → list`

Groups current month expenses by category.

**Returns:**
```python
[
    {"category": "SaaS", "amount": 4200.00, "percentage": 22.8},
    {"category": "Infrastructure", "amount": 5800.00, "percentage": 31.5},
    {"category": "Salary", "amount": 8400.00, "percentage": 45.7},
]
```

**Use case:** Expense breakdown pie charts, cost analysis

## Context Builder API

### `build_financial_context(supabase_url, supabase_key, user_id) → dict`

Assembles complete financial context with metrics, transactions, and metadata.

**Returns:**
```python
{
    "metrics": {...},  # All computed metrics
    "recent_transactions": [...],  # Last 10 transactions
    "user_metadata": {
        "company_name": "TechCorp",
        "startup_stage": "scaling",
    },
    "timestamp": "2026-04-23T14:30:00Z"
}
```

### `format_context_for_prompt(context: dict) → str`

Formats context as readable markdown for Claude's system prompt.

**Example output:**
```
## CURRENT FINANCIAL SNAPSHOT

**MRR**: $24,200.00 (+8.1% MoM)
**Monthly Expenses**: $18,400.00 (+2.3% MoM)
**Net Burn**: $5,800.00/month (PROFITABLE)
**Cash Balance**: $252,000.00
**Runway**: 14.2 months
**Gross Margin**: 62.5%

## RECENT TRANSACTIONS (Last 10)
- 2026-04-20: AWS Infrastructure - -$2,400.00 (expense)
- 2026-04-18: Stripe Revenue - +$3,200.00 (income)
...

## COMPANY CONTEXT
**Company**: TechCorp
**Stage**: scaling
```

## Integration with Tools

### Tool Handlers in `tools.py`

#### `get_metrics(db, user_id, supabase_url, supabase_key) → dict`
- Updated to use `compute_all_metrics` when Supabase credentials provided
- Falls back to SQLAlchemy for backwards compatibility

#### `update_metrics(supabase_url, supabase_key, user_id, metrics_data) → dict`
- **NEW**: Manual metric update tool for Claude
- Updates user metadata (company_name, startup_stage)
- Returns confirmation card

**Usage in Claude:**
```json
{
    "tool": "update_metrics",
    "input": {
        "mrr": 50000,
        "monthly_expenses": 40000,
        "cash_balance": 250000,
        "company_name": "MyStartup",
        "startup_stage": "scaling"
    }
}
```

#### `add_transaction(supabase_url, supabase_key, user_id, transaction_data) → dict`
- **NEW**: Manual transaction entry tool for Claude
- Records income or expense transactions
- Returns confirmation card with saved data

**Usage in Claude:**
```json
{
    "tool": "add_transaction",
    "input": {
        "date": "2026-04-23",
        "description": "AWS Infrastructure",
        "amount": 2400.00,
        "type": "expense",
        "category": "Cloud Infrastructure"
    }
}
```

## System Prompt Injection

### Before (Static)
```python
system_prompt = build_system_prompt(user_context={
    "company_name": "TechCorp",
    "mrr": 50000,
})
```

### After (Real-Time)
```python
# In chat.py stream_chat_with_tools():
context = await build_financial_context(supabase_url, supabase_key, user_id)
formatted_context = format_context_for_prompt(context)
system_prompt = build_system_prompt(financial_snapshot=formatted_context)
```

Claude now has real-time financial data in every message!

## Configuration

Add to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

These are read by `app.core.config.Settings`:
```python
SUPABASE_URL: Optional[str] = None
SUPABASE_SERVICE_KEY: Optional[str] = None
```

## Data Flow Diagram

```
User Chat Message
       ↓
Chat Endpoint (/v1/chat)
       ↓
build_financial_context()
  ├→ compute_all_metrics() [Supabase REST API]
  ├→ fetch_recent_transactions() [Supabase REST API]
  └→ fetch_user_metadata() [Supabase REST API]
       ↓
format_context_for_prompt()
       ↓
System Prompt + Injected Context
       ↓
Claude AI CFO (with tools)
       ├→ [Tool: get_metrics] → compute_all_metrics()
       ├→ [Tool: add_transaction] → Supabase INSERT
       └→ [Tool: update_metrics] → Supabase PATCH
       ↓
Response to User
```

## Transaction Classification

### Revenue Categories
Transactions are classified as revenue if:
- Type = `credit` AND
- Category contains ANY: `revenue`, `subscription`, `recurring`, `stripe`, `payment`, `customer`, `sales` AND
- Category does NOT contain: `refund`, `loan`, `grant`, `investment`, `capital`, `owner contribution`, `interest`, `tax refund`

### Expense Categories
- Type = `debit`
- All debits are expenses

### COGS Classification
Expenses classified as COGS if category contains: `cogs`, `cost of goods sold`, `cost of revenue`, `cost of services`, `infrastructure`, `cloud`, `hosting`, `data costs`, `fulfillment`, `shipping`, `merchant fees`

## Testing

Run tests:
```bash
pytest backend/tests/test_metrics.py -v
```

Tests cover:
- Metrics computation with various transaction patterns
- Classification logic (revenue, expense, COGS)
- Calculations (margins, runway, growth rates)
- Context formatting
- Edge cases (zero data, division by zero, etc.)

## Edge Cases & Error Handling

1. **No transactions**: Returns all zeros, no errors
2. **Negative cash balance**: Clamped to 0 in computation
3. **Division by zero**: Checked in margin calculations
4. **Infinite runway**: Set to `float('inf')` for profitable companies
5. **Missing categories**: Defaults to "Other"
6. **Supabase API errors**: Returns empty list, continues gracefully
7. **Invalid dates**: Caught and logged, transaction skipped

## Future Enhancements

1. **Forecast Models**: Predict MRR based on historical growth
2. **Anomaly Detection**: Alert on unusual spending patterns
3. **Goal Tracking**: Compare metrics vs. user-defined targets
4. **Multi-Currency**: Support international transactions
5. **Bank Integration**: Auto-sync from connected bank accounts
6. **Scenario Caching**: Save and compare multiple scenarios
7. **Alerts**: Notify when runway drops below threshold

## Related Files

- `/backend/app/services/metrics.py` - Core computation engine
- `/backend/app/services/context_builder.py` - Context building
- `/backend/app/services/tools.py` - Tool handlers (includes metric updates)
- `/backend/app/api/v1/endpoints/chat.py` - Chat endpoint integration
- `/backend/app/services/system_prompt.py` - Prompt building
- `/backend/tests/test_metrics.py` - Unit tests
- `/backend/app/core/config.py` - Configuration
