export type AIProvider = 'claude';

interface AIConfig {
  provider: AIProvider;
}

export const getAIConfig = (): AIConfig => {
  // All Claude API calls must go through the backend proxy
  return { provider: 'claude' };
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Provider display name for UI
export const AI_PROVIDERS = [
  { id: 'claude' as const, name: 'Anthropic Claude', desc: 'Advanced reasoning and superior context understanding', model: 'claude-3-5-sonnet-20241022' }
];

/**
 * Stream AI response through the Raven backend API proxy.
 * The backend handles authentication with Claude and manages API keys securely.
 *
 * @deprecated - Use the chat endpoint instead: POST /api/v1/chat
 * All Claude API calls must be proxied through the backend for security.
 */
export const streamAIResponse = async (
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onError: (error: any) => void,
  context?: string
) => {
  if (messages.length === 0) {
    onError(new Error('No messages to send.'));
    return;
  }

  onError(new Error(
    'Direct AI calls are not supported. Please use the Chat endpoint in the app. ' +
    'All Claude API calls must be proxied through the Raven backend for security.'
  ));
};
