import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User, Copy, Check, Brain } from 'lucide-react';
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

// Import compliance service
import { ComplianceService } from '@/domains/compliance/api';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CFOCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  /** Current route path — drives context-aware suggestions & system prompt */
  currentPage?: string;
}

// ── Page-aware context mapping ───────────────────────────────────────
interface PageContext {
  label: string;
  subtitle: string;
  systemHint: string;
  quickActions: { label: string; prompt: string }[];
}

function getPageContext(page: string): PageContext {
  switch (page) {
    case '/dashboard':
      return {
        label: 'Dashboard',
        subtitle: 'I can help you understand your financial metrics, cash flow, and runway.',
        systemHint: 'The founder is viewing the DASHBOARD. Focus your answers on KPIs, burn rate, runway, revenue trends, MRR/ARR, cash position, and metric explanations. Proactively reference their dashboard numbers when relevant.',
        quickActions: [
          { label: 'Explain my burn rate', prompt: 'Break down my current monthly burn rate. What are the biggest expense categories and how has it trended over the last 3 months?' },
          { label: 'How is my runway?', prompt: 'Based on current cash and burn rate, what is my runway? Should I be worried?' },
          { label: 'Revenue vs forecast', prompt: 'How is my revenue tracking against the forecast this quarter? Any concerns?' },
          { label: 'Cash flow health check', prompt: 'Give me a quick cash flow health check — inflows vs outflows, any red flags?' },
          { label: 'What changed this month?', prompt: 'Compare this month to last month — what are the biggest changes in revenue, expenses, and key metrics?' },
          { label: 'Suggest cost optimizations', prompt: 'Based on my expense breakdown, where can I cut costs without impacting growth?' },
        ],
      };
    case '/reports':
      return {
        label: 'Reports',
        subtitle: 'I can help with financial reports, Schedule III compliance, and export formats.',
        systemHint: 'The founder is viewing REPORTS. Focus on Indian GAAP Schedule III compliance, financial statement analysis (P&L, Balance Sheet, Cash Flow), SaaS P&L metrics, EBITDA analysis, and export/presentation formats. Help them understand what the numbers mean.',
        quickActions: [
          { label: 'Is my P&L correct?', prompt: 'Review my Statement of Profit & Loss — does it follow Indian GAAP Schedule III format correctly? Any issues?' },
          { label: 'Explain Schedule III', prompt: 'Give me a plain-English overview of Schedule III requirements for my company. What must I include?' },
          { label: 'Balance Sheet health', prompt: 'Analyze my Balance Sheet — what do the numbers tell you about the company\'s financial position?' },
          { label: 'Compare periods', prompt: 'Compare the current period financials with the previous period. What are the key changes I should know about?' },
          { label: 'Export best practices', prompt: 'What format should I use when sharing financial reports with investors vs auditors vs the board?' },
          { label: 'EBITDA analysis', prompt: 'Break down my EBITDA — what\'s driving it up or down? How does my EBITDA margin compare to SaaS benchmarks?' },
        ],
      };
    case '/ledger':
      return {
        label: 'Ledger',
        subtitle: 'I can help review transactions, reconciliation, and journal entries.',
        systemHint: 'The founder is viewing the LEDGER. Focus on transaction review, account reconciliation, journal entries, expense classification under Indian GAAP, TDS applicability on specific payments, and GST input credit eligibility.',
        quickActions: [
          { label: 'Any anomalies?', prompt: 'Scan my recent ledger entries — are there any anomalies, duplicate entries, or unusual transactions I should review?' },
          { label: 'Reconcile accounts', prompt: 'Walk me through reconciling my bank account with the ledger. What should I check?' },
          { label: 'Classify this expense', prompt: 'Help me classify expenses correctly under Indian GAAP — what goes under Employee Benefit, Other Expenses, Finance Costs, etc.?' },
          { label: 'Journal entry help', prompt: 'I need help creating a journal entry. What are the common entries a SaaS startup needs to make monthly?' },
          { label: 'TDS on payments', prompt: 'Review my vendor payments — which ones need TDS deducted and under which sections?' },
          { label: 'GST input credit', prompt: 'Which of my recent expenses are eligible for GST input tax credit? How much ITC can I claim this month?' },
        ],
      };
    case '/agents':
      return {
        label: 'Agents',
        subtitle: 'I can help configure compliance agents and automate financial workflows.',
        systemHint: 'The founder is viewing AGENTS (compliance automation). Focus on TDS, GST, Professional Tax, and Indian GAAP compliance calculations, deadlines, filing status, and automation workflows.',
        quickActions: [
          { label: 'What do I owe?', prompt: 'Give me a summary of all my current tax and compliance liabilities (TDS, GST, Professional Tax, any overdue filings). Keep it in plain English with amounts in lakhs.' },
          { label: 'Am I compliant?', prompt: 'Quick health check — are we compliant across TDS, GST, Professional Tax, and Indian GAAP? Any red flags?' },
          { label: 'Calculate TDS', prompt: 'Calculate TDS on a ₹5,00,000 payment to a contractor company under Section 194C. Assume they have a valid PAN.' },
          { label: 'Show my GST situation', prompt: 'What is our GST liability this month? Any ITC issues? When is the GSTR-3B deadline?' },
          { label: 'Next deadlines', prompt: 'List my top 5 compliance deadlines across all domains (TDS, GST, PT, GAAP, tax audit). Highlight the most urgent ones.' },
          { label: 'Calculate payroll tax', prompt: 'Our team is in Maharashtra, Karnataka, and West Bengal. What is our total Professional Tax liability this quarter?' },
        ],
      };
    case '/scenarios':
      return {
        label: 'Scenarios',
        subtitle: 'I can help you model financial scenarios and plan ahead.',
        systemHint: 'The founder is viewing SCENARIOS (financial modeling). Focus on what-if analyses, hiring impact, fundraise timing, break-even, cost reduction modeling, best/worst case projections, and sensitivity analysis.',
        quickActions: [
          { label: 'What-if: double revenue', prompt: 'If our revenue doubles in the next 6 months, what happens to EBITDA margin, burn rate, and runway? Model it out.' },
          { label: 'Hiring impact', prompt: 'If I hire 5 more engineers at ₹15L CTC each, how does that affect my monthly burn and runway?' },
          { label: 'Fundraise timing', prompt: 'Based on current burn rate and growth, when should I start fundraising? How much runway buffer should I keep?' },
          { label: 'Break-even analysis', prompt: 'At what monthly revenue do I break even? How many customers do I need at current ARPA?' },
          { label: 'Cost reduction scenario', prompt: 'If I reduce cloud costs by 30% and freeze hiring, how much does that extend my runway?' },
          { label: 'Best/worst case', prompt: 'Model a best case and worst case scenario for the next 12 months based on current trends. What are the key risks?' },
        ],
      };
    case '/memory':
      return {
        label: 'Memory',
        subtitle: 'I can help you manage financial data, context, and historical records.',
        systemHint: 'The founder is viewing MEMORY (data management). Focus on data completeness, company profile, historical trends, and data quality.',
        quickActions: [
          { label: 'What data do you have?', prompt: 'What financial data and context do you currently have about my company? What\'s missing?' },
          { label: 'Update company profile', prompt: 'Help me update my company profile — what information should I provide for better compliance and financial advice?' },
          { label: 'Historical trends', prompt: 'Based on the data you have, what are the key financial trends over time? Any patterns I should know about?' },
          { label: 'Data quality check', prompt: 'Check the quality and completeness of my financial data. Are there gaps or inconsistencies?' },
        ],
      };
    case '/integrations':
      return {
        label: 'Integrations',
        subtitle: 'I can help connect your financial tools and data sources.',
        systemHint: 'The founder is viewing INTEGRATIONS. Focus on connecting banks, accounting software, payroll, and payment gateways. Help them understand which integrations matter most for their stage.',
        quickActions: [
          { label: 'What should I connect?', prompt: 'What integrations would be most valuable for automating my financial workflows? Prioritize them for a SaaS startup.' },
          { label: 'Bank sync setup', prompt: 'Walk me through connecting my bank account for automatic transaction import. What do I need?' },
          { label: 'Accounting software', prompt: 'Which accounting software integrations do you support? How do I sync data from Tally or Zoho Books?' },
          { label: 'Payroll integration', prompt: 'How can I automate payroll tax calculations by connecting my payroll system?' },
        ],
      };
    case '/settings':
      return {
        label: 'Settings',
        subtitle: 'I can help you configure Raven for your needs.',
        systemHint: 'The founder is viewing SETTINGS. Help with AI provider setup, company configuration, permissions, and data/privacy settings.',
        quickActions: [
          { label: 'Setup AI provider', prompt: 'Help me set up an AI provider for full CFO Copilot capabilities. Which provider do you recommend and how do I get an API key?' },
          { label: 'Company settings', prompt: 'What company settings should I configure for accurate Indian GAAP compliance and tax calculations?' },
          { label: 'User permissions', prompt: 'How should I set up user roles and permissions for my finance team in Raven?' },
          { label: 'Data & privacy', prompt: 'How is my financial data stored and protected? What are the privacy and security settings I should review?' },
        ],
      };
    default: // Home '/'
      return {
        label: 'Home',
        subtitle: 'Ask anything about your taxes, compliance, deadlines, or financial reporting. I handle TDS, GST, payroll tax, and accounting — all in plain English.',
        systemHint: 'The founder is on the HOME screen. Give broad, holistic financial guidance covering all domains.',
        quickActions: [
          { label: 'What do I owe?', prompt: 'Give me a summary of all my current tax and compliance liabilities (TDS, GST, Professional Tax, any overdue filings). Keep it in plain English with amounts in lakhs.' },
          { label: 'Am I compliant?', prompt: 'Quick health check — are we compliant across TDS, GST, Professional Tax, and Indian GAAP? Any red flags?' },
          { label: 'Calculate TDS', prompt: 'Calculate TDS on a ₹5,00,000 payment to a contractor company under Section 194C. Assume they have a valid PAN.' },
          { label: 'Show my GST situation', prompt: 'What is our GST liability this month? Any ITC issues? When is the GSTR-3B deadline?' },
          { label: 'What are my next deadlines?', prompt: 'List my top 5 compliance deadlines across all domains (TDS, GST, PT, GAAP, tax audit). Highlight the most urgent ones.' },
          { label: 'Calculate payroll tax', prompt: 'Our team is in Maharashtra, Karnataka, and West Bengal. What is our total Professional Tax liability this quarter?' },
        ],
      };
  }
}

