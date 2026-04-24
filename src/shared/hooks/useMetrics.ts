import { useState, useEffect, useCallback } from 'react';
import { fetchMetrics, fetchAllMetrics } from '@/shared/services/supabase/queries';
import type { Metric } from '@/shared/types';

export function useMetrics(initialMetrics: Metric[], timeframe: string = '30d') {
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMetrics(timeframe);
        if (data && data.length > 0) {
          const latestMetrics: Metric[] = [];
          const labelsSeen = new Set();
          data.forEach((m: any) => {
            if (!labelsSeen.has(m.label)) {
              latestMetrics.push(m);
              labelsSeen.add(m.label);
            }
          });
          setMetrics(latestMetrics);
        }
      } catch (err) {
        console.error('Unexpected error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [timeframe]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllMetrics();
      if (data) setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMetric = useCallback((label: string): Metric => {
    const found = metrics.find(m => m.label === label) || initialMetrics.find(m => m.label === label);
    return found ?? { label, value: 'N/A' };
  }, [metrics, initialMetrics]);

  return { metrics, loading, getMetric, refetch };
}