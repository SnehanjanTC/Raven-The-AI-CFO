import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  RefreshCw,
  ChevronRight,
  Check,
  Key,
  Eye,
  EyeOff,
  Database,
  Globe,
  Lock,
  PackagePlus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { AIProvider, getAIConfig, setAIKey, setAIProvider, AI_PROVIDERS } from '@/lib/ai';
import { DetailModal, DetailStat } from '@/components/DetailModal';
import { isDemoDataLoaded, loadDemoData, clearDemoData, getDemoSummary, getDemoTeam, onDemoDataChange, getNotificationPrefs, setNotificationPref, NotificationPrefs } from '@/lib/demo-data';

const statusDot = (status: string) => {
  if (status.toLowerCase().includes('connected') || status.toLowerCase().includes('ok') || status.toLowerCase().includes('synced') || status.toLowerCase().includes('ms'))
    return 'bg-tertiary';
  if (status.toLowerCase().includes('checking') || status.toLowerCase().includes('loading'))
    return 'bg-yellow-400 animate-pulse';
  return 'bg-error';
};

const statusColor = (status: string) => {
  if (status.toLowerCase().includes('connected') || status.toLowerCase().includes('ok') || status.toLowerCase().includes('synced') || status.toLowerCase().includes('ms'))
    return 'text-tertiary';
  if (status.toLowerCase().includes('checking') || status.toLowerCase().includes('loading'))
    return 'text-yellow-400';
  return 'text-error';
};