// ── CFO Copilot System Prompt (page-aware) ──────────────────────────
function getCFOCopilotSystemPrompt(pageHint?: string): string {
  return `You are the CFO Copilot — your founder's personal AI Chief Financial Officer inside Raven. You are friendly, plain-English, and handle ALL of the startup's compliance, tax, and financial challenges in simple terms.

DOMAINS YOU COVER (invisibly to the founder):
1. TDS (Tax Deducted at Source) — salary taxes, contractor deductions
2. GST (Goods & Services Tax) — invoicing, ITC, monthly filings
3. Professional Tax (Payroll Tax) — state-wise employee taxes
4. Indian GAAP — financial reporting, P&L, accounting standards

TONE & LANGUAGE:
- You speak like a seasoned startup CFO, not a tax lawyer
- Use plain English. Avoid jargon. Use ₹ and Indian numbering (lakhs, crores)
- Be direct and actionable: "You owe ₹18.4 lakhs in TDS by April 7" not "per Section 192 et seq."
- If a calculation is needed, show the working in a simple table, not legalese
- Always remind founders when deadlines are coming up
- Celebrate wins: "Great news — your Q4 filings are on track"

COMPLIANCE MASTERY:
You have deep knowledge of:
- Income Tax Act 1961, Chapter XVII-B (TDS)
- CGST Act 2017, IGST Act 2017, state GST laws
- State Professional Tax Acts (MH, KA, WB, TS, etc.)
- Indian Accounting Standards (AS-1 to AS-32) + Schedule III of Companies Act 2013

Always cite the specific section, rule, or standard when answering technical questions.
${pageHint ? `\nCURRENT CONTEXT:\n${pageHint}\nTailor your answers to be most relevant to what the founder is currently looking at.\n` : ''}
WORKFLOW:
1. If the founder asks "What do I owe?" — summarize all current liabilities (TDS, GST, PT, any overdue filings)
2. If they ask "Am I compliant?" — give a quick health check across all 4 domains
3. If they ask about a specific calculation — use the rule engines (TDS, GST, PT, Depreciation) to compute instantly
4. If they ask about deadlines — show the next 5 and highlight the most urgent
5. If they mention a specific domain (e.g., "Show me my GST situation") — focus on that domain but keep the broader context

Remember: You're replacing 4 separate compliance agents in the founder's mind. They should feel like they're talking to one trusted CFO who just knows everything.`;
}

