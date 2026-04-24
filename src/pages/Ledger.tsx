import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  Calendar,
  Tag,
  X,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { DetailModal, DetailStat } from '@/components/DetailModal';
import { isDemoDataLoaded, getDemoTransactions } from '@/lib/demo-data';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'cleared' | 'pending' | 'flagged';
}

// Map a raw Zoho Books invoice into the Ledger's `Transaction` shape.
// Invoices are receivables → always income. Status mapping mirrors what the
// dashboard aggregator does (void/draft are real but flagged).
const mapZohoInvoiceToTransaction = (inv: any): Transaction => {
  const rawStatus = String(inv?.status || '').toLowerCase();
  let status: Transaction['status'] = 'pending';
  if (rawStatus === 'paid') status = 'cleared';
  else if (rawStatus === 'void' || rawStatus === 'voided' || rawStatus === 'draft') status = 'flagged';
  else if (rawStatus === 'overdue' || rawStatus === 'partially_paid') status = 'pending';
  else if (rawStatus === 'sent' || rawStatus === 'viewed') status = 'pending';

  const customer = inv?.customer_name || inv?.company_name || 'Customer';
  const num = inv?.invoice_number ? `${inv.invoice_number} · ` : '';
  return {
    id: String(inv?.invoice_id || inv?.invoice_number || crypto.randomUUID()),
    date: String(inv?.date || inv?.created_time || '').slice(0, 10),
    description: `${num}${customer}`,
    category: inv?.transaction_type === 'renewal' ? 'Recurring Revenue' : 'Revenue',
    amount: Number(inv?.total || 0),
    type: 'income',
    status,
  };
};

