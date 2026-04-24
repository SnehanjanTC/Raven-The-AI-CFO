import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User, Sparkles, Calculator, AlertCircle, ChevronDown, Copy, Check, BarChart3, Calendar, FileText, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { streamAIResponse, ChatMessage, getAIConfig, AI_PROVIDERS } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Import rule engines
import { calculateTDS, getTDSContext } from '@/domains/compliance/engines/tds';
import { calculateGST, reverseCalculateGST, getGSTContext } from '@/domains/compliance/engines/gst';
import { calculatePTax, getPTaxContext } from '@/domains/compliance/engines/ptax';
import { calculateDepreciation, getIndianGAAPContext } from '@/domains/compliance/engines/indian-gaap';

// Import compliance service and hooks
import { ComplianceService } from '@/domains/compliance/api';
import { useComplianceSummary, useComplianceDeadlines, useComplianceFilings } from '@/domains/compliance/hooks';
import type { FilingRecord, ComplianceDeadline, DeadlinePriority } from '@/domains/compliance/types';

interface AgentWorkspaceProps {
  agent: any;
  onClose: () => void;
}

// ── Agent System Prompts ─────────────────────────────────────────────────
function getAgentSystemPrompt(agentId: string): string {
  const base = `You are a specialized Indian compliance agent inside FinOS, an AI-powered financial operating system. You provide precise, actionable answers grounded in Indian tax law and accounting standards. Always cite the specific section, rule, or standard when answering. Format currency in ₹ with Indian numbering (lakhs, crores). If a calculation is involved, show the step-by-step working.\n\n`;

  switch (agentId) {
    case 'tds':
      return base + `You are the TDS Agent — expert in Tax Deducted at Source under Income Tax Act 1961, Chapter XVII-B.\n\n` + getTDSContext();
    case 'gst':
      return base + `You are the GST Agent — expert in Goods & Services Tax under CGST Act 2017, IGST Act 2017, and state GST laws.\n\n` + getGSTContext();
    case 'ptax':
      return base + `You are the Professional Tax Agent — expert in state-wise Professional Tax laws across India.\n\n` + getPTaxContext();
    case 'gaap-pnl':
      return base + `You are the Indian GAAP P&L Agent — expert in Indian Accounting Standards (AS-1 through AS-32), Schedule III of Companies Act 2013, and financial statement preparation.\n\n` + getIndianGAAPContext();
    default:
      return base + `You are a financial compliance agent. Help the user with their financial queries.`;
  }
}

// ── Quick Actions per Agent ──────────────────────────────────────────────
function getQuickActions(agentId: string): { label: string; prompt: string }[] {
  switch (agentId) {
    case 'tds':
      return [
        { label: 'Calculate TDS on ₹5L contractor payment', prompt: 'Calculate TDS on a ₹5,00,000 payment to a contractor company under Section 194C. The contractor has a valid PAN.' },
        { label: 'TDS return due dates', prompt: 'What are the quarterly TDS return filing due dates for FY 2025-26? Include form numbers.' },
        { label: 'Late deposit penalty', prompt: 'We missed depositing TDS of ₹2.4L for March. What interest and penalties apply under Sec 201(1A) and 234E?' },
        { label: 'Sec 194J rates', prompt: 'What are the TDS rates under Section 194J for professional fees vs technical services? What is the threshold?' },
      ];
    case 'gst':
      return [
        { label: 'Calculate GST on ₹10L invoice', prompt: 'Calculate GST on a ₹10,00,000 IT consulting invoice (SAC 998313) for an intra-state supply in Maharashtra.' },
        { label: 'ITC mismatch resolution', prompt: 'We have ₹3.2L ITC in our books but only ₹2.8L shows in GSTR-2B. What should we do? Can we claim the full amount?' },
        { label: 'E-invoice requirements', prompt: 'Our turnover is ₹8 Cr. What are our e-invoicing obligations? Do we need IRN for all invoices?' },
        { label: 'GSTR-3B filing checklist', prompt: 'Give me a step-by-step checklist for filing GSTR-3B for March 2026, including ITC reconciliation steps.' },
      ];
    case 'ptax':
      return [
        { label: 'PT for ₹45K salary in Karnataka', prompt: 'Calculate monthly Professional Tax for an employee earning ₹45,000/month in Karnataka.' },
        { label: 'Multi-state PT comparison', prompt: 'Compare Professional Tax for a ₹60,000/month salary across Maharashtra, Karnataka, West Bengal, and Telangana.' },
        { label: 'PT compliance checklist', prompt: 'Our company operates in Maharashtra, Karnataka, and West Bengal. What are our PT enrollment, deduction, and filing obligations in each state?' },
        { label: 'PT late payment penalty', prompt: 'We missed depositing Professional Tax for Q3 in Maharashtra. What are the penalties and interest charges?' },
      ];
    case 'gaap-pnl':
      return [
        { label: 'Depreciation on ₹15L server', prompt: 'Calculate annual depreciation on a server costing ₹15,00,000 under Schedule II using SLM method. What is the useful life?' },
        { label: 'Schedule III P&L format', prompt: 'Show me the complete P&L statement format as per Schedule III of Companies Act 2013 with all line items.' },
        { label: 'AS-9 revenue recognition', prompt: 'We have ₹4.8L of services delivered but not yet invoiced. How should we treat this under AS-9 Revenue Recognition?' },
        { label: 'Gratuity provision (AS-15)', prompt: 'How should we account for gratuity provision under AS-15? Do we need an actuarial valuation? What are the disclosure requirements?' },
      ];
    default:
      return [];
  }
}

