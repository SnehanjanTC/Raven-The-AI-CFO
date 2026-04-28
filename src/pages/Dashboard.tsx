import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Download, TrendingUp, Flame, Plus, Clock, DollarSign, Wallet, BarChart3, X, Users, AlertCircle } from 'lucide-react';
import { DetailModal, DetailStat, DetailProgress } from '@/components/DetailModal';
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard';

import { useMetrics } from '@/hooks/useMetrics';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { Metric } from '@/types';
import { cn } from '@/lib/utils';
import { api, type ZohoRevenueResponse } from '@/lib/api';

/** Format an INR amount compactly: ₹6.41 Cr / ₹47.6 L / ₹52,300 */
const formatINRCompact = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};
import {
  isDemoDataLoaded,
  getDemoMrrTrend,
  getDemoCashFlow,
  getDemoExpenseBreakdown,
  getDemoAnomalies,
  formatCurrency,
  onDemoDataChange
} from '@/lib/demo-data';

const getInitialMetrics = (): Metric[] => {
  return [
    { label: 'Revenue (MRR)', value: '—', change: '', trend: 'stable' },
    { label: 'Runway', value: '—', subtext: 'Months' },
    { label: 'Monthly Burn', value: '—', change: '', trend: 'stable' },
  ];
};

const fallbackMrrData: any[] = [];
const fallbackCashFlowData: any[] = [];

const getDemoMrrDataFallback = () => {
  if (isDemoDataLoaded()) {
    const demoTrend = getDemoMrrTrend();
    return demoTrend.map((item, index) => ({
      name: item.month,
      value: item.mrr / 100000, // Convert to millions for display
      isEst: index === demoTrend.length - 1
    }));
  }
  return [];
};

const getDemoCashFlowDataFallback = () => {
  if (isDemoDataLoaded()) {
    const demoCashFlow = getDemoCashFlow();
    return demoCashFlow.map((item) => ({
      name: item.week,
      inflow: item.inflow / 1000, // Convert to thousands for display
      outflow: item.outflow / 1000
    }));
  }
  return [];
};