export function Ledger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'zoho' | 'backend' | 'demo' | 'empty'>('empty');
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // New Transaction State
  const [newTx, setNewTx] = useState<{
    description: string;
    amount: string;
    category: string;
    type: 'income' | 'expense';
    date: string;
  }>({
    description: '',
    amount: '',
    category: 'Software',
    type: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showDateRange, setShowDateRange] = useState(false);

  // Actions Menu State
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Edit Note State
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setRefreshing(true);
    try {
      await _fetchTransactions();
    } finally {
      setRefreshing(false);
    }
  };

  const _fetchTransactions = async () => {
    // 1) Live Zoho Books MCP — every invoice becomes one income row.
    //    Once Zoho is connected it is the ONLY source of truth. We never
    //    silently fall back to demo data, because that would be misleading
    //    (the user explicitly linked their books). Transient empty results
    //    show the empty state with a refresh button instead.
    let mcpConnected = false;
    try {
      const mcpStatus = await api.zohomcp.status();
      mcpConnected = !!mcpStatus?.connected;
    } catch {
      // status check failed → treat as disconnected
    }

    if (mcpConnected) {
      try {
        // Retry once if the MCP session hands back an empty payload (the
        // Zoho MCP backend occasionally re-initialises and returns []).
        let data: any[] = [];
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await api.zohomcp.invoices();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            data = res.data;
            break;
          }
          if (attempt === 0) await new Promise(r => setTimeout(r, 800));
        }
        setTransactions(data.map(mapZohoInvoiceToTransaction));
        setDataSource('zoho');
      } catch (err) {
        console.warn('Zoho MCP invoices unavailable:', err);
        setTransactions([]);
        setDataSource('zoho');
      }
      setLoading(false);
      return;
    }

    // 2) FastAPI backend — only if it actually has rows.
    try {
      const backendTx = await api.transactions.list();
      if (backendTx && backendTx.length > 0) {
        setTransactions(backendTx.map(tx => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          category: tx.category,
          amount: tx.amount,
          type: (tx.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
          status: (tx.status === 'cleared' ? 'cleared' : tx.status === 'pending' ? 'pending' : 'cleared') as 'cleared' | 'pending' | 'flagged',
        })));
        setDataSource('backend');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('FastAPI backend transactions unavailable:', err);
    }

    // 3) Demo data — ONLY if the user has explicitly opted in via Settings.
    //    No auto-bootstrap.
    if (isDemoDataLoaded()) {
      const demoTx = getDemoTransactions().map(tx => ({
        id: tx.id,
        date: tx.date,
        description: tx.description + (tx.tdsSection ? ` [TDS ${tx.tdsSection}]` : '') + (tx.gstRate ? ` [GST ${tx.gstRate}%]` : ''),
        category: tx.category,
        amount: tx.amount,
        type: tx.type === 'credit' ? 'income' as const : 'expense' as const,
        status: tx.status === 'reconciled' ? 'cleared' as const : tx.status === 'pending' ? 'pending' as const : 'cleared' as const,
      }));
      setTransactions(demoTx);
      setDataSource('demo');
    } else {
      setTransactions([]);
      setDataSource('empty');
    }
    setLoading(false);
  };

  // Get filtered and searched transactions
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(tx => tx.category === filterCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (dateRange?.start) {
      filtered = filtered.filter(tx => tx.date >= dateRange.start);
    }
    if (dateRange?.end) {
      filtered = filtered.filter(tx => tx.date <= dateRange.end);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Get unique categories for filter dropdown
  const getCategories = () => {
    const categories = new Set(transactions.map(tx => tx.category));
    return Array.from(categories).sort();
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      // Try FastAPI backend export first
      const csvBlob = await api.transactions.exportCSV();
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    } catch (err) {
      console.error('Error exporting from FastAPI backend, falling back to local export:', err);
    }

    // Fallback: Generate CSV locally from current transactions
    const filtered = getFilteredTransactions();
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Status'];
    const rows = filtered.map(tx => [
      tx.date,
      tx.description,
      tx.category,
      tx.amount.toFixed(2),
      tx.type,
      tx.status
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Mark transaction as reconciled
  const handleMarkReconciled = (txId: string) => {
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === txId
          ? { ...tx, status: tx.status === 'cleared' ? 'pending' : 'cleared' }
          : tx
      )
    );
    setOpenActionMenu(null);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...newTx,
      amount: parseFloat(newTx.amount),
      status: 'cleared' as const,
      id: Math.random().toString(36).substring(7)
    };

    try {
      // Optimistically update local state
      setTransactions(prev => [payload as Transaction, ...prev]);
      setIsModalOpen(false);
      setNewTx({ description: '', amount: '', category: 'Software', type: 'expense', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error('Error creating transaction:', err);
      console.error('Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate summary stats
  const filteredTx = getFilteredTransactions();
  const totalIncome = filteredTx
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = filteredTx
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <section className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-headline font-bold text-white">Ledger</h1>
          <p className="text-slate-400 mt-1 text-xs max-w-lg">Transaction history and accounting</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> New Entry
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 glass-subtle border border-white/[0.06] px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.08] transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => fetchTransactions()}
            disabled={refreshing}
            className="flex items-center gap-2 glass-subtle border border-white/[0.06] px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            title="Re-pull from Zoho Books / backend"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* Summary Stats */}
      {/* Source banner: makes it obvious where the rows are coming from */}
      {!loading && (() => {
        // Special-case: Zoho is connected but the MCP returned an empty
        // payload (it does this intermittently while re-initialising).
        // Surface a clear retry CTA instead of pretending all is well.
        const zohoEmpty = dataSource === 'zoho' && transactions.length === 0;
        return (
          <div className={cn(
            "rounded-xl border px-4 py-2 text-xs flex items-center gap-2 flex-wrap",
            zohoEmpty && "border-amber-500/30 bg-amber-500/5 text-amber-300",
            !zohoEmpty && dataSource === 'zoho' && "border-tertiary/20 bg-tertiary/5 text-tertiary",
            dataSource === 'backend' && "border-primary/20 bg-primary/5 text-primary",
            dataSource === 'demo' && "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
            dataSource === 'empty' && "border-white/10 bg-white/[0.02] text-slate-400",
          )}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {zohoEmpty && (
              <>
                <span>
                  Connected to Zoho Books MCP but received an empty response.
                  This usually clears after one retry.
                </span>
                <button
                  onClick={() => fetchTransactions()}
                  disabled={refreshing}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                  {refreshing ? 'Retrying…' : 'Retry pull'}
                </button>
              </>
            )}
            {!zohoEmpty && dataSource === 'zoho' && <span>Live data from Zoho Books MCP · {transactions.length} invoices</span>}
            {dataSource === 'backend' && <span>FinOS backend · {transactions.length} transactions</span>}
            {dataSource === 'demo' && <span>Demo dataset (manually loaded from Settings) · {transactions.length} sample transactions</span>}
            {dataSource === 'empty' && <span>No data source connected. Link Zoho Books in Integrations or load demo data from Settings.</span>}
          </div>
        );
      })()}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Income</span>
            <TrendingUp className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold text-tertiary">
            ₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-2">{filteredTx.filter(tx => tx.type === 'income').length} transactions</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-error" />
          </div>
          <p className="text-2xl font-bold text-error">
            ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-2">{filteredTx.filter(tx => tx.type === 'expense').length} transactions</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Net Amount</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <p className={cn("text-2xl font-bold", netAmount >= 0 ? "text-tertiary" : "text-error")}>
            {netAmount >= 0 ? '+' : '-'}₹{Math.abs(netAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-2">Balance</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Transactions</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {filteredTx.length}
          </p>
          <p className="text-xs text-slate-400 mt-2">{transactions.length} total</p>
        </div>
      </section>

      {/* New Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-modal rounded-2xl max-w-lg w-full p-8 border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-headline font-bold text-white">New Transaction Entry</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                <input
                  required
                  type="text"
                  value={newTx.description}
                  onChange={e => setNewTx({...newTx, description: e.target.value})}
                  placeholder="e.g. AWS Cloud Infrastructure"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newTx.amount}
                    onChange={e => setNewTx({...newTx, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                  <select
                    value={newTx.type}
                    onChange={e => setNewTx({...newTx, type: e.target.value as 'income' | 'expense'})}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                  <select
                    value={newTx.category}
                    onChange={e => setNewTx({...newTx, category: e.target.value})}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
                  >
                    {['Software', 'Cloud', 'Revenue', 'Payroll', 'Marketing', 'Utilities', 'Taxes'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={e => setNewTx({...newTx, date: e.target.value})}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Execute Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-subtle border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative group flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  (filterType !== 'all' || filterCategory) ? "border-primary/40 text-primary bg-primary/5" : "border-white/[0.06] text-slate-400 hover:text-white"
                )}
              >
                <Filter className="w-3.5 h-3.5" /> Type
              </button>
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-56 glass-panel border border-white/[0.08] rounded-2xl shadow-xl z-50 p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Transaction Type</p>
                    <div className="space-y-2.5">
                      {(['all', 'income', 'expense'] as const).map(type => (
                        <label key={type} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="filter-type"
                            value={type}
                            checked={filterType === type}
                            onChange={e => setFilterType(e.target.value as typeof filterType)}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Category</p>
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">All Categories</option>
                      {getCategories().map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterCategory('');
                      setShowFilterDropdown(false);
                    }}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-white py-2.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDateRange(!showDateRange)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  dateRange ? "border-primary/40 text-primary bg-primary/5" : "border-white/[0.06] text-slate-400 hover:text-white"
                )}
              >
                <Calendar className="w-3.5 h-3.5" /> Date
              </button>
              {showDateRange && (
                <div className="absolute right-0 mt-2 w-56 glass-panel border border-white/[0.08] rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">From</label>
                    <input
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={e =>
                        setDateRange({
                          start: e.target.value,
                          end: dateRange?.end || ''
                        })
                      }
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">To</label>
                    <input
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={e =>
                        setDateRange({
                          start: dateRange?.start || '',
                          end: e.target.value
                        })
                      }
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setDateRange(null);
                      setShowDateRange(false);
                    }}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-white py-2.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    Clear Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Pills */}
        {(filterType !== 'all' || filterCategory || dateRange) && (
          <div className="flex flex-wrap gap-2">
            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium text-primary">
                {filterType}
                <button
                  onClick={() => setFilterType('all')}
                  className="hover:text-primary/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium text-primary">
                {filterCategory}
                <button
                  onClick={() => setFilterCategory('')}
                  className="hover:text-primary/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateRange && (
              <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium text-primary">
                {dateRange.start && dateRange.start.split('-').reverse().join('/')} - {dateRange.end && dateRange.end.split('-').reverse().join('/')}
                <button
                  onClick={() => setDateRange(null)}
                  className="hover:text-primary/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="glass-panel border border-white/[0.04] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500">Date</th>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500">Description</th>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500 text-right">Amount</th>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500">Category</th>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500">Status</th>
                <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading transactions...</p>
                  </td>
                </tr>
              ) : getFilteredTransactions().length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-12 h-12 text-slate-600" />
                      <div>
                        <p className="text-sm text-slate-400 font-medium">
                          {transactions.length === 0
                            ? 'No transactions yet'
                            : 'No transactions match your filters'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {transactions.length === 0
                            ? 'Click "New Entry" to create your first transaction'
                            : 'Try adjusting your filters'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredTransactions().map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-slate-300">{tx.date}</span>
                    </td>
                    <td className="py-4 px-6">
                      {editingNote?.id === tx.id ? (
                        <input
                          type="text"
                          value={editingNote.note}
                          onChange={e =>
                            setEditingNote({ ...editingNote, note: e.target.value })
                          }
                          onBlur={() => setEditingNote(null)}
                          autoFocus
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border",
                              tx.type === 'income'
                                ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
                                : "bg-error/10 border-error/20 text-error"
                            )}
                          >
                            {tx.type === 'income' ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-white">{tx.description}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-mono">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          tx.type === 'income' ? "text-tertiary" : "text-error"
                        )}
                      >
                        {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-2 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] text-xs font-medium text-slate-300">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                          tx.status === 'cleared'
                            ? "text-tertiary"
                            : tx.status === 'pending'
                            ? "text-primary"
                            : "text-error"
                        )}
                      >
                        {tx.status === 'cleared' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : tx.status === 'pending' ? (
                          <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        {tx.status}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          setOpenActionMenu(openActionMenu === tx.id ? null : tx.id);
                        }}
                        className="relative"
                      >
                        <button className="p-2 rounded-lg hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openActionMenu === tx.id && (
                          <div className="absolute right-0 mt-1 w-48 glass-panel border border-white/[0.08] rounded-xl shadow-xl z-50 py-1">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedTx(tx);
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingNote({ id: tx.id, note: tx.description });
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                            >
                              Edit Note
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleMarkReconciled(tx.id);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                            >
                              Mark {tx.status === 'cleared' ? 'Pending' : 'Reconciled'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <DetailModal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={selectedTx?.description || ''}
        subtitle={`Transaction ID: ${selectedTx?.id || ''}`}
        icon={selectedTx?.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
      >
        {selectedTx && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <DetailStat label="Amount" value={`${selectedTx.type === 'income' ? '+' : '-'}₹${selectedTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color={selectedTx.type === 'income' ? 'text-tertiary' : 'text-error'} />
              <DetailStat label="Type" value={selectedTx.type.charAt(0).toUpperCase() + selectedTx.type.slice(1)} color={selectedTx.type === 'income' ? 'text-tertiary' : 'text-error'} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DetailStat label="Category" value={selectedTx.category} />
              <DetailStat label="Date" value={selectedTx.date} />
              <DetailStat label="Status" value={selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)} color={selectedTx.status === 'cleared' ? 'text-tertiary' : selectedTx.status === 'pending' ? 'text-primary' : 'text-error'} />
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Audit Trail</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" />
                  <span>Created on {selectedTx.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" />
                  <span>Auto-categorized as {selectedTx.category}</span>
                </div>
                {selectedTx.status === 'cleared' && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" />
                    <span>Reconciled and cleared</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
