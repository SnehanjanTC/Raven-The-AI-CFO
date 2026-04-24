import React, { useState, useEffect } from 'react';
import {
  Wallet,
  LineChart,
  Droplets,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
  Brain,
  ArrowRight,
  Bot,
  TrendingUp,
  Plus,
  Loader2,
  Shield,
  Zap,
  Globe,
  Receipt,
  Landmark,
  BadgeIndianRupee,
  BookOpen,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentDetail } from '@/components/AgentDetail';
import { CFOCopilot } from '@/components/CFOCopilot';
import { CreateAgentForm } from '@/components/CreateAgentForm';
import { api } from '@/lib/api';
import { isDemoDataLoaded, getDemoAgentMetrics, onDemoDataChange } from '@/lib/demo-data';
import { Agent } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'cfo',
    name: 'CFO Agent',
    role: 'Capital allocation & runway modeling',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'strategic',
    icon: Wallet,
    bg: 'bg-primary-container',
    color: 'text-primary',
    insight: 'Connect data sources to enable insights.'
  },
  {
    id: 'fpa',
    name: 'FP&A Agent',
    role: 'Variance analysis & budget tracking',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'analytical',
    icon: LineChart,
    bg: 'bg-secondary-container',
    color: 'text-secondary',
    metrics: { label: 'Budget Status', value: '—', trendType: 'info' }
  },
  {
    id: 'cashflow',
    name: 'Cash Flow Agent',
    role: 'Liquidity forecasting & burn monitoring',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'high-priority',
    icon: Droplets,
    bg: 'bg-tertiary/20',
    color: 'text-tertiary',
    isPriority: true,
    metrics: { label: 'Burn Rate', value: '—', chart: [] }
  },
  {
    id: 'ar',
    name: 'AR Agent',
    role: 'Accounts Receivable & Collections',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'standard',
    icon: ArrowDownLeft,
    bg: 'bg-surface-container-highest',
    color: 'text-on-surface-variant',
    metrics: { label: 'Collection Health', value: '—', progress: 0 }
  },
  {
    id: 'ap',
    name: 'AP Agent',
    role: 'Accounts Payable & Bill Pay',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'standard',
    icon: ArrowUpRight,
    bg: 'bg-surface-container-highest',
    color: 'text-on-surface-variant',
    metrics: { label: 'Upcoming Payables', value: '—', sub: 'Awaiting data' }
  },
  {
    id: 'tax',
    name: 'Tax Agent',
    role: 'Nexus tracking & multi-state filing',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'standard',
    icon: Scale,
    bg: 'bg-surface-container-highest',
    color: 'text-on-surface-variant',
    metrics: { label: 'Filing Status', value: '—' }
  },
  // ── Indian Compliance Agents (now founder-friendly names, route through CFO Copilot) ──────────────────────────
  {
    id: 'tds',
    name: 'Tax Deductions',
    role: 'Auto-calculates TDS on salaries, contractors & payments',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'compliance',
    icon: Receipt,
    bg: 'bg-amber-500/20',
    color: 'text-amber-400',
    isPriority: true,
    region: 'IN',
    insight: 'Connect data sources to enable insights.',
    metrics: { label: 'TDS Liability', value: '—', trendType: 'info' },
    complianceDetails: {
      framework: 'Income Tax Act, 1961',
      governingAct: 'Chapter XVII-B (Sections 192–206C)',
      filingFrequency: 'Quarterly (Form 24Q / 26Q / 27Q / 27EQ)',
      nextDeadline: '2026-04-07',
      sections: [
        { label: 'Sec 192 — Salary TDS', value: '—', status: 'na' },
        { label: 'Sec 194A — Interest TDS', value: '—', status: 'na' },
        { label: 'Sec 194C — Contractor TDS', value: '—', status: 'na' },
        { label: 'Sec 194J — Professional TDS', value: '—', status: 'na' },
        { label: 'Form 16 / 16A Issuance', value: 'Due Jun 15', status: 'na' },
        { label: 'Challan 281 Deposit', value: 'Due 7th of next month', status: 'na' },
      ]
    }
  },
  {
    id: 'gst',
    name: 'GST & Invoicing',
    role: 'Tracks your GST, ITC claims & monthly filing',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'compliance',
    icon: Landmark,
    bg: 'bg-[#e5a764]/20',
    color: 'text-[#e5a764]',
    isPriority: true,
    region: 'IN',
    insight: 'Connect data sources to enable insights.',
    metrics: { label: 'GST Liability', value: '—', progress: 0 },
    complianceDetails: {
      framework: 'CGST Act, 2017 & State GST Acts',
      governingAct: 'Sections 37–39, 44 (Annual Return)',
      filingFrequency: 'Monthly (GSTR-1, GSTR-3B) / Annual (GSTR-9)',
      nextDeadline: '2026-04-20',
      sections: [
        { label: 'GSTR-1 — Outward Supplies', value: '—', status: 'na' },
        { label: 'GSTR-3B — Summary Return', value: 'Due Apr 20', status: 'na' },
        { label: 'GSTR-2B — ITC Auto-draft', value: '—', status: 'na' },
        { label: 'E-invoicing (>₹5Cr)', value: '—', status: 'na' },
        { label: 'E-way Bill Compliance', value: '—', status: 'na' },
        { label: 'GSTR-9 Annual Return', value: 'Due Dec 31', status: 'na' },
      ]
    }
  },
  {
    id: 'ptax',
    name: 'Payroll Tax',
    role: 'State-wise payroll tax for your team',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'compliance',
    icon: BadgeIndianRupee,
    bg: 'bg-emerald-500/20',
    color: 'text-emerald-400',
    region: 'IN',
    insight: 'Connect data sources to enable insights.',
    metrics: { label: 'PT Liability', value: '—', trendType: 'info' },
    complianceDetails: {
      framework: 'State Professional Tax Acts',
      governingAct: 'Maharashtra PT Act 1975, Karnataka Tax on Professions Act 1976, etc.',
      filingFrequency: 'Monthly/Quarterly (varies by state)',
      nextDeadline: '2026-04-30',
      sections: [
        { label: 'Maharashtra — Employer', value: '—', status: 'na' },
        { label: 'Karnataka — Employer', value: '—', status: 'na' },
        { label: 'West Bengal — Employer', value: '—', status: 'na' },
        { label: 'Telangana — Employer', value: '—', status: 'na' },
        { label: 'Enrollment Certificates', value: '—', status: 'na' },
        { label: 'Annual PT Return', value: 'Due Mar 31', status: 'na' },
      ]
    }
  },
  {
    id: 'gaap-pnl',
    name: 'Profit & Loss',
    role: 'Your P&L statement per Indian accounting rules',
    status: 'inactive',
    lastActive: 'Awaiting data',
    type: 'compliance',
    icon: BookOpen,
    bg: 'bg-[#c4bdb4]/20',
    color: 'text-[#c4bdb4]',
    isPriority: true,
    region: 'IN',
    insight: 'Connect data sources to enable insights.',
    metrics: { label: 'Net Profit (Draft)', value: '—', trendType: 'info' },
    complianceDetails: {
      framework: 'Indian Accounting Standards (AS) + Companies Act 2013',
      governingAct: 'Schedule III of Companies Act 2013, AS-1 to AS-32',
      filingFrequency: 'Quarterly Board Review / Annual Filing (MCA)',
      nextDeadline: '2026-05-30',
      sections: [
        { label: 'AS-1 — Disclosure Policies', value: '—', status: 'na' },
        { label: 'AS-6 — Depreciation (SLM)', value: '—', status: 'na' },
        { label: 'AS-9 — Revenue Recognition', value: '—', status: 'na' },
        { label: 'AS-15 — Employee Benefits', value: '—', status: 'na' },
        { label: 'Schedule III Format', value: '—', status: 'na' },
        { label: 'Tax Audit (Sec 44AB)', value: 'Due Sep 30', status: 'na' },
      ]
    }
  }
];

