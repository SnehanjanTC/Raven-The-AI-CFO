# Compliance API Service - Implementation Guide

## Overview

This document describes the production-grade compliance API service layer for the React/Supabase fintech application. The service provides comprehensive support for compliance operations including TDS, GST, P-Tax, and Indian GAAP auditing with automatic audit logging.

## Architecture

### File Structure

```
src/domains/compliance/
├── types.ts                 # TypeScript interfaces and types
├── api.ts                   # ComplianceService (main API class)
├── hooks.ts                 # React hooks for UI integration
├── engines/
│   ├── index.ts            # Barrel export (all engines + new API)
│   ├── tds.ts              # TDS calculation engine
│   ├── gst.ts              # GST calculation engine
│   ├── ptax.ts             # P-Tax calculation engine
│   └── indian-gaap.ts      # Indian GAAP accounting engine
```

## Core Components

### 1. Types (`src/domains/compliance/types.ts`)

Comprehensive TypeScript interfaces for all compliance operations:

- **ComplianceDomain**: Union type for compliance domains (tds, gst, ptax, gaap)
- **AuditLogEntry**: Complete audit trail with metadata
- **FilingRecord**: Compliance filing with multi-status support
- **ComplianceDeadline**: Deadlines with recurring schedule support
- **RateTableEntry**: Versioned rate tables for tax calculations
- **LedgerEntry**: Transaction tracking
- **ComplianceParty**: Vendor/customer/employee tracking
- **ComplianceSummary**: Dashboard aggregate data
- **Calculation Request/Response**: Generic wrappers for any calculation

### 2. API Service (`src/domains/compliance/api.ts`)

Static ComplianceService class with 25+ methods:

#### Audit Logging
```typescript
logAction(entry): Promise<void>
calculateWithAudit<T>(agentId, type, params, fn): Promise<{result, auditId}>
```

#### Filing Management
```typescript
getFilings(agentId?, status?): Promise<FilingRecord[]>
createFiling(filing): Promise<FilingRecord>
updateFilingStatus(id, status, details?): Promise<FilingRecord>
getOverdueFilings(): Promise<FilingRecord[]>
```

#### Deadline Management
```typescript
getDeadlines(agentId?, daysAhead?): Promise<ComplianceDeadline[]>
getUpcomingDeadlines(days?): Promise<ComplianceDeadline[]>
markDeadlineComplete(id): Promise<void>
```

#### Rate Management
```typescript
getCurrentRates(domain): Promise<RateTableEntry[]>
getRateHistory(domain, rateKey): Promise<RateTableEntry[]>
```

#### Ledger & Calculations
```typescript
getLedgerEntries(filters): Promise<LedgerEntry[]>
getTDSLiability(periodStart, periodEnd): Promise<TDSLiability[]>
getGSTLiability(month): Promise<GSTLiability>
getPTaxSummary(stateCode?): Promise<PTaxSummary[]>
getPnLSummary(periodStart, periodEnd): Promise<PnLSummary>
```

#### Dashboard
```typescript
getComplianceSummary(agentId?): Promise<ComplianceSummary>
getComplianceHealth(): Promise<ComplianceHealthReport[]>
```

### 3. React Hooks (`src/domains/compliance/hooks.ts`)

Custom hooks for component integration with loading/error states:

```typescript
useComplianceFilings(agentId?)
useComplianceDeadlines(agentId?, daysAhead?)
useComplianceSummary(agentId?)
useLedgerData(filters)
useAuditLog(agentId?, limit?)
useTDSLiability(periodStart, periodEnd)
useGSTLiability(month)
usePTaxSummary(stateCode?)
usePnLSummary(periodStart, periodEnd)
```

Each hook returns:
- `loading`: boolean state
- `error`: Error | null
- `refetch()`: manual refresh function
- `data`: typed result

## Usage Examples

### Service Usage

```typescript
import { ComplianceService } from '@/domains/compliance/engines';

// Get filings
const filings = await ComplianceService.getFilings('agent-123', 'pending');

// Calculate with audit trail
const { result, auditId } = await ComplianceService.calculateWithAudit(
  'agent-123',
  'tds_calculation',
  { amount: 50000, section: '192' },
  () => calculateTDS(50000, '192')
);

// Get summary
const summary = await ComplianceService.getComplianceSummary('agent-123');
```

### React Hook Usage

