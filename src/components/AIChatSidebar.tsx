import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ArrowUp, Bot, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  /** Current route path — drives context-aware suggestions */
  currentPage?: string;
}

const WELCOME_MESSAGE = "Hey! I'm your FinOS AI assistant. Ask me about your finances, compliance, or anything else.";

const SUGGESTION_CHIPS = [
  "What's my burn rate?",
  'Upcoming compliance deadlines',
  'Summarize this month',
  'Help me with GST filing',
];

/** Page-aware suggestion chips */
function getPageSuggestions(page: string): { chips: string[]; welcome: string } {
  switch (page) {
    case '/dashboard':
      return {
        welcome: "I'm tuned into your Dashboard. Ask about metrics, burn rate, runway, or revenue trends.",
        chips: ["Explain my burn rate", "How's my runway?", "Revenue vs forecast", "What changed this month?"],
      };
    case '/reports':
      return {
        welcome: "I'm focused on your Reports. Ask about Schedule III compliance, P&L analysis, or exports.",
        chips: ["Is my P&L compliant?", "EBITDA breakdown", "Compare with last period", "Best export format?"],
      };
    case '/ledger':
      return {
        welcome: "I'm reviewing your Ledger. Ask about transactions, reconciliation, or expense classification.",
        chips: ["Any anomalies?", "Help classify expenses", "TDS on vendor payments", "GST input credit check"],
      };
    case '/agents':
      return {
        welcome: "I'm in your Agents hub. Ask about compliance, calculations, or automation workflows.",
        chips: ["What do I owe?", "Am I compliant?", "Calculate TDS on ₹5L", "Next 5 deadlines"],
      };
    case '/scenarios':
      return {
        welcome: "I'm in Scenarios mode. Ask me to model financial what-ifs and projections.",
        chips: ["What if revenue doubles?", "Hiring 5 engineers impact?", "Break-even point?", "Extend runway options"],
      };
    case '/memory':
      return {
        welcome: "I'm viewing your Memory store. Ask about your data, completeness, or historical trends.",
        chips: ["What data do you have?", "Any data gaps?", "Key financial trends", "Update my profile"],
      };
    case '/integrations':
      return {
        welcome: "I'm in Integrations. Ask about connecting your tools, banks, or accounting software.",
        chips: ["What should I connect?", "Bank sync setup", "Tally/Zoho sync", "Payroll integration"],
      };
    case '/settings':
      return {
        welcome: "I'm in Settings. Ask about AI providers, company config, or permissions.",
        chips: ["Setup AI provider", "Company settings help", "User permissions", "Data & privacy"],
      };
    default:
      return {
        welcome: "Hey! I'm your FinOS AI assistant. Ask me about your finances, compliance, or anything else.",
        chips: SUGGESTION_CHIPS,
      };
  }
}

