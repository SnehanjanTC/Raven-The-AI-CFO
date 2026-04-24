import React, { useState, useEffect } from 'react';
import {
  Blocks, CheckCircle2, Plus, ArrowRight, ShieldCheck, RefreshCw, X,
  Database, Globe, CreditCard, Building2, Users, FileText,
  IndianRupee, Landmark, Receipt, Banknote, Wallet, BarChart3,
  AlertTriangle, Zap, Clock, Link2, Key, Eye, EyeOff, ExternalLink,
  Settings, Trash2, TestTube
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import zohobooks, { type ZohoOrganization, type ZohoStatus } from '@/lib/zohobooks';

// ── Types ──────────────────────────────────────────────────────────────────────

type ConnStatus = 'connected' | 'pending' | 'error' | 'disconnected';
type IntStatus = 'connected' | 'available' | 'coming_soon';

interface ConnectionConfig {
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  webhookUrl?: string;
  environment?: 'sandbox' | 'production';
}

interface DataSource {
  id: string;
  name: string;
  category: string;
  type: 'bank' | 'accounting' | 'payments' | 'government';
  status: ConnStatus;
  lastSync?: string;
  records?: number;
  icon: React.ReactNode;
  configFields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder: string;
  required?: boolean;
  options?: string[];
}

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntStatus;
  icon: React.ReactNode;
  popular?: boolean;
  configFields: ConfigField[];
  docsUrl?: string;
}

// ── Config Field Presets ───────────────────────────────────────────────────────

const BANK_FIELDS: ConfigField[] = [
  { key: 'accountId', label: 'Account Number', type: 'text', placeholder: 'XXXX XXXX XXXX 1234', required: true },
  { key: 'ifsc', label: 'IFSC Code', type: 'text', placeholder: 'HDFC0001234', required: true },
  { key: 'apiKey', label: 'Open Banking API Key', type: 'password', placeholder: 'pk_live_...', required: true },
  { key: 'environment', label: 'Environment', type: 'select', placeholder: '', options: ['sandbox', 'production'] },
];

