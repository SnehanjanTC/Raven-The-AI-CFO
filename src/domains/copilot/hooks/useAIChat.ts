import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/shared/types';
import type { Metric } from '@/shared/types';

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hello! I'm your **FinOS Copilot**. I've analyzed your current ledger and market conditions. How can I assist with your financial strategy today?\n\nYou can ask about:\n- **Runway projections** based on current burn\n- **Hiring impact** for new engineering roles\n- **Expense anomalies** in your Q3 cloud spend",
  timestamp: new Date(),
  isValidated: true,
};

export function useAIChat(metrics: Metric[]) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isValidated: true,
      }]);

      const context = metrics.length > 0
        ? `Current Financial Snapshots: ${metrics.map(m => `${m.label}: ${m.value} (${m.change || 'N/A'})`).join(', ')}`
        : undefined;

      const { streamAIResponse } = await import('@/lib/ai');

      await streamAIResponse(
        [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m
          ));
        },
        (err) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId ? {
              ...m,
              content: `**Error:** ${errorMsg}\n\nPlease check your API key in **Settings → Strategic Intelligence Core**.`,
            } : m
          ));
          setIsLoading(false);
        },
        context,
      );

      setIsLoading(false);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId && m.content === ''
          ? { ...m, content: 'No response received. Please check your API key and try again.' }
          : m
      ));
    } catch (error) {
      console.error('Chat Error:', error);
      setIsLoading(false);
    }
  }, [input, isLoading, messages, metrics]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Chat history cleared. How can I help you now?',
      timestamp: new Date(),
      isValidated: true,
    }]);
  }, []);

  return { messages, input, setInput, isLoading, scrollRef, sendMessage, clearChat };
}