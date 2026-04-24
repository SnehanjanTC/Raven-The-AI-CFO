import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  KeyRound,
  Database,
  LogOut,
  Save,
  Trash2,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import {
  isDemoDataLoaded,
  loadDemoData,
  clearDemoData,
  onDemoDataChange,
} from '@/lib/demo-data';

type Tab = 'profile' | 'ai' | 'data';

const ANTHROPIC_KEY_STORAGE = 'raven_anthropic_key';

export function Settings() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="max-w-5xl mx-auto pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your account, AI provider keys, and local data.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={<UserIcon className="h-4 w-4" />} label="Profile & Account" />
          <TabButton active={tab === 'ai'} onClick={() => setTab('ai')} icon={<KeyRound className="h-4 w-4" />} label="AI & API Keys" />
          <TabButton active={tab === 'data'} onClick={() => setTab('data')} icon={<Database className="h-4 w-4" />} label="Data & Preferences" />
        </nav>

        <section className="flex-1 min-w-0">
          {tab === 'profile' && <ProfilePanel user={user} signOut={signOut} />}
          {tab === 'ai' && <AIKeyPanel />}
          {tab === 'data' && <DataPanel />}
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        'transition-colors',
        active
          ? 'bg-white/[0.06] text-slate-100 border border-white/[0.08]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

function ProfilePanel({ user, signOut }: { user: any; signOut: () => Promise<void> }) {
  const initials = (() => {
    const name = user?.full_name || user?.email || 'U';
    const parts = name.split(/[\s@]/);
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  })();

  const providerLabel = user?.provider === 'google' ? 'Google'
    : user?.provider === 'azure' ? 'Microsoft'
    : user?.provider === 'email' ? 'Email & password'
    : '—';

  return (
    <>
      <Card title="Account" description="Your signed-in identity and session details.">
        <div className="flex items-center gap-4 mb-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#00F0A0] to-[#00CC88] flex items-center justify-center text-base font-semibold text-black">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.email || '—'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          <Field label="Email" value={user?.email || '—'} />
          <Field label="Full name" value={user?.full_name || '—'} />
          <Field label="Provider" value={providerLabel} />
          <Field
            label="Session"
            value={
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs',
                'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              )}>
                <ShieldCheck className="h-3 w-3" />
                Authenticated
              </span>
            }
          />
        </div>
      </Card>

      <Card title="Sign out" description="End your current session on this device.">
        <button
          onClick={async () => { await signOut(); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </Card>
    </>
  );
}

function AIKeyPanel() {
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '';
  const hasEnvKey = !!envKey && !envKey.includes('your-') && envKey !== 'sk-ant-...';

  const [key, setKey] = useState(() => localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '');
  const [reveal, setReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(ANTHROPIC_KEY_STORAGE, trimmed);
    else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clear = () => {
    setKey('');
    localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <Card
        title="Anthropic Claude API Key"
        description="Used by the Copilot and AI-powered features. Stored locally in your browser."
      >
        {hasEnvKey && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            A key is already configured via <code className="font-mono">VITE_ANTHROPIC_API_KEY</code>. The env key takes precedence.
          </div>
        )}

        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">API Key</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label={reveal ? 'Hide key' : 'Reveal key'}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={save}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] text-black text-sm font-medium transition"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {key && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 text-sm transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Keys are stored only in this browser's localStorage. Clear on shared machines. Get a key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-[#00F0A0] hover:underline">
            console.anthropic.com
          </a>
          .
        </p>
      </Card>

      <Card title="AI provider" description="Raven currently supports Anthropic Claude. Other providers coming soon.">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Sparkles className="h-4 w-4 text-[#00F0A0]" />
          <div className="flex-1">
            <p className="text-sm text-slate-200">Anthropic Claude</p>
            <p className="text-xs text-slate-500">claude-opus / claude-sonnet</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Active
          </span>
        </div>
      </Card>
    </>
  );
}

function DataPanel() {
  const [demoLoaded, setDemoLoaded] = useState(isDemoDataLoaded());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onDemoDataChange(() => setDemoLoaded(isDemoDataLoaded()));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (demoLoaded) clearDemoData();
      else loadDemoData();
    } finally {
      setBusy(false);
    }
  };

  const clearLocal = () => {
    const confirmed = window.confirm(
      'Clear all locally cached data (demo data, AI key, guest session)? You will be signed out.'
    );
    if (!confirmed) return;
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <Card title="Demo data" description="Populate the app with example metrics, transactions, and team data.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">
              Demo data is currently{' '}
              <span className={demoLoaded ? 'text-[#00F0A0]' : 'text-slate-400'}>
                {demoLoaded ? 'loaded' : 'not loaded'}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {demoLoaded
                ? 'Clear to see the empty state and connect real sources.'
                : 'Load to explore the product without connecting any integrations.'}
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={busy}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition',
              demoLoaded
                ? 'border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-200'
                : 'bg-[#00F0A0] hover:bg-[#00D890] text-black'
            )}
          >
            {demoLoaded ? 'Clear demo data' : 'Load demo data'}
          </button>
        </div>
      </Card>

      <Card title="Danger zone" description="Reset everything stored by Raven in this browser.">
        <button
          onClick={clearLocal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition"
        >
          <Trash2 className="h-4 w-4" />
          Clear all local data
        </button>
      </Card>
    </>
  );
}

export default Settings;
