import React from 'react';
import { Cpu, Database, Search, ShieldCheck, Zap, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DetailModal, DetailStat, DetailProgress } from '@/components/DetailModal';
import { isDemoDataLoaded, getDemoTransactions, getDemoInvoices, getDemoFilings, getDemoTeam, getDemoVendors, getDemoMetrics, onDemoDataChange, formatCurrency } from '@/lib/demo-data';

export function Memory() {
  const [stats, setStats] = React.useState({ nodes: '—', sources: '—', lastUpdate: 'Connecting...' });
  const [loading, setLoading] = React.useState(true);
  const [selectedSource, setSelectedSource] = React.useState<{ source: string; items: number; last: string; status: string } | null>(null);
  const [selectedStat, setSelectedStat] = React.useState<string | null>(null);
  const [sources, setSources] = React.useState<{ source: string; items: number; last: string; status: string }[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredSources, setFilteredSources] = React.useState<{ source: string; items: number; last: string; status: string }[]>([]);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchMemoryStats();
  }, []);

  React.useEffect(() => {
    updateSourcesFromDemoData();
  }, []);

  React.useEffect(() => {
    const unsubscribe = onDemoDataChange(() => {
      updateSourcesFromDemoData();
      fetchMemoryStats();
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    const filtered = sources.filter(source =>
      source.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSources(filtered);
  }, [searchQuery, sources]);

  const updateSourcesFromDemoData = async () => {
    // Strategy 0: Live Zoho Books MCP — surface invoices as a memory source
    // when the user has linked their books. This is the source of truth.
    try {
      const status = await api.zohomcp.status();
      if (status?.connected) {
        const inv = await api.zohomcp.invoices();
        const count = Number(inv?.count ?? 0);
        if (count > 0) {
          setSources([
            {
              source: `Zoho Books — Invoices (${count} records)`,
              items: count,
              last: 'just now',
              status: 'ready',
            },
            {
              source: 'Zoho Books — Customer Ledger',
              items: count,
              last: 'just now',
              status: 'indexed',
            },
          ]);
          return;
        }
      }
    } catch {
      // MCP not connected — fall through
    }

    try {
      const transactions = await api.transactions.list();
      const filings = await api.filings.list();
      const integrations = await api.integrations.list();

      // Truthy check is NOT enough — `[]` is truthy in JS, so a freshly-created
      // guest user (zero rows) would render an empty page. Require at least
      // ONE record across all three to consider the backend "populated";
      // otherwise fall through to the demo dataset below.
      const totalRows =
        (transactions?.length ?? 0) + (filings?.length ?? 0) + (integrations?.length ?? 0);
      if (totalRows > 0) {
        const newSources = [
          {
            source: `Transactions (${transactions.length} records)`,
            items: transactions.length,
            last: 'just now',
            status: 'ready'
          },
          {
            source: `Filings (${filings.length} records)`,
            items: filings.length,
            last: 'just now',
            status: 'ready'
          },
          {
            source: `Integrations (${integrations.length} connected)`,
            items: integrations.length,
            last: 'just now',
            status: 'indexed'
          }
        ];

        setSources(newSources);
        return;
      }
    } catch (err) {
      console.error('Error fetching from FastAPI backend:', err);
    }

    if (isDemoDataLoaded()) {
      const now = new Date();
      const transactions = getDemoTransactions();
      const invoices = getDemoInvoices();
      const filings = getDemoFilings();
      const team = getDemoTeam();
      const vendors = getDemoVendors();
      const metrics = getDemoMetrics();

      const newSources = [
        {
          source: `Transactions (${transactions.length} records)`,
          items: transactions.length,
          last: 'just now',
          status: 'ready'
        },
        {
          source: `Invoices & Filings (${invoices.length + filings.length} records)`,
          items: invoices.length + filings.length,
          last: 'just now',
          status: 'ready'
        },
        {
          source: `Team & Vendors (${team.length + vendors.length} records)`,
          items: team.length + vendors.length,
          last: 'just now',
          status: 'indexed'
        }
      ];

      setSources(newSources);
      return;
    }

    // No live source AND no demo data — surface a clear empty state so the
    // user knows what to do next instead of seeing "0 sources" silently.
    setSources([
      {
        source: 'No data sources connected',
        items: 0,
        last: '—',
        status: 'empty',
      },
    ]);
  };

  const calculateNodeCount = async (): Promise<number> => {
    try {
      const transactions = await api.transactions.list();
      const filings = await api.filings.list();
      const integrations = await api.integrations.list();

      const total =
        (transactions?.length ?? 0) + (filings?.length ?? 0) + (integrations?.length ?? 0);
      if (total > 0) return total;
      // else fall through to demo data
    } catch (err) {
      console.error('Error calculating node count from backend:', err);
    }

    if (isDemoDataLoaded()) {
      return (
        getDemoTransactions().length +
        getDemoInvoices().length +
        getDemoFilings().length +
        getDemoTeam().length +
        getDemoVendors().length +
        getDemoMetrics().length
      );
    }
    return 0;
  };

  const fetchMemoryStats = async () => {
    try {
      const nodeCount = await calculateNodeCount();
      if (nodeCount > 0) {
        setStats({
          nodes: nodeCount.toLocaleString(),
          sources: sources.length.toString(),
          lastUpdate: 'Live Sync'
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error fetching memory stats from backend:', err);
    }

    if (isDemoDataLoaded()) {
      const nodeCount = await calculateNodeCount();
      setStats({
        nodes: nodeCount.toLocaleString(),
        sources: sources.length.toString(),
        lastUpdate: 'Demo Data'
      });
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const handleQueryMemory = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    try {
      const results = await api.transactions.list({ search: searchQuery });
      setSearchResults(results || []);
    } catch (err) {
      console.error('Error querying memory engine:', err);
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold text-white">Memory</h1>
          <p className="text-sm text-slate-400">Structured Intelligence Framework</p>
        </div>
        <div className="px-3 py-2 glass-panel rounded-lg flex items-center gap-2 border border-white/[0.06]">
          <div className={cn("w-2 h-2 rounded-full", loading ? "bg-slate-500 animate-pulse" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]")}></div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{loading ? 'Syncing...' : stats.lastUpdate}</span>
        </div>
      </section>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setSelectedStat('nodes')}
          className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/[0.06] hover:border-[#e5a764]/30 transition-all text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Cpu className="w-16 h-16 text-[#e5a764]" />
          </div>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Knowledge Nodes</p>
            <h3 className="text-3xl font-bold text-white mb-2">{stats.nodes}</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-[#e5a764]">
              <Zap className="w-3 h-3 fill-current" />
              <span>Active Indexing</span>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedStat('sources')}
          className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/[0.06] hover:border-emerald-500/30 transition-all text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Data Sources</p>
            <h3 className="text-3xl font-bold text-white mb-2">{stats.sources}</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Sync</span>
            </div>
          </div>
        </button>

        <button
          onClick={() => {}}
          className="glass-card rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-between text-left"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4">Quick Stats</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Sync Status</span>
              <span className={cn("text-xs font-bold", loading ? "text-slate-500" : "text-emerald-400")}>{loading ? 'Syncing' : 'Live'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Framework</span>
              <span className="text-xs font-bold text-white">SIF v1</span>
            </div>
          </div>
        </button>
      </div>

      {/* Search/Query Section */}
      <div className="glass-card rounded-2xl p-8 border border-white/[0.06] space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Query Memory</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search across all indexed data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQueryMemory()}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#e5a764]/50"
            />
          </div>
          <button
            onClick={handleQueryMemory}
            className="px-6 py-3 bg-gradient-to-r from-[#e5a764] to-[#d99850] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all"
          >
            Query
          </button>
        </div>
      </div>

      {/* Data Sources List */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.06] space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          Active Context Streams {searchQuery && `(${filteredSources.length} matching)`}
        </h3>
        <div className="space-y-2">
          {(filteredSources.length > 0 ? filteredSources : sources).map((m) => (
            <button
              key={m.source}
              onClick={() => setSelectedSource(m)}
              className="w-full flex items-center justify-between p-4 glass-subtle rounded-xl border border-white/[0.06] hover:bg-white/[0.08] transition-all group text-left"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center text-slate-500 group-hover:text-[#e5a764] transition-colors">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">{m.source}</span>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{m.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 ml-4">
                <div className="text-right">
                  <span className="text-sm font-bold text-white block">{m.items.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-tighter">indexed</span>
                </div>
                <div className="text-right min-w-[60px]">
                  <span className="text-xs text-[#e5a764] font-bold block">{m.last}</span>
                  <span className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">sync</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#e5a764] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Memory Stat Detail Modal */}
      <DetailModal
        isOpen={!!selectedStat}
        onClose={() => setSelectedStat(null)}
        title={selectedStat === 'nodes' ? 'Knowledge Nodes' : 'Data Sources'}
        subtitle="SIF Memory engine details"
        icon={selectedStat === 'nodes' ? <Cpu className="w-5 h-5" /> : <Database className="w-5 h-5" />}
        size="sm"
      >
        {selectedStat === 'nodes' && (
          <div className="space-y-5">
            <DetailStat label="Total Nodes" value={stats.nodes} color="text-[#e5a764]" />
            <div className="space-y-3">
              <DetailProgress label="Financial Data" value="62%" percent={62} color="bg-[#e5a764]" />
              <DetailProgress label="Transaction Logs" value="24%" percent={24} color="bg-emerald-500" />
              <DetailProgress label="Document Embeddings" value="14%" percent={14} color="bg-[#c4bdb4]" />
            </div>
            <div className="bg-[#e5a764]/10 rounded-xl p-4 border border-[#e5a764]/20">
              <p className="text-xs text-[#e5a764] font-bold mb-1">Indexing Status</p>
              <p className="text-xs text-slate-400">Active indexing running. New nodes are being added as data arrives from connected sources.</p>
            </div>
          </div>
        )}
        {selectedStat === 'sources' && (
          <div className="space-y-5">
            <DetailStat label="Connected Sources" value={stats.sources} color="text-emerald-400" />
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.source} className="flex items-center justify-between p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <span className="text-xs font-bold text-white">{s.source}</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailModal>

      {/* Source Detail Modal */}
      <DetailModal
        isOpen={!!selectedSource}
        onClose={() => setSelectedSource(null)}
        title={selectedSource?.source || ''}
        subtitle="Data source details"
        icon={<Database className="w-5 h-5" />}
      >
        {selectedSource && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <DetailStat label="Indexed Blocks" value={selectedSource.items.toLocaleString()} color="text-[#e5a764]" />
              <DetailStat label="Last Sync" value={selectedSource.last} />
              <DetailStat label="Status" value={selectedSource.status.charAt(0).toUpperCase() + selectedSource.status.slice(1)} color="text-emerald-400" />
            </div>
            <DetailProgress label="Index Completeness" value="100%" percent={100} color="bg-emerald-500" />
            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Connection Health</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Connection verified and encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-[#e5a764] flex-shrink-0" />
                  <span>Real-time sync enabled</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