// ── Local calculation interceptor with audit logging ──────────────────────
function tryLocalCalculation(agentId: string, userMessage: string): { result: string; auditId: string } | null {
  const msg = userMessage.toLowerCase();

  if (agentId === 'tds') {
    // Pattern: "calculate tds ... section 194C ... ₹5,00,000 / 500000 / 5 lakh"
    const sectionMatch = msg.match(/(?:section|sec)\s*(194[a-z]*|192|193|195|206c)/i);
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l)/i);

    if (sectionMatch && amountMatch) {
      const section = sectionMatch[1].toUpperCase();
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;

      const isIndividual = msg.includes('individual') || msg.includes('huf') || msg.includes('person');
      const hasPan = !msg.includes('no pan') && !msg.includes('without pan');

      const tdsResult = calculateTDS(section, amount, hasPan, isIndividual);
      if (tdsResult) {
        const resultText = `**TDS Calculation Result (Rule Engine)**\n\n| Field | Value |\n|---|---|\n| Section | ${tdsResult.section} |\n| Nature | ${tdsResult.nature} |\n| Amount | ₹${tdsResult.amount.toLocaleString('en-IN')} |\n| PAN Available | ${tdsResult.hasPan ? 'Yes' : 'No'} |\n| Rate | ${tdsResult.rate}% |\n| **TDS Amount** | **₹${tdsResult.tdsAmount.toLocaleString('en-IN')}** |\n| Net Payable | ₹${tdsResult.netPayable.toLocaleString('en-IN')} |\n\n> ${tdsResult.notes}\n\n---\n*Computed by TDS Rule Engine. Verify with your tax advisor for complex scenarios.*`;

        // Log to audit trail
        ComplianceService.calculateWithAudit(agentId, 'TDS_CALCULATION', { section, amount, hasPan, isIndividual }, () => tdsResult)
          .catch(err => console.error('[TDS Audit] Error:', err));

        return { result: resultText, auditId: `tds-${Date.now()}` };
      }
    }
  }

  if (agentId === 'gst') {
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l|cr)/i);
    const rateMatch = msg.match(/(\d+)\s*%/);
    const isInter = msg.includes('inter-state') || msg.includes('interstate') || msg.includes('igst');
    const isReverse = msg.includes('reverse') || msg.includes('inclusive') || msg.includes('extract');

    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;
      if (msg.includes('cr') || msg.includes('crore')) amount *= 10000000;

      const rate = rateMatch ? parseFloat(rateMatch[1]) : 18; // default to 18%

      const gstResult = isReverse
        ? reverseCalculateGST(amount, rate, isInter)
        : calculateGST(amount, rate, isInter);

      const resultText = `**GST Calculation Result (Rule Engine)**\n\n| Field | Value |\n|---|---|\n| Base Amount | ₹${gstResult.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |\n| GST Rate | ${gstResult.gstRate}% |\n| Supply Type | ${gstResult.isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'} |\n${gstResult.isInterState
        ? `| IGST | ₹${gstResult.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |`
        : `| CGST (${gstResult.gstRate / 2}%) | ₹${gstResult.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |\n| SGST (${gstResult.gstRate / 2}%) | ₹${gstResult.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |`
      }\n| **Total Tax** | **₹${gstResult.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** |\n| **Invoice Total** | **₹${gstResult.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** |\n\n---\n*Computed by GST Rule Engine.*`;

      // Log to audit trail
      ComplianceService.calculateWithAudit(agentId, 'GST_CALCULATION', { amount, rate, isInterState: isInter, isReverse }, () => gstResult)
        .catch(err => console.error('[GST Audit] Error:', err));

      return { result: resultText, auditId: `gst-${Date.now()}` };
    }
  }

  if (agentId === 'ptax') {
    const stateMatch = msg.match(/(?:maharashtra|karnataka|west bengal|telangana|andhra pradesh|tamil nadu|gujarat|madhya pradesh)/i);
    const salaryMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:k|thousand)/i);

    if (stateMatch && salaryMatch) {
      const stateMap: Record<string, string> = {
        'maharashtra': 'MH', 'karnataka': 'KA', 'west bengal': 'WB',
        'telangana': 'TS', 'andhra pradesh': 'AP', 'tamil nadu': 'TN',
        'gujarat': 'GJ', 'madhya pradesh': 'MP'
      };
      const stateCode = stateMap[stateMatch[0].toLowerCase()];
      let salary = parseFloat(salaryMatch[1].replace(/,/g, ''));
      if (msg.includes('k') || msg.includes('thousand')) salary *= 1000;

      if (stateCode) {
        const ptaxResult = calculatePTax(stateCode, salary);
        if (ptaxResult) {
          const resultText = `**Professional Tax Calculation (Rule Engine)**\n\n| Field | Value |\n|---|---|\n| State | ${ptaxResult.state} |\n| Monthly Salary | ₹${ptaxResult.monthlySalary.toLocaleString('en-IN')} |\n| Monthly PT | ₹${ptaxResult.monthlyTax} |\n| Annual PT | ₹${ptaxResult.annualTax} |\n| Annual Cap | ₹${ptaxResult.maxAnnualCap} |\n| Status | ${ptaxResult.applicable ? 'Applicable' : 'Exempt'} |\n\n> ${ptaxResult.slabNote}\n\n---\n*Computed by Professional Tax Rule Engine.*`;

          // Log to audit trail
          ComplianceService.calculateWithAudit(agentId, 'PTAX_CALCULATION', { stateCode, salary }, () => ptaxResult)
            .catch(err => console.error('[P-Tax Audit] Error:', err));

          return { result: resultText, auditId: `ptax-${Date.now()}` };
        }
      }
    }
  }

  if (agentId === 'gaap-pnl') {
    const depMatch = msg.match(/depreciation/i);
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l)/i);
    const categories = ['computer', 'server', 'furniture', 'building', 'vehicle', 'car', 'plant', 'machinery', 'software', 'office equipment', 'electrical'];
    const catMatch = categories.find(c => msg.includes(c));

    if (depMatch && amountMatch && catMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;

      const method = msg.includes('wdv') ? 'WDV' as const : 'SLM' as const;
      const depResult = calculateDepreciation(catMatch, amount, method);

      if (depResult) {
        const resultText = `**Depreciation Calculation (Rule Engine)**\n\n| Field | Value |\n|---|---|\n| Asset Category | ${depResult.category} |\n| Original Cost | ₹${depResult.originalCost.toLocaleString('en-IN')} |\n| Residual Value (5%) | ₹${depResult.residualValue.toLocaleString('en-IN')} |\n| Depreciable Amount | ₹${depResult.depreciableAmount.toLocaleString('en-IN')} |\n| Method | ${depResult.method} |\n| Useful Life | ${depResult.usefulLife} years |\n| Rate | ${depResult.rate}% p.a. |\n| **Annual Depreciation** | **₹${depResult.annualDepreciation.toLocaleString('en-IN')}** |\n\n> Per Schedule II of Companies Act 2013, AS-6 Depreciation Accounting.\n\n---\n*Computed by Indian GAAP Rule Engine.*`;

        // Log to audit trail
        ComplianceService.calculateWithAudit(agentId, 'DEPRECIATION_CALCULATION', { category: catMatch, amount, method }, () => depResult)
          .catch(err => console.error('[GAAP Audit] Error:', err));

        return { result: resultText, auditId: `gaap-${Date.now()}` };
      }
    }
  }

  return null;
}

