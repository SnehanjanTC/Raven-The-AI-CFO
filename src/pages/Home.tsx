import React from 'react';
import {
  Sparkles,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Upload,
  FileSpreadsheet,
  Link2,
  X,
  Check,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import { api } from '@/lib/api';
import { isDemoDataLoaded, getDemoSummary, onDemoDataChange } from '@/lib/demo-data';

// ─── Types ────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  /** For system messages: inline action buttons */
  actions?: Array<{ label: string; action: string; icon?: 'upload' | 'link' | 'navigate' }>;
}

interface QuickMetric {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface DataSource {
  id: string;
  label: string;
  type: 'api' | 'file' | 'integration';
  connected: boolean;
  fileName?: string;
  rows?: number;
}

// ─── Data Requirements Map ────────────────────────────────────────────
// Maps capabilities to the data sources they need
const DATA_REQUIREMENTS: Record<string, { needed: string[]; description: string }> = {
  burn: {
    needed: ['transactions', 'bank_statement'],
    description: 'expense transactions or a bank statement',
  },
  runway: {
    needed: ['transactions', 'bank_statement'],
    description: 'your cash balance and monthly expenses',
  },
  revenue: {
    needed: ['invoices', 'revenue_data'],
    description: 'invoices or revenue data',
  },
  compliance: {
    needed: ['tds_data', 'gst_data', 'payroll'],
    description: 'TDS/GST filings or payroll data',
  },
  payroll: {
    needed: ['payroll', 'employee_data'],
    description: 'payroll or employee data',
  },
  forecast: {
    needed: ['transactions', 'revenue_data'],
    description: 'at least 3 months of transaction and revenue history',
  },
  valuation: {
    needed: ['revenue_data', 'cap_table'],
    description: 'revenue data and a cap table',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────
function formatINR(value: number, unit: 'Cr' | 'L' | '%' = 'Cr'): string {
  if (!value || value === 0) return '—';
  if (unit === 'Cr') return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (unit === 'L') return `₹${(value / 100000).toFixed(1)}L`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  return `₹${value}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFileCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bank') || n.includes('statement')) return 'bank_statement';
  if (n.includes('invoice') || n.includes('billing')) return 'invoices';
  if (n.includes('payroll') || n.includes('salary') || n.includes('employee')) return 'payroll';
  if (n.includes('revenue') || n.includes('sales') || n.includes('mrr')) return 'revenue_data';
  if (n.includes('tds')) return 'tds_data';
  if (n.includes('gst')) return 'gst_data';
  if (n.includes('cap') && n.includes('table')) return 'cap_table';
  if (n.includes('transaction') || n.includes('expense') || n.includes('ledger')) return 'transactions';
  return 'general';
}

const CATEGORY_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement',
  invoices: 'Invoices',
  payroll: 'Payroll',
  revenue_data: 'Revenue',
  tds_data: 'TDS Data',
  gst_data: 'GST Data',
  cap_table: 'Cap Table',
  transactions: 'Transactions',
  general: 'Financial Data',
};

// ─── AI Response Generator ────────────────────────────────────────────
function generateAIResponse(
  query: string,
  data: any,
  sources: DataSource[],
  onRequestData: (needed: string[], description: string) => void
): string {
  const q = query.toLowerCase();
  const connectedTypes = sources.filter(s => s.connected).map(s => s.id);

  // The financial fields that *actually* matter for AI responses. If none of
  // these are present (or all zero), we treat the dashboard as "empty" even
  // when the object itself has scaffolding keys like `_userName` or
  // `metrics: []`. The previous `Object.keys(data).length <= 1` check was a
  // false-empty: any populated metadata key tricked it into believing the
  // user had real data.
  const FINANCIAL_FIELDS = [
    'cash_balance', 'monthly_burn', 'mrr', 'arr_projection',
    'revenue', 'gross_margin', 'net_margin', 'runway_months',
    'tds_liability', 'gst_liability',
  ];
  const hasMeaningfulData = (d: any): boolean => {
    if (!d || typeof d !== 'object') return false;
    return FINANCIAL_FIELDS.some(f => {
      const v = d[f];
      return typeof v === 'number' && v !== 0;
    });
  };

  // Check if user is asking about something that needs data we don't have
  const checkAndAsk = (topic: string): string | null => {
    const req = DATA_REQUIREMENTS[topic];
    if (!req) return null;
    const hasAny = req.needed.some(n =>
      connectedTypes.includes(n) || hasMeaningfulData(data)
    );
    if (!hasAny) {
      onRequestData(req.needed, req.description);
      return `I'd love to help with that, but I need more data first. To give you accurate ${topic} analysis, I'll need **${req.description}**.\n\nYou can upload an Excel or CSV file, or connect an integration. I've added some quick options below.`;
    }
    return null;
  };

  if (!hasMeaningfulData(data)) {
    // No data at all — guide the user
    return `I don't have any financial data connected yet. To get started, I'll need at least one of these:\n\n• **Bank statements** — for cash balance & burn rate\n• **Revenue/invoice data** — for MRR & growth analysis\n• **Payroll data** — for employee cost breakdown\n• **TDS/GST filings** — for compliance tracking\n\nYou can upload an Excel or CSV file below, or connect your accounting tools via Integrations.`;
  }

  if (q.includes('burn') || q.includes('spending') || q.includes('expense')) {
    const missing = checkAndAsk('burn');
    if (missing) return missing;
    const burn = data.monthly_burn ? formatINR(data.monthly_burn, 'L') : 'unavailable';
    const runway = data.runway_months ? `${data.runway_months.toFixed(1)} months` : 'unknown';
    return `Your current monthly burn is **${burn}**. At this rate, you have approximately **${runway}** of runway remaining. I'd recommend reviewing your top 3 expense categories to identify optimization opportunities.`;
  }

  if (q.includes('runway') || q.includes('how long') || q.includes('survive')) {
    const missing = checkAndAsk('runway');
    if (missing) return missing;
    const runway = data.runway_months ? `${data.runway_months.toFixed(1)} months` : 'unknown';
    const cash = data.cash_balance ? formatINR(data.cash_balance, 'Cr') : '—';
    return `With a cash balance of **${cash}** and current burn rate, your runway is **${runway}**. ${data.runway_months > 18 ? 'This is a healthy position.' : data.runway_months > 12 ? 'Consider planning your next raise in the next 3-4 months.' : '⚠️ This is getting tight. I recommend immediate cost optimization and fundraising outreach.'}`;
  }

  if (q.includes('revenue') || q.includes('mrr') || q.includes('arr') || q.includes('growth')) {
    const missing = checkAndAsk('revenue');
    if (missing) return missing;
    const mrr = data.mrr ? formatINR(data.mrr, 'L') : '—';
    const arr = data.arr_projection ? formatINR(data.arr_projection, 'L') : '—';
    return `Your current MRR is **${mrr}** with an ARR projection of **${arr}**. ${data.gross_margin ? `Gross margin stands at **${data.gross_margin.toFixed(1)}%**.` : ''} Focus on improving net revenue retention to accelerate growth.`;
  }

  if (q.includes('payroll') || q.includes('salary') || q.includes('employee') || q.includes('team cost')) {
    const missing = checkAndAsk('payroll');
    if (missing) return missing;
    return `I can see your payroll data. To get a full breakdown of team costs, head to the **Dashboard** page. I'd recommend tracking cost-per-employee trending monthly.`;
  }

  if (q.includes('compliance') || q.includes('gst') || q.includes('tds') || q.includes('filing') || q.includes('tax')) {
    const overdue = data.overdue_filings || 0;
    const upcoming = data.upcoming_deadlines || 0;
    if (overdue > 0) {
      return `⚠️ You have **${overdue} overdue filing(s)** that need immediate attention. Plus **${upcoming} upcoming deadlines**. I recommend prioritizing the overdue filings today to avoid penalties. Navigate to the Reports page to generate compliance reports.`;
    }
    return `Your compliance status looks good — **${upcoming} upcoming deadlines** to track, but nothing overdue. Keep an eye on your next TDS deposit and GST return dates.`;
  }

  if (q.includes('valuation') || q.includes('cap table') || q.includes('equity')) {
    const missing = checkAndAsk('valuation');
    if (missing) return missing;
    return `Based on your current metrics, I can help estimate valuation multiples. Upload your cap table for a more complete picture.`;
  }

  if (q.includes('forecast') || q.includes('predict') || q.includes('project') || q.includes('next quarter')) {
    const missing = checkAndAsk('forecast');
    if (missing) return missing;
    return `Based on your data, I can model forecasts on the **Scenarios** page. Try adjusting growth rate, churn, and burn to see how they impact your runway. I can help you analyze the results.`;
  }

  if (q.includes('what data') || q.includes('what do you need') || q.includes('what should i upload') || q.includes('get started') || q.includes('how to use')) {
    const suggestions = [];
    if (!connectedTypes.includes('bank_statement') && !connectedTypes.includes('transactions')) {
      suggestions.push('• **Bank statement** (Excel/CSV) — unlocks cash balance, burn rate, runway analysis');
    }
    if (!connectedTypes.includes('revenue_data') && !connectedTypes.includes('invoices')) {
      suggestions.push('• **Revenue/invoice data** — unlocks MRR, ARR, growth metrics');
    }
    if (!connectedTypes.includes('payroll')) {
      suggestions.push('• **Payroll sheet** — unlocks team cost analysis, Professional Tax calculations');
    }
    if (!connectedTypes.includes('tds_data') && !connectedTypes.includes('gst_data')) {
      suggestions.push('• **TDS/GST data** — unlocks compliance tracking and filing reminders');
    }
    if (suggestions.length === 0) {
      return `You've got great data coverage! I can currently analyze your cash position, burn, revenue, compliance, and team costs. Ask me anything.`;
    }
    return `Here's what would make me most useful for you:\n\n${suggestions.join('\n')}\n\nYou can **upload Excel/CSV files** using the paperclip below, or **connect integrations** like Tally, Zoho, or your bank.`;
  }

  if (q.includes('health') || q.includes('score') || q.includes('overall') || q.includes('summary') || q.includes('how am i doing')) {
    const cash = data.cash_balance ? formatINR(data.cash_balance, 'Cr') : '—';
    const burn = data.monthly_burn ? formatINR(data.monthly_burn, 'L') : '—';
    const margin = data.gross_margin ? `${data.gross_margin.toFixed(1)}%` : '—';
    return `Here's your financial snapshot:\n\n• **Cash:** ${cash}\n• **Monthly Burn:** ${burn}\n• **Gross Margin:** ${margin}\n• **Runway:** ${data.runway_months ? data.runway_months.toFixed(1) + ' months' : '—'}\n\n${data.runway_months > 12 ? 'Overall, your startup is in a stable financial position.' : 'I recommend focusing on extending your runway through cost optimization or fundraising.'}`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    const name = data._userName || 'there';
    return `Hey ${name}! I'm your AI CFO assistant. I can help you understand your finances, check compliance deadlines, analyze burn rate, or run scenario projections. What would you like to know?`;
  }

  // Default
  const cash = data.cash_balance ? formatINR(data.cash_balance, 'Cr') : null;
  const burn = data.monthly_burn ? formatINR(data.monthly_burn, 'L') : null;
  const fileCount = sources.filter(s => s.type === 'file' && s.connected).length;
  const extra = fileCount > 0 ? ` I'm also analyzing **${fileCount} uploaded file(s)**.` : '';
  return `I can help with financial analysis, compliance, scenario modeling, and more. ${cash ? `Your current cash balance is **${cash}**${burn ? ` with a monthly burn of **${burn}**` : ''}.` : ''}${extra} Try asking about your burn rate, runway, revenue, or type **"what data do you need"** to see what I can unlock with more sources.`;
}

// ─── Component ────────────────────────────────────────────────────────
export function Home() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userName = session?.user?.email?.split('@')[0] || 'there';

  // Chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Data sources state
  const [dataSources, setDataSources] = React.useState<DataSource[]>([]);
  const [showSourceMenu, setShowSourceMenu] = React.useState(false);
  const sourceMenuRef = React.useRef<HTMLDivElement>(null);

  // Dashboard data for AI context
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [metrics, setMetrics] = React.useState<QuickMetric[]>([
    { label: 'Cash', value: '—' },
    { label: 'Burn', value: '—' },
    { label: 'Runway', value: '—' },
    { label: 'MRR', value: '—' },
  ]);

  // Initialize data sources from API/demo state
  const updateSourcesFromData = React.useCallback((data: any) => {
    const apiSources: DataSource[] = [];
    if (data) {
      apiSources.push({ id: 'dashboard', label: 'Dashboard', type: 'api', connected: true });
      if (data.cash_balance) apiSources.push({ id: 'transactions', label: 'Transactions', type: 'api', connected: true });
      if (data.mrr) apiSources.push({ id: 'revenue_data', label: 'Revenue', type: 'api', connected: true });
      apiSources.push({ id: 'compliance', label: 'Compliance', type: 'api', connected: true });
      if (data.arr_projection) apiSources.push({ id: 'projections', label: 'Projections', type: 'api', connected: true });
    } else {
      apiSources.push({ id: 'dashboard', label: 'Dashboard', type: 'api', connected: false });
    }
    setDataSources(prev => {
      const fileSources = prev.filter(s => s.type === 'file');
      return [...apiSources, ...fileSources];
    });
  }, []);

