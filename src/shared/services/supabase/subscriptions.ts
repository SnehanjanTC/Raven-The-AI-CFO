import { getSupabase } from './client';

type CleanupFn = () => void;

/** Subscribe to real-time dashboard updates (metrics + transactions) */
export function subscribeDashboard(onUpdate: () => void): CleanupFn {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('dashboard_updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'metrics' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, onUpdate)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Subscribe to real-time agent status updates */
export function subscribeAgents(onUpdate: () => void): CleanupFn {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('agents_live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, onUpdate)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Subscribe to real-time ledger changes */
export function subscribeLedger(onUpdate: () => void): CleanupFn {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('ledger_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, onUpdate)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Subscribe to real-time activity log updates (Home page) */
export function subscribeActivity(onUpdate: () => void): CleanupFn {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('home_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, onUpdate)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Subscribe to global transaction alerts (App-level) */
export function subscribeGlobalAlerts(
  onTransaction: (payload: any) => void
): CleanupFn {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('global_alerts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
      onTransaction(payload.new);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
