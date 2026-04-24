import { useState, useEffect, useCallback } from 'react';
import { fetchAgents as fetchAgentsQuery, createAgent as createAgentQuery, updateAgentStatus } from '@/shared/services/supabase/queries';
import { subscribeAgents } from '@/shared/services/supabase/subscriptions';
import type { Agent } from '@/shared/types';

export function useAgents(initialAgents: Agent[]) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async (iconMap: Record<string, any>, fallbackIcon: any) => {
    try {
      const data = await fetchAgentsQuery();
      if (!data || data.length === 0) {
        setAgents(initialAgents);
      } else {
        const mapped = data.map((agent: any) => ({
          ...agent,
          lastActive: agent.last_active || agent.lastActive,
          lastActiveType: agent.last_active_type || agent.lastActiveType,
          isPriority: agent.is_priority || agent.isPriority,
          icon: iconMap[agent.icon_name?.toLowerCase()] || fallbackIcon,
        }));
        setAgents(mapped);
      }
    } catch {
      setAgents(initialAgents);
    } finally {
      setLoading(false);
    }
  }, [initialAgents]);

  const toggleStatus = useCallback(async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try {
      await updateAgentStatus(id, newStatus);
    } catch {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: agent.status } : a));
    }
  }, [agents]);

  const addAgent = useCallback(async (newAgent: Record<string, any>, iconMap: Record<string, any>, fallbackIcon: any) => {
    try {
      const data = await createAgentQuery(newAgent);
      if (data) {
        fetchAgents(iconMap, fallbackIcon);
      }
    } catch (err) {
      console.error('Error adding agent:', err);
    }
  }, [fetchAgents]);

  return { agents, setAgents, loading, fetchAgents, toggleStatus, addAgent, subscribeAgents };
}