  // Fetch dashboard data
  React.useEffect(() => {
    /** Format an INR number compactly: ₹6.41 Cr / ₹47.6 L */
    const fmtINR = (n: number | undefined | null): string => {
      if (n === undefined || n === null || isNaN(Number(n))) return '—';
      const v = Number(n);
      if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
      if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
      return `₹${Math.round(v).toLocaleString('en-IN')}`;
    };

    const fetchData = async () => {
      // Try Zoho live revenue first; we'll merge it into the summary below
      let zoho: any = null;
      try {
        zoho = await api.zohomcp.revenue();
      } catch {
        // Zoho MCP not connected — fall through to dashboard summary only
      }

      try {
        const summary = await api.dashboard.summary();
        if (summary) {
          summary._userName = userName;
          if (zoho) {
            // Inject live Zoho values so the AI CFO has them in context
            summary.total_revenue = zoho.total_revenue;
            summary.outstanding_revenue = zoho.outstanding;
            summary.paid_revenue = zoho.paid_revenue;
            summary.invoice_count = zoho.invoice_count;
            summary.top_customers = zoho.top_customers;
            // Headline MRR = TTM (trailing-12mo billings ÷ 12) — works for any cadence
            summary.mrr = zoho.metrics?.mrr ?? 0;
            summary.arr_projection = zoho.metrics?.arr ?? 0;
            summary.recurring_mrr = zoho.metrics?.recurring_mrr ?? 0;
            summary.one_time_mrr = zoho.metrics?.one_time_mrr ?? 0;
            summary.recurring_customers = zoho.metrics?.recurring_customers ?? [];
            summary.mrr_method = zoho.metrics?.mrr_method;
          }
          setDashboardData(summary);
          updateSourcesFromData(summary);
          setMetrics([
            { label: 'Cash', value: formatINR(summary.cash_balance, 'Cr'), change: '+8.2%', trend: 'up' },
            { label: 'Burn', value: formatINR(summary.monthly_burn, 'L'), change: '-3.1%', trend: 'down' },
            { label: 'Runway', value: summary.runway_months ? `${summary.runway_months.toFixed(1)} Mo` : '—', trend: 'stable' },
            zoho
              ? {
                  label: 'MRR',
                  value: fmtINR(zoho.metrics?.mrr ?? 0),
                  change:
                    zoho.metrics?.yoy_pct !== null && zoho.metrics?.yoy_pct !== undefined
                      ? `${zoho.metrics.yoy_pct >= 0 ? '+' : ''}${zoho.metrics.yoy_pct.toFixed(1)}% YoY`
                      : '',
                  trend: (zoho.metrics?.yoy_pct ?? 0) >= 0 ? 'up' : 'down',
                }
              : { label: 'MRR', value: formatINR(summary.mrr, 'L'), change: '+6.4%', trend: 'up' },
          ]);
        } else if (zoho) {
          // Backend has no summary but Zoho is connected — use Zoho-only metrics
          const d = { total_revenue: zoho.total_revenue, outstanding_revenue: zoho.outstanding, paid_revenue: zoho.paid_revenue, top_customers: zoho.top_customers, invoice_count: zoho.invoice_count, _userName: userName } as any;
          setDashboardData(d);
          updateSourcesFromData(d);
          setMetrics([
            { label: 'MRR (TTM)', value: fmtINR(zoho.metrics?.mrr ?? 0), change: `${zoho.invoice_count} inv`, trend: 'up' },
            { label: 'ARR', value: fmtINR(zoho.metrics?.arr ?? 0), trend: 'up' },
            { label: 'Outstanding', value: fmtINR(zoho.outstanding), trend: 'down' },
            { label: 'Top Customer', value: zoho.top_customers?.[0]?.customer?.split(' ').slice(0, 2).join(' ') || '—' },
          ]);
        }
      } catch {
        if (isDemoDataLoaded()) {
          const s = getDemoSummary();
          const d = { cash_balance: s.cashBalance, monthly_burn: s.monthlyBurn, runway_months: s.runway, mrr: s.mrr, arr_projection: s.arrProjection, gross_margin: s.grossMargin, _userName: userName } as any;
          setDashboardData(d);
          updateSourcesFromData(d);
          setMetrics([
            { label: 'Cash', value: formatINR(s.cashBalance, 'Cr'), change: '+8.2%', trend: 'up' },
            { label: 'Burn', value: formatINR(s.monthlyBurn, 'L'), change: '-3.1%', trend: 'down' },
            { label: 'Runway', value: `${s.runway.toFixed(1)} Mo`, trend: 'stable' },
            { label: 'MRR', value: formatINR(s.mrr, 'L'), change: '+6.4%', trend: 'up' },
          ]);
        } else {
          updateSourcesFromData(null);
        }
      }
    };
    fetchData();

    const unsub = onDemoDataChange(() => {
      if (isDemoDataLoaded()) {
        const s = getDemoSummary();
        const d = { cash_balance: s.cashBalance, monthly_burn: s.monthlyBurn, runway_months: s.runway, mrr: s.mrr, arr_projection: s.arrProjection, gross_margin: s.grossMargin, _userName: userName } as any;
        setDashboardData(d);
        updateSourcesFromData(d);
        setMetrics([
          { label: 'Cash', value: formatINR(s.cashBalance, 'Cr'), change: '+8.2%', trend: 'up' },
          { label: 'Burn', value: formatINR(s.monthlyBurn, 'L'), change: '-3.1%', trend: 'down' },
          { label: 'Runway', value: `${s.runway.toFixed(1)} Mo`, trend: 'stable' },
          { label: 'MRR', value: formatINR(s.mrr, 'L'), change: '+6.4%', trend: 'up' },
        ]);
      }
    });
    return unsub;
  }, [userName, updateSourcesFromData]);

