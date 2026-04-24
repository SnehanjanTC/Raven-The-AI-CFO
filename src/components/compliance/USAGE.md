# Compliance Components Documentation

This directory contains production-grade compliance workflow and filing management UI components for FinOS, the fintech application. The components support Indian compliance domains: TDS, GST, P-Tax, and GAAP.

## Components Overview

### 1. ComplianceCalendar

A comprehensive deadline calendar and filing tracker with timeline and pipeline views.

**Location:** `ComplianceCalendar.tsx`

**Props:**
```typescript
interface ComplianceCalendarProps {
  agentId?: string;           // Filter by agent (optional)
  onFilingClick?: (filing: FilingRecord) => void;
}
```

**Features:**
- **Timeline View** (default): Vertical timeline grouped by month with:
  - Overdue section at top with pulsing red indicator
  - Upcoming deadlines grouped by month
  - Today marker for current deadline
  - Expandable deadline details
  - Priority indicators (Critical, High, Medium, Low)

- **Pipeline View**: Kanban-style columns showing filing progression:
  - Draft → Review → Filed → Acknowledged
  - Each filing card shows type, period, amount, due date
  - Status badge and acknowledgment number (if available)
  - Quick view/update buttons

- **Summary Stats Bar**:
  - This Month's filing count
  - On-time filing rate (%)
  - Overdue count with red badge
  - Next deadline countdown

**Usage Example:**
```tsx
import { ComplianceCalendar } from '@/components/compliance';

export function MyDashboard() {
  const handleFilingClick = (filing) => {
    // Open filing workflow or details modal
  };

  return (
    <ComplianceCalendar
      agentId="tds-agent"
      onFilingClick={handleFilingClick}
    />
  );
}
```

**Mock Data Mode:** If hooks return empty data, the component automatically generates realistic mock deadlines and filings for demonstration.

---

### 2. FilingWorkflow

Detailed filing workflow panel with status stepper, form management, and audit trail.

**Location:** `FilingWorkflow.tsx`

**Props:**
```typescript
interface FilingWorkflowProps {
  filing: FilingRecord;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => void;
}
```

**Features:**
- **Header**: Filing type, period, current status badge
- **Progress Stepper**: Horizontal 4-step progress: Draft → Review → Filed → Acknowledged
- **Filing Details Card**: Shows amount, due date, penalties, interest, acknowledgment number
- **Status-Aware Action Buttons**:
  - Draft: "Submit for Review"
  - Review: "Mark as Filed" (with filed date input)
  - Filed: "Record Acknowledgment" (with ack number input)
  - Overdue: Red alert with penalty calculator CTA
- **Acknowledgment Form**: Inline form for entering acknowledgment numbers or filed dates
- **Audit Trail**: Shows recent audit log entries for the filing
- **Notes Section**: Editable textarea for filing notes with character count
- **Overdue Alert**: Red alert banner with accrued penalties (if applicable)

**Usage Example:**
```tsx
import { FilingWorkflow } from '@/components/compliance';
import { useState } from 'react';

export function FilingPanel() {
  const [selectedFiling, setSelectedFiling] = useState(null);

  const handleStatusChange = async (id, newStatus, details) => {
    // Call API to update filing status
    await updateFiling(id, { status: newStatus, ...details });
  };

  return (
    selectedFiling && (
      <FilingWorkflow
        filing={selectedFiling}
        onClose={() => setSelectedFiling(null)}
        onStatusChange={handleStatusChange}
      />
    )
  );
}
```

**State Management:**
- Uses React hooks for form state (notes, ackNumber, filedDate)
- Shows loading state during status transitions
- Integrates with `useAuditLog` hook for activity history

---

### 3. ComplianceDashboard

Top-level compliance overview dashboard aggregating across all 4 Indian agents.

**Location:** `ComplianceDashboard.tsx`

**Props:**
```typescript
interface ComplianceDashboardProps {
  onAgentClick?: (agentId: string) => void;
}
```

**Features:**
- **Health Score Cards** (4 cards, one per domain):
  - TDS Health, GST Health, P-Tax Health, GAAP Health
  - Score 0-100 with color coding (green >80, yellow >50, red <50)
  - Status badge: Compliant / At Risk / Non-Compliant
  - Top 2 issues listed (if any)
  - Next deadline for that domain
  - Clickable to navigate to agent workspace

- **Overdue Alerts Banner**:
  - Dismissible red banner with count of overdue filings
  - "View All" button to navigate to overdue filings
  - Only shows if overdue filings exist

- **This Month's Filings Grid**:
  - Cards for each filing due this month
  - Shows amount, due date, status
  - Quick "Update" and "Details" buttons
  - Limited to 6 most recent (grid is scrollable)

- **Compliance Score Trend**:
  - 6-month line chart of compliance score
  - Color-coded bars (green >85%, yellow >70%, red <70%)
  - Hover tooltips with exact scores
  - Shows improvement/decline over time

- **Summary Stats Grid**:
  - Total Filings (all time)
  - Filed count + completion %
  - Pending count
  - Overdue count (color-coded red/green)

