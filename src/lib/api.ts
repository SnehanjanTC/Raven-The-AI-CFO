/**
 * Comprehensive TypeScript API Client
 * Wraps all FastAPI backend endpoints with proper typing and error handling
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Auth-related types
 */
export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  startup_stage?: string;
  is_guest: boolean;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

/**
 * Transaction-related types
 */
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  vendor?: string;
  gst_rate?: number;
  tds_section?: string;
  status: string;
  [key: string]: any;
}

export interface TransactionCreateRequest {
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  vendor?: string;
  gst_rate?: number;
  tds_section?: string;
  status: string;
  [key: string]: any;
}

export interface TransactionListParams {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

/**
 * Invoice-related types
 */
export interface Invoice {
  id: string;
  status?: string;
  client?: string;
  [key: string]: any;
}

export interface InvoiceListParams {
  status?: string;
  client?: string;
  skip?: number;
  limit?: number;
}

/**
 * Filing-related types
 */
export interface Filing {
  id: string;
  type?: string;
  status?: string;
  [key: string]: any;
}

export interface FilingListParams {
  type?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

/**
 * Integration-related types
 */
export interface Integration {
  id: string;
  provider: string;
  display_name: string;
  category: string;
  credentials: Record<string, string>;
  environment?: string;
  [key: string]: any;
}

export interface IntegrationCreateRequest {
  provider: string;
  display_name: string;
  category: string;
  credentials: Record<string, string>;
  environment?: string;
}

export interface IntegrationTestRequest {
  provider: string;
  credentials: Record<string, string>;
}

/**
 * Report-related types
 */
export interface Report {
  id: string;
  type?: string;
  status?: string;
  [key: string]: any;
}

export interface ReportGenerateRequest {
  name?: string;
  type: string;
  period: string;
  version?: string;
}

export interface ReportListParams {
  type?: string;
  status?: string;
}

/**
 * Dashboard-related types
 */
export interface DashboardSummary {
  [key: string]: any;
}

export interface MRRTrend {
  [key: string]: any;
}

export interface CashFlow {
  [key: string]: any;
}

export interface Expenses {
  [key: string]: any;
}

export interface Anomalies {
  [key: string]: any;
}

/**
 * Compliance-related types
 */
export interface TDSCalculateRequest {
  amount: number;
  section: string;
  pan_available?: boolean;
  is_resident?: boolean;
}

export interface GSTCalculateRequest {
  amount: number;
  gst_rate: number;
  is_igst?: boolean;
  is_composition?: boolean;
}

export interface PTaxCalculateRequest {
  monthly_salary: number;
  state: string;
}

export interface ComplianceHealth {
  [key: string]: any;
}

export interface ComplianceDeadlines {
  [key: string]: any;
}

/**
 * Notification-related types
 */
export interface Notification {
  id: string;
  [key: string]: any;
}

export interface UnreadCount {
  count: number;
}

/**
 * AI-related types
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  messages: ChatMessage[];
  context?: string;
  provider?: string;
}

export interface AIChatResponse {
  [key: string]: any;
}

/**
 * Team-related types
 */
export interface TeamMember {
  id: string;
  [key: string]: any;
}

export interface TeamSummaryPayroll {
  [key: string]: any;
}

/**
 * API Response wrapper for paginated results
 */
export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  skip?: number;
  limit?: number;
}

/**
 * API Error response
 */
export interface APIError {
  detail?: string;
  status?: number;
  [key: string]: any;
}

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

let API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_STORAGE_KEY = 'finos_token';

/**
 * Get current API base URL
 */
export function getAPIBaseURL(): string {
  return API_BASE_URL;
}

/**
 * Set API base URL
 */
export function setAPIBaseURL(url: string): void {
  API_BASE_URL = url;
}

/**
 * Get stored token from localStorage
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Set token in localStorage
 */
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    console.error('Failed to save token to localStorage');
  }
}

/**
 * Clear token from localStorage
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    console.error('Failed to clear token from localStorage');
  }
}

// ============================================================================
// FETCH UTILITIES
// ============================================================================

/**
 * Build query string from object
 */
function buildQueryString(params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return '';

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Make HTTP request with automatic token injection
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, any> } = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}${buildQueryString(params)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Attach JWT token if available
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 Unauthorized.
    //
    // IMPORTANT: do NOT call `window.location.href = '/login'` here. That fires
    // a hard navigation while React is mid-render, which can race with other
    // in-flight effects, blow away component state, and (combined with a route
    // ErrorBoundary that doesn't reset on navigation) brick every other page
    // until a full reload. Instead, clear the token and throw — the
    // AuthProvider will route to /login on next mount, and individual pages
    // can decide how to handle the throw locally.
    if (response.status === 401) {
      const isGuest = localStorage.getItem('finos_guest_mode') === 'true';
      if (!isGuest) {
        clearToken();
      }
      const err = new Error('Unauthorized') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData: APIError = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.detail || `API Error: ${response.status} ${response.statusText}`
      ) as Error & { status?: number; data?: APIError };
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    // Parse and return response
    if (response.status === 204) {
      return undefined as any;
    }

    return await response.json();
  } catch (error) {
    // Re-throw with better error context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`API request failed: ${String(error)}`);
  }
}