export function Dashboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = React.useState('30d');
  const { loading, getMetric, metrics, refetch } = useMetrics(getInitialMetrics(), timeframe);
  const { profile } = useCompanyProfile();
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = React.useState<{ label: string; value: string; amount: number; pct: number } | null>(null);
  const [dismissedAnomalies, setDismissedAnomalies] = React.useState<string[]>([]);
  const [mrrData, setMrrData] = React.useState<any[]>(() => getDemoMrrDataFallback());
  const [cashFlowData, setCashFlowData] = React.useState<any[]>(() => getDemoCashFlowDataFallback());
  const [dashboardSummary, setDashboardSummary] = React.useState<any>(null);
  const [expenseBreakdown, setExpenseBreakdown] = React.useState<any[]>([]);
  const [burnData, setBurnData] = React.useState<number[]>([]);
  const [arrForecast, setArrForecast] = React.useState<string>('—');
  const [runwayPercent, setRunwayPercent] = React.useState<number>(0);
  const [zohoRevenue, setZohoRevenue] = React.useState<ZohoRevenueResponse | null>(null);
  const [zohoConnected, setZohoConnected] = React.useState<boolean>(false);

  // Fetch all dashboard data from API with fallback to demo data
  React.useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch all data in parallel
        const [summary, mrrTrend, cashFlow, expenses] = await Promise.all([
          api.dashboard.summary(),
          api.dashboard.mrrTrend(),
          api.dashboard.cashFlow(),
          api.dashboard.expenses()
        ]);

        // Store summary for modal calculations
        if (summary) {
          setDashboardSummary(summary);

          // Compute ARR forecast from arr_projection if available
          if (summary.arr_projection) {
            setArrForecast(formatCurrency(summary.arr_projection) || '—');
          }

          // Runway progress bar:
          //  - null  → unbounded (no burn yet) → 100% bar but display "—" months
          //  - >=24  → "fully healthy" cap
          //  -  <24  → linear scale
          if (summary.runway_months == null) {
            // Unbounded runway → user has no recorded expenses yet.
            setRunwayPercent(100);
          } else if (typeof summary.runway_months === 'number') {
            const HEALTHY_MONTHS = 24;
            const pct = Math.min(100, Math.max(0, (summary.runway_months / HEALTHY_MONTHS) * 100));
            setRunwayPercent(pct);
          }
        }

        // Update MRR data — values are in rupees, divide by 100000 to display in lakhs (₹L)
        if (mrrTrend && Array.isArray(mrrTrend) && mrrTrend.length > 0) {
          setMrrData(mrrTrend.map((item, index) => ({
            name: item.month || item.name || '',
            value: (item.value || item.mrr || 0) / 100000, // ₹ → ₹L (lakhs)
            isEst: index === mrrTrend.length - 1
          })));
        } else {
          setMrrData(getDemoMrrDataFallback());
        }

        // Update cash flow data — values are in rupees, divide by 1000 to display in thousands (₹K)
        if (cashFlow && Array.isArray(cashFlow) && cashFlow.length > 0) {
          setCashFlowData(cashFlow.map((item) => ({
            name: item.month || item.week || item.name || '',
            inflow: (item.inflow || 0) / 1000, // ₹ → ₹K (thousands)
            outflow: (item.outflow || 0) / 1000
          })));

          // Derive burn visualization from outflow data (use last 6 weeks).
          // Guard divide-by-zero: when no outflows are recorded, max=0 and the
          // normalisation would explode to Infinity. Use Math.max(1, …) so an
          // all-zero series renders as zero bars instead of NaN.
          const maxOutflow = Math.max(1, ...cashFlow.map((cf: any) => Number(cf.outflow) || 0));
          const recentOutflows = cashFlow.slice(-6).map(item => {
            const outflow = Number(item.outflow) || 0;
            return Math.round((outflow / maxOutflow) * 100 * 1000) / 1000;
          });
          setBurnData(recentOutflows.length > 0 ? recentOutflows : []);
        } else {
          setCashFlowData(getDemoCashFlowDataFallback());
          setBurnData([]);
        }

        // Update expense breakdown
        if (expenses && Array.isArray(expenses) && expenses.length > 0) {
          setExpenseBreakdown(expenses.map((item) => ({
            label: item.category || item.label || '',
            value: formatCurrency(item.amount || 0) || '₹0',
            amount: item.amount || 0,
            pct: item.pct || 0
          })));
        } else if (isDemoDataLoaded()) {
          // Fallback to demo expenses
          const demoExpenses = getDemoExpenseBreakdown();
          setExpenseBreakdown(demoExpenses.map((item) => ({
            label: item.category,
            value: formatCurrency(item.amount),
            amount: item.amount,
            pct: item.pct
          })));
        } else {
          setExpenseBreakdown([]);
        }
        // ── Live revenue from Zoho Books MCP (overrides MRR/ARR/chart) ──
        try {
          const zoho = await api.zohomcp.revenue();
          setZohoRevenue(zoho);
          setZohoConnected(true);

          // Override the MRR bar chart with the Zoho monthly revenue series.
          // Exclude the current (incomplete) month so the last bar is a real month.
          const currentMonth = zoho.metrics?.current_month;
          const monthEntries = Object.entries(zoho.by_month || {})
            .filter(([m]) => !currentMonth || m < currentMonth)
            .sort(([a], [b]) => a.localeCompare(b));

          if (monthEntries.length > 0) {
            const last12 = monthEntries.slice(-12);
            setMrrData(
              last12.map(([month, value]) => ({
                name: month.slice(5), // MM
                value: (value as number) / 100000, // L for chart scale
                isEst: false,
              }))
            );
          }

          // ARR = TTM-based ARR (trailing 12 months total). This is annualized
          // *historical* revenue, NOT a forecast — labeled accordingly in the UI.
          setArrForecast(formatINRCompact(zoho.metrics?.arr ?? 0));
        } catch {
          // Zoho MCP not connected — silently skip
          setZohoConnected(false);
        }
      } catch (error) {
        // Fallback to demo data if API fails
        console.warn('Failed to fetch dashboard data from backend, using demo data:', error);
        setMrrData(getDemoMrrDataFallback());
        setCashFlowData(getDemoCashFlowDataFallback());

        if (isDemoDataLoaded()) {
          const demoExpenses = getDemoExpenseBreakdown();
          setExpenseBreakdown(demoExpenses.map((item) => ({
            label: item.category,
            value: formatCurrency(item.amount),
            amount: item.amount,
            pct: item.pct
          })));
        }
      }
    };

    loadDashboardData();
  }, []);


  // Subscribe to demo data changes
  React.useEffect(() => {
    const unsubscribe = onDemoDataChange(() => {
      refetch();
      setMrrData(getDemoMrrDataFallback());
      setCashFlowData(getDemoCashFlowDataFallback());
      if (isDemoDataLoaded()) {
        const demoExpenses = getDemoExpenseBreakdown();
        setExpenseBreakdown(demoExpenses.map((item) => ({
          label: item.category,
          value: formatCurrency(item.amount),
          amount: item.amount,
          pct: item.pct
        })));
      }
    });

    return unsubscribe;
  }, [refetch]);

  // ── Zoho-derived display values (fall back to existing useMetrics) ──
  // Headline MRR = TTM (trailing-12mo billings ÷ 12). YoY = TTM vs prior 12mo.
  const mrrTTM = zohoRevenue?.metrics?.mrr ?? 0;
  const yoyPct = zohoRevenue?.metrics?.yoy_pct;
  const yoyChange =
    zohoConnected && yoyPct !== null && yoyPct !== undefined
      ? `${yoyPct >= 0 ? '+' : ''}${yoyPct.toFixed(1)}% YoY`
      : '';
  const yoyTrend: 'up' | 'down' | 'stable' =
    yoyPct === null || yoyPct === undefined ? 'stable' : yoyPct >= 0 ? 'up' : 'down';

  const displayMRR = zohoConnected ? formatINRCompact(mrrTTM) : getMetric('Revenue (MRR)').value;
  const displayMRRChange = zohoConnected ? yoyChange : getMetric('Revenue (MRR)').change;
  const displayMRRTrend = zohoConnected ? yoyTrend : getMetric('Revenue (MRR)').trend;

  const collectionEfficiency =
    zohoRevenue && zohoRevenue.total_revenue > 0
      ? ((zohoRevenue.paid_revenue / zohoRevenue.total_revenue) * 100).toFixed(1)
      : null;

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Metric,Value,Change,Trend\n"
      + metrics.map(m => `${m.label},${m.value},${m.change || 'N/A'},${m.trend}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raven_dashboard_export_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div className="animate-slide-up">
            <h1 className="font-headline text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Financial overview and analytics</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 animate-slide-up">
            <div className="flex items-center gap-1.5 px-3 py-1 glass-subtle rounded-xl text-xs font-semibold text-slate-300 border border-white/10">
              <div className={cn("w-2 h-2 rounded-full", loading ? "bg-slate-500 animate-pulse" : "bg-tertiary")}></div>
              {loading ? 'Syncing...' : 'Live'}
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap gap-3 animate-slide-up">
          <div className="flex glass-subtle rounded-xl p-1 border border-white/10 backdrop-blur-sm">
            {[
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'ytd', label: 'YTD' },
              { id: 'all', label: 'ALL' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  timeframe === t.id
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="glass-subtle px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 flex items-center gap-2 hover:bg-white/5 transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* PROFILE SUMMARY CARD */}
      <ProfileSummaryCard profile={profile} />

      {/* METRICS GRID - 2 rows x 4 columns (or responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Recurring Revenue', icon: DollarSign, value: displayMRR, change: displayMRRChange, trend: displayMRRTrend },
          { label: 'Cash Runway', icon: Clock, value: getMetric('Runway').value, subtext: 'Months', footer: 'Current projection' },
          { label: 'Net Burn', icon: Flame, value: getMetric('Monthly Burn').value, change: getMetric('Monthly Burn').change, trend: 'down' },
          { label: zohoConnected ? 'ARR (TTM)' : 'ARR Forecast', icon: TrendingUp, value: arrForecast, footer: zohoConnected ? 'Trailing 12 months' : 'Next 12 months' }
        ].map((metric, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (idx === 0) setSelectedCard('MRR');
              if (idx === 1) setSelectedCard('Runway');
              if (idx === 2) setSelectedCard('Burn');
              if (idx === 3) setSelectedCard('MRR');
            }}
            className="glass-panel rounded-2xl p-5 border border-white/10 cursor-pointer hover:border-primary/30 transition-all duration-300 group animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                <metric.icon className="w-5 h-5 text-primary" />
              </div>
              {metric.change && (
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1",
                  metric.trend === 'up' ? "bg-tertiary/10 text-tertiary" : "bg-error/10 text-error"
                )}>
                  <TrendingUp className="w-3 h-3" />
                  {metric.change}
                </span>
              )}
            </div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block mb-1">{metric.label}</span>
            <h3 className="text-2xl font-bold text-white mb-2">{metric.value}</h3>
            {metric.subtext && <p className="text-xs text-slate-400">{metric.subtext}</p>}
            {metric.footer && <p className="text-xs text-slate-500 mt-2 italic">{metric.footer}</p>}
          </div>
        ))}
      </div>

      {/* CHARTS SECTION - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Chart - 2/3 width */}
        <div
          onClick={() => setSelectedCard('MRR')}
          className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-primary/30 transition-all duration-300 animate-slide-up"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {zohoConnected ? 'Monthly Revenue (TTM, Zoho Books)' : 'Monthly Recurring Revenue'}
              </h3>
              <p className="text-3xl font-bold text-white">{displayMRR}</p>
              {zohoConnected && (
                <p className="text-xs text-slate-500 mt-1">
                  Trailing-12mo ÷ 12 · {zohoRevenue?.invoice_count ?? 0} invoices ·{' '}
                  {zohoRevenue?.metrics?.recurring_customers_count ?? 0} recurring customers
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-tight">
                {zohoConnected ? 'ARR (TTM)' : 'ARR Forecast'}
              </p>
              <p className="text-xl font-bold text-primary mt-1">{arrForecast}</p>
            </div>
          </div>

          <div className="h-64">
            {loading ? (
              <div className="w-full h-full flex items-end gap-4 px-4">
                {[40, 55, 65, 80, 50].map((h, i) => (
                  <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mrrData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    dy={8}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {mrrData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isEst ? '#64748b' : '#adc6ff'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense Breakdown - 1/3 width */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Expense Breakdown</h3>
            <button
              onClick={() => navigate('/ledger')}
              className="text-xs text-primary font-semibold hover:text-primary-light transition-colors"
            >
              View
            </button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(() => {
              const expenses = expenseBreakdown.length > 0 ? expenseBreakdown : [];

              return expenses.length > 0 ? (
                expenses.slice(0, 6).map((item) => (
                  <div key={item.label} onClick={() => setSelectedExpense(item)} className="group cursor-pointer">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      <span className="font-semibold text-white">{item.value}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-primary to-tertiary h-full rounded-full" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No expense data</p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* AI INSIGHT / ANOMALY CARD */}
      {(() => {
        const anomalies = isDemoDataLoaded() ? getDemoAnomalies() : [];
        const visibleAnomalies = anomalies.filter((_, idx) => !dismissedAnomalies.includes(String(idx)));

        return visibleAnomalies.length > 0 ? (
          <div className="glass-panel rounded-2xl p-6 border border-primary/20 relative overflow-hidden animate-slide-up group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-transparent"></div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-all">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-1">{visibleAnomalies[0]?.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{visibleAnomalies[0]?.description}</p>
              </div>
              <button
                onClick={() => setDismissedAnomalies([...dismissedAnomalies, '0'])}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* LIVE REVENUE FROM ZOHO BOOKS */}
      {zohoConnected && zohoRevenue && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Headline AR snapshot + MRR breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Accounts Receivable</h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                <span className="text-[10px] font-semibold text-tertiary uppercase">Zoho Live</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">Total Billed</p>
                <p className="text-2xl font-bold text-white">{formatINRCompact(zohoRevenue.total_revenue)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{zohoRevenue.invoice_count} invoices</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-tertiary/5 border border-tertiary/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-tertiary font-semibold">Collected</p>
                  <p className="text-lg font-bold text-white mt-1">{formatINRCompact(zohoRevenue.paid_revenue)}</p>
                  {collectionEfficiency && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{collectionEfficiency}% efficiency</p>
                  )}
                </div>
                <div className="rounded-xl bg-error/5 border border-error/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-error font-semibold">Outstanding</p>
                  <p className="text-lg font-bold text-white mt-1">{formatINRCompact(zohoRevenue.outstanding)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {Math.round((zohoRevenue.outstanding / Math.max(1, zohoRevenue.total_revenue)) * 100)}% of total
                  </p>
                </div>
              </div>
              {/* MRR composition */}
              {zohoRevenue.metrics && zohoRevenue.metrics.mrr > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">MRR Composition</p>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      ARR {formatINRCompact(zohoRevenue.metrics.arr)}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-white">{formatINRCompact(zohoRevenue.metrics.mrr)}/mo</p>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>
                      Recurring{' '}
                      <span className="text-tertiary font-semibold">
                        {formatINRCompact(zohoRevenue.metrics.recurring_mrr)}
                      </span>
                      {zohoRevenue.metrics.recurring_pct_of_mrr !== null && (
                        <span className="text-slate-600"> ({zohoRevenue.metrics.recurring_pct_of_mrr}%)</span>
                      )}
                    </span>
                    <span>
                      One-time{' '}
                      <span className="text-secondary font-semibold">
                        {formatINRCompact(zohoRevenue.metrics.one_time_mrr)}
                      </span>
                    </span>
                  </div>
                  {/* Composition bar */}
                  {zohoRevenue.metrics.mrr > 0 && (
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2 flex">
                      <div
                        className="bg-tertiary h-full"
                        style={{ width: `${(zohoRevenue.metrics.recurring_mrr / zohoRevenue.metrics.mrr) * 100}%` }}
                      />
                      <div
                        className="bg-secondary h-full"
                        style={{ width: `${(zohoRevenue.metrics.one_time_mrr / zohoRevenue.metrics.mrr) * 100}%` }}
                      />
                    </div>
                  )}
                  {/* Cadence mix */}
                  {(() => {
                    const cust = zohoRevenue.metrics.recurring_customers || [];
                    const counts = { monthly: 0, quarterly: 0, annual: 0 };
                    cust.forEach((c) => {
                      counts[c.cadence] = (counts[c.cadence] || 0) + 1;
                    });
                    const total = counts.monthly + counts.quarterly + counts.annual;
                    if (total === 0) return null;
                    return (
                      <div className="flex gap-1 mt-2">
                        {(['monthly', 'quarterly', 'annual'] as const).map((c) => {
                          if (!counts[c]) return null;
                          const color =
                            c === 'monthly'
                              ? 'bg-tertiary/15 text-tertiary border-tertiary/25'
                              : c === 'quarterly'
                                ? 'bg-primary/15 text-primary border-primary/25'
                                : 'bg-secondary/15 text-secondary border-secondary/25';
                          return (
                            <span
                              key={c}
                              className={cn(
                                'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border',
                                color
                              )}
                            >
                              {counts[c]} {c}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Status breakdown bars */}
              {Object.keys(zohoRevenue.by_status || {}).length > 0 && (
                <div className="space-y-2 pt-2">
                  {Object.entries(zohoRevenue.by_status)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 4)
                    .map(([status, amount]) => {
                      const pct = Math.round(((amount as number) / Math.max(1, zohoRevenue.total_revenue)) * 100);
                      const color =
                        status === 'paid' || status === 'closed'
                          ? 'bg-tertiary'
                          : status === 'overdue'
                            ? 'bg-error'
                            : 'bg-primary';
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400 capitalize">{status}</span>
                            <span className="text-slate-300 font-semibold">
                              {formatINRCompact(amount as number)} <span className="text-slate-500">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Top customers — 2/3 width */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Top Customers</h3>
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                Distributor invoices remapped to end-customer
              </span>
            </div>
            {zohoRevenue.top_customers && zohoRevenue.top_customers.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  // Build cadence lookup from recurring_customers
                  const cadenceByName = new Map(
                    (zohoRevenue.metrics?.recurring_customers || []).map((c) => [c.customer, c.cadence])
                  );
                  return zohoRevenue.top_customers.slice(0, 8).map((c, idx) => {
                    const max = zohoRevenue.top_customers[0].revenue || 1;
                    const pct = Math.round((c.revenue / max) * 100);
                    const cadence = cadenceByName.get(c.customer);
                    const cadenceColor =
                      cadence === 'monthly'
                        ? 'bg-tertiary/10 text-tertiary border-tertiary/25'
                        : cadence === 'quarterly'
                          ? 'bg-primary/10 text-primary border-primary/25'
                          : cadence === 'annual'
                            ? 'bg-secondary/10 text-secondary border-secondary/25'
                            : '';
                    return (
                    <div key={`${c.customer}-${idx}`} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-200 font-medium truncate">{c.customer}</span>
                          {cadence && (
                            <span
                              title={`Recurring ${cadence}`}
                              className={cn(
                                'text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded border shrink-0',
                                cadenceColor
                              )}
                            >
                              {cadence}
                            </span>
                          )}
                          {c.via_distributor && (
                            <span
                              title={`Billed via ${c.via_distributor}`}
                              className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 shrink-0"
                            >
                              via reseller
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-500">{c.invoice_count} inv</span>
                          <span className="text-white font-bold tabular-nums w-20 text-right">
                            {formatINRCompact(c.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-tertiary h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No customer data available.</p>
            )}
            {Object.keys(zohoRevenue.distributor_remap || {}).length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {Object.keys(zohoRevenue.distributor_remap).length} invoice
                  {Object.keys(zohoRevenue.distributor_remap).length === 1 ? '' : 's'} re-attributed from
                  distributor to real end-customer (parsed from line item descriptions).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM SECTION - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runway Projection - 1/3 width */}
        <div
          onClick={() => setSelectedCard('Runway')}
          className="glass-panel rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-primary/30 transition-all duration-300 animate-slide-up"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Cash Runway</h3>
          <div className="mb-6">
            {(() => {
              // Backend now returns null when monthly_burn=0 (unbounded runway).
              // Show "—" / "No burn yet" instead of a misleading 999.
              const rm = dashboardSummary?.runway_months;
              if (rm == null) {
                return (
                  <>
                    <p className="text-4xl font-bold text-white mb-2">—</p>
                    <p className="text-xs text-slate-400">No expenses recorded yet</p>
                  </>
                );
              }
              return (
                <>
                  <p className="text-4xl font-bold text-white mb-2">{Number(rm).toFixed(1)}</p>
                  <p className="text-xs text-slate-400">Months of cash remaining</p>
                </>
              );
            })()}
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Projected runway</span>
                <span className="text-slate-300 font-semibold">
                  {dashboardSummary?.runway_months == null ? '∞' : `${runwayPercent.toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-tertiary h-full rounded-full transition-all duration-500" style={{ width: `${runwayPercent}%` }}></div>
              </div>
            </div>
          </div>
          {dashboardSummary?.zero_cash_date && (
            <p className="text-xs text-slate-500 mt-4 italic">
              Zero cash: {new Date(dashboardSummary.zero_cash_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Net Burn - 1/3 width */}
        <div
          onClick={() => setSelectedCard('Burn')}
          className="glass-panel rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-error/30 transition-all duration-300 animate-slide-up relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 opacity-20">
            <Flame className="w-12 h-12 text-error" />
          </div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Monthly Burn</h3>
          <div className="mb-6 relative z-10">
            <p className="text-3xl font-bold text-white mb-2">{getMetric('Monthly Burn').value}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-error font-semibold">{getMetric('Monthly Burn').change} MoM</span>
            </div>
          </div>
          <div className="h-12 w-full flex items-end gap-1">
            {(burnData.length > 0 ? burnData : [0, 0, 0, 0, 0]).map((h, i) => (
              <div key={i} className="flex-1 bg-error/40 rounded-sm transition-all hover:bg-error/60" style={{ height: `${Math.max(12, h)}%` }}></div>
            ))}
          </div>
        </div>

        {/* Cash Flow - 1/3 width */}
        <div
          onClick={() => setSelectedCard('CashFlow')}
          className="glass-panel rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-tertiary/30 transition-all duration-300 animate-slide-up"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Net Cash Flow</h3>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
              <span className="text-xs text-slate-400">Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
              <span className="text-xs text-slate-400">Outflow</span>
            </div>
          </div>
          <div className="h-40">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4edea3" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4edea3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="inflow" stroke="#4edea3" fillOpacity={1} fill="url(#colorInflow)" />
                  <Area type="monotone" dataKey="outflow" stroke="#ffb4ab" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-slate-500">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => navigate('/ledger')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50 group"
        title="New Ledger Entry"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Dashboard Card Detail Modal */}
      <DetailModal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title={selectedCard === 'MRR' ? 'Monthly Recurring Revenue' :
               selectedCard === 'Runway' ? 'Cash Runway Analysis' :
               selectedCard === 'Burn' ? 'Net Burn Trend' :
               'Net Cash Flow Analysis'}
        subtitle="Detailed financial breakdown"
        icon={selectedCard === 'MRR' ? <Wallet className="w-5 h-5" /> :
              selectedCard === 'Runway' ? <Clock className="w-5 h-5" /> :
              selectedCard === 'Burn' ? <Flame className="w-5 h-5" /> :
              <BarChart3 className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {selectedCard === 'MRR' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <DetailStat label="Current MRR" value={getMetric('Revenue (MRR)').value} color="text-primary" />
                <DetailStat label="MoM Growth" value={getMetric('Revenue (MRR)').change || '—'} color="text-tertiary" />
                <DetailStat label="ARR Forecast" value={arrForecast} />
              </div>
              <div className="space-y-3">
                <DetailProgress label="New Business" value={dashboardSummary?.new_business ? formatCurrency(dashboardSummary.new_business) : '—'} percent={dashboardSummary?.new_business_pct || 0} color="bg-primary" />
                <DetailProgress label="Expansion" value={dashboardSummary?.expansion ? formatCurrency(dashboardSummary.expansion) : '—'} percent={dashboardSummary?.expansion_pct || 0} color="bg-tertiary" />
                <DetailProgress label="Churned" value={dashboardSummary?.churned ? formatCurrency(dashboardSummary.churned) : '—'} percent={dashboardSummary?.churned_pct || 0} color="bg-error" />
              </div>
              <p className="text-xs text-slate-500 italic">Revenue composition for the selected timeframe ({timeframe}).</p>
            </>
          )}
          {selectedCard === 'Runway' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DetailStat label="Months Remaining" value={`${getMetric('Runway').value} Mo`} color="text-primary" />
                <DetailStat label="Zero Cash Date" value={dashboardSummary?.zero_cash_date ? new Date(dashboardSummary.zero_cash_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'} />
              </div>
              <div className="space-y-3">
                <DetailProgress label="Cash Reserves" value={dashboardSummary?.cash_reserves ? formatCurrency(dashboardSummary.cash_reserves) : '—'} percent={runwayPercent} color="bg-primary" />
                <DetailProgress label="Monthly Burn" value={getMetric('Monthly Burn').value} percent={25} color="bg-error" />
              </div>
              <div className="bg-tertiary/5 rounded-xl p-4 border border-tertiary/10">
                <p className="text-xs text-tertiary font-bold mb-1">AI Recommendation</p>
                <p className="text-xs text-slate-400">
                  {expenseBreakdown.length > 0
                    ? (() => {
                        const cloudExpense = expenseBreakdown.find(e => e.label.toLowerCase().includes('cloud') || e.label.toLowerCase().includes('infrastructure'));
                        const cloudPct = cloudExpense ? ((cloudExpense.amount / expenseBreakdown.reduce((sum, e) => sum + e.amount, 0)) * 100).toFixed(1) : '15';
                        return `Reducing cloud costs by ${cloudPct}% would extend runway. Review infrastructure spending.`;
                      })()
                    : 'Review infrastructure and cloud spending to optimize runway.'}
                </p>
              </div>
            </>
          )}
          {selectedCard === 'Burn' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DetailStat label="Current Burn" value={getMetric('Monthly Burn').value} color="text-error" />
                <DetailStat label="Trend" value={`${getMetric('Monthly Burn').change} MoM`} color="text-error" />
              </div>
              <div className="space-y-3">
                {expenseBreakdown.length > 0 ? (
                  expenseBreakdown.map((exp, idx) => (
                    <DetailProgress
                      key={idx}
                      label={exp.label}
                      value={exp.value}
                      percent={exp.pct}
                      color={['bg-primary', 'bg-error', 'bg-secondary', 'bg-slate-600'][idx % 4]}
                    />
                  ))
                ) : (
                  <>
                    <DetailProgress label="Personnel" value="—" percent={0} color="bg-primary" />
                    <DetailProgress label="Infrastructure" value="—" percent={0} color="bg-error" />
                    <DetailProgress label="Marketing" value="—" percent={0} color="bg-secondary" />
                    <DetailProgress label="Other" value="—" percent={0} color="bg-slate-600" />
                  </>
                )}
              </div>
            </>
          )}
          {selectedCard === 'CashFlow' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {cashFlowData.length > 0 ? (
                  <>
                    <DetailStat
                      label="Net This Week"
                      value={cashFlowData.length > 0 ? formatCurrency((cashFlowData[cashFlowData.length - 1].inflow - cashFlowData[cashFlowData.length - 1].outflow) * 1000) : '—'}
                      color={cashFlowData.length > 0 && (cashFlowData[cashFlowData.length - 1].inflow - cashFlowData[cashFlowData.length - 1].outflow) < 0 ? 'text-error' : 'text-tertiary'}
                    />
                    <DetailStat
                      label="Avg Inflow"
                      value={formatCurrency((cashFlowData.reduce((sum, d) => sum + (d.inflow || 0), 0) / cashFlowData.length) * 1000)}
                      color="text-tertiary"
                    />
                    <DetailStat
                      label="Avg Outflow"
                      value={formatCurrency((cashFlowData.reduce((sum, d) => sum + (d.outflow || 0), 0) / cashFlowData.length) * 1000)}
                      color="text-error"
                    />
                  </>
                ) : (
                  <>
                    <DetailStat label="Net This Week" value="—" color="text-error" />
                    <DetailStat label="Avg Inflow" value="—" color="text-tertiary" />
                    <DetailStat label="Avg Outflow" value="—" color="text-error" />
                  </>
                )}
              </div>
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <p className="text-xs text-primary font-bold mb-1">Cash Flow Insight</p>
                <p className="text-xs text-slate-400">
                  {dashboardSummary?.cash_flow_insight || 'Monitor weekly cash flow patterns to optimize timing of outflows and ensure sufficient reserves.'}
                </p>
              </div>
            </>
          )}
        </div>
      </DetailModal>

      {/* Expense Detail Modal */}
      <DetailModal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title={selectedExpense?.label || ''}
        subtitle="Expense category breakdown"
        icon={<DollarSign className="w-5 h-5" />}
        size="sm"
      >
        {selectedExpense && (
          <div className="space-y-5">
            <DetailStat label="Total Spend" value={selectedExpense.value} color="text-white" />
            <DetailProgress label="Budget Utilization" value={`${selectedExpense.pct}%`} percent={selectedExpense.pct} color={selectedExpense.pct > 50 ? 'bg-error' : 'bg-primary'} />
            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Budget" value={`${formatCurrency(parseFloat(selectedExpense.value.replace(/[^0-9.]/g, '')) * 1.15)}`} />
              <DetailStat label="Variance" value={selectedExpense.pct > 50 ? 'Over' : 'Under'} color={selectedExpense.pct > 50 ? 'text-error' : 'text-tertiary'} />
            </div>
            <p className="text-xs text-slate-500 italic">Tap "View Ledger" for full transaction-level detail.</p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
