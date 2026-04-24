import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  startup_stage?: string;
  is_guest?: boolean;
}

interface AuthState {
  session: { user: { email: string; id: string; [key: string]: any } } | null;
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, companyName?: string) => Promise<void>;
  guestLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, onAuthChange }: { children: React.ReactNode; onAuthChange?: (user: User | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(localStorage.getItem('raven_guest_mode') === 'true');

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = api.getToken();
        if (token) {
          // Token exists, verify it by fetching current user
          try {
            const userData = await api.auth.me();
            setUser(userData as User);
            setIsGuest(userData.is_guest ?? false);
            if (userData.is_guest) {
              localStorage.setItem('raven_guest_mode', 'true');
            } else {
              localStorage.removeItem('raven_guest_mode');
            }
            onAuthChange?.(userData as User);
          } catch (error: any) {
            const status = error.response?.status || error.status;
            if (status === 401) {
              // Token is invalid, clear it
              api.clearToken();
              localStorage.removeItem('raven_guest_mode');
              setUser(null);
              setIsGuest(false);
              onAuthChange?.(null);
            } else if (isGuest || localStorage.getItem('raven_guest_mode') === 'true') {
              // Network error or backend unavailable in guest mode — keep guest session alive
              console.warn('Backend unreachable, continuing in guest mode');
              setIsGuest(true);
            } else {
              throw error;
            }
          }
        } else if (isGuest) {
          // No token but guest mode is enabled
          setUser(null);
        } else {
          // No token and not guest mode
          setUser(null);
          setIsGuest(false);
        }
      } catch (error) {
        console.debug('[auth] init failed', error);
        setUser(null);
        setIsGuest(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [onAuthChange]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      api.setToken(response.access_token);

      // Fetch user details after login
      const userData = await api.auth.me();
      setUser(userData as User);
      localStorage.removeItem('raven_guest_mode');
      setIsGuest(false);
      onAuthChange?.(userData as User);
    } catch (error) {
      console.debug('[auth] sign in failed', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName?: string, companyName?: string) => {
    try {
      const response = await api.auth.register({
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      });
      api.setToken(response.access_token);

      // Fetch user details after registration
      const userData = await api.auth.me();
      setUser(userData as User);
      localStorage.removeItem('raven_guest_mode');
      setIsGuest(false);
      onAuthChange?.(userData as User);
    } catch (error) {
      console.debug('[auth] register failed', error);
      throw error;
    }
  };

  const guestLogin = async () => {
    try {
      const response = await api.auth.guest();
      api.setToken(response.access_token);

      // Fetch user details for guest
      const userData = await api.auth.me();
      setUser(userData as User);
      localStorage.setItem('raven_guest_mode', 'true');
      setIsGuest(true);
      onAuthChange?.(userData as User);
    } catch (error) {
      console.debug('[auth] guest login failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.debug('[auth] logout failed', error);
    } finally {
      localStorage.removeItem('raven_guest_mode');
      setUser(null);
      setIsGuest(false);
      onAuthChange?.(null);
      window.location.reload();
    }
  };

  // Create session object for backward compatibility
  const session = user ? { user: { email: user.email, id: user.id, ...user } } : null;

  const value: AuthState = {
    session,
    user,
    isGuest,
    isAuthenticated: !!user || isGuest,
    loading,
    signOut,
    signIn,
    register,
    guestLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}