```typescript
import { useComplianceFilings, useComplianceSummary } from '@/domains/compliance/engines';

export function ComplianceDashboard() {
  const { filings, loading, error, refetch } = useComplianceFilings();
  const { summary, health } = useComplianceSummary();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Total Filings: {summary?.total_filings}</h2>
      <h3>Status:</h3>
      <ul>
        <li>Filed: {summary?.filed}</li>
        <li>Pending: {summary?.pending}</li>
        <li>Overdue: {summary?.overdue}</li>
      </ul>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Combining Multiple Hooks

```typescript
export function TaxLiabilityDashboard() {
  const tds = useTDSLiability('2025-01-01', '2025-03-31');
  const gst = useGSTLiability('2025-03');
  const ptax = usePTaxSummary('MH');

  if (tds.loading || gst.loading || ptax.loading) {
    return <div>Loading tax data...</div>;
  }

  return (
    <div>
      <TDSSection liability={tds.liability} />
      <GSTSection liability={gst.liability} />
      <PTaxSection summary={ptax.summary} />
    </div>
  );
}
```

## Error Handling

All API methods include comprehensive error handling:

```typescript
interface ApiError {
  code: string;           // Error code for categorization
  message: string;        // Human-readable message
  statusCode: number;     // HTTP status
  details?: Record<string, any>;  // Additional context
  timestamp: string;      // When error occurred
}
```

Example error handling:

```typescript
try {
  const filing = await ComplianceService.createFiling(filingData);
} catch (error) {
  if (error.code === 'CREATE_FILING_ERROR') {
    console.error('Failed to create filing:', error.message);
    // Handle specific error
  }
}
```

## Fallback Strategy

When Supabase is unavailable (`getSupabase()` returns null), the service:

1. Returns realistic mock data for most queries
2. Logs warnings to console
3. Maintains the same API contract
4. Allows development/testing without a live database

Mock data includes:
- TDS/GST/P-Tax filings
- Compliance deadlines
- Summary aggregates
- Ledger entries

## Audit Logging

Every calculation is automatically logged to the `audit_logs` table with:

```typescript
{
  agent_id: string;
  action_type: string;           // "tds_calculation", etc.
  input_params: Record<string, any>;
  output_result: Record<string, any>;
  created_at: timestamp;
  metadata: {
    executionTimeMs: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }
}
```

## Database Schema Integration

The service expects these Supabase tables:

### audit_logs
- id, agent_id, action_type, input_params, output_result, user_id, created_at, metadata

### compliance_filings
- id, agent_id, filing_type, period_start, period_end, due_date, filed_date, status, acknowledgment_number, amount, penalty_amount, interest_amount, notes, metadata, created_at, updated_at

### compliance_deadlines
- id, agent_id, title, description, deadline_date, reminder_days_before, status, priority, recurring, recurrence_pattern, linked_filing_id, metadata, created_at, updated_at

### ledger_entries
- id, date, category, tax_section, description, debit, credit, running_balance, status, reference_document, agent_id, metadata, created_at, updated_at

### rate_tables
- id, domain, rate_key, rate_data, effective_from, effective_to, version, is_active, source_notification, created_at, updated_at

### compliance_parties
- id, name, party_type, pan, gstin, email, address, contact_person, phone, agent_id, metadata, created_at, updated_at

## Performance Considerations

1. **Caching**: Hook results should be memoized with useMemo for expensive calculations
2. **Pagination**: Large ledger queries should implement pagination (not yet built-in)
3. **Batching**: Multiple API calls can be batched with Promise.all()
4. **Real-time Updates**: Consider adding Supabase subscriptions for live filing updates

## Security

1. All operations respect Supabase Row Level Security (RLS)
2. Audit logging enables compliance audits and accountability
3. Error messages don't expose sensitive data
4. No credentials or API keys are logged

## Type Safety

The entire codebase is fully typed with TypeScript 5.0+ ES2022 target:

```typescript
// All imports are properly typed
import type { FilingRecord, ComplianceDomain } from '@/domains/compliance/engines';
import { ComplianceService } from '@/domains/compliance/engines';

// Full type checking at compile time
const filing: FilingRecord = await ComplianceService.createFiling({
  agent_id: 'agent-1',
  filing_type: 'GSTR-3B',
  period_start: '2025-01-01',
  period_end: '2025-01-31',
  due_date: '2025-02-20',
  status: 'draft',
  amount: 125000,
});
```

## Integration with Calculation Engines

The API service works seamlessly with existing calculation engines:

```typescript
import {
  calculateTDS,
  calculateGST,
  calculatePTax,
  calculateDepreciation,
  ComplianceService,
} from '@/domains/compliance/engines';

// Use calculation engines
const tdsAmount = calculateTDS(payment, section);

// Log the calculation
const { result, auditId } = await ComplianceService.calculateWithAudit(
  'agent-123',
  'tds_calculation',
  { payment, section },
  () => tdsAmount
);
```

## Testing

To test the API service:

```typescript
// Test without Supabase (mock data)
const filings = await ComplianceService.getFilings();

// Test with Supabase (real data)
// Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

// Test error handling
try {
  await ComplianceService.createFiling(invalidData);
} catch (error) {
  expect(error.code).toBe('CREATE_FILING_ERROR');
}
```

## Future Enhancements

1. **Pagination**: Add offset/limit to large queries
2. **Filtering**: Add advanced filter support for filings
3. **Subscriptions**: Real-time updates via Supabase subscriptions
4. **Batch Operations**: Bulk create/update for filings
5. **Caching**: Client-side cache with invalidation
6. **Sync**: Offline-first sync with Supabase
7. **Export**: CSV/PDF export for reports
8. **Webhooks**: Notification system for deadline alerts

## Support

For issues or questions:
1. Check the TypeScript types for method signatures
2. Review error codes and messages
3. Check Supabase connection status with `getSupabase()`
4. Enable console logging for debugging