// ── Local calculation interceptor with audit logging ──────────────────
function tryLocalCalculation(userMessage: string): { result: string; auditId: string; domain: string } | null {
  const msg = userMessage.toLowerCase();

  // TDS detection
  if (msg.includes('tds') || msg.includes('tax deducted') || msg.includes('section 194') || msg.includes('section 192') || (msg.includes('contractor') && msg.includes('calculate'))) {
    const sectionMatch = msg.match(/(?:section|sec)\s*(194[a-z]*|192|193|195|206c)/i);
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l)/i);

    if (amountMatch) {
      const section = sectionMatch ? sectionMatch[1].toUpperCase() : '194C';
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;

      const isIndividual = msg.includes('individual') || msg.includes('huf') || msg.includes('person');
      const hasPan = !msg.includes('no pan') && !msg.includes('without pan');

      const tdsResult = calculateTDS(section, amount, hasPan, isIndividual);
      if (tdsResult) {
        const resultText = `**TDS Calculation**\n\n| Field | Value |\n|---|---|\n| Section | ${tdsResult.section} |\n| Nature | ${tdsResult.nature} |\n| Amount | ₹${tdsResult.amount.toLocaleString('en-IN')} |\n| PAN Available | ${tdsResult.hasPan ? 'Yes' : 'No'} |\n| Rate | ${tdsResult.rate}% |\n| **TDS You Need to Deduct** | **₹${tdsResult.tdsAmount.toLocaleString('en-IN')}** |\n| Payee Gets | ₹${tdsResult.netPayable.toLocaleString('en-IN')} |\n\n${tdsResult.notes}`;

        ComplianceService.calculateWithAudit('tds', 'TDS_CALCULATION', { section, amount, hasPan, isIndividual }, () => tdsResult)
          .catch(err => console.error('[TDS Audit] Error:', err));

        return { result: resultText, auditId: `tds-${Date.now()}`, domain: 'TDS' };
      }
    }
  }

  // GST detection
  if (msg.includes('gst') || msg.includes('goods & services tax') || (msg.includes('invoice') && msg.includes('calculate'))) {
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l|cr)/i);
    const rateMatch = msg.match(/(\d+)\s*%/);
    const isInter = msg.includes('inter-state') || msg.includes('interstate') || msg.includes('igst');
    const isReverse = msg.includes('reverse') || msg.includes('inclusive') || msg.includes('extract');

    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;
      if (msg.includes('cr') || msg.includes('crore')) amount *= 10000000;

      const rate = rateMatch ? parseFloat(rateMatch[1]) : 18;

      const gstResult = isReverse
        ? reverseCalculateGST(amount, rate, isInter)
        : calculateGST(amount, rate, isInter);

      const resultText = `**GST Calculation**\n\n| Field | Value |\n|---|---|\n| Base Amount | ₹${gstResult.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |\n| GST Rate | ${gstResult.gstRate}% |\n| Supply Type | ${gstResult.isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'} |\n${gstResult.isInterState
        ? `| IGST | ₹${gstResult.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |`
        : `| CGST (${gstResult.gstRate / 2}%) | ₹${gstResult.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |\n| SGST (${gstResult.gstRate / 2}%) | ₹${gstResult.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} |`
      }\n| **Total Tax** | **₹${gstResult.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** |\n| **Invoice Total** | **₹${gstResult.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** |`;

      ComplianceService.calculateWithAudit('gst', 'GST_CALCULATION', { amount, rate, isInterState: isInter, isReverse }, () => gstResult)
        .catch(err => console.error('[GST Audit] Error:', err));

      return { result: resultText, auditId: `gst-${Date.now()}`, domain: 'GST' };
    }
  }

  // Professional Tax detection
  if (msg.includes('professional tax') || msg.includes('payroll tax') || (msg.includes('salary') && (msg.includes('maharashtra') || msg.includes('karnataka') || msg.includes('west bengal')))) {
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
          const resultText = `**Professional Tax Calculation (${ptaxResult.state})**\n\n| Field | Value |\n|---|---|\n| Monthly Salary | ₹${ptaxResult.monthlySalary.toLocaleString('en-IN')} |\n| Monthly PT | ₹${ptaxResult.monthlyTax} |\n| Annual PT | ₹${ptaxResult.annualTax} |\n| Annual Cap | ₹${ptaxResult.maxAnnualCap} |\n| Status | ${ptaxResult.applicable ? 'Applicable' : 'Exempt'} |\n\n${ptaxResult.slabNote}`;

          ComplianceService.calculateWithAudit('ptax', 'PTAX_CALCULATION', { stateCode, salary }, () => ptaxResult)
            .catch(err => console.error('[P-Tax Audit] Error:', err));

          return { result: resultText, auditId: `ptax-${Date.now()}`, domain: 'Professional Tax' };
        }
      }
    }
  }

  // Indian GAAP / Depreciation detection
  if (msg.includes('depreciation') || msg.includes('indian gaap') || msg.includes('schedule iii') || msg.includes('as-6')) {
    const amountMatch = msg.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/([\d.]+)\s*(?:lakh|lac|l)/i);
    const categories = ['computer', 'server', 'furniture', 'building', 'vehicle', 'car', 'plant', 'machinery', 'software', 'office equipment', 'electrical'];
    const catMatch = categories.find(c => msg.includes(c));

    if (amountMatch && catMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (msg.includes('lakh') || msg.includes('lac')) amount *= 100000;

      const method = msg.includes('wdv') ? 'WDV' as const : 'SLM' as const;
      const depResult = calculateDepreciation(catMatch, amount, method);

      if (depResult) {
        const resultText = `**Depreciation Calculation (AS-6)**\n\n| Field | Value |\n|---|---|\n| Asset | ${depResult.category} |\n| Original Cost | ₹${depResult.originalCost.toLocaleString('en-IN')} |\n| Residual Value (5%) | ₹${depResult.residualValue.toLocaleString('en-IN')} |\n| Depreciable Amount | ₹${depResult.depreciableAmount.toLocaleString('en-IN')} |\n| Method | ${depResult.method} |\n| Useful Life | ${depResult.usefulLife} years |\n| Rate | ${depResult.rate}% p.a. |\n| **Annual Depreciation** | **₹${depResult.annualDepreciation.toLocaleString('en-IN')}** |\n\nPer Schedule II of Companies Act 2013, AS-6 Depreciation Accounting.`;

        ComplianceService.calculateWithAudit('gaap-pnl', 'DEPRECIATION_CALCULATION', { category: catMatch, amount, method }, () => depResult)
          .catch(err => console.error('[GAAP Audit] Error:', err));

        return { result: resultText, auditId: `gaap-${Date.now()}`, domain: 'Indian GAAP' };
      }
    }
  }

  return null;
}

