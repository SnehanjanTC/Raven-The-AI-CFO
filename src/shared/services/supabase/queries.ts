import { getSupabase } from './client';

// ---------- Metrics ----------
export async function fetchMetrics(timeframe: string = '30d') {
  const supabase = getSupabase();
  if (!supabase) return null;

  let query = supabase
    .from('metrics')
    .select('*')
    .order('category', { ascending: true });

  if (timeframe !== 'all') {
    const now = new Date();
    let startDate = new Date();
    if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeframe === '90d') startDate.setDate(now.getDate() - 90);
    else if (timeframe === 'ytd') startDate = new Date(now.getFullYear(), 0, 1);
    query = query.gte('updated_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) { console.debug(`[supabase] metrics unavailable`, error?.message); return null; }
  return data;
}

export async function fetchAllMetrics() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from('metrics').select('*').order('updated_at', { ascending: false });
  return data;
}

// ---------- Agents ----------
export async function fetchAgents() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.debug(`[supabase] agents unavailable`, error?.message); return null; }
  return data;
}

export async function createAgent(agent: Record<string, any>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('agents').insert([agent]).select();
  if (error) throw error;
  return data;
}

export async function updateAgentStatus(id: string, status: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('agents').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---------- Transactions ----------
export async function fetchTransactions() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTransaction(tx: Record<string, any>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase.from('transactions').insert([tx]);
  if (error) throw error;
  return true;
}

// ---------- Reports ----------
export async function fetchReports() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('date', { ascending: false });

  if (error) { console.debug(`[supabase] reports unavailable`, error?.message); return null; }
  return data;
}

export async function createReport(report: Record<string, any>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('reports').insert([report]).select();
  if (error) throw error;
  return data;
}

export async function deleteReport(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('reports').delete().match({ id });
  if (error) throw error;
}

export async function archiveReport(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('reports').update({ status: 'draft' }).eq('id', id);
}

// ---------- Scenarios ----------
export async function fetchScenarios() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase.from('scenarios').select('*').order('last_updated', { ascending: false });
  return data;
}

export async function createScenario(scenario: Record<string, any>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase.from('scenarios').insert([scenario]);
  if (error) console.debug('[supabase] saveScenario failed', error?.message);
  return !error;
}

// ---------- Activity Log ----------
export async function fetchActivityLog(limit = 8) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) { console.debug(`[supabase] activity unavailable`, error?.message); return null; }
  return data;
}

export async function logActivity(agentName: string, action: string, type: string = 'info') {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('activity_log').insert([{
    agent_name: agentName,
    action,
    type,
    timestamp: new Date().toISOString()
  }]);
}

// ---------- Memory ----------
export async function fetchMemoryStats() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact', head: true });

  if (error) { console.debug('[supabase] memory stats unavailable', error?.message); return null; }
  return count;
}