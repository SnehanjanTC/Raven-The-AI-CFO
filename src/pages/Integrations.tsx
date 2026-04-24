import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

function ZohoBooksLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Zoho Books">
      <defs>
        <linearGradient id="zb-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8332A" />
          <stop offset="100%" stopColor="#BF1F17" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="8" fill="url(#zb-red)" />
      <path
        d="M16 14h16v3.2l-11.4 13.6H32V34H15.2v-3.2l11.4-13.6H16z"
        fill="#FFFFFF"
      />
      <rect x="14" y="36" width="20" height="2" rx="1" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const DEFAULT_ENDPOINT = 'https://mcp.zoho.com/v1/sse';

type Status = 'unknown' | 'connected' | 'disconnected' | 'error';

export function Integrations() {
  const [status, setStatus] = useState<Status>('unknown');
  const [endpoint, setEndpoint] = useState<string>('');
  const [endpointInput, setEndpointInput] = useState<string>(DEFAULT_ENDPOINT);
  const [revenue, setRevenue] = useState<{ mrr?: number; arr?: number; refreshing?: boolean } | null>(null);
  const [busy, setBusy] = useState<'check' | 'connect' | 'disconnect' | 'revenue' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setBusy('check');
    setError(null);
    try {
      const s = await api.zohomcp.status();
      setStatus(s.connected ? 'connected' : 'disconnected');
      if (s.endpoint) {
        setEndpoint(s.endpoint);
        setEndpointInput(s.endpoint);
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Backend unreachable');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const connect = async () => {
    setBusy('connect');
    setError(null);
    setAuthUrl(null);
    try {
      const r = await api.zohomcp.connect(endpointInput.trim());
      setAuthUrl(r.authorization_url);
    } catch (e: any) {
      setError(e?.message || 'Connection failed');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Zoho MCP? Stored tokens will be revoked.')) return;
    setBusy('disconnect');
    setError(null);
    try {
      await api.zohomcp.disconnect();
      setStatus('disconnected');
      setRevenue(null);
    } catch (e: any) {
      setError(e?.message || 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  };

  const fetchRevenue = async (refresh = false) => {
    setBusy('revenue');
    setError(null);
    try {
      const r: any = await api.zohomcp.revenue({ refresh });
      setRevenue({
        mrr: Number(r?.metrics?.mrr) || 0,
        arr: Number(r?.metrics?.arr) || 0,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not fetch revenue');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Connect Raven to your accounting and revenue data sources.
        </p>
      </header>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-red-500/10">
              <ZohoBooksLogo className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Zoho Books — MCP</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pull invoices, revenue, and GST data via the Zoho MCP server.
              </p>
            </div>
          </div>

          <StatusBadge status={status} />
        </div>

        {/* Endpoint config */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5">MCP Endpoint URL</label>
          <input
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            disabled={status === 'connected'}
            placeholder={DEFAULT_ENDPOINT}
            className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm font-mono',
              'bg-white/[0.03] border-white/[0.08] text-slate-200 placeholder:text-slate-600',
              'focus:outline-none focus:border-[#00F0A0]/40',
              status === 'connected' && 'opacity-60 cursor-not-allowed'
            )}
          />
          {status === 'connected' && endpoint && (
            <p className="text-xs text-slate-500 mt-1">Connected to <code className="font-mono">{endpoint}</code></p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-300 mt-0.5 shrink-0" />
            <div className="text-xs text-red-300">
              {error}
              {status === 'error' && (
                <p className="text-slate-500 mt-1">
                  The backend may not be running. Start it with <code className="font-mono">cd backend && uvicorn app.main:app --reload</code>.
                </p>
              )}
            </div>
          </div>
        )}

        {/* OAuth handoff */}
        {authUrl && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-300 mb-2">Complete OAuth in a new tab to finish connecting:</p>
            <a
              href={authUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs text-amber-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Zoho consent screen
            </a>
            <button
              onClick={checkStatus}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              I've authorized — check status
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {status !== 'connected' ? (
            <button
              onClick={connect}
              disabled={busy === 'connect' || !endpointInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] disabled:bg-white/[0.04] disabled:text-slate-500 text-black text-sm font-medium transition"
            >
              {busy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Connect
            </button>
          ) : (
            <>
              <button
                onClick={() => fetchRevenue(false)}
                disabled={busy === 'revenue'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-sm transition"
              >
                {busy === 'revenue' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync revenue
              </button>
              <button
                onClick={disconnect}
                disabled={busy === 'disconnect'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition"
              >
                {busy === 'disconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Disconnect
              </button>
            </>
          )}

          <button
            onClick={checkStatus}
            disabled={busy === 'check'}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {busy === 'check' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        {/* Revenue snapshot */}
        {revenue && (
          <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">MRR</p>
              <p className="text-xl font-semibold text-[#00F0A0] mt-1 font-mono">
                {revenue.mrr ? `₹${(revenue.mrr).toLocaleString('en-IN')}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">ARR</p>
              <p className="text-xl font-semibold text-[#00F0A0] mt-1 font-mono">
                {revenue.arr ? `₹${(revenue.arr).toLocaleString('en-IN')}` : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Backend route: <code className="font-mono">/api/v1/zohomcp/*</code>. See <code>backend/INTEGRATION_GUIDE.md</code> for the full setup.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = {
    connected: { label: 'Connected', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', Icon: Check },
    disconnected: { label: 'Not connected', cls: 'bg-white/[0.04] text-slate-400 border-white/[0.08]', Icon: X },
    error: { label: 'Backend offline', cls: 'bg-red-500/10 text-red-300 border-red-500/20', Icon: AlertCircle },
    unknown: { label: 'Checking…', cls: 'bg-white/[0.04] text-slate-500 border-white/[0.08]', Icon: Loader2 },
  }[status];
  const { label, cls, Icon } = cfg;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border', cls)}>
      <Icon className={cn('h-3 w-3', status === 'unknown' && 'animate-spin')} />
      {label}
    </span>
  );
}

export default Integrations;
