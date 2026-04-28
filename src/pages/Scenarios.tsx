import React, { useState, useMemo, useEffect } from 'react';
import {
  Save,
  RefreshCcw,
  Zap,
  TrendingUp,
  LineChart as LineChartIcon,
  Info
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Scenario } from '@/types';
import { cn } from '@/lib/utils';
import { DetailModal, DetailStat } from '@/components/DetailModal';
import { isDemoDataLoaded, getDemoScenarioDefaults, formatCurrency, onDemoDataChange } from '@/lib/demo-data';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';

export function Scenarios() {
  const { profile } = useCompanyProfile();

  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [savingScenarioName, setSavingScenarioName] = useState<string>('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Derive growth rate from profile stage if available
  const getDefaultGrowth = () => {
    if (profile.stage === 'pre-revenue') return 0;
    if (profile.stage === 'early') return 10;
    if (profile.stage === 'scaling') return 15;
    if (profile.stage === 'growth') return 20;
    return 15;
  };

  // Simulation Parameters
  const [growth, setGrowth] = useState(getDefaultGrowth());
  const [churn, setChurn] = useState(profile.monthlyChurnRate ?? 2.5);
  const [monthlyBurn, setMonthlyBurn] = useState(profile.monthlyBurnRate ?? 120000);
  const [initialCash, setInitialCash] = useState(profile.cashReserves ?? 2500000);
  // Real, fetched MRR (₹). Falls back to profile monthlyRevenue, then example value when nothing connected.
  const [currentMrr, setCurrentMrr] = useState<number>(profile.monthlyRevenue ?? 150000);
  // Where each parameter came from — drives the "example data" pill so users
  // never confuse a hardcoded placeholder with a live figure.
  const [paramSource, setParamSource] = useState<{
    mrr: 'zoho' | 'backend' | 'example';
    burn: 'backend' | 'example';
    cash: 'backend' | 'example';
  }>({ mrr: 'example', burn: 'example', cash: 'example' });
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    const initializeDefaults = async () => {
      const apiMod = await import('@/lib/api');
      const api = apiMod.api;

      // ── 1. MRR: Zoho MCP first (it ships a TTM/12 figure straight from
      //    Zoho Books), then fall back to /dashboard/summary, then example.
      let mrrSource: 'zoho' | 'backend' | 'example' = 'example';
      try {
        const status = await api.zohomcp.status();
        if (status?.connected) {
          const rev: any = await api.zohomcp.revenue();
          const zohoMrr = Number(rev?.metrics?.mrr ?? 0);
          if (zohoMrr > 0) {
            setCurrentMrr(zohoMrr);
            mrrSource = 'zoho';
          }
        }
      } catch { /* MCP unavailable — fall through */ }

      // ── 2. /dashboard/summary for burn + cash, and MRR if Zoho missed.
      let burnSource: 'backend' | 'example' = 'example';
      let cashSource: 'backend' | 'example' = 'example';
      try {
        const summary: any = await api.dashboard.summary();
        if (summary) {
          if (Number(summary.monthly_burn) > 0) {
            setMonthlyBurn(Number(summary.monthly_burn));
            burnSource = 'backend';
          }
          if (Number(summary.cash_balance) > 0) {
            setInitialCash(Number(summary.cash_balance));
            cashSource = 'backend';
          }
          if (mrrSource === 'example' && Number(summary.mrr) > 0) {
            setCurrentMrr(Number(summary.mrr));
            mrrSource = 'backend';
          }
        }
      } catch (error) {
        console.error('Error loading dashboard defaults:', error);
      }

      setParamSource({ mrr: mrrSource, burn: burnSource, cash: cashSource });
      fetchScenarios();
    };

    initializeDefaults();
    onDemoDataChange(() => fetchScenarios());
  }, []);

  // True when ANY parameter is still a hardcoded placeholder.
  const usingExampleData =
    paramSource.mrr === 'example' ||
    paramSource.burn === 'example' ||
    paramSource.cash === 'example';

  const fetchScenarios = async () => {
    setLoading(false);
  };

  const projectionData = useMemo(() => {
    let currentCash = initialCash;
    // Default to whatever was fetched (Zoho → backend → example).
    let currentMRR = currentMrr;

    // Demo data overrides everything when explicitly enabled.
    if (isDemoDataLoaded()) {
      const defaults = getDemoScenarioDefaults();
      currentMRR = defaults.currentMrr;
    }

    const data = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = [];

    for (let i = 0; i < 12; i++) {
      const monthIndex = (now.getMonth() + i) % 12;
      months.push(monthNames[monthIndex]);
    }

    for (let i = 0; i < 12; i++) {
      const revenue = currentMRR;
      const netCashFlow = revenue - monthlyBurn;
      currentCash += netCashFlow;

      data.push({
        name: months[i],
        cash: Math.max(0, currentCash),
        revenue: revenue,
        burn: monthlyBurn,
        isNegative: currentCash < 0
      });

      currentMRR = currentMRR * (1 + (growth / 100) - (churn / 100));
    }
    return data;
  }, [growth, churn, monthlyBurn, initialCash, currentMrr]);

  const runwayMonths = useMemo(() => {
    const defaultRunway = projectionData.findIndex(d => d.cash <= 0);
    return defaultRunway === -1 ? '12+' : defaultRunway;
  }, [projectionData]);

  // Calculate runway impact: Cash Reserves / (Burn Rate - Revenue)
  const runwayImpactMonths = useMemo(() => {
    const netBurn = monthlyBurn - currentMrr;
    if (netBurn <= 0) return null; // Positive cash flow, no concern
    return initialCash / netBurn;
  }, [initialCash, monthlyBurn, currentMrr]);

  const getRunwayImpactColor = (months: number | null) => {
    if (months === null) return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Cash Positive' };
    if (months < 12) return { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Critical' };
    if (months < 18) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'At Risk' };
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Healthy' };
  };

  const handleSaveScenario = async () => {
    if (!savingScenarioName.trim()) return;

    const newScenario = {
      title: savingScenarioName,
      description: `Growth: ${growth}%, Churn: ${churn}%, Burn: $${monthlyBurn/1000}k`,
      impact: `${runwayMonths} Mo Runway`,
      status: 'active' as const,
      probability: 'Medium',
      last_updated: new Date().toISOString()
    };

    setScenarios(prev => [{ id: crypto.randomUUID(), ...newScenario }, ...prev]);
    setSavingScenarioName('');
    setShowSaveInput(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <section className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-headline font-bold text-white">Scenarios</h1>
          {usingExampleData ? (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title={`MRR: ${paramSource.mrr} · Burn: ${paramSource.burn} · Cash: ${paramSource.cash}`}
            >
              Example data
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              title={`MRR: ${paramSource.mrr} · Burn: ${paramSource.burn} · Cash: ${paramSource.cash}`}
            >
              Live · {paramSource.mrr === 'zoho' ? 'Zoho Books' : 'Backend'}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          What-if analysis and runway modeling
          {usingExampleData && (
            <span className="text-amber-400/80">
              {' '}— some inputs are placeholders. Connect Zoho Books for live figures.
            </span>
          )}
        </p>
      </section>

      {/* Profile-Populated Info Banner */}
      {profile.companyName && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            Scenarios are pre-filled from your company profile. Edit values to explore what-if scenarios.
          </p>
        </div>
      )}

      {/* Controls Bar */}
      <div className="glass-panel space-y-6 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Model Parameters</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setGrowth(15); setChurn(2.5); setMonthlyBurn(120000); }}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
              title="Reset to defaults"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Growth Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Monthly Growth</label>
              <span className="text-lg font-bold text-tertiary">{growth}%</span>
            </div>
            <input
              type="range" min="0" max="50" step="0.5"
              value={growth} onChange={(e) => setGrowth(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-tertiary"
            />
          </div>

          {/* Churn Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Revenue Churn</label>
              <span className="text-lg font-bold text-red-400">{churn}%</span>
            </div>
            <input
              type="range" min="0" max="20" step="0.1"
              value={churn} onChange={(e) => setChurn(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-400"
            />
          </div>

          {/* Monthly Burn Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Monthly Burn</label>
              <span className="text-lg font-bold text-white">${(monthlyBurn/1000).toFixed(0)}k</span>
            </div>
            <input
              type="range" min="50000" max="500000" step="5000"
              value={monthlyBurn} onChange={(e) => setMonthlyBurn(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>

          {/* Initial Cash Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Initial Cash</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                value={initialCash}
                onChange={(e) => setInitialCash(parseFloat(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 pl-6 text-white text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runway Card */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Projected Runway</p>
            <h3 className="text-4xl font-bold text-white">{runwayMonths}</h3>
            <p className="text-xs text-slate-400">months</p>
          </div>
          <div className="pt-4 border-t border-white/[0.06]">
            <div className={cn(
              "inline-flex px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider",
              runwayMonths === '12+' ? "bg-emerald-500/20 text-emerald-300" :
              parseInt(runwayMonths.toString()) > 6 ? "bg-[#00F0A0]/20 text-[#4DFFC0]" : "bg-red-500/20 text-red-300"
            )}>
              {runwayMonths === '12+' ? 'Optimistic' : parseInt(runwayMonths.toString()) > 6 ? 'Stable' : 'Critical'}
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">12-Month Projection</h3>
            <div className="flex gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00F0A0]"></div>
                <span className="text-slate-400">Treasury Cash</span>
              </div>
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0A0" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00F0A0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  dy={5}
                />
                <YAxis hide domain={[0, 'dataMax + 1000000']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  formatter={(value: number) => {
                    if (isDemoDataLoaded()) {
                      return [formatCurrency(value), 'Cash'];
                    }
                    return [`$${(value/1000000).toFixed(2)}M`, 'Cash'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#00F0A0"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCash)"
                  animationDuration={1000}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-white/[0.06] text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Final Treasury</p>
              <p className="text-sm font-bold text-white">
                {isDemoDataLoaded() ? formatCurrency(projectionData[11].cash) : `$${(projectionData[11].cash / 1000000).toFixed(2)}M`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Efficiency</p>
              <p className="text-sm font-bold text-[#00F0A0]">
                {((growth / churn) || 0).toFixed(1)}x
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Risk</p>
              <div className="flex items-center justify-center gap-1">
                <Zap className={cn("w-3 h-3", churn > 5 ? "text-red-400" : "text-emerald-400")} />
                <span className="text-xs font-bold text-white">{churn > 5 ? 'High' : 'Low'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Runway Impact</p>
              {runwayImpactMonths === null ? (
                <p className="text-sm font-bold text-emerald-300">Positive CF</p>
              ) : (
                <p className="text-sm font-bold text-white">{runwayImpactMonths.toFixed(1)} mo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Scenario Section */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Save Current Scenario</h3>
            <p className="text-xs text-slate-400 mt-1">Store this configuration for later reference</p>
          </div>
          {showSaveInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scenario name..."
                value={savingScenarioName}
                onChange={(e) => setSavingScenarioName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveScenario()}
                className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#00F0A0]/50"
                autoFocus
              />
              <button
                onClick={handleSaveScenario}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00F0A0] to-[#00CC88] text-[#001A0F] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveInput(false); setSavingScenarioName(''); }}
                className="px-4 py-2.5 border border-white/[0.06] rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#00F0A0] to-[#00CC88] text-[#001A0F] px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all"
            >
              <Save className="w-4 h-4" /> Save Scenario
            </button>
          )}
        </div>
      </div>

      {/* Saved Scenarios Grid */}
      {scenarios.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-bold px-1">Saved Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s)}
                className="glass-subtle rounded-xl p-5 text-left border border-white/[0.06] hover:border-[#00F0A0]/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-[#00F0A0]/20 transition-all">
                    <LineChartIcon className="w-4 h-4 text-[#00F0A0]" />
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest",
                    s.status === 'active' ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/50 text-slate-400"
                  )}>
                    {s.status}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{s.title}</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                  <span className="text-[#00F0A0]">{s.impact}</span>
                  <span className="text-slate-500">{new Date(s.last_updated).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Scenario Detail Modal */}
      <DetailModal
        isOpen={!!selectedScenario}
        onClose={() => setSelectedScenario(null)}
        title={selectedScenario?.title || ''}
        subtitle="Saved scenario parameters"
        icon={<LineChartIcon className="w-5 h-5" />}
      >
        {selectedScenario && (
          <div className="space-y-5">
            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-sm text-slate-300 leading-relaxed">{selectedScenario.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DetailStat label="Impact" value={selectedScenario.impact} color="text-[#00F0A0]" />
              <DetailStat label="Status" value={selectedScenario.status.charAt(0).toUpperCase() + selectedScenario.status.slice(1)} color={selectedScenario.status === 'active' ? 'text-emerald-400' : 'text-slate-400'} />
              <DetailStat label="Probability" value={selectedScenario.probability || 'Medium'} />
            </div>
            <DetailStat label="Last Updated" value={new Date(selectedScenario.last_updated).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const match = selectedScenario.description.match(/Growth: ([\d.]+)%.*Churn: ([\d.]+)%.*Burn: \$([\d.]+)k/);
                  if (match) {
                    setGrowth(parseFloat(match[1]));
                    setChurn(parseFloat(match[2]));
                    setMonthlyBurn(parseFloat(match[3]) * 1000);
                  }
                  setSelectedScenario(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#00F0A0] to-[#00CC88] text-[#001A0F] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
              >
                Load Scenario
              </button>
              <button
                onClick={() => setSelectedScenario(null)}
                className="px-6 py-2.5 border border-white/[0.06] rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