// ── Compliance Sidebar Component ─────────────────────────────────────────
interface ComplianceSidebarProps {
  agentId: string;
  isOpen: boolean;
  onToggle: () => void;
}

function ComplianceSidebar({ agentId, isOpen, onToggle }: ComplianceSidebarProps) {
  const { summary, health, loading: summaryLoading } = useComplianceSummary(agentId);
  const { deadlines, loading: deadlinesLoading } = useComplianceDeadlines(agentId, 90);
  const { filings, loading: filingsLoading } = useComplianceFilings(agentId);
  const [expandedDeadline, setExpandedDeadline] = useState<string | null>(null);
  const [expandedFiling, setExpandedFiling] = useState<string | null>(null);

  const healthScore = health.find((h) => h.domain === (agentId as any))?.score ?? 85;
  const upcomingDeadlines = deadlines.slice(0, 5);
  const recentFilings = filings.slice(0, 5);
  const totalLiability = filings.reduce((sum, f) => sum + f.amount, 0);
  const overdueCount = filings.filter((f) => f.status === 'overdue').length;
  const filedCount = filings.filter((f) => f.status === 'filed').length;
  const onTimeRate = filings.length > 0 ? Math.round((filedCount / filings.length) * 100) : 0;

  const getPriorityColor = (priority: DeadlinePriority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-[#e5a764] bg-[#e5a764]/10';
    }
  };

  const getStatusBadge = (status: FilingRecord['status']) => {
    const styles: Record<FilingRecord['status'], string> = {
      'filed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'upcoming': 'bg-[#e5a764]/10 text-[#e5a764] border-[#e5a764]/20',
      'draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      'review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'acknowledged': 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return styles[status] || styles.draft;
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-4 top-4 p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white z-10"
        title="Toggle compliance sidebar"
      >
        <BarChart3 className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className="w-full h-full bg-surface-container-low border-l border-white/5 overflow-y-auto custom-scrollbar flex flex-col"
    >
      {/* Close button */}
      <button
        onClick={onToggle}
        className="absolute right-4 top-4 p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="p-4 space-y-6 pb-8">
        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Compliance Health</h3>
          </div>
          <div className="relative h-2 bg-surface-container rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full"
            />
          </div>
          <p className={cn("text-xs font-bold", healthScore >= 80 ? "text-emerald-400" : healthScore >= 50 ? "text-yellow-400" : "text-red-400")}>
            {healthScore}/100
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-surface-container rounded-lg border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold">On-Time Rate</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{onTimeRate}%</p>
          </div>
          <div className="p-3 bg-surface-container rounded-lg border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Overdue</p>
            <p className={cn("text-lg font-bold mt-1", overdueCount > 0 ? "text-red-400" : "text-emerald-400")}>{overdueCount}</p>
          </div>
          <div className="p-3 bg-surface-container rounded-lg border border-white/5 col-span-2">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Liability</p>
            <p className="text-sm font-bold text-on-surface mt-1">₹{(totalLiability / 100000).toFixed(1)}L</p>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {!deadlinesLoading && upcomingDeadlines.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-tertiary" />
              <h4 className="text-xs font-bold text-slate-400 uppercase">Upcoming Deadlines</h4>
            </div>
            <div className="space-y-1">
              {upcomingDeadlines.map((deadline) => (
                <button
                  key={deadline.id}
                  onClick={() => setExpandedDeadline(expandedDeadline === deadline.id ? null : deadline.id)}
                  className="w-full text-left p-2 rounded-lg bg-surface-container border border-white/5 hover:border-primary/30 hover:bg-surface-container-high transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", getPriorityColor(deadline.priority))}>
                      {deadline.priority.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-on-surface truncate">{deadline.title}</p>
                      <p className="text-[10px] text-slate-500">{new Date(deadline.deadline_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {expandedDeadline === deadline.id && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-[10px] text-slate-400 leading-relaxed">{deadline.description || 'No description'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Status: {deadline.status}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Filings */}
        {!filingsLoading && recentFilings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-secondary" />
              <h4 className="text-xs font-bold text-slate-400 uppercase">Recent Filings</h4>
            </div>
            <div className="space-y-1">
              {recentFilings.map((filing) => (
                <button
                  key={filing.id}
                  onClick={() => setExpandedFiling(expandedFiling === filing.id ? null : filing.id)}
                  className="w-full text-left p-2 rounded-lg bg-surface-container border border-white/5 hover:border-primary/30 hover:bg-surface-container-high transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", getStatusBadge(filing.status))}>
                      {filing.status.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-on-surface truncate">{filing.filing_type}</p>
                      <p className="text-[10px] text-slate-500">{filing.period_start} to {filing.period_end}</p>
                    </div>
                  </div>
                  {expandedFiling === filing.id && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-on-surface font-bold">₹{filing.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Due Date:</span>
                        <span className="text-on-surface">{new Date(filing.due_date).toLocaleDateString()}</span>
                      </div>
                      {filing.filed_date && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Filed Date:</span>
                          <span className="text-emerald-400">{new Date(filing.filed_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {filing.acknowledgment_number && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Ack#:</span>
                          <span className="text-slate-300">{filing.acknowledgment_number}</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!summaryLoading && !deadlinesLoading && !filingsLoading && upcomingDeadlines.length === 0 && recentFilings.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No compliance data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────
export function AgentWorkspace({ agent, onClose }: AgentWorkspaceProps) {
  const [messages, setMessages] = useState<(ChatMessage & { isLocal?: boolean; auditId?: string; isCopied?: boolean })[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const Icon = agent.icon;
  const quickActions = getQuickActions(agent.id);
  const config = getAIConfig();
  const providerName = AI_PROVIDERS.find(p => p.id === config.provider)?.name || config.provider;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming) return;

    setInput('');
    setError(null);

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);

    // 1. Try local rule engine calculation first
    const localResult = tryLocalCalculation(agent.id, messageText);
    if (localResult) {
      setMessages(prev => [...prev, { role: 'assistant', content: localResult.result, isLocal: true, auditId: localResult.auditId } as any]);

      // 2. Also stream AI commentary on top of the calculation
      setIsStreaming(true);
      const aiMessages: ChatMessage[] = [
        ...messages,
        userMsg,
        { role: 'assistant', content: localResult.result },
        { role: 'user', content: 'The rule engine computed the above result. Now provide additional context, compliance tips, any caveats, and recommended next steps based on this calculation. Be concise.' }
      ];

      let aiResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await streamAIResponse(
        aiMessages,
        (chunk) => {
          aiResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: aiResponse };
            return updated;
          });
        },
        (err) => {
          // Non-critical — the calculation already succeeded
          if (!aiResponse) {
            setMessages(prev => prev.slice(0, -1)); // Remove empty AI message
          }
        },
        getAgentSystemPrompt(agent.id)
      );

      setIsStreaming(false);
      return;
    }

    // 3. No local calculation — stream AI response directly
    setIsStreaming(true);
    let aiResponse = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamAIResponse(
      [...messages, userMsg],
      (chunk) => {
        aiResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: aiResponse };
          return updated;
        });
      },
      (err) => {
        setError(err?.message || 'Failed to get response. Check your API key in Settings.');
        setMessages(prev => prev.slice(0, -1));
      },
      getAgentSystemPrompt(agent.id)
    );

    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filing quick action prompts for compliance agents
  const isComplianceAgent = ['tds', 'gst', 'ptax'].includes(agent.id);
  const filingQuickActions = isComplianceAgent ? [
    { label: 'View Filing Calendar', prompt: 'Show me the filing calendar with upcoming deadlines and due dates.' },
    { label: 'Check Overdue Items', prompt: 'What filings are currently overdue? Please summarize the status and penalties.' },
    { label: 'Generate Filing Report', prompt: 'Generate a comprehensive filing status report for the last 90 days, including filed, pending, and overdue items.' },
  ] : [];

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed inset-0 z-[61] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-surface-container/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", agent.bg, agent.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-headline text-lg font-bold text-on-surface">{agent.name} Workspace</h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  AI + Rule Engine · {providerName}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Chat Area (70% or full width) */}
          <div className={cn("flex flex-col overflow-hidden", sidebarOpen ? "flex-[0.7]" : "flex-1")}>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.length === 0 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4", agent.bg, agent.color)}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-headline font-bold text-on-surface mb-2">{agent.name}</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">{agent.role}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Calculator className="w-3.5 h-3.5 text-tertiary" />
                      <span className="text-[10px] text-tertiary font-bold uppercase tracking-widest">Rule Engine + AI Hybrid</span>
                    </div>
                  </div>

                  {quickActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quick Actions</p>
                      <div className="grid grid-cols-1 gap-2">
                        {quickActions.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => handleSend(action.prompt)}
                            className="text-left p-3 rounded-xl bg-surface-container border border-white/5 hover:border-primary/30 hover:bg-surface-container-high transition-all text-xs text-slate-300 font-medium group"
                          >
                            <span className="text-primary group-hover:text-primary font-bold">{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filingQuickActions.length > 0 && (
                    <div className="space-y-2 border-t border-white/10 pt-6">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">Filing Actions</p>
                      <div className="grid grid-cols-1 gap-2">
                        {filingQuickActions.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => handleSend(action.prompt)}
                            className="text-left p-3 rounded-xl bg-secondary/5 border border-secondary/20 hover:border-secondary/40 hover:bg-secondary/10 transition-all text-xs text-slate-300 font-medium group"
                          >
                            <span className="text-secondary group-hover:text-secondary font-bold flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5" />
                              {action.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 group", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  {msg.role === 'assistant' && (
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1", (msg as any).isLocal ? "bg-tertiary/20 text-tertiary" : "bg-primary/20 text-primary")}>
                      {(msg as any).isLocal ? <Calculator className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 px-4 text-[9px]">
                        {(msg as any).isLocal ? (
                          <>
                            <span className="px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary font-bold">RULE ENGINE</span>
                            {(msg as any).auditId && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">AUDIT LOGGED ✓</span>}
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">AI</span>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === 'user'
                        ? "bg-primary text-on-primary"
                        : (msg as any).isLocal
                          ? "bg-tertiary/5 border border-tertiary/20 text-on-surface"
                          : "bg-surface-container border border-white/5 text-on-surface"
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-white/5 overflow-x-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-fit flex items-center gap-1 px-2 py-1 text-[9px] text-slate-400 hover:text-slate-200 rounded hover:bg-white/5"
                      >
                        {copiedIndex === i ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-surface-container border border-white/5 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-2 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-xs text-error">{error}</p>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-surface-container/50 shrink-0">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${agent.name} anything...`}
                  rows={1}
                  className="flex-1 bg-surface-container-high border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  className="p-3 bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 mt-2 text-center">
                Calculations use the built-in rule engine. AI provides context via {providerName}.
              </p>
            </div>
          </div>

          {/* Compliance Sidebar (30%) */}
          {isComplianceAgent && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? '30%' : 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-white/5 overflow-hidden flex-shrink-0"
            >
              {sidebarOpen && (
                <ComplianceSidebar
                  agentId={agent.id}
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
              )}
            </motion.div>
          )}

          {/* Sidebar Toggle Button */}
          {isComplianceAgent && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute right-4 top-20 p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white z-10 bg-surface-container border border-white/5"
              title="Open compliance sidebar"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