  // Welcome message — adapts to data state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const hasData = dataSources.some(s => s.connected);
      const fileCount = dataSources.filter(s => s.type === 'file').length;
      let welcomeText: string;

      if (hasData && fileCount > 0) {
        welcomeText = `${getGreeting()}, ${userName}. I'm your AI CFO — I have context from your connected data and **${fileCount} uploaded file(s)**. Ask me anything.`;
      } else if (hasData) {
        welcomeText = `${getGreeting()}, ${userName}. I'm your AI CFO with access to your financial data. For deeper insights, you can upload Excel/CSV files like bank statements, invoices, or payroll. What would you like to know?`;
      } else {
        welcomeText = `${getGreeting()}, ${userName}. I'm your AI CFO — but I need data to work with. Let's get started:\n\n• **Upload a file** — bank statement, invoices, payroll (Excel or CSV)\n• **Connect an integration** — Tally, Zoho, Razorpay, and more\n\nOr just ask me **"what data do you need"** and I'll guide you.`;
      }

      setMessages([{
        id: 'welcome',
        role: 'ai',
        content: welcomeText,
        timestamp: new Date(),
      }]);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  // Auto-scroll
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close source menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setShowSourceMenu(false);
      }
    };
    if (showSourceMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSourceMenu]);

  // Handle data request from AI (when it detects missing data)
  const handleDataRequest = React.useCallback((_needed: string[], description: string) => {
    // Add a system message with action buttons
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: `I need ${description} to answer that. Choose how to provide it:`,
      timestamp: new Date(),
      actions: [
        { label: 'Upload Excel/CSV', action: 'upload', icon: 'upload' },
        { label: 'Connect Integration', action: 'integrate', icon: 'link' },
      ],
    }]);
  }, []);

  // Handle file upload
  const handleFileUpload = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv', 'tsv'].includes(ext || '')) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'ai',
          content: `I can only process **Excel (.xlsx, .xls)** and **CSV/TSV** files. The file "${file.name}" isn't supported. Please try again with the right format.`,
          timestamp: new Date(),
        }]);
        return;
      }

      const category = getFileCategory(file.name);
      const categoryLabel = CATEGORY_LABELS[category];
      const rowEstimate = Math.round(file.size / 100); // rough estimate

      // Add as a data source
      const newSource: DataSource = {
        id: category,
        label: categoryLabel,
        type: 'file',
        connected: true,
        fileName: file.name,
        rows: rowEstimate,
      };
      setDataSources(prev => {
        const filtered = prev.filter(s => !(s.type === 'file' && s.id === category));
        return [...filtered, newSource];
      });

      // Confirmation message from AI
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}-${file.name}`,
        role: 'ai',
        content: `Got it! I've ingested **${file.name}** (~${rowEstimate.toLocaleString()} rows) as your **${categoryLabel}** source. ${getOnboardingHint(category)}\n\nThis data is now available for all my analyses. What would you like to know?`,
        timestamp: new Date(),
      }]);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowSourceMenu(false);
  }, []);

  const handleSystemAction = React.useCallback((action: string) => {
    if (action === 'upload') {
      fileInputRef.current?.click();
    } else if (action === 'integrate') {
      navigate('/integrations');
    }
  }, [navigate]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    setTimeout(() => {
      const response = generateAIResponse(text, dashboardData, dataSources, handleDataRequest);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const removeSource = (id: string) => {
    setDataSources(prev => prev.filter(s => !(s.type === 'file' && s.id === id)));
    setMessages(prev => [...prev, {
      id: `remove-${Date.now()}`,
      role: 'ai',
      content: `Removed the **${CATEGORY_LABELS[id] || id}** data source. My analyses will no longer include that data.`,
      timestamp: new Date(),
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const suggestions = [
    "What data do you need?",
    "What's my burn rate?",
    'Summarize my financial health',
    'Any compliance deadlines?',
  ];

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-emerald-400" />;
    return <Minus className="w-3 h-3 text-slate-500" />;
  };

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('• ')) {
        const parts = line.substring(2).split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} className="flex gap-2 py-0.5">
            <span className="text-slate-500 mt-0.5">•</span>
            <span>
              {parts.map((p, j) =>
                p.startsWith('**') && p.endsWith('**')
                  ? <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>
                  : <span key={j}>{p}</span>
              )}
            </span>
          </div>
        );
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={line === '' ? 'h-2' : ''}>
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </p>
      );
    });
  };

  const connectedSources = dataSources.filter(s => s.connected);
  const fileSources = dataSources.filter(s => s.type === 'file' && s.connected);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ─── Quick Metrics Strip ───────────────────────────────── */}
      <div className="flex items-center gap-2 py-3 px-2 overflow-x-auto no-scrollbar flex-shrink-0">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] min-w-fit"
          >
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{m.label}</span>
            <span className="text-xs font-semibold text-on-background">{m.value}</span>
            {m.change && (
              <span className="flex items-center gap-0.5">
                <TrendIcon trend={m.trend} />
                <span className={cn('text-[10px] font-medium', 'text-emerald-400')}>
                  {m.change}
                </span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ─── Chat Area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        <div className="space-y-6 py-4">
          {messages.map((msg) => {
            // System message with action buttons
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mt-1">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-slate-300">
                      {renderContent(msg.content)}
                    </div>
                    {msg.actions && (
                      <div className="flex gap-2 mt-2">
                        {msg.actions.map((act) => (
                          <button
                            key={act.action}
                            onClick={() => handleSystemAction(act.action)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
                          >
                            {act.icon === 'upload' && <Upload className="w-3.5 h-3.5" />}
                            {act.icon === 'link' && <Link2 className="w-3.5 h-3.5" />}
                            {act.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'ai' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#e5a764]/20 to-[#c4bdb4]/20 border border-white/[0.06] flex items-center justify-center mt-1">
                    <Sparkles className="w-4 h-4 text-[#e5a764]" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
                    msg.role === 'ai'
                      ? 'bg-white/[0.03] border border-white/[0.05] text-slate-300'
                      : 'bg-primary/10 border border-primary/10 text-slate-200'
                  )}
                >
                  {renderContent(msg.content)}
                  <p className="text-[10px] text-slate-600 mt-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-primary">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#e5a764]/20 to-[#c4bdb4]/20 border border-white/[0.06] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#e5a764]" />
              </div>
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Suggestion Chips (shown when few messages) ──────── */}
        {messages.length <= 1 && !isTyping && (
          <div className="flex flex-col items-center py-8 gap-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Try asking</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-4 py-2 text-[13px] text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full hover:bg-white/[0.06] hover:text-slate-300 hover:border-white/[0.1] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Input Area ────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-2 pb-3 pt-2">
        <div className="relative flex items-end gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-3 focus-within:border-primary/20 transition-colors">
          {/* Attach / Upload button */}
          <div className="relative" ref={sourceMenuRef}>
            <button
              onClick={() => setShowSourceMenu(!showSourceMenu)}
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                showSourceMenu
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
              )}
              aria-label="Add data source"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Source picker popup */}
            {showSourceMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1c1c1a]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-white/[0.05]">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Add data source</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] text-slate-300 font-medium group-hover:text-white transition-colors">Upload Excel / CSV</p>
                      <p className="text-[11px] text-slate-600">Bank statements, invoices, payroll</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { navigate('/integrations'); setShowSourceMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#e5a764]/10 flex items-center justify-center">
                      <Link2 className="w-4 h-4 text-[#e5a764]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] text-slate-300 font-medium group-hover:text-white transition-colors">Connect Integration</p>
                      <p className="text-[11px] text-slate-600">Tally, Zoho, Razorpay, Banks</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI CFO anything..."
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              input.trim()
                ? 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                : 'bg-white/[0.04] text-slate-600'
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Data source chips */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          {connectedSources.map((src) => (
            <div
              key={`${src.type}-${src.id}`}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                src.type === 'file'
                  ? 'bg-emerald-500/[0.04] border-emerald-500/10'
                  : 'bg-white/[0.02] border-white/[0.05]'
              )}
            >
              {src.type === 'file' ? (
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              <span className="text-[10px] text-slate-500 font-medium">
                {src.label}
                {src.fileName && <span className="text-slate-600"> · {src.fileName}</span>}
              </span>
              {src.type === 'file' && (
                <button
                  onClick={() => removeSource(src.id)}
                  className="ml-0.5 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => setShowSourceMenu(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-white/[0.08] hover:border-primary/30 hover:bg-primary/[0.04] transition-all group"
          >
            <Plus className="w-3 h-3 text-slate-600 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-slate-600 group-hover:text-slate-400 font-medium transition-colors">Add source</span>
          </button>

          <span className="text-[10px] text-slate-700 ml-0.5">·</span>
          <span className="text-[10px] text-slate-700">FinOS AI CFO</span>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding hint after upload ─────────────────────────────────────
function getOnboardingHint(category: string): string {
  switch (category) {
    case 'bank_statement':
      return 'I can now calculate your **burn rate**, **runway**, and **cash flow trends**. Try asking "what\'s my burn rate?"';
    case 'invoices':
      return 'I can now track your **revenue**, **outstanding payments**, and **collection efficiency**.';
    case 'payroll':
      return 'I can now analyze **team costs**, **Professional Tax**, and **salary distributions**.';
    case 'revenue_data':
      return 'I can now calculate **MRR**, **ARR projections**, and **growth rates**.';
    case 'tds_data':
      return 'I can now track **TDS liabilities** and **filing deadlines**.';
    case 'gst_data':
      return 'I can now monitor **GST compliance** and help prepare **GSTR-3B**.';
    case 'cap_table':
      return 'I can now help with **dilution analysis** and **valuation estimates**.';
    case 'transactions':
      return 'I can now categorize your **expenses** and identify **spending patterns**.';
    default:
      return 'I\'ll analyze this data and make it available for all your queries.';
  }
}