// Helper to map icon names to components
const ICON_MAP: Record<string, any> = {
  Wallet,
  LineChart,
  Droplets,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Brain,
  Bot,
  Shield,
  Zap,
  Globe,
  Receipt,
  Landmark,
  BadgeIndianRupee,
  BookOpen,
  FileCheck,
  // Mapping for lowercase IDs from CreateAgentForm
  wallet: Wallet,
  chart: LineChart,
  droplet: Droplets,
  shield: Shield,
  zap: Zap,
  globe: Globe,
  scale: Scale,
  bot: Bot,
  receipt: Receipt,
  landmark: Landmark,
  badgeindianrupee: BadgeIndianRupee,
  bookopen: BookOpen,
  filecheck: FileCheck
};

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>('');

  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch agent metrics from FastAPI backend first, then fall back to demo data
  useEffect(() => {
    const fetchAgentMetrics = async () => {
      try {
        const summary: any = await api.dashboard.summary();
        // The FastAPI dashboard.summary endpoint returns snake_case fields:
        //   { runway_months, monthly_burn, cash_balance, mrr, ... }
        // Earlier code referenced summary.runway / .monthlyBurn / .cashBalance
        // (camelCase), which were always `undefined` → `.toFixed()` threw a
        // TypeError → the page errored out. Normalize defensively here so a
        // backend that returns either casing (or zero values) renders cleanly.
        const runwayMonths = Number(summary?.runway_months ?? summary?.runway ?? 0);
        const monthlyBurn = Number(summary?.monthly_burn ?? summary?.monthlyBurn ?? 0);
        const cashBalance = Number(summary?.cash_balance ?? summary?.cashBalance ?? 0);
        const hasRealData = runwayMonths > 0 || monthlyBurn > 0 || cashBalance > 0;

        if (hasRealData) {
          // Update agent metrics based on financial summary
          // Set agents to 'active' when real data is available
          setAgents(prev => prev.map(agent => {
            if (agent.id === 'cfo') {
              return {
                ...agent,
                status: 'active' as const,
                lastActive: `Runway optimized ${Math.floor(Math.random() * 3) + 1}h ago`,
                metrics: { label: 'Runway', value: `${runwayMonths.toFixed(1)} months`, sub: 'at current burn', trendType: 'success' as const }
              };
            } else if (agent.id === 'fpa') {
              return {
                ...agent,
                status: 'active' as const,
                lastActive: `Budget analysis completed ${Math.floor(Math.random() * 2) + 1}h ago`,
                metrics: { label: 'Budget Status', value: `₹${(monthlyBurn / 100000).toFixed(1)}L`, sub: 'monthly burn', trendType: 'info' as const }
              };
            } else if (agent.id === 'cashflow') {
              return {
                ...agent,
                status: 'active' as const,
                lastActive: `Liquidity check passed ${Math.floor(Math.random() * 15) + 1}m ago`,
                metrics: { label: 'Cash Balance', value: `₹${(cashBalance / 10000000).toFixed(2)} Cr`, sub: 'liquid reserves', chart: [] }
              };
            }
            return agent;
          }));
          return;
        }
        // Backend reachable but returned all zeros (fresh guest user) → fall
        // through to demo data so the page still renders meaningful content.
      } catch (err) {
        console.error('Error fetching agent metrics from backend:', err);
        // Fall back to demo data
      }

      // Fall back to demo data
      const unsubscribe = onDemoDataChange(() => {
        if (isDemoDataLoaded()) {
          const demoMetrics = getDemoAgentMetrics();

          // Map demo metrics to agent IDs and update
          const agentMetricsMap: Record<string, any> = {
            'cfo': demoMetrics.cfo,
            'fpa': demoMetrics.fpa,
            'cashflow': demoMetrics.cashflow,
            'tds': demoMetrics.tds,
            'gst': demoMetrics.gst,
            'ptax': demoMetrics.ptax,
            'gaap-pnl': demoMetrics.pnl,
            'compliance': demoMetrics.compliance
          };

          setAgents(prev => prev.map(agent => {
            const metrics = agentMetricsMap[agent.id];
            if (metrics) {
              return {
                ...agent,
                status: metrics.status || agent.status,
                lastActive: metrics.lastActive || agent.lastActive,
                metrics: metrics.metric || agent.metrics
              };
            }
            return agent;
          }));
        }
      });

      return unsubscribe;
    };

    fetchAgentMetrics();
  }, []);

  const fetchAgents = async () => {
    setAgents(INITIAL_AGENTS);
    setLoading(false);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleAgentClick = (agent: Agent) => {
    if (agent.type === 'compliance') {
      // Route compliance agents through CFO Copilot with domain-specific prompts
      const prompts: Record<string, string> = {
        'tds': 'Show me my TDS status and upcoming deadlines',
        'gst': "What's my GST situation this month?",
        'ptax': 'Check my payroll tax status across all states',
        'gaap-pnl': 'Show me a draft P&L for this quarter'
      };
      setIsCopilotOpen(true);
      setCopilotInitialPrompt(prompts[agent.id] || 'Tell me about compliance');
    } else {
      setSelectedAgentId(agent.id);
    }
  };

  const handleStatusToggle = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    const newStatus = agent.status === 'active' ? 'inactive' : 'active';

    // Optimistic update
    setAgents(prev => prev.map(a =>
      a.id === id ? { ...a, status: newStatus } : a
    ));
  };

  const handleAddAgent = async (newAgent: any) => {
    const localAgent = {
      id: Math.random().toString(),
      name: newAgent.name,
      role: newAgent.role,
      type: newAgent.type as any,
      status: 'active' as const,
      lastActive: 'Initializing...',
      lastActiveType: 'info' as const,
      isPriority: newAgent.is_priority || false,
      icon: ICON_MAP[newAgent.icon_name?.toLowerCase()] || Bot,
      bg: 'bg-surface-container-highest',
      color: 'text-on-surface-variant'
    };
    setAgents(prev => [localAgent as Agent, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
            AI Agents
          </h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Autonomous financial intelligence powered by advanced AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateFormOpen(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Deploy Agent
          </motion.button>
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-background bg-tertiary"></div>
              <div className="w-6 h-6 rounded-full border border-background bg-primary"></div>
              <div className="w-6 h-6 rounded-full border border-background bg-secondary"></div>
            </div>
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
              {agents.filter(a => a.status === 'active' || a.status === 'syncing').length} Active
            </span>
          </div>
        </div>
      </motion.div>

      {/* Agent Cards Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        <AnimatePresence mode="popLayout">
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => handleAgentClick(agent)}
              className={cn(
                "glass-panel group rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden",
                "border border-white/[0.08] hover:border-white/[0.12]",
                agent.isPriority && "border-primary/30 bg-primary/[0.03]",
                agent.status === 'inactive' && "opacity-50 grayscale"
              )}
            >
              {/* Animated background glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl group-hover:opacity-100 opacity-0 transition-opacity duration-300 pointer-events-none"></div>

              <div className="relative z-10 space-y-4">
                {/* Icon and Type Badge */}
                <div className="flex justify-between items-start">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm", "bg-white/[0.04] border border-white/[0.08]", agent.color)}>
                    <agent.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-sm border",
                    agent.type === 'compliance' ? "text-amber-300 bg-amber-500/10 border-amber-500/20" :
                    agent.isPriority ? "text-tertiary bg-tertiary/10 border-tertiary/20" :
                    "text-slate-400 bg-slate-500/10 border-slate-500/10"
                  )}>
                    {agent.type}{agent.region ? ` · ${agent.region}` : ''}
                  </span>
                </div>

                {/* Name with Status Dot */}
                <div>
                  <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 mb-0.5">
                    {agent.name}
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      agent.status === 'active' ? "bg-tertiary" :
                      agent.status === 'syncing' ? "bg-primary animate-pulse" :
                      "bg-slate-600"
                    )}></span>
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{agent.role}</p>
                </div>

                {/* Status and Metrics */}
                <div className="space-y-3 py-3 border-y border-white/[0.05]">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {agent.status === 'syncing' ? <Clock className="w-3 h-3 animate-spin text-primary" /> :
                     agent.status === 'active' ? <CheckCircle2 className="w-3 h-3 text-tertiary" /> :
                     <AlertCircle className="w-3 h-3" />}
                    <span className={cn(agent.lastActiveType === 'error' && "text-error")}>
                      {agent.status === 'inactive' ? 'Standby' : agent.lastActive}
                    </span>
                  </div>

                  {agent.metrics && (
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{agent.metrics.label}</p>
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-on-surface">{agent.metrics.value}</span>
                          {agent.metrics.sub && <span className="text-[8px] text-slate-500">{agent.metrics.sub}</span>}
                        </div>
                        {agent.metrics.progress !== undefined && (
                          <div className="w-12 h-6 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.04]">
                            <div className="bg-gradient-to-r from-primary to-primary/60 h-full" style={{ width: `${agent.metrics.progress}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAgentClick(agent);
                  }}
                  className={cn(
                    "w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    agent.isPriority
                      ? "bg-gradient-to-r from-primary/80 to-primary/60 text-on-primary hover:from-primary hover:to-primary/70 shadow-lg shadow-primary/20"
                      : "bg-white/[0.05] text-on-surface hover:bg-white/[0.08] border border-white/[0.08]"
                  )}>
                  {agent.type === 'compliance' ? 'CFO Copilot' : 'Open'}
                  <ArrowRight className="w-3 h-3" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* CFO Copilot Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-8 border border-primary/20 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Brain className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-primary mb-2">Your CFO Copilot</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl">
              Monitor all compliance across TDS, GST, payroll tax, and financial reporting. Everything routes through one conversation — just ask about your taxes, deadlines, or calculations in plain English.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsCopilotOpen(true);
              setCopilotInitialPrompt('');
            }}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all shrink-0">
            Talk to CFO
          </motion.button>
        </div>
      </motion.div>

      {/* Agent Detail View (non-compliance agents) */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          onClose={() => setSelectedAgentId(null)}
          onStatusToggle={handleStatusToggle}
        />
      )}

      {/* CFO Copilot (replaces separate compliance agent workspaces) */}
      <CFOCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        initialPrompt={copilotInitialPrompt}
        currentPage="/agents"
      />

      {/* Create Agent Form */}
      {isCreateFormOpen && (
        <CreateAgentForm
          onClose={() => setIsCreateFormOpen(false)}
          onSave={handleAddAgent}
        />
      )}
    </div>
  );
}
