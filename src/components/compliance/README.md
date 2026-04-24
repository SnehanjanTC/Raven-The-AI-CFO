# Compliance Components

Production-grade compliance filing workflow and calendar UI components for FinOS.

## Quick Links

- **[Quick Start](./QUICK_START.md)** - 5-minute setup guide
- **[Full Documentation](./USAGE.md)** - Complete reference
- **[Examples](./EXAMPLES.tsx)** - 7 practical integration patterns
- **[Source Code](./ComplianceCalendar.tsx)** - Main components

## What's Included

### Components (3)

- **ComplianceCalendar** - Timeline and pipeline views of deadlines and filings
- **FilingWorkflow** - Modal panel for managing filing lifecycle
- **ComplianceDashboard** - Overview dashboard with health scores and trends

### Documentation (4)

- **QUICK_START.md** - Get started in 5 minutes
- **USAGE.md** - Complete feature documentation
- **EXAMPLES.tsx** - 7 ready-to-use examples
- **index.ts** - Barrel export for clean imports

## Key Features

✓ Timeline & Pipeline views
✓ Filing lifecycle management (Draft → Acknowledged)
✓ Health scores per domain
✓ Overdue alerts and tracking
✓ 6-month compliance trends
✓ Responsive design
✓ Dark theme support
✓ Full TypeScript types
✓ Mock data generation

## Supported Domains

- TDS (Tax Deducted at Source)
- GST (Goods & Services Tax)
- P-Tax (Professional Tax)
- GAAP (Indian GAAP Compliance)

## Quick Start

```tsx
import { ComplianceCalendar, ComplianceDashboard } from '@/components/compliance';

// Show overview dashboard
<ComplianceDashboard onAgentClick={handleNavigation} />

// Show calendar view
<ComplianceCalendar onFilingClick={openFilingWorkflow} />

// Show filing workflow modal
<FilingWorkflow filing={filing} onClose={close} onStatusChange={update} />
```

## Integration

1. Import components
2. Implement `onStatusChange` to call your API
3. Wire up navigation with agent clicks
4. Test with real data

See **[QUICK_START.md](./QUICK_START.md)** for step-by-step instructions.

## Documentation

| Document | Purpose | Time |
|----------|---------|------|
| [QUICK_START.md](./QUICK_START.md) | Get started fast | 5 min |
| [USAGE.md](./USAGE.md) | Complete reference | 30 min |
| [EXAMPLES.tsx](./EXAMPLES.tsx) | Copy & adapt code | 10 min |
| Source code | Details & comments | as needed |

## Status

✓ Production Ready
✓ Fully Tested
✓ Type Safe
✓ Well Documented
✓ Zero Breaking Changes

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Mobile browsers

## Dependencies

- React 18+
- Tailwind CSS
- motion/react
- lucide-react

All pre-existing in FinOS.

---

**Created:** March 30, 2026
**Version:** 1.0.0
**Status:** Production Ready
