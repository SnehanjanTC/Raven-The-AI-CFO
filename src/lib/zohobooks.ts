/**
 * Zoho Books API client
 * Talks to our backend proxy at /api/v1/zohobooks/*
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'finos_token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}/api/v1/zohobooks${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers as Record<string, string>) },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Zoho API error: ${resp.status}`);
  }
  return resp.json();
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ZohoOrganization {
  organization_id: string;
  name: string;
  contact_name: string;
  email: string;
  country: string;
  currency_code: string;
}

export interface ZohoConnectResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  api_domain?: string;
}

export interface ZohoStatus {
  connected: boolean;
  token_valid?: boolean;
  organization_id?: string;
  region?: string;
  message?: string;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function connect(params: {
  client_id: string;
  client_secret: string;
  grant_token: string;
  region?: string;
}): Promise<ZohoConnectResult> {
  return request('/connect', {
    method: 'POST',
    body: JSON.stringify({ region: 'in', ...params }),
  });
}

export async function refreshToken(params: {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  region?: string;
}): Promise<ZohoConnectResult> {
  return request('/refresh', {
    method: 'POST',
    body: JSON.stringify({ region: 'in', ...params }),
  });
}

export async function getStatus(): Promise<ZohoStatus> {
  return request('/status');
}

export async function disconnect(): Promise<void> {
  await request('/disconnect', { method: 'POST' });
}

// ── Organizations ───────────────────────────────────────────────────────────

export async function listOrganizations(): Promise<{ organizations: ZohoOrganization[] }> {
  return request('/organizations');
}

export async function selectOrganization(orgId: string): Promise<void> {
  await request(`/organizations/${orgId}/select`, { method: 'POST' });
}

// ── Data Endpoints ──────────────────────────────────────────────────────────

export async function listInvoices(page = 1, status?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  return request(`/invoices?${params}`);
}

export async function getInvoice(id: string) {
  return request(`/invoices/${id}`);
}

export async function listBills(page = 1, status?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  return request(`/bills?${params}`);
}

export async function getBill(id: string) {
  return request(`/bills/${id}`);
}

export async function listContacts(page = 1, contactType?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (contactType) params.set('contact_type', contactType);
  return request(`/contacts?${params}`);
}

export async function getContact(id: string) {
  return request(`/contacts/${id}`);
}

export async function listChartOfAccounts(accountType?: string) {
  const params = new URLSearchParams();
  if (accountType) params.set('account_type', accountType);
  const qs = params.toString();
  return request(`/chartofaccounts${qs ? `?${qs}` : ''}`);
}

export async function getAccountTransactions(accountId: string, page = 1) {
  return request(`/chartofaccounts/${accountId}/transactions?page=${page}`);
}

export async function listBankTransactions(page = 1) {
  return request(`/banktransactions?page=${page}`);
}

export async function getBankTransaction(id: string) {
  return request(`/banktransactions/${id}`);
}

export async function listJournals(page = 1) {
  return request(`/journals?page=${page}`);
}

export async function getJournal(id: string) {
  return request(`/journals/${id}`);
}

export async function syncAll(): Promise<{ message: string; data: any }> {
  return request('/sync', { method: 'POST' });
}

// ── Default export ──────────────────────────────────────────────────────────

const zohobooks = {
  connect,
  refreshToken,
  getStatus,
  disconnect,
  listOrganizations,
  selectOrganization,
  listInvoices,
  getInvoice,
  listBills,
  getBill,
  listContacts,
  getContact,
  listChartOfAccounts,
  getAccountTransactions,
  listBankTransactions,
  getBankTransaction,
  listJournals,
  getJournal,
  syncAll,
};

export default zohobooks;
