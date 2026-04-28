/**
 * @file Company Profile API Client
 * @description Frontend API client for company profile CRUD operations
 */

import { CompanyProfile } from '@/types/company-profile';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'raven_token';

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

export const companyProfileAPI = {
  /** Get current user's company profile */
  get: () => fetchWithAuth<CompanyProfile>('/api/v1/company-profile/'),

  /** Update (upsert) the company profile */
  update: (data: Partial<CompanyProfile>) =>
    fetchWithAuth<CompanyProfile>('/api/v1/company-profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get profile completeness score */
  completeness: () =>
    fetchWithAuth<{ completeness: number; missing_fields: string[] }>(
      '/api/v1/company-profile/completeness'
    ),
};
