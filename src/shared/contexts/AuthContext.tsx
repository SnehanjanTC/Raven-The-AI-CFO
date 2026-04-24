import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/shared/services/supabase/client';

export type OAuthProvider = 'google' | 'azure';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  provider?: string;
}

interface AuthState {
  session: { user: { email: string; id: string; [key: string]: any } } | null;
  user: User | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function mapSupabaseUser(u: any | null): User | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email || meta.email || '',
    full_name: meta.full_name || meta.name,
    avatar_url: meta.avatar_url || meta.picture,
    provider: u.app_metadata?.provider,
  };
}

export function AuthProvider({
  children,
  onAuthChange,
}: {
  children: React.ReactNode;
  onAuthChange?: (user: User | null) => void;
}) {
  const supabase = getSupabase();
  const isConfigured = !!supabase;
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthState['session']>(null);
  const [loading, setLoading] = useState(isConfigured);
  const onAuthChangeRef = useRef(onAuthChange);

  useEffect(() => {
    onAuthChangeRef.current = onAuthChange;
  }, [onAuthChange]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = mapSupabaseUser(data.session?.user);
      setUser(u);
      setSession(data.session ? { user: { email: u?.email || '', id: u?.id || '', ...u } } : null);
      setLoading(false);
      onAuthChangeRef.current?.(u);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      const u = mapSupabaseUser(supaSession?.user);
      setUser(u);
      setSession(supaSession ? { user: { email: u?.email || '', id: u?.id || '', ...u } } : null);
      onAuthChangeRef.current?.(u);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (!supabase) {
      throw new Error('Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: fullName ? { full_name: fullName } : undefined },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* noop */ }
    }
    setUser(null);
    setSession(null);
    onAuthChangeRef.current?.(null);
  };

  const value: AuthState = {
    session,
    user,
    isAuthenticated: !!user,
    isConfigured,
    loading,
    signOut,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