const PAYMENT_FIELDS: ConfigField[] = [
  { key: 'apiKey', label: 'API Key ID', type: 'password', placeholder: 'rzp_live_...', required: true },
  { key: 'apiSecret', label: 'API Key Secret', type: 'password', placeholder: 'Secret key', required: true },
  { key: 'webhookUrl', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
  { key: 'environment', label: 'Environment', type: 'select', placeholder: '', options: ['sandbox', 'production'] },
];

const ACCOUNTING_FIELDS: ConfigField[] = [
  { key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'Token from Settings → API', required: true },
  { key: 'orgId', label: 'Organisation ID', type: 'text', placeholder: 'org_12345', required: true },
  { key: 'environment', label: 'Environment', type: 'select', placeholder: '', options: ['sandbox', 'production'] },
];

const ZOHO_OAUTH_FIELDS: ConfigField[] = [
  { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'From api-console.zoho.com → Self Client', required: true },
  { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Self Client secret', required: true },
  { key: 'grant_token', label: 'Grant Token', type: 'password', placeholder: 'Generate in API Console → Self Client → Generate Code', required: true },
  { key: 'region', label: 'Zoho Region', type: 'select', placeholder: '', options: ['in', 'us', 'eu', 'au', 'jp', 'ca'] },
];

// Zoho Books MCP — much simpler than legacy OAuth: the MCP server hosts its
// own DCR + PKCE OAuth, so all FinOS needs is the per-tenant MCP endpoint URL.
// The backend handles client registration and token exchange.
const ZOHO_MCP_FIELDS: ConfigField[] = [
  {
    key: 'endpoint_url',
    label: 'MCP Endpoint URL',
    type: 'text',
    placeholder: 'https://books-financial-overview-XXX.zohomcp.in/mcp/.../message',
    required: true,
  },
];

const GOV_FIELDS: ConfigField[] = [
  { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: '27AABCU9603R1ZM', required: true },
  { key: 'username', label: 'Portal Username', type: 'text', placeholder: 'Your registered username', required: true },
  { key: 'apiKey', label: 'API Key / EVC', type: 'password', placeholder: 'Obtained from GST Suvidha Provider', required: true },
];

const TAX_FIELDS: ConfigField[] = [
  { key: 'tan', label: 'TAN Number', type: 'text', placeholder: 'MUMB12345A', required: true },
  { key: 'username', label: 'TRACES Username', type: 'text', placeholder: 'Deductor login', required: true },
  { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'From TRACES developer portal' },
];

// ── Data ───────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'finos_integration_configs';

function getSavedConfigs(): Record<string, { config: ConnectionConfig; connectedAt: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveConfig(id: string, config: ConnectionConfig) {
  const all = getSavedConfigs();
  all[id] = { config, connectedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function removeConfig(id: string) {
  const all = getSavedConfigs();
  delete all[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function isConnected(id: string): boolean {
  return !!getSavedConfigs()[id];
}

function getConnectionTime(id: string): string | null {
  const cfg = getSavedConfigs()[id];
  if (!cfg) return null;
  const d = new Date(cfg.connectedAt);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const INITIAL_DATA_SOURCES: DataSource[] = [
  { id: 'ds-hdfc', name: 'HDFC Bank — Current A/C', category: 'Banking', type: 'bank', status: 'disconnected', icon: <Landmark className="w-5 h-5" />, configFields: BANK_FIELDS },
  { id: 'ds-icici', name: 'ICICI Bank — Salary A/C', category: 'Banking', type: 'bank', status: 'disconnected', icon: <Landmark className="w-5 h-5" />, configFields: BANK_FIELDS },
  { id: 'ds-razorpay', name: 'Razorpay', category: 'Payment Gateway', type: 'payments', status: 'disconnected', icon: <CreditCard className="w-5 h-5" />, configFields: PAYMENT_FIELDS },
  { id: 'ds-zoho', name: 'Zoho Books', category: 'Accounting', type: 'accounting', status: 'disconnected', icon: <FileText className="w-5 h-5" />, configFields: ZOHO_OAUTH_FIELDS },
  { id: 'ds-gst', name: 'GST Portal (NIC)', category: 'Government', type: 'government', status: 'disconnected', icon: <Receipt className="w-5 h-5" />, configFields: GOV_FIELDS },
  { id: 'ds-traces', name: 'TRACES — TDS', category: 'Government', type: 'government', status: 'disconnected', icon: <Banknote className="w-5 h-5" />, configFields: TAX_FIELDS },
];

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'int-tally', name: 'Tally Prime', category: 'Accounting', description: 'Sync vouchers, ledgers and trial balance from Tally ERP.', status: 'available', icon: <FileText className="w-6 h-6" />, popular: true, configFields: [{ key: 'apiKey', label: 'Tally Connector Key', type: 'password', placeholder: 'From TallyPrime Settings → API', required: true }, { key: 'host', label: 'Tally Host:Port', type: 'text', placeholder: 'localhost:9000', required: true }], docsUrl: 'https://tallysolutions.com/api' },
  { id: 'int-cashfree', name: 'Cashfree Payouts', category: 'Payments', description: 'Auto-reconcile vendor payouts and employee reimbursements.', status: 'available', icon: <Wallet className="w-6 h-6" />, configFields: PAYMENT_FIELDS, docsUrl: 'https://docs.cashfree.com' },
  { id: 'int-razorpay', name: 'Razorpay', category: 'Payment Gateway', description: 'Pull settlements, refunds, and disputes in real-time.', status: 'available', icon: <CreditCard className="w-6 h-6" />, popular: true, configFields: PAYMENT_FIELDS, docsUrl: 'https://razorpay.com/docs/api' },
  { id: 'int-stripe', name: 'Stripe India', category: 'Payment Gateway', description: 'International payment reconciliation with forex handling.', status: 'available', icon: <Globe className="w-6 h-6" />, configFields: PAYMENT_FIELDS, docsUrl: 'https://stripe.com/docs/api' },
  { id: 'int-zoho', name: 'Zoho Books', category: 'Accounting', description: 'Two-way sync of invoices, expenses, and chart of accounts via OAuth.', status: 'available', icon: <BarChart3 className="w-6 h-6" />, popular: true, configFields: ZOHO_OAUTH_FIELDS, docsUrl: 'https://www.zoho.com/books/api/v3' },
  { id: 'int-zoho-mcp', name: 'Zoho Books (MCP)', category: 'Accounting', description: 'Live revenue, MRR, ARR and AR via the Zoho Books MCP server (OAuth + PKCE). Powers the Dashboard and Home headline metrics.', status: 'available', icon: <Zap className="w-6 h-6" />, popular: true, configFields: ZOHO_MCP_FIELDS, docsUrl: 'https://www.zoho.com/books/api/v3/mcp' },
  { id: 'int-cleartax', name: 'ClearTax', category: 'Tax & Compliance', description: 'Auto-file GST returns and pull ITR computation data.', status: 'available', icon: <Receipt className="w-6 h-6" />, popular: true, configFields: [{ key: 'apiKey', label: 'ClearTax API Key', type: 'password', placeholder: 'ct_api_...', required: true }, { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: '27AABCU9603R1ZM', required: true }] },
  { id: 'int-greythr', name: 'greytHR', category: 'Payroll & HR', description: 'Sync payroll runs, PF/ESI deductions, and Form 16 data.', status: 'available', icon: <Users className="w-6 h-6" />, configFields: [{ key: 'apiKey', label: 'greytHR API Key', type: 'password', placeholder: 'From Admin → API Settings', required: true }, { key: 'subdomain', label: 'Company Subdomain', type: 'text', placeholder: 'acmetech.greythr.com', required: true }] },
  { id: 'int-rpx-payroll', name: 'RazorpayX Payroll', category: 'Payroll & HR', description: 'Employee salary disbursements and TDS auto-computation.', status: 'coming_soon', icon: <IndianRupee className="w-6 h-6" />, configFields: PAYMENT_FIELDS },
  { id: 'int-perfios', name: 'Perfios', category: 'Bank Statement Analysis', description: 'AI-powered bank statement parsing and categorisation.', status: 'coming_soon', icon: <Database className="w-6 h-6" />, configFields: [] },
  { id: 'int-chargebee', name: 'Chargebee', category: 'Subscription Billing', description: 'MRR tracking, churn analytics, and revenue recognition.', status: 'available', icon: <Zap className="w-6 h-6" />, configFields: [{ key: 'apiKey', label: 'Chargebee API Key', type: 'password', placeholder: 'From Settings → API Keys', required: true }, { key: 'site', label: 'Site Name', type: 'text', placeholder: 'acmetech', required: true }], docsUrl: 'https://apidocs.chargebee.com' },
  { id: 'int-mca', name: 'MCA Portal', category: 'Government', description: 'ROC filing status, annual return tracking, and DIN monitoring.', status: 'coming_soon', icon: <Building2 className="w-6 h-6" />, configFields: [] },
  { id: 'int-digio', name: 'Digio / Leegality', category: 'e-Signing', description: 'Aadhaar e-sign for invoices, contracts and board resolutions.', status: 'coming_soon', icon: <ShieldCheck className="w-6 h-6" />, configFields: [] },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  switch (s) {
    case 'connected': return 'text-tertiary';
    case 'pending': return 'text-amber-400';
    case 'error': return 'text-error';
    case 'available': return 'text-primary';
    case 'coming_soon': return 'text-slate-500';
    default: return 'text-slate-600';
  }
};

const statusDot = (s: string) => {
  switch (s) {
    case 'connected': return 'bg-tertiary';
    case 'pending': return 'bg-amber-400';
    case 'error': return 'bg-error';
    case 'available': return 'bg-primary';
    case 'coming_soon': return 'bg-slate-600';
    default: return 'bg-slate-700';
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'connected': return 'Connected';
    case 'pending': return 'Syncing…';
    case 'error': return 'Error';
    case 'available': return 'Available';
    case 'coming_soon': return 'Coming Soon';
    case 'disconnected': return 'Not Connected';
    default: return s;
  }
};

// ── Component ──────────────────────────────────────────────────────────────────

export function Integrations() {
  // Hydrate statuses from backend or localStorage
  const hydrateDS = () => INITIAL_DATA_SOURCES.map(ds => ({
    ...ds,
    status: (isConnected(ds.id) ? 'connected' : ds.status) as ConnStatus,
    lastSync: getConnectionTime(ds.id) || ds.lastSync,
    records: ds.records,
  }));

  const hydrateInt = () => INITIAL_INTEGRATIONS.map(i => ({
    ...i,
    status: (isConnected(i.id) ? 'connected' : i.status) as IntStatus,
  }));

  const [dataSources, setDataSources] = useState(hydrateDS);
  const [integrations, setIntegrations] = useState(hydrateInt);
  const [connectTarget, setConnectTarget] = useState<DataSource | Integration | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'connected' | 'available' | 'coming_soon'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoOrgs, setZohoOrgs] = useState<ZohoOrganization[]>([]);
  const [zohoSyncData, setZohoSyncData] = useState<any>(null);
  const [zohoSyncing, setZohoSyncing] = useState(false);
  const [zohoTab, setZohoTab] = useState<'overview' | 'invoices' | 'bills' | 'contacts' | 'accounts'>('overview');

  // Load integrations from backend on mount
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const connections = await api.integrations.list();
        // Map backend integrations to connected status with real sync counts
        const connectionMap = new Map(connections.map(c => [c.id || c.provider, c]));

        setDataSources(prev => prev.map(ds => {
          const conn = connectionMap.get(ds.id);
          return {
            ...ds,
            status: (conn ? 'connected' : ds.status) as ConnStatus,
            lastSync: conn ? 'Just now' : ds.lastSync,
            records: conn ? (conn.sync_count || 0) : 0,
          };
        }));

        setIntegrations(prev => prev.map(i => ({
          ...i,
          status: (connectionMap.has(i.id) ? 'connected' : i.status) as IntStatus,
        })));
      } catch (err) {
        // Fall back to localStorage if backend fails
        console.warn('Failed to load integrations from backend, using localStorage', err);
      }
    };

    loadIntegrations();

    // Check Zoho Books MCP connection status (independent of legacy Zoho OAuth flow).
    const checkZohoMcp = async () => {
      try {
        const mcpStatus = await api.zohomcp.status();
        if (mcpStatus.connected) {
          setIntegrations(prev => prev.map(i =>
            i.id === 'int-zoho-mcp' ? { ...i, status: 'connected' as IntStatus } : i
          ));
        }
      } catch {
        // MCP not configured — leave tile in `available` state.
      }
    };
    checkZohoMcp();

    // Check Zoho Books connection status and auto-reconnect via stored refresh token
    const checkZoho = async () => {
      try {
        const status = await zohobooks.getStatus();
        if (status.connected) {
          setZohoConnected(true);
          setDataSources(prev => prev.map(d =>
            d.id === 'ds-zoho' ? { ...d, status: 'connected' as ConnStatus, lastSync: 'Just now' } : d
          ));
          setIntegrations(prev => prev.map(i =>
            i.id === 'int-zoho' ? { ...i, status: 'connected' as IntStatus } : i
          ));
          return;
        }

        // Try auto-reconnect via stored refresh token
        const stored = localStorage.getItem('finos_zoho_config');
        if (stored) {
          const cfg = JSON.parse(stored);
          await zohobooks.refreshToken(cfg);
          const orgs = await zohobooks.listOrganizations();
          if (orgs.organizations.length > 0) {
            setZohoOrgs(orgs.organizations);
          }
          setZohoConnected(true);
          setDataSources(prev => prev.map(d =>
            d.id === 'ds-zoho' ? { ...d, status: 'connected' as ConnStatus, lastSync: 'Just now' } : d
          ));
          setIntegrations(prev => prev.map(i =>
            i.id === 'int-zoho' ? { ...i, status: 'connected' as IntStatus } : i
          ));
        }
      } catch (err) {
        console.warn('Zoho auto-reconnect failed:', err);
      }
    };
    checkZoho();
  }, []);

  const filteredIntegrations = filter === 'all'
    ? integrations
    : integrations.filter(i => i.status === filter);

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const sourceCount = dataSources.filter(d => d.status === 'connected').length;
  const totalRecords = dataSources.reduce((sum, d) => sum + (d.records || 0), 0);

  // Open connect modal
  const openConnect = (target: DataSource | Integration) => {
    // Pre-fill saved config if exists
    const saved = getSavedConfigs()[target.id];
    if (saved?.config) {
      const vals: Record<string, string> = {};
      Object.entries(saved.config).forEach(([k, v]) => { if (v) vals[k] = v as string; });
      setFormValues(vals);
    } else {
      setFormValues({});
    }
    setShowPasswords({});
    setTestResult('idle');
    setConnectTarget(target);
  };

  // Test connection
  const handleTest = async () => {
    if (!connectTarget) return;
    setTestResult('testing');

    // Validate required fields
    const fields = connectTarget.configFields || [];
    const missing = fields.filter(f => f.required && !formValues[f.key]?.trim());
    if (missing.length > 0) {
      setTestResult('error');
      return;
    }

    try {
      // Zoho Books MCP: hit the dedicated /zohomcp/status endpoint
      if (connectTarget.id === 'int-zoho-mcp') {
        const status = await api.zohomcp.status();
        setTestResult(status.connected ? 'success' : 'error');
        return;
      }

      // Zoho Books: use dedicated OAuth test
      if (connectTarget.id === 'ds-zoho' || connectTarget.id === 'int-zoho') {
        const status = await zohobooks.getStatus();
        if (status.connected && status.token_valid) {
          setTestResult('success');
        } else {
          // Try connecting with grant token
          await zohobooks.connect({
            client_id: formValues.client_id,
            client_secret: formValues.client_secret,
            grant_token: formValues.grant_token,
            region: formValues.region || 'in',
          });
          setTestResult('success');
        }
        return;
      }

      // Generic: call backend API to test connection
      const result = await api.integrations.test({
        provider: connectTarget.id,
        credentials: formValues,
      });
      setTestResult(result.success ? 'success' : 'error');
    } catch (err) {
      console.error('Connection test failed:', err);
      setTestResult('error');
    }
  };

  // Save connection
  const handleConnect = async () => {
    if (!connectTarget) return;
    const fields = connectTarget.configFields || [];
    const missing = fields.filter(f => f.required && !formValues[f.key]?.trim());
    if (missing.length > 0) {
      showToast('Please fill in all required fields');
      return;
    }

    setConnecting(true);

    try {
      // ── Zoho Books MCP ────────────────────────────────────────────────────
      // The MCP server uses DCR + PKCE OAuth, so the flow is:
      //  1. POST /zohomcp/connect with the per-tenant endpoint URL → backend
      //     registers a client and returns an authorization_url.
      //  2. Pop that URL in a new tab so the user can complete consent.
      //  3. Poll /zohomcp/status until backend reports connected=true (the
      //     OAuth callback persists the token to disk on success).
      if (connectTarget.id === 'int-zoho-mcp') {
        const endpointUrl = formValues.endpoint_url?.trim();
        if (!endpointUrl) {
          showToast('Please paste the MCP endpoint URL');
          setConnecting(false);
          return;
        }

        const { authorization_url } = await api.zohomcp.connect(endpointUrl);
        // Open Zoho consent in a new tab — the backend's /oauth/callback will
        // persist the token; we poll status here while the user authorizes.
        const popup = window.open(authorization_url, '_blank', 'noopener,noreferrer');
        if (!popup) {
          showToast('Pop-up blocked — copy the URL from the console and open manually');
          console.info('[Zoho MCP] Open this URL to authorize:', authorization_url);
        }

        // Poll status for up to 2 minutes (every 2s). The backend stores the
        // token as soon as the redirect lands, so this resolves quickly.
        const start = Date.now();
        const POLL_MS = 2000;
        const TIMEOUT_MS = 120_000;
        let connected = false;
        while (Date.now() - start < TIMEOUT_MS) {
          await new Promise(r => setTimeout(r, POLL_MS));
          try {
            const s = await api.zohomcp.status();
            if (s.connected) { connected = true; break; }
          } catch { /* keep polling */ }
        }

        if (!connected) {
          showToast('Timed out waiting for Zoho consent. Please retry.');
          setConnecting(false);
          return;
        }

        // Mark the tile connected and persist the endpoint locally so we can
        // re-prefill the form on subsequent opens.
        saveConfig('int-zoho-mcp', { apiKey: endpointUrl });
        setIntegrations(prev => prev.map(i =>
          i.id === 'int-zoho-mcp' ? { ...i, status: 'connected' as IntStatus } : i
        ));
        setConnecting(false);
        setConnectTarget(null);
        showToast('Zoho Books MCP connected — live revenue is now flowing');
        return;
      }

      // Zoho Books: use dedicated OAuth connect flow
      if (connectTarget.id === 'ds-zoho' || connectTarget.id === 'int-zoho') {
        const result = await zohobooks.connect({
          client_id: formValues.client_id,
          client_secret: formValues.client_secret,
          grant_token: formValues.grant_token,
          region: formValues.region || 'in',
        });

        // Fetch and auto-select organization
        const orgsResult = await zohobooks.listOrganizations();
        if (orgsResult.organizations.length > 0) {
          setZohoOrgs(orgsResult.organizations);
          if (orgsResult.organizations.length === 1) {
            await zohobooks.selectOrganization(orgsResult.organizations[0].organization_id);
          }
        }

        // Store refresh token locally for reconnection
        if (result.refresh_token) {
          const zohoConfig = {
            client_id: formValues.client_id,
            client_secret: formValues.client_secret,
            refresh_token: result.refresh_token,
            region: formValues.region || 'in',
          };
          localStorage.setItem('finos_zoho_config', JSON.stringify(zohoConfig));
        }

        // Update both ds-zoho and int-zoho
        setDataSources(prev => prev.map(d =>
          d.id === 'ds-zoho' ? { ...d, status: 'connected' as ConnStatus, lastSync: 'Just now', records: 0 } : d
        ));
        setIntegrations(prev => prev.map(i =>
          i.id === 'int-zoho' ? { ...i, status: 'connected' as IntStatus } : i
        ));

        setConnecting(false);
        setConnectTarget(null);
        setZohoConnected(true);
        showToast('Zoho Books connected via OAuth');
        return;
      }

      // Generic: try backend first
      await api.integrations.create({
        provider: connectTarget.id,
        display_name: connectTarget.name,
        category: connectTarget.category,
        credentials: formValues,
      });

      // Update state
      if ('type' in connectTarget) {
        setDataSources(prev => prev.map(d =>
          d.id === connectTarget.id ? { ...d, status: 'connected' as ConnStatus, lastSync: 'Just now', records: 0 } : d
        ));
      } else {
        setIntegrations(prev => prev.map(i =>
          i.id === connectTarget.id ? { ...i, status: 'connected' as IntStatus } : i
        ));
      }

      setConnecting(false);
      setConnectTarget(null);
      showToast(`${connectTarget.name} connected successfully`);
    } catch (err) {
      // Fallback to localStorage
      console.warn('Failed to save to backend, using localStorage', err);

      const config: ConnectionConfig = {
        apiKey: formValues.apiKey,
        apiSecret: formValues.apiSecret,
        accountId: formValues.accountId || formValues.orgId || formValues.gstin || formValues.tan,
      };
      saveConfig(connectTarget.id, config);

      // Update state
      if ('type' in connectTarget) {
        setDataSources(prev => prev.map(d =>
          d.id === connectTarget.id ? { ...d, status: 'connected' as ConnStatus, lastSync: 'Just now', records: 0 } : d
        ));
      } else {
        setIntegrations(prev => prev.map(i =>
          i.id === connectTarget.id ? { ...i, status: 'connected' as IntStatus } : i
        ));
      }

      setConnecting(false);
      setConnectTarget(null);
      showToast(`${connectTarget.name} connected successfully`);
    }
  };

  // Disconnect
  const handleDisconnect = async (id: string) => {
    // Zoho Books MCP has its own disconnect endpoint (revokes OAuth tokens).
    if (id === 'int-zoho-mcp') {
      try {
        await api.zohomcp.disconnect();
      } catch (err) {
        console.warn('Zoho MCP disconnect failed:', err);
      }
      removeConfig('int-zoho-mcp');
      setIntegrations(prev => prev.map(i =>
        i.id === 'int-zoho-mcp' ? { ...i, status: 'available' as IntStatus } : i
      ));
      setDisconnectTarget(null);
      showToast('Zoho Books MCP disconnected');
      return;
    }

    try {
      // Try backend first
      await api.integrations.delete(id);

      setDataSources(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'disconnected' as ConnStatus, lastSync: undefined, records: undefined } : d
      ));
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: (INITIAL_INTEGRATIONS.find(ii => ii.id === id)?.status || 'available') as IntStatus } : i
      ));
      setDisconnectTarget(null);
      showToast('Disconnected successfully');
    } catch (err) {
      // Fallback to localStorage
      console.warn('Failed to delete from backend, using localStorage', err);
      removeConfig(id);

      setDataSources(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'disconnected' as ConnStatus, lastSync: undefined, records: undefined } : d
      ));
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: (INITIAL_INTEGRATIONS.find(ii => ii.id === id)?.status || 'available') as IntStatus } : i
      ));
      setDisconnectTarget(null);
      showToast('Disconnected successfully');
    }
  };

  // Zoho sync handler
  const handleZohoSync = async () => {
    setZohoSyncing(true);
    try {
      const result = await zohobooks.syncAll();
      setZohoSyncData(result.data);
      showToast('Zoho Books sync complete');
    } catch (err) {
      console.error('Zoho sync failed:', err);
      showToast('Zoho sync failed');
    } finally {
      setZohoSyncing(false);
    }
  };

  // Zoho disconnect handler
  const handleZohoDisconnect = async () => {
    try {
      await zohobooks.disconnect();
      localStorage.removeItem('finos_zoho_config');
      setZohoConnected(false);
      setZohoSyncData(null);
      setZohoOrgs([]);
      setDataSources(prev => prev.map(d =>
        d.id === 'ds-zoho' ? { ...d, status: 'disconnected' as ConnStatus, lastSync: undefined, records: undefined } : d
      ));
      setIntegrations(prev => prev.map(i =>
        i.id === 'int-zoho' ? { ...i, status: 'available' as IntStatus } : i
      ));
      setDisconnectTarget(null);
      showToast('Zoho Books disconnected');
    } catch (err) {
      console.error('Zoho disconnect failed:', err);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const currentFields = connectTarget?.configFields || [];

  return (
    <div className="space-y-10 pb-20 max-w-6xl animate-fade-in">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Integrations
        </h1>
        <p className="text-slate-400 text-sm">
          Connect your financial tools
        </p>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { label: 'Data Sources', value: `${sourceCount}/${dataSources.length}`, sub: 'Connected', color: 'text-tertiary' },
          { label: 'Integrations', value: `${connectedCount}/${integrations.length}`, sub: 'Active', color: 'text-primary' },
          { label: 'Records Synced', value: totalRecords.toLocaleString('en-IN'), sub: 'Total', color: 'text-secondary' },
          { label: 'Sync Status', value: sourceCount > 0 ? 'Healthy' : 'No Sources', sub: sourceCount > 0 ? 'All systems' : 'Connect to start', color: sourceCount > 0 ? 'text-tertiary' : 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-2xl p-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-2", s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Zoho Books Dashboard ──────────────────────────────────────────── */}
      {zohoConnected && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Zoho Books — Live Data
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleZohoSync}
                disabled={zohoSyncing}
                className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", zohoSyncing && "animate-spin")} />
                {zohoSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={() => setDisconnectTarget('zoho-disconnect')}
                className="text-[10px] font-bold text-error/60 hover:text-error bg-error/5 hover:bg-error/10 px-3 py-2 rounded-xl transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-container-high/30 rounded-xl p-1 w-fit">
            {(['overview', 'invoices', 'bills', 'contacts', 'accounts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setZohoTab(tab);
                  if (!zohoSyncData && tab !== 'overview') handleZohoSync();
                }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  zohoTab === tab
                    ? "bg-primary text-on-primary shadow"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass-panel rounded-2xl p-6">
            {zohoTab === 'overview' && !zohoSyncData && (
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-4">Click "Sync Now" to pull data from Zoho Books</p>
                <button
                  onClick={handleZohoSync}
                  disabled={zohoSyncing}
                  className="text-xs font-bold text-on-primary bg-primary hover:opacity-90 px-6 py-2.5 rounded-xl transition-all"
                >
                  {zohoSyncing ? 'Syncing...' : 'Pull Data'}
                </button>
              </div>
            )}

            {zohoTab === 'overview' && zohoSyncData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Invoices', count: zohoSyncData.invoices?.total ?? '—', icon: <FileText className="w-4 h-4" /> },
                  { label: 'Bills', count: zohoSyncData.bills?.total ?? '—', icon: <Receipt className="w-4 h-4" /> },
                  { label: 'Contacts', count: zohoSyncData.contacts?.total ?? '—', icon: <Users className="w-4 h-4" /> },
                  { label: 'Accounts', count: zohoSyncData.chart_of_accounts?.total ?? '—', icon: <BarChart3 className="w-4 h-4" /> },
                ].map(item => (
                  <div key={item.label} className="bg-surface-container-high/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      {item.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-on-surface">{item.count}</p>
                  </div>
                ))}
              </div>
            )}

            {zohoTab === 'invoices' && zohoSyncData?.invoices?.recent && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
                  <span>Invoice #</span><span>Customer</span><span>Amount</span><span>Status</span>
                </div>
                {zohoSyncData.invoices.recent.map((inv: any) => (
                  <div key={inv.invoice_id || inv.invoice_number} className="grid grid-cols-4 gap-4 py-2 text-xs text-slate-300 border-b border-white/[0.02]">
                    <span className="font-mono text-primary">{inv.invoice_number || '—'}</span>
                    <span className="truncate">{inv.customer_name || '—'}</span>
                    <span className="font-mono">{inv.currency_symbol || '₹'}{Number(inv.total || 0).toLocaleString('en-IN')}</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      inv.status === 'paid' ? 'text-tertiary' : inv.status === 'overdue' ? 'text-error' : 'text-amber-400'
                    )}>{inv.status || '—'}</span>
                  </div>
                ))}
                {zohoSyncData.invoices.recent.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No invoices found</p>
                )}
              </div>
            )}

            {zohoTab === 'bills' && zohoSyncData?.bills?.recent && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
                  <span>Bill #</span><span>Vendor</span><span>Amount</span><span>Status</span>
                </div>
                {zohoSyncData.bills.recent.map((bill: any) => (
                  <div key={bill.bill_id || bill.bill_number} className="grid grid-cols-4 gap-4 py-2 text-xs text-slate-300 border-b border-white/[0.02]">
                    <span className="font-mono text-primary">{bill.bill_number || '—'}</span>
                    <span className="truncate">{bill.vendor_name || '—'}</span>
                    <span className="font-mono">{bill.currency_symbol || '₹'}{Number(bill.total || 0).toLocaleString('en-IN')}</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      bill.status === 'paid' ? 'text-tertiary' : bill.status === 'overdue' ? 'text-error' : 'text-amber-400'
                    )}>{bill.status || '—'}</span>
                  </div>
                ))}
                {zohoSyncData.bills.recent.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No bills found</p>
                )}
              </div>
            )}

            {zohoTab === 'contacts' && zohoSyncData?.contacts?.recent && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
                  <span>Name</span><span>Type</span><span>Email</span><span>Outstanding</span>
                </div>
                {zohoSyncData.contacts.recent.map((c: any) => (
                  <div key={c.contact_id} className="grid grid-cols-4 gap-4 py-2 text-xs text-slate-300 border-b border-white/[0.02]">
                    <span className="truncate font-medium">{c.contact_name || '—'}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{c.contact_type || '—'}</span>
                    <span className="truncate text-slate-500">{c.email || '—'}</span>
                    <span className="font-mono">{c.currency_symbol || '₹'}{Number(c.outstanding_receivable_amount || c.outstanding_payable_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {zohoSyncData.contacts.recent.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No contacts found</p>
                )}
              </div>
            )}

            {zohoTab === 'accounts' && zohoSyncData?.chart_of_accounts?.accounts && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
                  <span>Account Name</span><span>Type</span><span>Balance</span>
                </div>
                {zohoSyncData.chart_of_accounts.accounts.slice(0, 20).map((a: any) => (
                  <div key={a.account_id} className="grid grid-cols-3 gap-4 py-2 text-xs text-slate-300 border-b border-white/[0.02]">
                    <span className="truncate font-medium">{a.account_name || '—'}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{a.account_type || '—'}</span>
                    <span className="font-mono">{a.currency_symbol || '₹'}{Number(a.balance || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}

            {zohoTab !== 'overview' && !zohoSyncData && (
              <div className="text-center py-8">
                <p className="text-xs text-slate-500">Syncing data...</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Connected Integrations ──────────────────────────────────────────── */}
      {(dataSources.filter(d => d.status === 'connected').length > 0 || integrations.filter(i => i.status === 'connected').length > 0) && (
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Connected</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataSources.filter(d => d.status === 'connected').map(ds => (
                <div key={ds.id} className="glass-panel rounded-2xl p-5 flex flex-col group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-tertiary/20 flex items-center justify-center text-tertiary">
                      {ds.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                        Connected
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1">{ds.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 flex-grow">{ds.category}</p>

                  <div className="space-y-2 pt-4 border-t border-white/5">
                    {ds.lastSync && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>Synced {ds.lastSync}</span>
                      </div>
                    )}
                    {ds.records && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Database className="w-3 h-3" />
                        <span>{ds.records.toLocaleString('en-IN')} records</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openConnect(ds)}
                      className="flex-1 text-[10px] font-bold text-slate-300 bg-white/10 hover:bg-white/20 py-2 rounded-xl transition-all"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => setDisconnectTarget(ds.id)}
                      className="text-[10px] font-bold text-error/60 hover:text-error bg-error/5 hover:bg-error/10 py-2 px-3 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {integrations.filter(i => i.status === 'connected').map(int => (
                <div key={int.id} className="glass-panel rounded-2xl p-5 flex flex-col group">
                  {int.popular && (
                    <div className="absolute top-4 right-4 bg-amber-500/20 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest">Popular</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-tertiary/20 flex items-center justify-center text-tertiary">
                      {int.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                        Connected
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1">{int.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{int.category}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-grow">{int.description}</p>

                  <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                    <button
                      onClick={() => openConnect(int)}
                      className="flex-1 text-[10px] font-bold text-slate-300 bg-white/10 hover:bg-white/20 py-2 rounded-xl transition-all"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => setDisconnectTarget(int.id)}
                      className="text-[10px] font-bold text-error/60 hover:text-error bg-error/5 hover:bg-error/10 py-2 px-3 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Available Integrations ──────────────────────────────────────────── */}
      {integrations.filter(i => i.status === 'available').length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Available to Connect</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.filter(i => i.status === 'available').map(int => (
                <div key={int.id} className="glass-card rounded-2xl p-5 flex flex-col group">
                  {int.popular && (
                    <div className="absolute top-4 right-4 bg-amber-500/20 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest">Popular</span>
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                    {int.icon}
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1">{int.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{int.category}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-grow">{int.description}</p>

                  <button
                    onClick={() => openConnect(int)}
                    className="w-full text-[10px] font-bold text-on-primary bg-primary hover:opacity-90 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-auto"
                  >
                    <Plus className="w-4 h-4" /> Connect
                  </button>
                </div>
              ))}

              {dataSources.filter(d => d.status === 'disconnected').map(ds => (
                <div key={ds.id} className="glass-card rounded-2xl p-5 flex flex-col group">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                    {ds.icon}
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1">{ds.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{ds.category}</p>

                  <button
                    onClick={() => openConnect(ds)}
                    className="w-full text-[10px] font-bold text-on-primary bg-primary hover:opacity-90 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-auto"
                  >
                    <Plus className="w-4 h-4" /> Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Coming Soon ──────────────────────────────────────────────────────── */}
      {integrations.filter(i => i.status === 'coming_soon').length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Coming Soon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.filter(i => i.status === 'coming_soon').map(int => (
                <div key={int.id} className="glass-subtle rounded-2xl p-5 flex flex-col opacity-60">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                    {int.icon}
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1">{int.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{int.category}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-grow">{int.description}</p>

                  <div className="flex items-center gap-1.5 mt-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coming Soon</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Connection / Config Modal ────────────────────────────────────────── */}
      {connectTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl max-w-lg w-full p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  {'icon' in connectTarget && connectTarget.icon}
                </div>
                <div>
                  <h2 className="text-lg font-headline font-bold text-white">
                    {isConnected(connectTarget.id) ? 'Configure' : 'Connect'} {connectTarget.name}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {connectTarget.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setConnectTarget(null); setTestResult('idle'); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {'description' in connectTarget && (
              <p className="text-xs text-slate-400 leading-relaxed mb-6">{connectTarget.description}</p>
            )}

            {/* Config Fields */}
            {currentFields.length > 0 ? (
              <div className="space-y-4 mb-6">
                {currentFields.map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                      {field.label} {field.required && <span className="text-error">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.key] || field.options?.[0] || ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-surface-container-high/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {field.options?.map(opt => (
                          <option key={opt} value={opt} className="bg-surface-container text-on-surface">
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-surface-container-high/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono pr-10"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          >
                            {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-high/30 rounded-xl p-4 border border-white/5 mb-6">
                <p className="text-xs text-slate-400 text-center">This integration is coming soon. Configuration will be available once the connector is released.</p>
              </div>
            )}

            {/* Security Info */}
            <div className="flex items-center gap-2 p-3 bg-tertiary/5 rounded-xl border border-tertiary/10 mb-6">
              <ShieldCheck className="w-4 h-4 text-tertiary shrink-0" />
              <p className="text-[11px] text-tertiary/80 leading-relaxed">
                Credentials are encrypted and stored locally. Keys are never sent to FinOS servers.
              </p>
            </div>

            {/* Test result */}
            {testResult === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-tertiary/10 rounded-xl border border-tertiary/20 mb-4">
                <CheckCircle2 className="w-4 h-4 text-tertiary" />
                <span className="text-xs text-tertiary font-bold">Connection test passed</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-error/10 rounded-xl border border-error/20 mb-4">
                <AlertTriangle className="w-4 h-4 text-error" />
                <span className="text-xs text-error font-bold">Missing required fields or invalid credentials</span>
              </div>
            )}

            {/* Action Buttons */}
            {currentFields.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={testResult === 'testing'}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/5 disabled:opacity-50"
                >
                  {testResult === 'testing' ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</>
                  ) : (
                    <><TestTube className="w-3.5 h-3.5" /> Test Connection</>
                  )}
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {connecting ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  ) : (
                    <><Key className="w-3.5 h-3.5" /> {isConnected(connectTarget.id) ? 'Update' : 'Connect'}</>
                  )}
                </button>
              </div>
            )}

            {/* Docs link */}
            {'docsUrl' in connectTarget && connectTarget.docsUrl && (
              <a
                href={connectTarget.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-primary mt-4 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View API Documentation
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Disconnect Confirm ───────────────────────────────────────────────── */}
      {disconnectTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl max-w-sm w-full p-6 border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Disconnect Integration?</h3>
            <p className="text-xs text-slate-400 mb-6">This will remove stored credentials and stop syncing. You can reconnect anytime.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 bg-white/5 text-on-surface py-2.5 rounded-xl text-xs font-bold border border-white/5 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => disconnectTarget === 'zoho-disconnect' ? handleZohoDisconnect() : handleDisconnect(disconnectTarget)}
                className="flex-1 bg-error text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-primary text-on-primary px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-sm font-bold">{toast}</p>
        </div>
      )}
    </div>
  );
}