// ============================================================================
// API CLIENT NAMESPACES
// ============================================================================

/**
 * Auth API namespace
 */
export const auth = {
  /**
   * Register a new user
   */
  register: async (data: AuthRegisterRequest): Promise<AuthTokenResponse> => {
    const response = await fetchAPI<AuthTokenResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access_token) {
      setToken(response.access_token);
    }
    return response;
  },

  /**
   * Login with email and password
   */
  login: async (data: AuthLoginRequest): Promise<AuthTokenResponse> => {
    const response = await fetchAPI<AuthTokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access_token) {
      setToken(response.access_token);
    }
    return response;
  },

  /**
   * Login as guest
   */
  guest: async (): Promise<AuthTokenResponse> => {
    const response = await fetchAPI<AuthTokenResponse>('/api/v1/auth/guest', {
      method: 'POST',
    });
    if (response.access_token) {
      setToken(response.access_token);
    }
    return response;
  },

  /**
   * Get current user profile
   */
  me: async (): Promise<User> => {
    return fetchAPI<User>('/api/v1/auth/me', {
      method: 'GET',
    });
  },

  /**
   * Logout (client-side only - clears token)
   */
  logout: (): void => {
    clearToken();
  },
};

/**
 * Transactions API namespace
 */
export const transactions = {
  /**
   * List all transactions with optional filters
   */
  list: async (params?: TransactionListParams): Promise<Transaction[]> => {
    return fetchAPI<Transaction[]>('/api/v1/transactions/', {
      method: 'GET',
      params,
    });
  },

  /**
   * Create a new transaction
   */
  create: async (data: TransactionCreateRequest): Promise<Transaction> => {
    return fetchAPI<Transaction>('/api/v1/transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a specific transaction by ID
   */
  get: async (id: string): Promise<Transaction> => {
    return fetchAPI<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update a transaction
   */
  update: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    return fetchAPI<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a transaction
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Export transactions as CSV
   */
  exportCSV: async (): Promise<Blob> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/transactions/export/csv`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken() || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }

    return response.blob();
  },
};

/**
 * Invoices API namespace
 */
export const invoices = {
  /**
   * List all invoices with optional filters
   */
  list: async (params?: InvoiceListParams): Promise<Invoice[]> => {
    return fetchAPI<Invoice[]>('/api/v1/invoices/', {
      method: 'GET',
      params,
    });
  },

  /**
   * Create a new invoice
   */
  create: async (data: Record<string, any>): Promise<Invoice> => {
    return fetchAPI<Invoice>('/api/v1/invoices/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a specific invoice by ID
   */
  get: async (id: string): Promise<Invoice> => {
    return fetchAPI<Invoice>(`/api/v1/invoices/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update an invoice
   */
  update: async (id: string, data: Partial<Invoice>): Promise<Invoice> => {
    return fetchAPI<Invoice>(`/api/v1/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an invoice
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/invoices/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Filings API namespace
 */
export const filings = {
  /**
   * List all filings with optional filters
   */
  list: async (params?: FilingListParams): Promise<Filing[]> => {
    return fetchAPI<Filing[]>('/api/v1/filings/', {
      method: 'GET',
      params,
    });
  },

  /**
   * Create a new filing
   */
  create: async (data: Record<string, any>): Promise<Filing> => {
    return fetchAPI<Filing>('/api/v1/filings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a specific filing by ID
   */
  get: async (id: string): Promise<Filing> => {
    return fetchAPI<Filing>(`/api/v1/filings/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update a filing
   */
  update: async (id: string, data: Partial<Filing>): Promise<Filing> => {
    return fetchAPI<Filing>(`/api/v1/filings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a filing
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/filings/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Integrations API namespace
 */
export const integrations = {
  /**
   * List all integrations
   */
  list: async (): Promise<Integration[]> => {
    return fetchAPI<Integration[]>('/api/v1/integrations/', {
      method: 'GET',
    });
  },

  /**
   * Create a new integration
   */
  create: async (data: IntegrationCreateRequest): Promise<Integration> => {
    return fetchAPI<Integration>('/api/v1/integrations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Test integration credentials
   */
  test: async (data: IntegrationTestRequest): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>('/api/v1/integrations/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an integration
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/integrations/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Sync data from integration
   */
  sync: async (id: string): Promise<{ status: string }> => {
    return fetchAPI<{ status: string }>(`/api/v1/integrations/${id}/sync`, {
      method: 'POST',
    });
  },
};

/**
 * Reports API namespace
 */
export const reports = {
  /**
   * List all reports with optional filters
   */
  list: async (params?: ReportListParams): Promise<Report[]> => {
    return fetchAPI<Report[]>('/api/v1/reports/', {
      method: 'GET',
      params,
    });
  },

  /**
   * Generate a new report
   */
  generate: async (data: ReportGenerateRequest): Promise<Report> => {
    return fetchAPI<Report>('/api/v1/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a specific report by ID
   */
  get: async (id: string): Promise<Report> => {
    return fetchAPI<Report>(`/api/v1/reports/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Delete a report
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/reports/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Export report
   */
  export: async (id: string): Promise<Blob> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reports/${id}/export`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken() || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export report: ${response.statusText}`);
    }

    return response.blob();
  },
};

/**
 * Dashboard API namespace
 */
export const dashboard = {
  /**
   * Get dashboard summary
   */
  summary: async (): Promise<DashboardSummary> => {
    return fetchAPI<DashboardSummary>('/api/v1/dashboard/summary', {
      method: 'GET',
    });
  },

  /**
   * Get MRR trend data
   */
  mrrTrend: async (): Promise<MRRTrend> => {
    return fetchAPI<MRRTrend>('/api/v1/dashboard/mrr-trend', {
      method: 'GET',
    });
  },

  /**
   * Get cash flow data
   */
  cashFlow: async (): Promise<CashFlow> => {
    return fetchAPI<CashFlow>('/api/v1/dashboard/cash-flow', {
      method: 'GET',
    });
  },

  /**
   * Get expenses data
   */
  expenses: async (): Promise<Expenses> => {
    return fetchAPI<Expenses>('/api/v1/dashboard/expenses', {
      method: 'GET',
    });
  },

  /**
   * Get anomalies data
   */
  anomalies: async (): Promise<Anomalies> => {
    return fetchAPI<Anomalies>('/api/v1/dashboard/anomalies', {
      method: 'GET',
    });
  },
};

/**
 * Compliance API namespace
 */
export const compliance = {
  /**
   * Calculate TDS
   */
  calculateTDS: async (data: TDSCalculateRequest): Promise<Record<string, any>> => {
    return fetchAPI<Record<string, any>>('/api/v1/compliance/tds/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Calculate GST
   */
  calculateGST: async (data: GSTCalculateRequest): Promise<Record<string, any>> => {
    return fetchAPI<Record<string, any>>('/api/v1/compliance/gst/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Calculate Professional Tax
   */
  calculatePTax: async (data: PTaxCalculateRequest): Promise<Record<string, any>> => {
    return fetchAPI<Record<string, any>>('/api/v1/compliance/ptax/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get compliance health status
   */
  health: async (): Promise<ComplianceHealth> => {
    return fetchAPI<ComplianceHealth>('/api/v1/compliance/health', {
      method: 'GET',
    });
  },

  /**
   * Get compliance deadlines
   */
  deadlines: async (): Promise<ComplianceDeadlines> => {
    return fetchAPI<ComplianceDeadlines>('/api/v1/compliance/deadlines', {
      method: 'GET',
    });
  },

  /**
   * Log an audit entry
   */
  logAudit: async (entry: Record<string, any>): Promise<void> => {
    await fetchAPI<void>('/api/v1/compliance/audit', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  /**
   * Mark a compliance deadline as complete
   */
  markDeadlineComplete: async (id: string): Promise<void> => {
    await fetchAPI<void>(`/api/v1/compliance/deadlines/${id}/complete`, {
      method: 'POST',
    });
  },
};

/**
 * Zoho MCP API namespace — live revenue/invoice data via Zoho Books MCP
 */
export interface ZohoTopCustomer {
  customer: string;
  revenue: number;
  invoice_count: number;
  via_distributor?: string | null;
}

export interface ZohoRecurringCustomer {
  customer: string;
  cadence: 'monthly' | 'quarterly' | 'annual';
  active_months_last12: number;
  trailing_12mo_revenue: number;
  monthly_avg: number;
}

export interface ZohoRevenueMetrics {
  current_month: string;
  last_full_month: string | null;
  last_full_month_revenue: number;
  trailing_months: string[];
  prev_trailing_months: string[];
  // Headline TTM-based MRR/ARR
  mrr: number;
  arr: number;
  trailing_12mo_total: number;
  prev_12mo_total: number;
  yoy_pct: number | null;
  // Composition
  recurring_mrr: number;
  one_time_mrr: number;
  recurring_pct_of_mrr: number | null;
  arr_recurring: number;
  // 3-month run-rate sub-metric
  avg_monthly_revenue: number;
  avg_monthly_revenue_prev: number;
  arr_run_rate: number;
  revenue_mom_pct: number | null;
  recurring_customers_count: number;
  recurring_customers: ZohoRecurringCustomer[];
  mrr_method: string;
}

export interface ZohoRevenueResponse {
  tool_used: string;
  invoice_count: number;
  total_revenue: number;
  paid_revenue: number;
  outstanding: number;
  by_status: Record<string, number>;
  by_month: Record<string, number>;
  by_month_recurring: Record<string, number>;
  top_customers: ZohoTopCustomer[];
  distributor_remap: Record<string, string>;
  recent_invoices: any[];
  metrics: ZohoRevenueMetrics;
  _cache?: { hit: boolean; age_seconds: number };
}

export const zohomcp = {
  status: async (): Promise<{ connected: boolean; endpoint?: string }> => {
    return fetchAPI('/api/v1/zohomcp/status', { method: 'GET' });
  },
  /**
   * Start the MCP OAuth flow. The backend returns an `authorization_url`
   * that the user must open in their browser to complete consent. Once
   * the redirect lands on /api/v1/zohomcp/oauth/callback the backend
   * persists the token and `status()` will report connected=true.
   */
  connect: async (endpoint_url: string): Promise<{ authorization_url: string; state: string; message: string }> => {
    return fetchAPI('/api/v1/zohomcp/connect', {
      method: 'POST',
      body: JSON.stringify({ endpoint_url, api_key: 'unused' }),
    });
  },
  disconnect: async (): Promise<{ message: string }> => {
    return fetchAPI('/api/v1/zohomcp/disconnect', { method: 'POST' });
  },
  revenue: async (opts?: { refresh?: boolean }): Promise<ZohoRevenueResponse> => {
    const qs = opts?.refresh ? '?refresh=true' : '';
    return fetchAPI<ZohoRevenueResponse>(`/api/v1/zohomcp/revenue${qs}`, { method: 'GET' });
  },
  invoices: async (): Promise<{ tool: string; count: number; data: any[] }> => {
    return fetchAPI('/api/v1/zohomcp/invoices', { method: 'GET' });
  },
  listTools: async (): Promise<any> => {
    return fetchAPI('/api/v1/zohomcp/tools', { method: 'GET' });
  },
  callTool: async (tool_name: string, args: Record<string, any> = {}): Promise<any> => {
    return fetchAPI('/api/v1/zohomcp/tools/call', {
      method: 'POST',
      body: JSON.stringify({ tool_name, arguments: args }),
    });
  },
};

/**
 * Notifications API namespace
 */
export const notifications = {
  /**
   * List all notifications
   */
  list: async (): Promise<Notification[]> => {
    return fetchAPI<Notification[]>('/api/v1/notifications/', {
      method: 'GET',
    });
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    return fetchAPI<Notification>(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    return fetchAPI<void>('/api/v1/notifications/read-all', {
      method: 'PUT',
    });
  },

  /**
   * Get unread notification count
   */
  unreadCount: async (): Promise<UnreadCount> => {
    return fetchAPI<UnreadCount>('/api/v1/notifications/unread-count', {
      method: 'GET',
    });
  },
};

/**
 * AI API namespace
 */
export const ai = {
  /**
   * Send chat message(s) to AI
   */
  chat: async (data: AIChatRequest): Promise<AIChatResponse> => {
    return fetchAPI<AIChatResponse>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Team API namespace
 */
export const team = {
  /**
   * List all team members
   */
  list: async (): Promise<TeamMember[]> => {
    return fetchAPI<TeamMember[]>('/api/v1/team/', {
      method: 'GET',
    });
  },

  /**
   * Create a new team member
   */
  create: async (data: Record<string, any>): Promise<TeamMember> => {
    return fetchAPI<TeamMember>('/api/v1/team/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a specific team member by ID
   */
  get: async (id: string): Promise<TeamMember> => {
    return fetchAPI<TeamMember>(`/api/v1/team/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update a team member
   */
  update: async (id: string, data: Partial<TeamMember>): Promise<TeamMember> => {
    return fetchAPI<TeamMember>(`/api/v1/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a team member
   */
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/team/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get team payroll summary
   */
  payrollSummary: async (): Promise<TeamSummaryPayroll> => {
    return fetchAPI<TeamSummaryPayroll>('/api/v1/team/summary/payroll', {
      method: 'GET',
    });
  },
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Main API client object grouping all namespaces
 */
export const api = {
  auth,
  transactions,
  invoices,
  filings,
  integrations,
  reports,
  dashboard,
  compliance,
  notifications,
  ai,
  team,
  zohomcp,
  // Utilities
  getToken,
  setToken,
  clearToken,
  getAPIBaseURL,
  setAPIBaseURL,
};

export default api;
