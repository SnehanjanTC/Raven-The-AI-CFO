import React, { useRef } from 'react';
import { ChatView } from '@/components/chat';

/**
 * Chat Page - Main AI CFO chat interface
 *
 * Renders chat view inside the shared ChatLayout shell.
 * Conversation management is handled by the parent ChatLayout.
 */
export function Chat() {
  const chatViewRef = useRef<{ sendImportMessage: (count: number) => void }>(null);

  return <ChatView ref={chatViewRef} />;
}

export default Chat;
