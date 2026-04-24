import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Wallet,
  Info,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Trash2,
  ArrowRight,
  PlayCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useMetrics } from '@/hooks/useMetrics';
import { isDemoDataLoaded, getDemoTransactions, getDemoFilings } from '@/lib/demo-data';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isValidated?: boolean;
  actions?: { label: string; icon: any; onClick: () => void }[];
}

export function Copilot() {
  const { metrics, loading: metricsLoading, getMetric } = useMetrics([]);
  const [aiKeyStatus, setAiKeyStatus] = useState<'ready' | 'no-key'>('no-key');
  const [contextDepth, setContextDepth] = useState<string>('Connect demo data');

  useEffect(() => {
    // Check for AI API keys
    const keys = [
      localStorage.getItem('finos_gemini_key'),
      localStorage.getItem('finos_openai_key'),
      localStorage.getItem('finos_anthropic_key'),
      localStorage.getItem('finos_grok_key')
    ];
    setAiKeyStatus(keys.some(k => k) ? 'ready' : 'no-key');

    // Update context depth based on demo data
    if (isDemoDataLoaded()) {
      const txnCount = getDemoTransactions().length;
      const filingCount = getDemoFilings().length;
      setContextDepth(`${txnCount} txns, ${filingCount} filings`);
    } else {
      setContextDepth('Connect demo data');
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize welcome message based on data status
  useEffect(() => {
    const initializeWelcome = async () => {
      try {
        // Prefer the live Zoho Books MCP for the data-presence check.
        // Fall back to the legacy backend dashboard summary if MCP is not connected.
        let invoiceCount = 0;
        let filingCount = 0;
        let mrr = 0;
        let arr = 0;
        try {
          const mcpStatus = await api.zohomcp.status();
          if (mcpStatus?.connected) {
            const rev: any = await api.zohomcp.revenue();
            invoiceCount = Number(rev?.invoice_count ?? 0);
            mrr = Number(rev?.metrics?.mrr ?? 0);
            arr = Number(rev?.metrics?.arr ?? 0);
          }
        } catch { /* MCP unavailable, fall through */ }

        const dashboardSummary: any = await api.dashboard.summary().catch(() => ({}));
        // Backend returns snake_case. None of `total_transactions` / `total_filings`
        // exist on the schema, so accept any plausible aliases.
        if (invoiceCount === 0) {
          invoiceCount = Number(
            dashboardSummary?.invoice_count
            ?? dashboardSummary?.transaction_count
            ?? dashboardSummary?.total_transactions
            ?? 0
          );
        }
        filingCount = Number(
          dashboardSummary?.filing_count
          ?? dashboardSummary?.total_filings
          ?? dashboardSummary?.overdue_filings
          ?? 0
        );
        if (mrr === 0) mrr = Number(dashboardSummary?.mrr ?? 0);
        if (arr === 0) arr = Number(dashboardSummary?.arr_projection ?? dashboardSummary?.arr ?? 0);

        const hasData = invoiceCount > 0 || mrr > 0 || arr > 0;
        const ctxBits: string[] = [];
        if (invoiceCount > 0) ctxBits.push(`${invoiceCount} invoices`);
        if (filingCount > 0) ctxBits.push(`${filingCount} filings`);
        if (mrr > 0) ctxBits.push(`MRR ₹${(mrr / 1e5).toFixed(1)}L`);
        const ctxLine = ctxBits.length > 0 ? ctxBits.join(', ') : 'live data';

        const welcomeMessage: Message = {
          id: '1',
          role: 'assistant',
          content: hasData
            ? `Hello! I'm your **FinOS Copilot**. I have access to ${ctxLine}. How can I assist with your financial strategy today?`
            : "Hello! I'm your **FinOS Copilot**. Connect your data sources to get personalized insights. Once connected, I can analyze runway projections, hiring impact, and expense anomalies.",
          timestamp: new Date(),
          isValidated: true,
          actions: hasData ? [
            { label: 'Analyze Hiring Impact', icon: Users, onClick: () => setInput('Analyze hiring 2 senior engineers') },
            { label: 'Runway Stress Test', icon: PlayCircle, onClick: () => setInput('Run a recession stress test on our runway') }
          ] : [
            { label: 'Help me set up FinOS', icon: FileText, onClick: () => setInput('Help me set up FinOS') }
          ]
        };

        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Error loading dashboard summary:', error);
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Hello! I'm your **FinOS Copilot**. Connect your data sources to get personalized insights.",
          timestamp: new Date(),
          isValidated: true,
          actions: [
            { label: 'Help me set up FinOS', icon: FileText, onClick: () => setInput('Help me set up FinOS') }
          ]
        }]);
      }
    };

    initializeWelcome();
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isValidated: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      const context = metrics.length > 0
        ? `Current Financial Snapshots: ${metrics.map(m => `${m.label}: ${m.value} (${m.change || 'N/A'})`).join(', ')}`
        : undefined;

      // Try backend AI proxy first
      let backedAISucceeded = false;
      try {
        const backendResponse = await api.ai.chat({
          messages: messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),
          context,
          provider: undefined
        });

        if (backendResponse && backendResponse.content) {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId ? { ...m, content: backendResponse.content } : m
          ));
          setIsLoading(false);
          backedAISucceeded = true;
          return;
        }
      } catch (backendErr) {
        console.error("Backend AI Error:", backendErr);
      }

      // Fall back to client-side AI if backend fails
      if (!backedAISucceeded) {
        import('@/lib/ai').then(({ streamAIResponse }) => {
          streamAIResponse(
            messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),
            (chunk) => {
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m
              ));
            },
            (err) => {
              console.error("AI Error:", err);
              const errorMsg = err instanceof Error ? err.message : String(err);
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId ? {
                  ...m,
                  content: `**Error:** ${errorMsg}\n\nPlease check your API key in **Settings → Strategic Intelligence Core**.`
                } : m
              ));
              setIsLoading(false);
            },
            context
          ).then(() => {
            setIsLoading(false);
            // Ensure empty responses show a message instead of blank bubble
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId && m.content === ''
                ? { ...m, content: 'No response received. Please check your API key and try again.' }
                : m
            ));
          });
        }).catch((importErr) => {
          console.error("Failed to load AI module:", importErr);
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId ? {
              ...m,
              content: 'Failed to load the AI module. Please refresh and try again.'
            } : m
          ));
          setIsLoading(false);
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: "Chat history cleared. How can I help you now?",
      timestamp: new Date(),
      isValidated: true
    }]);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <section className="flex-1 flex flex-col relative bg-background">
        {/* Chat Header */}
        <div className="px-4 md:px-10 py-4 border-b border-white/5 flex items-center justify-between bg-surface-container/30 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">FinOS Copilot</h2>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  aiKeyStatus === 'ready' ? "bg-tertiary" : "bg-yellow-500"
                )}></span>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  aiKeyStatus === 'ready' ? "text-tertiary" : "text-yellow-500"
                )}>
                  {aiKeyStatus === 'ready' ? 'AI Ready' : 'No API Key'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded-full border border-white/5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Context Depth:</span>
              <span className="text-xs text-primary font-bold">{contextDepth}</span>
            </div>
            <button 
              onClick={clearChat}
              className="p-2 text-slate-500 hover:text-error transition-colors rounded-lg hover:bg-error/10"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-10 py-8 space-y-8 scroll-smooth no-scrollbar"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-4 max-w-4xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 mt-1 shadow-glow-primary">
                  <Bot className="w-6 h-6 text-primary fill-current" />
                </div>
              )}
              
              <div className={cn(
                "group relative",
                msg.role === 'user' ? "max-w-xl" : "max-w-2xl"
              )}>
                {msg.role === 'assistant' && msg.isValidated && (
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-bold uppercase tracking-tighter">SIF Validated Response</span>
                  </div>
                )}
                
                <div className={cn(
                  "p-5 rounded-2xl shadow-lg",
                  msg.role === 'user' 
                    ? "bg-primary text-on-primary rounded-tr-none" 
                    : "glass-panel border border-primary/10 rounded-tl-none text-on-surface"
                )}>
                  <div className={cn(
                    "prose prose-invert prose-sm max-w-none overflow-x-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:overflow-x-auto [&_table]:block",
                    msg.role === 'user' ? "prose-p:text-on-primary" : "prose-p:text-on-surface"
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.actions.map((action, idx) => (
                        <button 
                          key={idx}
                          onClick={action.onClick}
                          className="flex items-center gap-2 bg-surface-container-highest/50 hover:bg-primary/20 hover:text-primary border border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                        >
                          <action.icon className="w-3 h-3" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={cn(
                    "mt-3 text-[11px] font-medium opacity-50",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 mr-auto">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 mt-1 animate-pulse">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="glass-panel border border-primary/10 rounded-2xl rounded-tl-none p-5 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs text-slate-400 font-medium italic">Copilot is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-10 bg-gradient-to-t from-background via-background to-transparent">
          <div className="relative max-w-4xl mx-auto">
            <form 
              onSubmit={handleSendMessage}
              className="glass-panel rounded-2xl border border-white/5 p-2 shadow-2xl focus-within:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Sparkles className={cn("w-5 h-5 transition-colors", isLoading ? "text-tertiary animate-pulse" : "text-primary")} />
                <input
                  className="w-full bg-transparent border-none text-on-surface placeholder:text-slate-500 focus:ring-0 py-3 text-sm"
                  placeholder="Ask about runway, burn rate, or growth scenarios..."
                  type="text"
                  aria-label="Ask FinOS Copilot a question"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2.5 rounded-xl transition-all flex items-center justify-center shadow-lg",
                    !input.trim() || isLoading 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                      : "bg-primary text-on-primary hover:scale-105 active:scale-95 shadow-primary/20"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-4 px-4 pb-3 overflow-x-auto no-scrollbar">
                {(() => {
                  const suggestions: string[] = [];
                  if (metrics.length > 0) {
                    suggestions.push('Review recent expenses');
                  }
                  const hasDeadlines = metrics.some(m => m.label.includes('Deadline') || m.label.includes('Due'));
                  if (hasDeadlines) {
                    suggestions.push('Check upcoming deadlines');
                  }
                  if (suggestions.length === 0) {
                    suggestions.push('Help me set up FinOS');
                  }
                  return suggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setInput(tag)}
                      className="text-xs text-slate-400 border border-slate-700 rounded-full px-3 py-1 hover:bg-white/5 hover:border-primary/50 transition-all whitespace-nowrap"
                    >
                      {tag}
                    </button>
                  ));
                })()}
              </div>
            </form>
            <p className="text-center text-xs text-slate-600 mt-4">
              FinOS Copilot uses the Strategic Intelligence Framework to provide real-time financial guidance.
            </p>
          </div>
        </div>
      </section>

      <aside className="w-96 bg-surface-container-low border-l border-white/5 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-headline font-bold text-sm tracking-tight text-on-surface uppercase mb-1">Supporting Data (SIF)</h2>
          <p className="text-xs text-slate-500">Live impact analysis for current conversation</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="bg-surface-container rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-1">Projected Runway</h3>
                <p className="font-headline font-extrabold text-2xl text-on-surface">{getMetric('Runway')?.value || 'N/A'} <span className="text-xs text-slate-500 font-medium">Mo</span></p>
              </div>
              <div className="px-2 py-1 bg-tertiary/10 text-tertiary rounded text-xs font-bold uppercase">
                Stable SIF
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((metrics.filter(m => m.label === 'Data Sources Connected').length / 5) * 100) || 30)}%` }}></div>
            </div>
            <div className="mt-4 flex justify-between text-xs font-medium text-slate-500">
              <span>DATA CONNECTIVITY</span>
              <span>{metricsLoading ? 'LOADING...' : 'CONNECTED'}</span>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 mb-4">Core Position Flow</h3>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-slate-500">MRR Position</p>
                <p className="text-sm font-bold text-on-surface">{getMetric('Revenue (MRR)')?.value || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Monthly Burn</p>
                <p className="text-sm font-bold text-error">{getMetric('Monthly Burn')?.value || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs uppercase font-bold text-slate-600">
                <span>Memory Depth</span>
                <span className={`${(getDemoTransactions().length || 0) > 100 ? 'text-primary' : 'text-slate-400'}`}>
                  {(getDemoTransactions().length || 0) > 100 ? 'High' : 'Medium'}
                </span>
              </div>
              <div className="flex justify-between text-xs uppercase font-bold text-slate-600">
                <span>Context Sync</span>
                <span className={aiKeyStatus === 'ready' ? 'text-tertiary' : 'text-slate-400'}>
                  {aiKeyStatus === 'ready' ? 'Real-time' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Strategic Context</h4>
            {(metrics.length > 0 ? [
              { icon: TrendingUp, title: 'Data Connectivity', desc: `Tracking ${getDemoTransactions().length || 0} transactions for real-time insights.`, color: 'text-tertiary', bg: 'bg-tertiary/10' },
              { icon: Users, title: 'AI Status', desc: aiKeyStatus === 'ready' ? 'Strategic Intelligence Core is active.' : 'Connect an AI API key in Settings.', color: 'text-secondary', bg: 'bg-secondary-container' },
              { icon: Wallet, title: 'Backend Health', desc: 'ERP and dashboard syncing real-time data updates.', color: 'text-error', bg: 'bg-error/10' }
            ] : [
              { icon: TrendingUp, title: 'No Data Sources', desc: 'Connect transactions, filings, or cloud spend data.', color: 'text-slate-500', bg: 'bg-slate-800/20' },
              { icon: Users, title: 'Setup Required', desc: 'Link your financial data sources to get started.', color: 'text-slate-500', bg: 'bg-slate-800/20' },
              { icon: Wallet, title: 'AI Optional', desc: 'Add API keys for enhanced strategic recommendations.', color: 'text-slate-500', bg: 'bg-slate-800/20' }
            ]).map((ctx) => (
              <div key={ctx.title} className="flex gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", ctx.bg, ctx.color)}>
                  <ctx.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface mb-0.5">{ctx.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{ctx.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 bg-surface-container-highest/20 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'user',
              content: 'Explain Methodology',
              timestamp: new Date()
            }, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'The **Strategic Intelligence Framework (SIF)** powers FinOS Copilot. It analyzes:\n\n1. **Financial Data**: Transactions, burn rate, runway projections\n2. **Market Context**: Hiring trends, expense patterns, growth efficiency\n3. **Risk Analysis**: Churn rates, cash flow scenarios, stress tests\n\nResponses integrate your actual financial metrics with AI-powered strategic recommendations.',
              timestamp: new Date(),
              isValidated: true
            }])}
            className="text-xs text-slate-500 flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Explain Methodology
          </button>
          <div className="flex gap-2">
            <ThumbsUp
              className="w-4 h-4 text-slate-500 cursor-pointer hover:text-tertiary transition-colors"
              onClick={() => console.log('Feedback: helpful')}
            />
            <ThumbsDown
              className="w-4 h-4 text-slate-500 cursor-pointer hover:text-error transition-colors"
              onClick={() => console.log('Feedback: not helpful')}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
