import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'grok';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

export const getAIConfig = (): AIConfig => {
  const provider = (localStorage.getItem('finos_ai_provider') as AIProvider) || 'gemini';
  const apiKey = localStorage.getItem(`finos_${provider}_key`) || import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`] || '';
  return { provider, apiKey };
};

export const setAIProvider = (provider: AIProvider) => {
  localStorage.setItem('finos_ai_provider', provider);
};

export const setAIKey = (provider: AIProvider, key: string) => {
  localStorage.setItem(`finos_${provider}_key`, key);
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Provider display names for UI
export const AI_PROVIDERS = [
  { id: 'gemini' as const, name: 'Google Gemini 2.0 Flash', desc: 'Default high-performance model', model: 'gemini-2.0-flash' },
  { id: 'openai' as const, name: 'OpenAI GPT-4o', desc: 'Industry standard reasoning', model: 'gpt-4o' },
  { id: 'anthropic' as const, name: 'Anthropic Claude Sonnet 4', desc: 'Superior safety and context', model: 'claude-sonnet-4-20250514' },
  { id: 'grok' as const, name: 'xAI Grok-Beta', desc: 'Real-time knowledge integration', model: 'grok-beta' }
];

export const streamAIResponse = async (
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onError: (error: any) => void,
  context?: string
) => {
  const { provider, apiKey } = getAIConfig();

  if (!apiKey) {
    onError(new Error(`API key for ${provider} is missing. Please configure it in Settings → Strategic Intelligence Core.`));
    return;
  }

  if (messages.length === 0) {
    onError(new Error('No messages to send.'));
    return;
  }

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: context
          ? `You are FinOS Copilot, an AI financial advisor. Use this real-time financial context to inform your responses:\n${context}`
          : 'You are FinOS Copilot, an AI financial advisor. Provide clear, actionable financial guidance.'
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.content }]
        }))
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.content);
      let hasContent = false;

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          onChunk(text);
          hasContent = true;
        }
      }

      if (!hasContent) {
        onChunk("I received your message but didn't generate a response. Please try rephrasing your question.");
      }

    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            ...(context ? [{ role: 'system', content: `You are FinOS Copilot, an AI financial advisor.\n\nCurrent Financial Context: ${context}` }] : []),
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          stream: true
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`OpenAI API error (${response.status}): ${response.statusText}${errorBody ? ` — ${errorBody.slice(0, 200)}` : ''}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read OpenAI response stream.');

      const decoder = new TextDecoder();
      let hasContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') break;
          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
              hasContent = true;
            }
          } catch {
            // Ignore parse errors for incomplete SSE chunks
          }
        }
      }

      if (!hasContent) {
        onChunk("I received your message but didn't generate a response. Please try again.");
      }

    } else if (provider === 'anthropic') {
      // NOTE: In production, Anthropic API calls should be proxied through a backend
      // to avoid exposing API keys in the browser.
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: context
            ? `You are FinOS Copilot, an AI financial advisor.\n\nCurrent Financial Context: ${context}`
            : 'You are FinOS Copilot, an AI financial advisor. Provide clear, actionable financial guidance.',
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: true
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Anthropic API error (${response.status}): ${response.statusText}${errorBody ? ` — ${errorBody.slice(0, 200)}` : ''}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read Anthropic response stream.');

      const decoder = new TextDecoder();
      let hasContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              if (data.type === 'content_block_delta' && data.delta?.text) {
                onChunk(data.delta.text);
                hasContent = true;
              } else if (data.type === 'error') {
                throw new Error(`Anthropic stream error: ${data.error?.message || 'Unknown error'}`);
              }
            } catch (e) {
              if (e instanceof Error && e.message.startsWith('Anthropic stream error')) throw e;
              // Ignore JSON parse errors for incomplete SSE chunks
            }
          }
        }
      }

      if (!hasContent) {
        onChunk("I received your message but didn't generate a response. Please try again.");
      }

    } else if (provider === 'grok') {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            ...(context ? [{ role: 'system', content: `You are FinOS Copilot, an AI financial advisor.\n\nCurrent Financial Context: ${context}` }] : []),
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          stream: true
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Grok API error (${response.status}): ${response.statusText}${errorBody ? ` — ${errorBody.slice(0, 200)}` : ''}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read Grok response stream.');

      const decoder = new TextDecoder();
      let hasContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') break;
          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
              hasContent = true;
            }
          } catch {
            // Ignore parse errors for incomplete SSE chunks
          }
        }
      }

      if (!hasContent) {
        onChunk("I received your message but didn't generate a response. Please try again.");
      }

    } else {
      onError(new Error(`Unknown AI provider: "${provider}". Please select a valid provider in Settings.`));
      return;
    }
  } catch (err) {
    onError(err);
  }
};
