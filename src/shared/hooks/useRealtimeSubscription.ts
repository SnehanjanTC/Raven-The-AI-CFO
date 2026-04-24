import { useEffect } from 'react';

/**
 * Generic hook for subscribing to real-time Supabase channels.
 * Takes a subscribe function that returns a cleanup function.
 */
export function useRealtimeSubscription(
  subscribeFn: (onUpdate: () => void) => () => void,
  onUpdate: () => void,
  deps: any[] = []
) {
  useEffect(() => {
    const cleanup = subscribeFn(onUpdate);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}