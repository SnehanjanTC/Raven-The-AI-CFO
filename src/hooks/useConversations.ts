/**
 * useConversations Hook - Manage conversation list and switching
 * Handles Supabase persistence, auto-titling, and message loading
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '@/shared/services/supabase/client';
import { useAuth } from '@/shared/contexts';

export interface ConversationWithMessages {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  card_data?: Record<string, any>;
  created_at: string;
}

interface UseConversationsReturn {
  conversations: ConversationWithMessages[];
  isLoading: boolean;
  error: Error | null;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  switchConversation: (id: string) => Promise<Message[]>;
  autoTitleConversation: (conversationId: string, userMessage: string) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = getSupabase();

  const loadConversations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get last message snippet for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('content, role')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = messages?.[0];
          const lastMessage = lastMsg
            ? `${lastMsg.role === 'user' ? 'You: ' : ''}${lastMsg.content.slice(0, 50)}${lastMsg.content.length > 50 ? '...' : ''}`
            : undefined;

          return {
            ...conv,
            last_message: lastMessage,
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load conversations');
      setError(error);
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  const createConversation = useCallback(
    async (title?: string): Promise<string | null> => {
      if (!user) return null;

      try {
        const { data, error: insertError } = await supabase
          .from('conversations')
          .insert([
            {
              user_id: user.id,
              title: title || null,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        if (data) {
          // Refresh list
          await loadConversations();
          return data.id;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create conversation');
        setError(error);
        console.error('Error creating conversation:', error);
      }
      return null;
    },
    [user, supabase, loadConversations]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Refresh list
        setConversations((prev) => prev.filter((conv) => conv.id !== id));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete conversation');
        setError(error);
        console.error('Error deleting conversation:', error);
      }
    },
    [user, supabase]
  );

  const loadMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        return (data || []) as Message[];
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load messages');
        setError(error);
        console.error('Error loading messages:', error);
        return [];
      }
    },
    [supabase]
  );

  const switchConversation = useCallback(
    async (id: string): Promise<Message[]> => {
      return await loadMessages(id);
    },
    [loadMessages]
  );

  const autoTitleConversation = useCallback(
    async (conversationId: string, userMessage: string) => {
      if (!user) return;

      try {
        // Check if conversation already has a title
        const { data: conv } = await supabase
          .from('conversations')
          .select('title')
          .eq('id', conversationId)
          .single();

        // Only set title if it's not already set
        if (conv && !conv.title) {
          const title = userMessage.slice(0, 50);
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ title })
            .eq('id', conversationId)
            .eq('user_id', user.id);

          if (updateError) throw updateError;

          // Update local state
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId ? { ...conv, title } : conv
            )
          );
        }
      } catch (err) {
        console.error('Error auto-titling conversation:', err);
      }
    },
    [user, supabase]
  );

  // Auto-load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    createConversation,
    deleteConversation,
    loadMessages,
    switchConversation,
    autoTitleConversation,
  };
}