**Usage Example:**
```tsx
import { ComplianceDashboard } from '@/components/compliance';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();

  const handleAgentClick = (agentId) => {
    navigate(`/agents/${agentId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Compliance Overview</h1>
      <ComplianceDashboard onAgentClick={handleAgentClick} />
    </div>
  );
}
```

**Data Integration:**
- Uses `useComplianceSummary()` for aggregate stats
- Uses `useComplianceDeadlines()` for deadline data
- Uses `useComplianceFilings()` for filing data
- Falls back to mock data if hooks return empty (useful for development)

---

## Styling & Theme

All components use the existing dark theme from FinOS:

**Colors:**
- `bg-surface-container`: Primary container background
- `bg-surface-container-high`: Elevated container background
- `text-on-surface`: Primary text color
- `text-on-surface-variant`: Secondary text color
- `text-primary`: Primary brand color (blue)
- `text-tertiary`: Tertiary accent (teal)
- `text-error`: Error/alert color (red)
- `bg-primary`, `bg-error`, etc.: Colored backgrounds

**Typography:**
- Uses `font-headline` for display text
- Uses standard font weights (bold, semibold, etc.)
- Uses `uppercase` with `tracking-wider` for labels

**Responsive Design:**
- Mobile-first grid layouts using Tailwind's `grid-cols-1`, `md:grid-cols-2`, `lg:grid-cols-3`
- Proper padding and spacing for all screen sizes
- Horizontal scrollable sections for overflow

**Animations:**
- Uses `motion/react` (NOT `framer-motion`)
- `motion.div` for animated containers
- `AnimatePresence` for mount/unmount animations
- Smooth transitions and spring physics for natural motion

---

## Integration with Hooks

All components integrate with the compliance domain hooks:

### useComplianceFilings(agentId?)
Returns: `{ filings, loading, error, refetch, updateStatus }`

### useComplianceDeadlines(agentId?, daysAhead?)
Returns: `{ deadlines, loading, error, refetch, markComplete }`

### useComplianceSummary(agentId?)
Returns: `{ summary, health, loading, error, refetch }`

### useAuditLog(agentId?, limit?)
Returns: `{ logs, loading, error, refetch }`

---

## Domain Information

Components support 4 compliance domains with distinct styling:

| Domain | Label | Color     | Icon |
|--------|-------|-----------|------|
| tds    | TDS   | Blue      | ₹    |
| gst    | GST   | Purple    | G    |
| ptax   | P-Tax | Green     | P    |
| gaap   | GAAP  | Orange    | A    |

Agent IDs:
- TDS: `'tds-agent'`
- GST: `'gst-agent'`
- P-Tax: `'ptax-agent'`
- GAAP: `'gaap-agent'`

---

## Status Lifecycle

Filing statuses throughout the compliance lifecycle:

```
upcoming → draft → review → filed → acknowledged
                      ↓
                    overdue (if past due date)
```

**Status Colors:**
- `draft`: Gray (slate-500/20)
- `review`: Yellow (yellow-500/20)
- `filed`: Blue (blue-500/20)
- `acknowledged`: Green (green-500/20)
- `overdue`: Red (red-500/20)

---

## Date Formatting

All dates are formatted for Indian locale (en-IN):
- Short format: "Mar 30" (used in calendars)
- Long format: "30 March 2026" (used in detail views)
- Storage format: "2026-03-30" (ISO 8601 for APIs)

---

## Type Safety

All components are fully TypeScript typed:
- Import types from `@/domains/compliance/types`
- `FilingRecord`: Complete filing information
- `ComplianceDeadline`: Deadline with recurrence info
- `FilingStatus`: Status enum (draft, review, filed, acknowledged, upcoming, overdue)
- `ComplianceDomain`: Domain enum (tds, gst, ptax, gaap)

---

## Usage in Application Structure

**Recommended routing:**
```
/compliance
  /overview          → ComplianceDashboard
  /calendar          → ComplianceCalendar
  /agents/:agentId   → ComplianceCalendar (filtered)
```

**In modals/panels:**
- ComplianceCalendar can open FilingWorkflow in a modal on filing click
- FilingWorkflow can open DetailModal for additional filing details

---

## Performance Considerations

- Components use `useMemo` for expensive calculations (grouping deadlines, filtering)
- `AnimatePresence` prevents layout thrashing
- Scrollable sections use `custom-scrollbar` for native-like UX
- Mock data generation is inline (no network calls in dev mode)

---

## Accessibility

- All buttons have proper `aria-label` attributes
- Keyboard navigation supported (Escape to close modals)
- Focus states visible on interactive elements
- Color contrast meets WCAG AA standards
- Semantic HTML with proper heading hierarchy

---

## Future Enhancements

Potential improvements for production:
1. PDF export of filings and compliance reports
2. Email notifications for approaching deadlines
3. Bulk filing status updates
4. Filing template management
5. Compliance rule engine integration
6. Advanced analytics and forecasting
7. Multi-year compliance reports
8. Integration with GST portal, ITR, TDS portal APIs