const MOCK_AI_RESPONSES = [
  "Based on your recent transactions, your monthly burn rate is approximately $8,500. This includes fixed overhead costs, team salaries, and operational expenses. Would you like me to break this down further by category?",
  "You have 3 upcoming compliance deadlines in the next 30 days: GST filing (April 10), Income Tax advance payment (April 15), and annual audit submission (April 30). I can provide more details on any of these if needed.",
  "Your total spending this month is $28,450, up 12% from last month. Key increases are in cloud infrastructure (Stripe, AWS) and marketing spend. Revenue is tracking 8% ahead of forecast. Overall, a solid month financially.",
  "I can help you with GST filing! First, let me ask: are you a monthly or quarterly filer? Once I know that, I can walk you through the process, including collecting invoices, calculating input tax credits, and preparing your return.",
  "Your cash position looks healthy with $156,000 in operating accounts. Based on current burn rate, you have approximately 18 months of runway. Consider reviewing your cost structure if this timeline feels tight.",
  "I recommend focusing on these three areas: 1) Optimize your cloud infrastructure costs (potential 15-20% savings), 2) Review vendor contracts for discounts, 3) Implement stricter expense approval workflows.",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-3 px-4">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <div
            key={dot}
            className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
            style={{ animationDelay: `${dot * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAI = message.role === 'ai';
  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'flex gap-2 mb-4 animate-fadeIn',
        isAI ? 'justify-start' : 'justify-end'
      )}
    >
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#e5a764] to-[#c4bdb4] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={cn('flex flex-col max-w-xs gap-1', isAI ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isAI
              ? 'bg-white/[0.03] border border-white/[0.08] relative overflow-hidden group'
              : 'bg-[#e5a764]/10 border border-[#e5a764]/20'
          )}
        >
          {isAI && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#e5a764] to-[#c4bdb4] group-hover:opacity-100 opacity-50 transition-opacity"
              aria-hidden
            />
          )}
          <div className={isAI ? 'pl-2' : ''}>{message.content}</div>
        </div>
        <span className="text-xs text-white/40">{timeString}</span>
      </div>

      {!isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-white/70" />
        </div>
      )}
    </div>
  );
}

function SuggestionChips({
  onChipClick,
  isVisible,
  chips,
}: {
  onChipClick: (text: string) => void;
  isVisible: boolean;
  chips: string[];
}) {
  if (!isVisible) return null;

  return (
    <div className="px-4 py-4 space-y-2">
      <p className="text-xs text-white/50 px-1 mb-3">Quick prompts:</p>
      <div className="grid grid-cols-2 gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onChipClick(chip)}
            className="text-xs px-3 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.2] transition-all duration-200 text-left line-clamp-2"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function InputArea({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 104); // max 4 lines
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/[0.08] bg-gradient-to-t from-[#1c1c1a]/50 to-transparent p-4">
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.08] resize-none transition-all duration-200"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
            inputValue.trim()
              ? 'bg-[#e5a764] hover:bg-[#d99850] text-white shadow-lg hover:shadow-xl'
              : 'bg-white/[0.05] text-white/40 cursor-not-allowed'
          )}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-white/30 mt-2 px-1">
        Shift + Enter for new line
      </p>
    </div>
  );
}

export function AIChatSidebar({
  isOpen,
  onClose,
  initialMessage,
  currentPage = '/',
}: AIChatSidebarProps) {
  const pageSuggestions = getPageSuggestions(currentPage);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content: pageSuggestions.welcome,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Reset welcome message & suggestions when page changes
  useEffect(() => {
    const ps = getPageSuggestions(currentPage);
    // Only reset if there's just the welcome message (no conversation yet)
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === '0') {
        return [{ id: '0', role: 'ai' as const, content: ps.welcome, timestamp: new Date() }];
      }
      return prev;
    });
  }, [currentPage]);

  useEffect(() => {
    if (initialMessage && isOpen) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, isOpen]);

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI thinking
    setIsTyping(true);
    const typingTimeout = setTimeout(() => {
      setIsTyping(false);
      // Add mock AI response
      const randomResponse =
        MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: randomResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1500);

    return () => clearTimeout(typingTimeout);
  };

  const showSuggestions = messages.length === 1; // Only show when there's just the welcome message

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm lg:hidden z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Chat Sidebar Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full lg:w-96 bg-[#111110]/95 backdrop-blur-2xl border-l border-white/[0.04] z-50 flex flex-col transition-transform duration-300 ease-out shadow-2xl',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500/20 animate-ping" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-transparent bg-gradient-to-r from-[#e5a764] to-[#c4bdb4] bg-clip-text" />
              <h2 className="text-sm font-semibold bg-gradient-to-r from-[#e5a764] to-[#c4bdb4] bg-clip-text text-transparent">
                FinOS AI
              </h2>
            </div>
            <span className="text-xs text-white/50">Online</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors duration-200"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-white/70 hover:text-white" />
          </button>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-white/[0.1] scrollbar-track-transparent"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && <TypingIndicator />}

          <SuggestionChips
            onChipClick={handleSendMessage}
            isVisible={showSuggestions}
            chips={pageSuggestions.chips}
          />

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <InputArea onSendMessage={handleSendMessage} />
      </div>
    </>
  );
}
