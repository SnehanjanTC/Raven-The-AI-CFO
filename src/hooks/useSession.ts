/**
 * useSession Hook - Proactive session initialization
 * Fetches opening nudges and suggestions when app loads
 */

import { useState, useCallback, useEffect } from 'react';

export interface Nudge {
  type: 'alert' | 'insight' | 'tip';
  message: string;
  detail?: string;
  actions?: { label: string; action: string }[];
}

export interface Suggestion {
  text: string;
  is_new?: boolean;
}

export interface SessionData {
  greeting: string;
  nudges: Nudge[];
  metrics_snapshot: Record<string, any>;
  suggestions: Suggestion[];
}

interface UseSessionReturn {
  sessionData: SessionData | null;
  isLoading: boolean;
  error: Error | null;
  hasInitialized: boolean;
}

export function useSession(): UseSessionReturn {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/session/start', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Session start failed: ${response.statusText}`);
        }

        const data = await response.json() as SessionData;
        setSessionData(data);
        setHasInitialized(true);
      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Still mark as initialized even on error to avoid infinite loops
        setHasInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  return {
    sessionData,
    isLoading,
    error,
    hasInitialized,
  };
}
