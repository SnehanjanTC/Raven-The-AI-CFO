import React from 'react';
import {
  Filter, PlusCircle, Table, FileText, BarChart3, Sparkles, Download, Share2,
  CheckCircle2, RefreshCw, FileSpreadsheet, TrendingUp, TrendingDown,
  Search, Clock, Shield, User, Tag, ChevronDown, AlertTriangle,
  Calendar, Building2, ArrowUpDown,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Report as ReportInterface, ReportMetric } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

import { DetailModal, DetailStat, DetailProgress } from '@/components/DetailModal';
import { isDemoDataLoaded, getDemoExpenseBreakdown, getDemoSummary, formatCurrency } from '@/lib/demo-data';
import { useReports } from '@/domains/reports';

const REPORT_ICON_MAP: Record<string, LucideIcon> = { FileText, Table, FileSpreadsheet };

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: LucideIcon }> = {
  approved: { color: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/20', icon: CheckCircle2 },
  generated: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: RefreshCw },
  draft: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: FileText },
  failed: { color: 'text-error', bg: 'bg-error/10', border: 'border-error/20', icon: AlertTriangle },
};

const CONF_COLORS: Record<string, string> = {
  restricted: 'text-error bg-error/10 border-error/20',
  confidential: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  internal: 'text-primary bg-primary/10 border-primary/20',
  public: 'text-tertiary bg-tertiary/10 border-tertiary/20',
};

function fmtMetric(m: ReportMetric): string {
  if (m.format === 'currency') return formatCurrency(m.value);
  if (m.format === 'percentage') return `${m.value}%`;
  if (m.format === 'months') return `${m.value} mo`;
  return String(m.value);
}

