/**
 * useChat Hook - Core chat state management
 * Manages messages, streaming, and Supabase persistence
 */

import { useState, useCallback, useRef } from 'react';
import { streamChat } from '@/services/claude';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  card_data?: {
    type: string;
    [key: string]: any;
  };
}

export interface SuggestionChip {
  text: string;
  is_new?: boolean;
}

interface UseChatOptions {
  onError?: (error: Error) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: Error | null;
  conversationId: string | null;
  suggestions: string[];
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: () => void;
  clearError: () => void;
  trackFeature: (feature: string) => void;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateConversationTitle = (userMessage: string): string => {
    const title = userMessage.slice(0, 50);
    return title.length < userMessage.length ? title + '...' : title;
  };

  const persistMessageToBackend = useCallback(
    async (role: 'user' | 'assistant', content: string, convId: string | null) => {
      // Note: Message persistence could be added via a backend endpoint.
      // For now, messages are kept in client state.
      // This is a placeholder for future persistence implementation.
      if (!convId) return;
      // Future implementation:
      // POST /api/v1/messages with { conversation_id, role, content }
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);
      setIsStreaming(true);
      setSuggestions([]);

      // Generate conversation ID on first message if needed
      let currentConvId = conversationId;
      if (!currentConvId) {
        // Create a simple client-side conversation ID
        const newConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        setConversationId(newConvId);
        currentConvId = newConvId;
      }

      // Add user message to UI
      const userMessage: ChatMessage = {
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Persist user message (placeholder for future backend integration)
      if (currentConvId) {
        await persistMessageToBackend('user', content, currentConvId);
      }

      // Prepare messages for API
      const apiMessages = [
        ...messages,
        userMessage,
      ].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Stream response from Claude
      let assistantContent = '';
      let currentCardData: any = null;

      await streamChat(
        apiMessages,
        {
          onTextDelta: (text) => {
            assistantContent += text;
            // Update the assistant message being built
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: assistantContent },
                ];
              }
              return prev;
            });
          },

          onCard: (cardType, data) => {
            currentCardData = { type: cardType, ...data };
            // Add or update card in the assistant message
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, card_data: currentCardData },
                ];
              }
              return prev;
            });
          },

          onSuggestions: (chips) => {
            setSuggestions(chips);
          },

          onDone: () => {
            setIsStreaming(false);
            // Persist assistant message (placeholder for future backend integration)
            if (currentConvId && assistantContent) {
              persistMessageToBackend('assistant', assistantContent, currentConvId);
            }
          },

          onError: (err) => {
            setIsStreaming(false);
            setError(err);
            options?.onError?.(err);
          },
        },
        currentConvId || undefined,
        abortControllerRef.current.signal
      );
    },
    [messages, conversationId, persistMessageToBackend, options]
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setSuggestions([]);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const trackFeature = useCallback((feature: string) => {
    // Track feature usage in backend
    fetch('/api/v1/chat/track-feature', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feature }),
    }).catch(err => console.error('Error tracking feature:', err));
  }, []);

  return {
    messages,
    isStreaming,
    error,
    conversationId,
    suggestions,
    sendMessage,
    startNewConversation,
    clearError,
    trackFeature,
  };
}
