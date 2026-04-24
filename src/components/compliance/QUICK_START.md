# Quick Start Guide - Compliance Components

## 5-Minute Setup

### Import

```typescript
import { ComplianceCalendar, FilingWorkflow, ComplianceDashboard } from '@/components/compliance';
```

### Basic Usage

**Show compliance dashboard:**
```tsx
<ComplianceDashboard onAgentClick={(agentId) => {
  navigate(`/agents/${agentId}`);
}} />
```

**Show calendar with modal:**
```tsx
const [selectedFiling, setSelectedFiling] = useState(null);

return (
  <>
    <ComplianceCalendar
      agentId="tds-agent"
      onFilingClick={setSelectedFiling}
    />

    {selectedFiling && (
      <FilingWorkflow
        filing={selectedFiling}
        onClose={() => setSelectedFiling(null)}
        onStatusChange={async (id, status, details) => {
          // Call your API
          await updateFiling(id, { status, ...details });
          setSelectedFiling(null);
        }}
      />
    )}
  </>
);
```

---

## Component Reference

### ComplianceCalendar
Timeline and pipeline views of filings and deadlines
```tsx
<ComplianceCalendar
  agentId="tds-agent"  // Optional: filter by agent
  onFilingClick={(filing) => {}}  // Optional: handle filing selection
/>
```

### FilingWorkflow
Modal panel for managing filing status and details
```tsx
<FilingWorkflow
  filing={filing}  // Required: FilingRecord object
  onClose={() => {}}  // Required: close handler
  onStatusChange={(id, status, details) => {}}  // Required: status update handler
/>
```

### ComplianceDashboard
Overview dashboard with health scores and trends
```tsx
<ComplianceDashboard
  onAgentClick={(agentId) => {}}  // Optional: handle agent click
/>
```

---

## Domain IDs

Use these agent IDs for filtering:

| Domain | Agent ID |
|--------|----------|
| TDS | `'tds-agent'` |
| GST | `'gst-agent'` |
| P-Tax | `'ptax-agent'` |
| GAAP | `'gaap-agent'` |

---

## Common Tasks

### Show only TDS filings
```tsx
<ComplianceCalendar agentId="tds-agent" />
```

### Navigate on health card click
```tsx
<ComplianceDashboard
  onAgentClick={(agentId) => navigate(`/agents/${agentId}`)}
/>
```

### Handle filing status update
```tsx
const handleStatusChange = async (id, newStatus, details) => {
  const response = await fetch(`/api/filings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus, ...details })
  });
  // Refetch filings or update state
};

<FilingWorkflow
  filing={filing}
  onClose={() => setSelectedFiling(null)}
  onStatusChange={handleStatusChange}
/>
```

### Show in page layout
```tsx
function CompliancePage() {
  const [selectedFiling, setSelectedFiling] = useState(null);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-headline font-bold">Compliance</h1>

      <ComplianceCalendar onFilingClick={setSelectedFiling} />

      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={updateFiling}
        />
      )}
    </div>
  );
}
```

---

## Key Props

| Prop | Type | Description |
|------|------|-------------|
| `agentId` | `string?` | Filter by agent ID (tds-agent, gst-agent, etc.) |
| `onFilingClick` | `(filing) => void?` | Called when filing is selected |
| `onAgentClick` | `(agentId) => void?` | Called when health card is clicked |
| `onClose` | `() => void` | Called when modal should close |
| `onStatusChange` | `(id, status, details) => Promise` | Called when status changes |

---

## Styling

All components use the existing dark theme:
- Works with Tailwind CSS
- Uses `bg-surface-container`, `text-on-surface`, `text-primary` classes
- Responsive design (mobile to desktop)
- Smooth animations with `motion/react`

No additional setup required!

---

## Mock Data Mode

Components automatically use mock data if:
- Hooks return empty arrays
- Running without backend connection

Perfect for development and testing without API integration.

---

## Next Steps

1. Import components into your page
2. Implement `onStatusChange` to call your API
3. Ensure hooks are connected to your data source
4. Customize colors/styling if needed
5. Add routing/navigation as shown above

For more details, see:
- `USAGE.md` - Full documentation
- `EXAMPLES.tsx` - 7 practical examples
- Component source code - Detailed comments

---

## Troubleshooting

**Components not showing?**
- Check imports are from `@/components/compliance`
- Verify hooks are working (check browser console)
- Components use mock data if hooks return empty

**Styling looks wrong?**
- Ensure Tailwind CSS is configured in your project
- Check parent has `dark` class or dark mode enabled
- Verify `@/lib/utils` cn utility is available

**Status updates not working?**
- Implement `onStatusChange` handler
- Make sure it returns a Promise
- Verify API endpoint is correct

---

## API Integration Template

```typescript
async function updateFilingStatus(id, status, details) {
  try {
    const response = await fetch(`/api/compliance/filings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        filed_date: details?.filed_date,
        acknowledgment_number: details?.acknowledgment_number,
        notes: details?.notes
      })
    });

    if (!response.ok) throw new Error('Update failed');

    // Refetch data
    refetchFilings();

    // Show success message
    showNotification('Filing updated successfully');
  } catch (error) {
    console.error('Error updating filing:', error);
    showNotification('Failed to update filing', 'error');
  }
}
```

---

## Performance Tips

- Wrap in `React.memo()` if used in list
- Use `useMemo()` for parent filter/sort logic
- Components optimize their own renders with `useMemo`
- Mock data is generated once, not on every render

---

## Browser Compatibility

✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Mobile browsers

---

For questions, refer to:
- **USAGE.md** - Comprehensive documentation
- **EXAMPLES.tsx** - Working examples
- **Component source** - Inline documentation

Happy coding!