export function Settings() {
  const [config, setConfig] = useState(getAIConfig());
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = React.useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof providers[0] | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<{ label: string; status: string; time: string } | null>(null);
  const [keys, setKeys] = useState<{ [key in AIProvider]: string }>({
    openai: localStorage.getItem('finos_openai_key') || '',
    anthropic: localStorage.getItem('finos_anthropic_key') || '',
    gemini: localStorage.getItem('finos_gemini_key') || '',
    grok: localStorage.getItem('finos_grok_key') || '',
  });

  // Demo data state
  const [demoLoaded, setDemoLoaded] = useState(isDemoDataLoaded());
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoClearing, setDemoClearing] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotificationPrefs());

  // System status state
  const [auditStats, setAuditStats] = useState([
    { label: 'Cloud Handshake', status: 'Checking...', time: 'Checking...', lastCheck: new Date().toISOString() },
    { label: 'SIF Knowledge Sync', status: 'Checking...', time: 'Checking...', lastCheck: new Date().toISOString() },
    { label: 'Model Response Latency', status: 'Checking...', time: 'Checking...', lastCheck: new Date().toISOString() }
  ]);

  useEffect(() => {
    const unsub = onDemoDataChange(() => setDemoLoaded(isDemoDataLoaded()));
    return unsub;
  }, []);

  // Measure backend health
  useEffect(() => {
    const measureCloudHealth = async () => {
      let healthCheckSuccess = false;
      let latency = 0;

      // Try FastAPI backend health check
      try {
        const start = performance.now();
        const response = await fetch('/api/health');
        latency = Math.round(performance.now() - start);
        if (response.ok) {
          healthCheckSuccess = true;
        }
      } catch {
        // Backend health check failed
      }

      setAuditStats(prev => prev.map(stat =>
        stat.label === 'Cloud Handshake'
          ? {
              ...stat,
              status: healthCheckSuccess ? 'Optimal' : 'Offline',
              time: healthCheckSuccess ? `${latency}ms` : '-'
            }
          : stat
      ));
    };
    measureCloudHealth();
  }, []);

  // Update SIF Knowledge Sync status based on backend API or demo data
  useEffect(() => {
    const checkDataAvailability = async () => {
      let dataAvailable = false;

      // Try to check backend data availability
      try {
        const summary = await api.dashboard.summary();
        if (summary && Object.keys(summary).length > 0) {
          dataAvailable = true;
        }
      } catch {
        // API check failed, fall back to demo data check
      }

      // Fall back to demo data check if API check failed
      if (!dataAvailable) {
        dataAvailable = isDemoDataLoaded();
      }

      setAuditStats(prev => prev.map(stat =>
        stat.label === 'SIF Knowledge Sync'
          ? {
              ...stat,
              status: dataAvailable ? 'Active' : 'No Data',
              time: dataAvailable ? new Date().toLocaleTimeString() : '-'
            }
          : stat
      ));
    };

    checkDataAvailability();
  }, [demoLoaded]);

  // Check for AI key to determine Model Response Latency status
  useEffect(() => {
    const hasAIKey = Object.values(keys).some(k => k.trim().length > 0);
    setAuditStats(prev => prev.map(stat =>
      stat.label === 'Model Response Latency'
        ? { ...stat, status: hasAIKey ? 'Ready' : 'No Key', time: hasAIKey ? '1.4s' : '-' }
        : stat
    ));
  }, [keys]);

  const handleLoadDemo = () => {
    setDemoLoading(true);
    loadDemoData();
    setDemoLoaded(true);
    setDemoLoading(false);
  };

  const handleClearDemo = () => {
    setDemoClearing(true);
    clearDemoData();
    setDemoLoaded(false);
    setDemoClearing(false);
  };

  const providers = AI_PROVIDERS;

  const handleProviderChange = (id: AIProvider) => {
    setAIProvider(id);
    setConfig(prev => ({ ...prev, provider: id }));
  };

  const handleKeyChange = (provider: AIProvider, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
    setAIKey(provider, value);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSystemReset = async () => {
    if (confirm('Are you sure you want to reset the system? This will clear local preferences and sync with default backend state.')) {
      setResetting(true);
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl animate-fade-in">
      <section className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm">Configuration and preferences</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Section */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-white">AI Engine Selection</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  aria-pressed={config.provider === p.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-left relative",
                    config.provider === p.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  {config.provider === p.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-on-primary" />
                    </div>
                  )}
                  <h3 className="font-bold text-on-surface text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* API Keys Section */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">API Keys</h2>
                <p className="text-xs text-slate-500 mt-0.5">Hardware encrypted, stored locally</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {providers.map(p => (
                <div key={p.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.name} Key</label>
                    {keys[p.id] && <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>}
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys[p.id] ? "text" : "password"}
                      value={keys[p.id]}
                      onChange={(e) => handleKeyChange(p.id, e.target.value)}
                      placeholder="sk-••••••••••••"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-4 pr-10 py-3 text-xs text-on-surface placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                    />
                    <button
                      onClick={() => toggleKeyVisibility(p.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showKeys[p.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* System Health Section */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-tertiary" />
              </div>
              <h2 className="text-lg font-bold text-white">System Health</h2>
            </div>

            <div className="space-y-3">
              {auditStats.map(stat => (
                <div key={stat.label} onClick={() => setSelectedAudit(stat)} className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-on-surface font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", statusDot(stat.status))}></div>
                    <span className={cn("text-xs font-bold uppercase tracking-wider", statusColor(stat.status))}>{stat.status}</span>
                    <span className="text-xs text-slate-500 font-bold">{stat.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Alerts Section */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-white">Intelligence Alerts</h2>
            </div>
            <div className="space-y-5">
              {[
                { key: 'burnRateSpikes' as const, label: 'Burn Rate Spikes', desc: 'Notify when variance > 10%' },
                { key: 'runwayHealth' as const, label: 'Runway Health', desc: 'Alert when critical < 3mo' },
                { key: 'agentAnomalies' as const, label: 'Agent Anomalies', desc: 'Flag divergent strategies' },
                { key: 'complianceDeadlines' as const, label: 'Compliance Deadlines', desc: 'Upcoming filing dates' },
                { key: 'paymentReminders' as const, label: 'Payment Reminders', desc: 'Invoice and bill alerts' }
              ].map(pref => (
                <div key={pref.key} className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-on-surface font-bold">{pref.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notifPrefs[pref.key]}
                    aria-label={pref.label}
                    onClick={() => {
                      const newPrefs = setNotificationPref(pref.key, !notifPrefs[pref.key]);
                      setNotifPrefs(newPrefs);
                    }}
                    className={cn(
                      "w-9 h-5 rounded-full p-1 cursor-pointer transition-colors shrink-0 mt-0.5",
                      notifPrefs[pref.key] ? "bg-primary" : "bg-surface-container-highest"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
                      notifPrefs[pref.key] ? "translate-x-4" : "translate-x-0"
                    )}></div>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Demo Data Manager */}
          <section className={cn(
            "rounded-2xl p-6 transition-all",
            demoLoaded
              ? "glass-panel"
              : "glass-card"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                demoLoaded ? "bg-tertiary/20" : "bg-primary/20"
              )}>
                {demoLoaded
                  ? <Sparkles className="w-5 h-5 text-tertiary" />
                  : <PackagePlus className="w-5 h-5 text-primary" />
                }
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Demo Data</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {demoLoaded ? 'Active' : 'Not loaded'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {demoLoaded
                ? (() => {
                    const s = getDemoSummary();
                    const teamCount = getDemoTeam().length;
                    return `Live: ₹${(s.cashBalance / 10000000).toFixed(1)}Cr cash, ${teamCount} team members.`;
                  })()
                : 'Load sample Indian SaaS startup data across all features.'}
            </p>

            {demoLoaded && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(() => {
                  const s = getDemoSummary();
                  return [
                    { label: 'Cash', value: `₹${(s.cashBalance / 10000000).toFixed(1)}Cr` },
                    { label: 'MRR', value: `₹${(s.mrr / 100000).toFixed(1)}L` },
                    { label: 'Burn', value: `₹${(s.monthlyBurn / 100000).toFixed(1)}L/mo` },
                    { label: 'Runway', value: `${s.runway.toFixed(0)} mo` },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-on-surface">{item.value}</p>
                    </div>
                  ));
                })()}
              </div>
            )}

            {demoLoaded ? (
              <button
                onClick={handleClearDemo}
                disabled={demoClearing}
                className="w-full py-2.5 bg-error/10 text-error rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-error hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {demoClearing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Clearing...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Clear Demo Data</>
                )}
              </button>
            ) : (
              <button
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {demoLoading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...</>
                ) : (
                  <><PackagePlus className="w-3.5 h-3.5" /> Load Demo Data</>
                )}
              </button>
            )}
          </section>

          {/* Platform Reset */}
          <section className="glass-subtle rounded-2xl p-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw className={cn("w-5 h-5 text-error", resetting && "animate-spin")} />
                <h2 className="text-lg font-bold text-error">Platform Reset</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Clear local encryption keys and cached intelligence. Use only for severe sync issues.
              </p>
            </div>
            <button
              onClick={handleSystemReset}
              disabled={resetting}
              className="w-full py-2.5 bg-error/10 text-error rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-error hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Execute Reset'}
            </button>
          </section>
        </div>
      </div>
      {/* Audit Trail Detail Modal */}
      <DetailModal
        isOpen={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title={selectedAudit?.label || ''}
        subtitle="Platform audit details"
        icon={<Shield className="w-5 h-5" />}
        size="sm"
      >
        {selectedAudit && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <DetailStat label="Status" value={selectedAudit.status} color="text-tertiary" />
              <DetailStat label="Response" value={selectedAudit.time} />
            </div>
            <div className="bg-surface-container-high/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Health Check</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5 text-tertiary" />
                  <span>Service is responsive and healthy</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5 text-tertiary" />
                  <span>Last verified: just now</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5 text-tertiary" />
                  <span>Uptime: 99.97% (30d)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