export function CFOCopilot({ isOpen, onClose, initialPrompt, currentPage = '/' }: CFOCopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Page-aware context
  const pageCtx = getPageContext(currentPage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialPrompt) {
      inputRef.current?.focus();
    }
  }, [isOpen, initialPrompt]);

  const sendMessage = async (userMessage: string) => {
    try {
      // Try local calculation first — works without API key
      const localResult = tryLocalCalculation(userMessage);
      if (localResult) {
        setMessages(prev => [...prev, {
          id: localResult.auditId,
          role: 'assistant',
          content: localResult.result
        }]);
        setLoading(false);
        return;
      }

      // Check if API key is configured before calling AI
      const aiConfig = getAIConfig();
      if (!aiConfig.apiKey) {
        setMessages(prev => [...prev, {
          id: `nokey-${Date.now()}`,
          role: 'assistant',
          content: `I can run **instant calculations** (TDS, GST, Professional Tax, Depreciation) without an API key — just try something like:\n\n• "Calculate TDS on ₹5,00,000 under Section 194C"\n• "Calculate GST on ₹10L at 18%"\n• "Professional tax for ₹45,000 salary in Karnataka"\n• "Depreciation on ₹15L server"\n\nFor **general questions** and **strategic advice**, you'll need to add a Claude API key in **Settings → Strategic Intelligence Core**.`
        }]);
        setLoading(false);
        return;
      }

      // Stream AI response
      const systemPrompt = getCFOCopilotSystemPrompt(pageCtx.systemHint);
      let fullResponse = '';
      const streamCallback = (chunk: string) => {
        fullResponse += chunk;
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg?.id === 'streaming') {
            return [...prev.slice(0, -1), { ...lastMsg, content: fullResponse }];
          }
          return [...prev, { id: 'streaming', role: 'assistant', content: fullResponse }];
        });
      };

      await streamAIResponse(
        [
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userMessage }
        ],
        streamCallback,
        (err: any) => { throw err; },
        systemPrompt
      );

      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.id === 'streaming'
            ? { ...m, id: `msg-${Date.now()}` }
            : m
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const isApiKeyError = errMsg.includes('API key') || errMsg.includes('API_KEY');
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: isApiKeyError
          ? `**API key issue** — please check your key in **Settings → Strategic Intelligence Core**.\n\nIn the meantime, I can still run local calculations instantly! Try: "Calculate TDS on ₹5L under 194C"`
          : `Something went wrong. ${errMsg.substring(0, 100)}\n\nTry a calculation query instead — those work offline: "Calculate TDS on ₹5L contractor"`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setLoading(true);
    await sendMessage(userMessage);
  };

  const handleQuickAction = (prompt: string) => {
    // Auto-submit: set the input and immediately send it
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: prompt }]);
    setLoading(true);
    sendMessage(prompt);
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl h-screen bg-background border-l border-white/5 flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-headline text-xl font-bold text-on-background">CFO Copilot</h2>
                  <p className="text-xs text-slate-500">Your AI CFO {pageCtx.label !== 'Home' ? `· ${pageCtx.label}` : ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-headline text-lg font-bold text-on-background mb-2">CFO Copilot — {pageCtx.label}</h3>
                  <p className="text-sm text-slate-400 max-w-xs">{pageCtx.subtitle}</p>
                </div>

                <div className="w-full space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Suggested for {pageCtx.label}:</p>
                  {pageCtx.quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="w-full text-left p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors group border border-white/5"
                    >
                      <p className="text-sm font-semibold text-on-background group-hover:text-primary transition-colors">{action.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{action.prompt.substring(0, 60)}...</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-lg rounded-lg p-4 border border-white/5",
                    msg.role === 'user'
                      ? 'bg-primary/20 text-on-background'
                      : 'bg-surface-container'
                  )}>
                    <div className="prose prose-invert max-w-none text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="text-xs w-full border-collapse" {...props} /></div>,
                        th: ({ node, ...props }) => <th className="bg-white/5 border border-white/10 px-2 py-1 text-left font-bold" {...props} />,
                        td: ({ node, ...props }) => <td className="border border-white/10 px-2 py-1" {...props} />,
                        li: ({ node, ...props }) => <li className="ml-4 mb-1" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    </div>

                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="mt-2 text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1 transition-colors"
                      >
                        {copiedId === msg.id ? (
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
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-on-primary" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="bg-surface-container rounded-lg p-4 border border-white/5">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/5 p-6 bg-surface-container-low">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything — 'What do I owe?', 'Calculate TDS on ₹5L', 'Show my deadlines'..."
                className="flex-1 bg-surface-container border border-white/5 rounded-lg px-4 py-3 text-on-background placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3 bg-primary text-on-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