export function Reports() {
  const {
    reports, loading, generating, syncStatus,
    generate: handleGenerateReport,
    remove: handleDeleteReport,
    archive: handleArchiveReport,
    exportReport: handleExportReport,
  } = useReports();

  const [isDiscrepancyOpen, setIsDiscrepancyOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<ReportInterface | null>(null);
  const [reportTypeFilter, setReportTypeFilter] = React.useState<string>('all');
  const [exportMenuReportId, setExportMenuReportId] = React.useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<'date' | 'name' | 'type'>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // Close export menu on click outside
  React.useEffect(() => {
    if (!exportMenuReportId) return;
    const handler = () => setExportMenuReportId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [exportMenuReportId]);

  // Filter, search, sort
  const filteredReports = React.useMemo(() => {
    let result = reports;
    if (reportTypeFilter !== 'all') result = result.filter(r => r.type === reportTypeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.period.toLowerCase().includes(q) ||
        r.author?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a.type.localeCompare(b.type);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [reports, reportTypeFilter, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const paginatedReports = filteredReports.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const recentReports = filteredReports.slice(0, 4);

  // Unique types for filter
  const reportTypes = React.useMemo(() => {
    const set = new Set(reports.map(r => r.type));
    return ['all', ...Array.from(set)];
  }, [reports]);

  // Counts by type
  const typeCounts = React.useMemo(() => {
    const map: Record<string, number> = { all: reports.length };
    reports.forEach(r => { map[r.type] = (map[r.type] || 0) + 1; });
    return map;
  }, [reports]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── AI Auditor insight (live-data first, demo fallback) ──────────
  // We compute this from whatever reports are loaded. When the Zoho-derived
  // reports are present (id 'zoho-top-customers' / 'zoho-pnl-ttm'), we use
  // the real customer-concentration ratio. Falls back to demo expenses only
  // if the user has manually loaded the demo dataset.
  const auditorInsight = React.useMemo(() => {
    const topCustReport = reports.find(r => r.id === 'zoho-top-customers');
    const pnlReport = reports.find(r => r.id === 'zoho-pnl-ttm');
    if (topCustReport && pnlReport) {
      const topMetric = topCustReport.metrics?.[0];
      const totalRev = pnlReport.metrics?.find(m => m.label.toLowerCase().includes('total revenue'))?.value || 0;
      if (topMetric && totalRev > 0) {
        const pct = (topMetric.value / totalRev) * 100;
        return {
          source: 'zoho' as const,
          headline: 'Customer Concentration Risk',
          tone: pct > 30 ? 'error' : pct > 15 ? 'warn' : 'ok',
          body: `${topMetric.label} alone accounts for ${formatCurrency(topMetric.value)} (${pct.toFixed(1)}%) of trailing-12mo revenue.`,
          impactLabel: 'Top customer share',
          impactValue: `${pct.toFixed(1)}%`,
          sourceLabel: topMetric.label,
        };
      }
    }
    if (isDemoDataLoaded()) {
      const breakdown = getDemoExpenseBreakdown();
      const top = breakdown[0];
      const total = breakdown.reduce((s, e) => s + e.amount, 0);
      if (top && total > 0) {
        const pct = (top.amount / total) * 100;
        const summary = getDemoSummary();
        const monthsImpact = summary.monthlyBurn ? (top.amount / summary.monthlyBurn).toFixed(1) : '—';
        return {
          source: 'demo' as const,
          headline: 'High Variance Detected',
          tone: 'warn',
          body: `${top.category} (${formatCurrency(top.amount)}) represents ${pct.toFixed(1)}% of total expenses.`,
          impactLabel: 'Impact on Runway',
          impactValue: `-${monthsImpact} mo`,
          sourceLabel: top.category,
        };
      }
    }
    return {
      source: 'empty' as const,
      headline: 'Awaiting Data',
      tone: 'ok',
      body: 'Connect Zoho Books or load demo data from Settings to surface anomaly insights.',
      impactLabel: 'Impact on Runway',
      impactValue: '—',
      sourceLabel: 'N/A',
    };
  }, [reports]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── AI Auditor Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {isDiscrepancyOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card rounded-2xl max-w-2xl w-full p-8 border border-white/[0.08] shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Sparkles className="w-6 h-6 text-primary fill-current" /></div>
                  <div><h3 className="text-xl font-headline font-bold text-white">AI Auditor Insight</h3><p className="text-xs text-slate-500">Anomaly detection powered by Raven AI</p></div>
                </div>
                <button onClick={() => setIsDiscrepancyOpen(false)} className="text-slate-500 hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="space-y-6">
                <div className={cn(
                  "rounded-xl p-5 border",
                  auditorInsight.tone === 'error' && "bg-error/10 border-error/20",
                  auditorInsight.tone === 'warn' && "bg-amber-400/10 border-amber-400/20",
                  auditorInsight.tone === 'ok' && "bg-tertiary/10 border-tertiary/20",
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={cn(
                      "w-4 h-4",
                      auditorInsight.tone === 'error' && "text-error",
                      auditorInsight.tone === 'warn' && "text-amber-400",
                      auditorInsight.tone === 'ok' && "text-tertiary",
                    )} />
                    <span className={cn(
                      "text-xs font-bold uppercase",
                      auditorInsight.tone === 'error' && "text-error",
                      auditorInsight.tone === 'warn' && "text-amber-400",
                      auditorInsight.tone === 'ok' && "text-tertiary",
                    )}>{auditorInsight.headline}</span>
                    {auditorInsight.source === 'zoho' && (
                      <span className="ml-auto text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-tertiary/10 text-tertiary border border-tertiary/20">Live · Zoho</span>
                    )}
                    {auditorInsight.source === 'demo' && (
                      <span className="ml-auto text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">Demo</span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed">{auditorInsight.body}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-high rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{auditorInsight.impactLabel}</p><p className="text-lg font-bold text-white">{auditorInsight.impactValue}</p></div>
                  <div className="bg-surface-container-high rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Source</p><p className="text-lg font-bold text-white">{auditorInsight.sourceLabel}</p></div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsDiscrepancyOpen(false)} className="flex-1 bg-primary text-on-primary py-3 rounded-xl text-sm font-bold">Adjust Budget & Regenerate</button>
                  <button onClick={() => setIsDiscrepancyOpen(false)} className="px-6 py-3 border border-white/5 rounded-xl text-sm font-bold text-on-surface hover:bg-white/5">Dismiss</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Reports</h1>
          <p className="text-on-surface-variant text-sm max-w-xl">Indian GAAP / Schedule III compliant financial reports with AI insights, version control, and multi-format export</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleGenerateReport} disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-on-primary px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 shrink-0">
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Report'}
        </motion.button>
      </div>

      {/* ── Quick Export + AI Auditor Row ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Export */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/[0.08]">
          <h3 className="text-sm font-bold text-on-surface mb-4">Quick Export</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: FileSpreadsheet, label: 'Excel', format: 'xlsx', sub: '.xlsx', color: 'text-tertiary' },
              { icon: FileText, label: 'PDF', format: 'pdf', sub: '.pdf', color: 'text-error' },
              { icon: BarChart3, label: 'Slides', format: 'pptx', sub: '.pptx', color: 'text-primary' },
              { icon: Table, label: 'CSV', format: 'csv', sub: '.csv', color: 'text-secondary' },
            ].map(btn => (
              <motion.button key={btn.format} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={() => reports.length > 0 ? handleExportReport(reports[0], btn.format) : null}
                className="flex items-center gap-3 p-4 glass-subtle rounded-xl border border-white/[0.08] hover:border-white/[0.12] transition-all text-left">
                <btn.icon className={cn("w-6 h-6 shrink-0", btn.color)} />
                <div><span className="text-xs font-bold text-on-surface block">{btn.label}</span><span className="text-[10px] text-slate-500">{btn.sub}</span></div>
              </motion.button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sync</span>
              <div className={cn("flex items-center gap-1.5 text-[10px] font-medium", syncStatus === 'synced' ? "text-tertiary" : syncStatus === 'syncing' ? "text-primary" : "text-slate-500")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", syncStatus === 'synced' ? "bg-tertiary" : syncStatus === 'syncing' ? "bg-primary animate-pulse" : "bg-slate-500")} />
                {syncStatus === 'synced' ? 'Connected' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
              </div>
            </div>
            <span className="text-[10px] text-slate-500">{filteredReports.length} reports</span>
          </div>
        </div>

        {/* AI Auditor Card */}
        <div className="glass-panel rounded-2xl p-6 border border-primary/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
              <h3 className="text-sm font-bold text-primary">AI Auditor</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">Q3 Cash Flow Analysis ready. AI detected a <span className="text-primary font-semibold">12% marketing spend variance</span> not flagged in prior drafts.</p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsDiscrepancyOpen(true)}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2.5 rounded-lg text-xs font-bold transition-all border border-primary/20">
            Review Discrepancies
          </motion.button>
        </div>
      </div>

      {/* ── Search + Filter Bar ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search reports by name, type, author, tag..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 glass-card rounded-xl border border-white/[0.08] focus:border-primary/30 focus:outline-none text-sm text-on-surface placeholder:text-slate-500 bg-transparent" />
        </div>
        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {reportTypes.map(type => (
            <button key={type} onClick={() => { setReportTypeFilter(type); setCurrentPage(1); }}
              className={cn("px-4 py-2.5 rounded-xl text-xs font-bold transition-all border", reportTypeFilter === type ? "bg-primary/10 text-primary border-primary/20" : "glass-card text-on-surface-variant border-white/[0.08] hover:border-white/[0.12]")}>
              {type === 'all' ? 'All' : type} <span className="ml-1 opacity-60">{typeCounts[type] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Cards ───────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Recently Generated</h3>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm"><RefreshCw className="w-5 h-5 animate-spin mr-3" /> Loading reports...</div>
        ) : recentReports.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl border border-white/[0.08]">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-on-surface mb-1">No reports found</p>
            <p className="text-xs text-slate-500">{searchQuery ? 'Try a different search term' : 'Generate your first report to get started'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentReports.map((report, idx) => {
              const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
              return (
                <motion.div key={report.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelectedReport(report)} className="glass-card rounded-xl overflow-hidden cursor-pointer group hover:border-white/[0.12] border border-white/[0.08] transition-all active:scale-[0.98]">
                  <div className={cn("h-16 flex items-center justify-between px-4 relative overflow-hidden bg-gradient-to-br to-[#0c1324]",
                    idx === 0 ? "from-[#1c2a4d]" : idx === 1 ? "from-[#3b2a4d]" : idx === 2 ? "from-[#2a4d46]" : "from-[#4d2a2a]")}>
                    {(() => { const Icon = REPORT_ICON_MAP[report.icon] || FileText; return <Icon className="w-6 h-6 text-white/30" />; })()}
                    <div className="flex items-center gap-1">
                      {report.gaap && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded uppercase border text-amber-300 bg-amber-400/10 border-amber-400/20">Sch III</span>}
                      {report.confidentiality && <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border", CONF_COLORS[report.confidentiality] || '')}>{report.confidentiality}</span>}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", sc.color, sc.bg, sc.border)}>{report.status}</span>
                      <span className="text-[10px] text-slate-500">{report.version}</span>
                    </div>
                    <h4 className="font-bold text-on-surface text-xs line-clamp-2 leading-snug">{report.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{report.period}</span>
                      <span className="text-[10px] text-slate-500">{report.type}</span>
                    </div>
                    {report.author && <div className="flex items-center gap-1 text-[10px] text-slate-500"><User className="w-3 h-3" />{report.author}</div>}
                    {/* Top 2 metrics */}
                    {report.metrics && report.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {report.metrics.slice(0, 2).map((m, i) => (
                          <div key={i} className="bg-surface-container-high/50 rounded-lg p-2">
                            <p className="text-[8px] text-slate-500 uppercase truncate">{m.label}</p>
                            <p className="text-xs font-bold text-on-surface">{fmtMetric(m)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Reports Table ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">All Reports</h3>
          <span className="text-xs text-slate-500">{filteredReports.length} reports — Page {currentPage} of {totalPages}</span>
        </div>
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-white/[0.02] border-b border-white/[0.05]">
                <tr>
                  <th className="py-3.5 px-5"><button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Report {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}</button></th>
                  <th className="py-3.5 px-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Period</th>
                  <th className="py-3.5 px-5"><button onClick={() => toggleSort('type')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Type {sortField === 'type' && <ArrowUpDown className="w-3 h-3" />}</button></th>
                  <th className="py-3.5 px-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Author</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="py-3.5 px-5"><button onClick={() => toggleSort('date')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Date {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}</button></th>
                  <th className="py-3.5 px-5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {paginatedReports.map(report => {
                  const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={report.id} onClick={() => setSelectedReport(report)} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg glass-subtle border border-white/[0.08] flex items-center justify-center shrink-0">
                            {(() => { const I = REPORT_ICON_MAP[report.icon] || FileText; return <I className="w-4 h-4 text-secondary" />; })()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-on-surface truncate">{report.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {report.gaap && <span className="text-[7px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">Sch III</span>}
                              {report.tags?.slice(0, 2).map(tag => <span key={tag} className="text-[8px] text-slate-500 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]">{tag}</span>)}
                              <span className="text-[10px] text-slate-500">{report.version}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5"><span className="text-xs text-on-surface-variant">{report.period}</span></td>
                      <td className="py-3.5 px-5"><span className="text-[10px] font-bold uppercase text-slate-400">{report.type}</span></td>
                      <td className="py-3.5 px-5"><span className="text-xs text-on-surface-variant">{report.author || '—'}</span></td>
                      <td className="py-3.5 px-5">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold", sc.color)}><StatusIcon className="w-3 h-3" />{report.status}</span>
                      </td>
                      <td className="py-3.5 px-5"><span className="text-[10px] text-slate-500">{new Date(report.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setExportMenuReportId(exportMenuReportId === report.id ? null : report.id)}
                              className="w-7 h-7 rounded-lg glass-subtle flex items-center justify-center text-slate-400 hover:text-primary transition-colors border border-white/[0.08]"><Download className="w-3.5 h-3.5" /></button>
                            <AnimatePresence>
                              {exportMenuReportId === report.id && (
                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                  className="absolute right-0 top-full mt-1 glass-card border border-white/[0.08] rounded-xl shadow-2xl z-30 min-w-[130px] py-1">
                                  {[{ l: 'Excel (.xlsx)', f: 'xlsx' }, { l: 'PDF Report', f: 'pdf' }, { l: 'Slides (.pptx)', f: 'pptx' }, { l: 'CSV Data', f: 'csv' }].map(o => (
                                    <button key={o.f} onClick={() => { handleExportReport(report, o.f); setExportMenuReportId(null); }}
                                      className="block w-full text-left px-3 py-1.5 text-[11px] text-on-surface hover:bg-white/[0.05] transition-colors">{o.l}</button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <button onClick={e => { e.stopPropagation(); handleArchiveReport(report.id); }}
                            className="w-7 h-7 rounded-lg glass-subtle flex items-center justify-center text-slate-400 hover:text-primary transition-colors border border-white/[0.08]"><Share2 className="w-3.5 h-3.5" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteReport(report.id); }}
                            className="w-7 h-7 rounded-lg glass-subtle flex items-center justify-center text-slate-400 hover:text-error transition-colors border border-white/[0.08]"><PlusCircle className="w-3.5 h-3.5 rotate-45" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Previous</button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}
                    className={cn("w-7 h-7 rounded-lg text-[10px] font-bold transition-all", currentPage === i + 1 ? "bg-primary/20 text-primary" : "text-slate-500 hover:text-white")}>{i + 1}</button>
                ))}
              </div>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Next</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Report Detail Modal (Enterprise-grade) ─────────────── */}
      <DetailModal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport?.name || ''} subtitle={selectedReport?.type || ''} size="lg"
        icon={(() => { if (!selectedReport) return <FileText className="w-5 h-5" />; const I = REPORT_ICON_MAP[selectedReport.icon] || FileText; return <I className="w-5 h-5" />; })()}>
        {selectedReport && (
          <div className="space-y-6">
            {/* Meta bar */}
            <div className="flex flex-wrap gap-2 items-center">
              {selectedReport.gaap && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase border text-amber-300 bg-amber-400/10 border-amber-400/20">
                  {selectedReport.gaap.standard} — Schedule III Div {selectedReport.gaap.division}
                </span>
              )}
              {selectedReport.confidentiality && <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", CONF_COLORS[selectedReport.confidentiality])}><Shield className="w-3 h-3 inline mr-1" />{selectedReport.confidentiality}</span>}
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", STATUS_CONFIG[selectedReport.status]?.color, STATUS_CONFIG[selectedReport.status]?.bg, STATUS_CONFIG[selectedReport.status]?.border)}>{selectedReport.status}</span>
              <span className="text-[10px] text-slate-500">{selectedReport.version}</span>
              {selectedReport.schedule?.frequency && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{selectedReport.schedule.frequency}</span>}
            </div>

            {/* GAAP Compliance Info */}
            {selectedReport.gaap && (
              <div className="bg-amber-400/5 rounded-xl p-4 border border-amber-400/15">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-2">Schedule III Compliance</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-[8px] text-slate-500 uppercase">Standard</p><p className="text-white font-semibold">{selectedReport.gaap.standard}</p></div>
                  <div><p className="text-[8px] text-slate-500 uppercase">Division</p><p className="text-white font-semibold">Division {selectedReport.gaap.division}</p></div>
                  {selectedReport.gaap.cin && <div><p className="text-[8px] text-slate-500 uppercase">CIN</p><p className="text-white font-mono text-[10px]">{selectedReport.gaap.cin}</p></div>}
                  <div><p className="text-[8px] text-slate-500 uppercase">Company</p><p className="text-white font-semibold text-[10px]">{selectedReport.gaap.companyName}</p></div>
                </div>
                {selectedReport.gaap.registeredOffice && (
                  <p className="text-[9px] text-slate-500 mt-2">Regd. Office: {selectedReport.gaap.registeredOffice}</p>
                )}
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailStat label="Period" value={selectedReport.period} />
              <DetailStat label="Generated" value={new Date(selectedReport.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
              {selectedReport.author && <DetailStat label="Author" value={selectedReport.author} />}
              {selectedReport.department && <DetailStat label="Department" value={selectedReport.department} />}
            </div>

            {/* Tags */}
            {selectedReport.tags && selectedReport.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedReport.tags.map(tag => <span key={tag} className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20 flex items-center gap-1"><Tag className="w-3 h-3" />{tag}</span>)}
              </div>
            )}

            {/* AI Summary */}
            {selectedReport.summary && (
              <div className="bg-surface-container-high/50 rounded-xl p-4 border border-white/5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Summary</p>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.summary}</p>
              </div>
            )}

            {/* Key Metrics */}
            {selectedReport.metrics && selectedReport.metrics.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Key Metrics</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedReport.metrics.map((m, i) => (
                    <div key={i} className="bg-surface-container-high/50 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase truncate mb-1">{m.label}</p>
                      <p className="text-sm font-bold text-white">{fmtMetric(m)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {m.change !== undefined && (
                          <span className={cn("text-[9px] font-bold flex items-center gap-0.5", m.trend === 'up' ? 'text-tertiary' : m.trend === 'down' ? 'text-error' : 'text-slate-400')}>
                            {m.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : m.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                            {m.change > 0 ? '+' : ''}{m.change}%
                          </span>
                        )}
                        {m.subtext && <span className="text-[8px] text-slate-500 truncate">{m.subtext}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {selectedReport.sections && selectedReport.sections.length > 0 && (
              <div className="space-y-4">
                {selectedReport.sections.map(section => (
                  <div key={section.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <div className="bg-white/[0.02] px-4 py-3">
                      <h4 className="text-xs font-bold text-on-surface">{section.title}</h4>
                      {section.description && <p className="text-[10px] text-slate-500 mt-0.5">{section.description}</p>}
                    </div>
                    <div className="p-4 space-y-3">
                      {section.metrics.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {section.metrics.map((m, i) => (
                            <div key={i} className="bg-surface-container-high/30 rounded-lg p-2.5">
                              <p className="text-[8px] text-slate-500 uppercase truncate">{m.label}</p>
                              <p className="text-xs font-bold text-white">{fmtMetric(m)}</p>
                              {m.subtext && <p className="text-[8px] text-slate-500 mt-0.5">{m.subtext}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {section.findings && section.findings.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-tertiary uppercase mb-1.5">Findings</p>
                          <ul className="space-y-1">
                            {section.findings.map((f, i) => <li key={i} className="text-[11px] text-slate-400 leading-relaxed flex gap-2"><CheckCircle2 className="w-3 h-3 text-tertiary shrink-0 mt-0.5" />{f}</li>)}
                          </ul>
                        </div>
                      )}
                      {section.risks && section.risks.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-amber-400 uppercase mb-1.5">Risks</p>
                          <ul className="space-y-1">
                            {section.risks.map((r, i) => <li key={i} className="text-[11px] text-slate-400 leading-relaxed flex gap-2"><AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Accounting Policies & Notes (collapsed by default) */}
            {selectedReport.gaap?.significantAccountingPolicies && (
              <details className="rounded-xl border border-white/[0.06] overflow-hidden group">
                <summary className="bg-white/[0.02] px-4 py-3 cursor-pointer text-xs font-bold text-on-surface flex items-center gap-2 hover:bg-white/[0.04] transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                  Significant Accounting Policies
                  <span className="text-[8px] text-slate-500 font-normal ml-auto">{selectedReport.gaap.significantAccountingPolicies.length} policies</span>
                </summary>
                <div className="p-4 space-y-2">
                  {selectedReport.gaap.significantAccountingPolicies.map((p, i) => (
                    <p key={i} className="text-[10px] text-slate-400 leading-relaxed">{i + 1}. {p}</p>
                  ))}
                </div>
              </details>
            )}

            {selectedReport.gaap?.notes && (
              <details className="rounded-xl border border-white/[0.06] overflow-hidden group">
                <summary className="bg-white/[0.02] px-4 py-3 cursor-pointer text-xs font-bold text-on-surface flex items-center gap-2 hover:bg-white/[0.04] transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                  Notes to Accounts
                  <span className="text-[8px] text-slate-500 font-normal ml-auto">{selectedReport.gaap.notes.length} notes</span>
                </summary>
                <div className="p-4 space-y-2">
                  {selectedReport.gaap.notes.map((n, i) => (
                    <p key={i} className="text-[10px] text-slate-400 leading-relaxed">{n}</p>
                  ))}
                </div>
              </details>
            )}

            {selectedReport.gaap?.auditorRemarks && (
              <details className="rounded-xl border border-white/[0.06] overflow-hidden group">
                <summary className="bg-white/[0.02] px-4 py-3 cursor-pointer text-xs font-bold text-on-surface flex items-center gap-2 hover:bg-white/[0.04] transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                  Auditor's Remarks
                  <span className="text-[8px] text-slate-500 font-normal ml-auto">{selectedReport.gaap.auditorRemarks.length} remarks</span>
                </summary>
                <div className="p-4 space-y-2">
                  {selectedReport.gaap.auditorRemarks.map((r, i) => (
                    <p key={i} className="text-[10px] text-slate-400 leading-relaxed">{r}</p>
                  ))}
                </div>
              </details>
            )}

            {/* Approval chain */}
            {(selectedReport.reviewedBy || selectedReport.approvedBy) && (
              <div className="flex flex-wrap gap-4">
                {selectedReport.reviewedBy && (
                  <div className="bg-surface-container-high/50 rounded-xl p-3 border border-white/5 flex-1 min-w-[180px]">
                    <p className="text-[9px] text-slate-500 uppercase mb-1">Reviewed By</p>
                    <p className="text-xs font-bold text-white">{selectedReport.reviewedBy.name}</p>
                    <p className="text-[10px] text-slate-500">{selectedReport.reviewedBy.role} — {new Date(selectedReport.reviewedBy.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                  </div>
                )}
                {selectedReport.approvedBy && (
                  <div className="bg-surface-container-high/50 rounded-xl p-3 border border-tertiary/10 flex-1 min-w-[180px]">
                    <p className="text-[9px] text-tertiary uppercase mb-1">Approved By</p>
                    <p className="text-xs font-bold text-white">{selectedReport.approvedBy.name}</p>
                    <p className="text-[10px] text-slate-500">{selectedReport.approvedBy.role} — {new Date(selectedReport.approvedBy.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                  </div>
                )}
              </div>
            )}

            {/* Export actions */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Export {selectedReport.gaap ? '(Schedule III Format)' : 'As'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Excel', format: 'xlsx', icon: FileSpreadsheet },
                  { label: 'PDF', format: 'pdf', icon: FileText },
                  { label: 'Slides', format: 'pptx', icon: BarChart3 },
                  { label: 'CSV', format: 'csv', icon: Table },
                ].map(opt => (
                  <button key={opt.format} onClick={e => { e.stopPropagation(); handleExportReport(selectedReport, opt.format); }}
                    className="flex items-center justify-center gap-2 py-2.5 glass-subtle rounded-xl text-xs font-bold text-on-surface hover:bg-white/[0.05] transition-all active:scale-[0.98] border border-white/[0.08]">
                    <opt.icon className="w-4 h-4 text-primary" /> {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedReport(null)} className="w-full px-6 py-2.5 border border-white/5 rounded-xl text-xs font-bold text-on-surface hover:bg-white/5 transition-all">Close</button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
