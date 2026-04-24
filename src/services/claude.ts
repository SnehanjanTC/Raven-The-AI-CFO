/**
 * Claude API streaming client
 * Handles SSE streaming from the backend chat endpoint
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onTextDelta?: (text: string) => void;
  onCard?: (cardType: string, data: any) => void;
  onSuggestions?: (chips: string[]) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  conversationId?: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl || window.location.origin;
  const endpoint = `${baseUrl}/api/v1/chat`;

  let retries = 0;
  const maxRetries = 3;
  const baseDelay = 1000;

  while (retries < maxRetries) {
    try {
      const requestBody = {
        messages,
        conversation_id: conversationId,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const eventData = line.slice(5).trim();
            if (!eventData) continue;

            try {
              const event = JSON.parse(eventData);

              if (event.type === 'text_delta' && event.content) {
                callbacks.onTextDelta?.(event.content);
              } else if (event.type === 'card') {
                callbacks.onCard?.(event.card_type, event.data);
              } else if (event.type === 'suggestions' && event.chips) {
                callbacks.onSuggestions?.(event.chips);
              } else if (event.type === 'done') {
                callbacks.onDone?.();
                return; // Success
              } else if (event.type === 'error') {
                throw new Error(event.message || 'Unknown streaming error');
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                // Ignore incomplete JSON
                continue;
              }
              throw parseError;
            }
          }
        }
      }

      // If we get here without hitting "done", connection closed unexpectedly
      if (retries < maxRetries - 1) {
        retries++;
        const delay = baseDelay * Math.pow(2, retries - 1); // Exponential backoff
        await sleep(delay);
        continue;
      } else {
        throw new Error('Connection closed unexpectedly');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User aborted, don't retry
        callbacks.onError?.(error);
        return;
      }

      if (retries < maxRetries - 1) {
        retries++;
        const delay = baseDelay * Math.pow(2, retries - 1);
        await sleep(delay);
      } else {
        const finalError = error instanceof Error
          ? error
          : new Error('Unknown streaming error');
        callbacks.onError?.(finalError);
        return;
      }
    }
  }
}
