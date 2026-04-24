import { useState, useEffect } from 'react';

interface UsageData {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  conversations_count: number;
  usage_percentage: number;
  within_limit: boolean;
  tokens_remaining: number;
  limit_tokens: number;
}

interface UseUsageReturn {
  usage: UsageData | null;
  isOverLimit: boolean;
  percentage: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useUsage - Hook to fetch and track token usage
 *
 * Features:
 * - Fetches usage on mount
 * - Provides refetch method for manual updates
 * - Tracks loading and error states
 * - Calculates reset date (1st of next month)
 *
 * Returns:
 * {
 *   usage: current usage data,
 *   isOverLimit: whether user exceeded monthly limit,
 *   percentage: usage percentage (0-100),
 *   isLoading: whether data is loading,
 *   error: error message if fetch failed,
 *   refetch: function to manually refresh usage data,
 * }
 */
export const useUsage = (): UseUsageReturn => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/usage', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage: ${response.statusText}`);
      }

      const data: UsageData = await response.json();
      setUsage(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchUsage();
  }, []);

  // Calculate reset date (1st of next month)
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);

  return {
    usage,
    isOverLimit: usage ? !usage.within_limit : false,
    percentage: usage?.usage_percentage ?? 0,
    isLoading,
    error,
    refetch: fetchUsage,
  };
};
