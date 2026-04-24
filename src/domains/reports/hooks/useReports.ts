import { useState, useEffect, useCallback } from 'react';
import {
  fetchReports as fetchReportsQuery,
  createReport as createReportQuery,
  deleteReport as deleteReportQuery,
  archiveReport as archiveReportQuery,
  logActivity,
} from '@/shared/services/supabase/queries';
import { api } from '@/lib/api';
import {
  isDemoDataLoaded,
  getDemoReports,
  onDemoDataChange,
} from '@/lib/demo-data';
import { exportReportAs } from '@/lib/report-export';
import type { Report } from '@/shared/types';

export type SyncStatus = 'syncing' | 'synced' | 'offline';

/**
 * Build a set of derived reports from the live Zoho Books MCP `/revenue`
 * payload. Each Report is synthesized from real numbers — there is no
 * persistence layer; the user re-fetches by reloading. This is the source
 * of truth whenever Zoho is connected.
 */
async function buildZohoReports(): Promise<Report[]> {
  const rev: any = await api.zohomcp.revenue();
  if (!rev || rev.invoice_count == null) return [];

  const m = rev.metrics || {};
  const byStatus = rev.by_status || {};
  const topCustomers: any[] = rev.top_customers || [];
  const recurring: any[] = m.recurring_customers || [];
  const byMonth = rev.by_month || {};

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const periodTtm = `Trailing 12 months (ending ${m.last_full_month || monthLabel})`;
  const iso = now.toISOString();

  // 1) P&L Snapshot — TTM revenue, paid, outstanding
  const pnl: Report = {
    id: 'zoho-pnl-ttm',
    name: 'Statement of Revenue — Trailing 12 Months',
    type: 'P&L',
    period: periodTtm,
    version: 'live',
    status: 'generated',
    date: iso,
    icon: 'FileText',
    summary: `Live data from Zoho Books. ₹${(rev.total_revenue / 1e7).toFixed(2)}Cr total billings across ${rev.invoice_count} invoices.`,
    author: 'Zoho Books MCP',
    department: 'Finance',
    tags: ['live', 'zoho', 'ttm'],
    confidentiality: 'confidential',
    createdAt: iso,
    metrics: [
      { label: 'Total Revenue (TTM)', value: m.trailing_12mo_total || 0, format: 'currency', currency: 'INR' },
      { label: 'Paid Revenue', value: rev.paid_revenue || 0, format: 'currency', currency: 'INR' },
      { label: 'Outstanding (AR)', value: rev.outstanding || 0, format: 'currency', currency: 'INR' },
      { label: 'Avg Monthly Revenue', value: Math.round(m.avg_monthly_revenue || 0), format: 'currency', currency: 'INR' },
      { label: 'YoY Growth', value: Number((m.yoy_pct || 0).toFixed(1)), format: 'percentage', trend: (m.yoy_pct || 0) >= 0 ? 'up' : 'down' },
      { label: 'MoM Change', value: Number((m.revenue_mom_pct || 0).toFixed(1)), format: 'percentage', trend: (m.revenue_mom_pct || 0) >= 0 ? 'up' : 'down' },
    ],
    sections: [
      {
        id: 'pnl-status',
        title: 'Invoice Status Breakdown',
        description: 'Billings classified by Zoho status. Void/draft are excluded from revenue.',
        metrics: Object.entries(byStatus).map(([status, amount]) => ({
          label: status.charAt(0).toUpperCase() + status.slice(1),
          value: Number(amount) || 0,
          format: 'currency',
          currency: 'INR',
        } as any)),
      },
    ],
  };

  // 2) MRR / ARR Snapshot
  const mrrArr: Report = {
    id: 'zoho-mrr-arr',
    name: 'MRR & ARR Snapshot',
    type: 'Forecast',
    period: periodTtm,
    version: 'live',
    status: 'generated',
    date: iso,
    icon: 'BarChart3',
    summary: `MRR ₹${((m.mrr || 0) / 1e5).toFixed(2)}L (${m.recurring_pct_of_mrr || 0}% recurring) · ARR ₹${((m.arr || 0) / 1e7).toFixed(2)}Cr`,
    author: 'Zoho Books MCP',
    department: 'Finance',
    tags: ['live', 'zoho', 'saas-metrics'],
    confidentiality: 'confidential',
    createdAt: iso,
    metrics: [
      { label: 'MRR (TTM ÷ 12)', value: Math.round(m.mrr || 0), format: 'currency', currency: 'INR' },
      { label: 'Recurring MRR', value: Math.round(m.recurring_mrr || 0), format: 'currency', currency: 'INR' },
      { label: 'One-time MRR', value: Math.round(m.one_time_mrr || 0), format: 'currency', currency: 'INR' },
      { label: 'ARR (TTM)', value: Math.round(m.arr || 0), format: 'currency', currency: 'INR' },
      { label: 'ARR Run-rate', value: Math.round(m.arr_run_rate || 0), format: 'currency', currency: 'INR' },
      { label: 'Recurring Customers', value: m.recurring_customers_count || 0, format: 'count' },
    ],
    sections: [
      {
        id: 'recurring-list',
        title: 'Recurring Customers',
        description: 'Cadence-classified using last-12-months billing pattern.',
        metrics: recurring.slice(0, 10).map((c: any) => ({
          label: `${c.customer} (${c.cadence})`,
          value: Math.round(c.monthly_avg || 0),
          format: 'currency',
          currency: 'INR',
          subtext: `${c.active_months_last12}/12 months active`,
        } as any)),
      },
    ],
  };

  // 3) Top Customers / Concentration
  const customers: Report = {
    id: 'zoho-top-customers',
    name: 'Revenue by Customer — TTM',
    type: 'P&L',
    period: periodTtm,
    version: 'live',
    status: 'generated',
    date: iso,
    icon: 'Table',
    summary: `Top ${Math.min(topCustomers.length, 10)} customers by trailing-12mo billings.`,
    author: 'Zoho Books MCP',
    department: 'Finance',
    tags: ['live', 'zoho', 'concentration'],
    confidentiality: 'confidential',
    createdAt: iso,
    metrics: topCustomers.slice(0, 6).map((c: any) => ({
      label: c.customer + (c.via_distributor ? ` (via ${c.via_distributor.split(' ')[0]})` : ''),
      value: c.revenue || 0,
      format: 'currency',
      currency: 'INR',
      subtext: `${c.invoice_count} invoice${c.invoice_count === 1 ? '' : 's'}`,
    })),
  };

  // 4) Accounts Receivable
  const ar: Report = {
    id: 'zoho-ar',
    name: 'Accounts Receivable — Current',
    type: 'Balance Sheet',
    period: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    version: 'live',
    status: 'generated',
    date: iso,
    icon: 'FileSpreadsheet',
    summary: `₹${((rev.outstanding || 0) / 1e7).toFixed(2)}Cr outstanding across overdue, sent, and signed invoices.`,
    author: 'Zoho Books MCP',
    department: 'Finance',
    tags: ['live', 'zoho', 'ar'],
    confidentiality: 'confidential',
    createdAt: iso,
    metrics: [
      { label: 'Total Outstanding', value: rev.outstanding || 0, format: 'currency', currency: 'INR' },
      { label: 'Overdue', value: Number(byStatus.overdue || 0), format: 'currency', currency: 'INR' },
      { label: 'Sent (not yet due)', value: Number(byStatus.sent || 0), format: 'currency', currency: 'INR' },
      { label: 'Signed', value: Number(byStatus.signed || 0), format: 'currency', currency: 'INR' },
    ],
  };

  // 5) Monthly Revenue Trend
  const months = Object.keys(byMonth).sort();
  const trend: Report = {
    id: 'zoho-monthly-trend',
    name: 'Monthly Revenue Trend',
    type: 'Forecast',
    period: months.length > 0 ? `${months[0]} → ${months[months.length - 1]}` : periodTtm,
    version: 'live',
    status: 'generated',
    date: iso,
    icon: 'BarChart3',
    summary: `${months.length} months of billing history from Zoho Books.`,
    author: 'Zoho Books MCP',
    department: 'Finance',
    tags: ['live', 'zoho', 'trend'],
    confidentiality: 'internal',
    createdAt: iso,
    metrics: months.slice(-6).map((month) => ({
      label: month,
      value: byMonth[month] || 0,
      format: 'currency',
      currency: 'INR',
    })),
  };

  return [pnl, mrrArr, customers, ar, trend];
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setSyncStatus('syncing');

    let loaded = false;

    // Strategy 0: Live Zoho Books MCP — derive reports from real billing data.
    // When connected, this is the source of truth and we never silently
    // fall back to demo. This mirrors the Ledger behaviour.
    try {
      const status = await api.zohomcp.status();
      if (status?.connected) {
        const zohoReports = await buildZohoReports();
        if (zohoReports.length > 0) {
          setReports(zohoReports);
          setSyncStatus('synced');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Zoho MCP reports unavailable, trying backend:', err);
    }

    // Strategy 1: Try REST API backend
    try {
      const backendReports = await api.reports.list();
      if (backendReports && backendReports.length > 0) {
        const mapped: Report[] = backendReports.map((r: any) => ({
          id: r.id,
          name: r.name || 'Untitled Report',
          type: r.type || 'P&L',
          period: r.period || '',
          version: r.version || 'v1.0',
          status: r.status || 'draft',
          date: r.created_at || r.date || new Date().toISOString(),
          icon: r.icon || 'FileText',
          // Enterprise fields (pass through if present)
          summary: r.summary,
          author: r.author,
          department: r.department,
          tags: r.tags,
          metrics: r.metrics,
          sections: r.sections,
          schedule: r.schedule,
          confidentiality: r.confidentiality,
          createdAt: r.created_at || r.createdAt,
          updatedAt: r.updated_at || r.updatedAt,
          reviewedBy: r.reviewed_by || r.reviewedBy,
          approvedBy: r.approved_by || r.approvedBy,
          gaap: r.gaap,
        }));
        setReports(mapped);
        loaded = true;
      }
    } catch {
      // Backend unavailable, continue to fallbacks
    }

    // Strategy 2: Try Supabase directly
    if (!loaded) {
      try {
        const supabaseData = await fetchReportsQuery();
        if (supabaseData && supabaseData.length > 0) {
          setReports(supabaseData);
          loaded = true;
        }
      } catch {
        // Supabase unavailable, continue to fallback
      }
    }

    // Strategy 3: Fall back to demo data (always works if demo is loaded)
    if (!loaded && isDemoDataLoaded()) {
      const demoReports = getDemoReports();
      if (demoReports.length > 0) {
        setReports(demoReports);
        loaded = true;
      }
    }

    // Determine sync status
    try {
      await api.dashboard.summary();
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
    const unsubscribe = onDemoDataChange(() => loadReports());
    return unsubscribe;
  }, [loadReports]);

  const generate = useCallback(async () => {
    setGenerating(true);

    const now = new Date();
    const reportName = `Financial Report \u2014 ${now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
    const period = `${now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} (Trailing 30 Days)`;

    // Try REST API backend first
    try {
      const generatedReport = await api.reports.generate({
        name: reportName,
        type: 'P&L',
        period,
        version: 'v1.0',
      });

      if (generatedReport) {
        const gr = generatedReport as any;
        const mapped: Report = {
          id: gr.id,
          name: gr.name || reportName,
          type: gr.type || 'P&L',
          period: gr.period || period,
          version: gr.version || 'v1.0',
          status: (gr.status || 'generated') as 'generated',
          date: gr.created_at || now.toISOString(),
          icon: gr.icon || 'FileText',
          summary: gr.summary,
          author: gr.author,
          department: gr.department,
          tags: gr.tags,
          metrics: gr.metrics,
          sections: gr.sections,
          schedule: gr.schedule,
          confidentiality: gr.confidentiality,
          createdAt: gr.created_at || gr.createdAt,
          updatedAt: gr.updated_at || gr.updatedAt,
          reviewedBy: gr.reviewed_by || gr.reviewedBy,
          approvedBy: gr.approved_by || gr.approvedBy,
        };
        setReports(prev => [mapped, ...prev]);
        await logActivity('Reporting Agent', `generated '${reportName}'`).catch(() => {});
        setGenerating(false);
        return;
      }
    } catch {
      // Backend unavailable, try Supabase
    }

    // Try Supabase directly
    const newReport = {
      name: reportName,
      type: 'P&L',
      period,
      version: 'v1.0',
      status: 'generated' as const,
      date: now.toISOString().split('T')[0],
      icon: 'FileText',
    };

    try {
      const data = await createReportQuery(newReport);
      if (data && data[0]) {
        setReports(prev => [data[0], ...prev]);
        await logActivity('Reporting Agent', `generated '${reportName}'`).catch(() => {});
        setGenerating(false);
        return;
      }
    } catch {
      // Supabase unavailable, create locally
    }

    // Local fallback
    const localReport: Report = {
      id: crypto.randomUUID(),
      name: reportName,
      type: 'P&L',
      period,
      version: 'v1.0',
      status: 'generated',
      date: now.toISOString(),
      icon: 'FileText',
    };
    setReports(prev => [localReport, ...prev]);
    setGenerating(false);
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    // Try backend first
    try {
      await api.reports.delete(id);
    } catch {
      // Try Supabase fallback
      try {
        await deleteReportQuery(id);
      } catch {
        console.warn('Backend delete failed, removing locally');
      }
    }

    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const archive = useCallback(async (id: string) => {
    // Optimistic update
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'draft' as const } : r));

    // Persist to Supabase
    try {
      await archiveReportQuery(id);
    } catch (err) {
      console.warn('Archive persistence failed (local state updated):', err);
    }
  }, []);

  const exportReport = useCallback(async (report: Report, format: string) => {
    try {
      await exportReportAs(report, format);
    } catch (err) {
      console.error(`Export failed (${format}):`, err);
    }
  }, []);

  return {
    reports,
    loading,
    generating,
    syncStatus,
    generate,
    remove,
    archive,
    exportReport,
    refresh: loadReports,
  };
}
