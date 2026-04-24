import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchScenarios as fetchScenariosQuery, createScenario as createScenarioQuery } from '@/shared/services/supabase/queries';
import type { Scenario } from '@/shared/types';

export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchScenariosQuery();
        if (data) setScenarios(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (scenario: Omit<Scenario, 'id'>) => {
    try {
      const ok = await createScenarioQuery(scenario as any);
      if (ok) {
        const data = await fetchScenariosQuery();
        if (data) setScenarios(data);
      } else {
        setScenarios(prev => [{ id: Math.random().toString(), ...scenario }, ...prev]);
      }
    } catch (err) {
      console.error('Error saving scenario:', err);
    }
  }, []);

  return { scenarios, loading, save };
}