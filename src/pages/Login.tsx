import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, RefreshCw, Zap, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.67-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { signInWithOAuth, signInWithPassword, signUpWithPassword, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState<null | 'google' | 'azure' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showEmail, setShowEmail] = useState(false);

  const handleOAuth = async (provider: 'google' | 'azure') => {
    setLoading(provider);
    setError(null);
    try {
      await signInWithOAuth(provider);
      // Redirect happens via Supabase; no further action needed.
    } catch (err: any) {
      setError(err?.message || `Could not sign in with ${provider === 'azure' ? 'Microsoft' : 'Google'}.`);
      setLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setError(null);
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password, fullName || undefined);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Gradient Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-[#00F0A0]/15 to-[#9CA3AF]/8 rounded-full blur-3xl animate-float-slow animate-glow-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-br from-[#9CA3AF]/12 to-[#00F0A0]/8 rounded-full blur-3xl animate-float-slower animate-glow-pulse pointer-events-none" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#00F0A0]/8 to-[#00FF87]/5 rounded-full blur-3xl animate-float-slow pointer-events-none" style={{ animationDelay: '-10s' }}></div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0F] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 relative">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-white">Rav</span>
            <span className="bg-gradient-to-r from-[#00F0A0] via-[#9CA3AF] to-[#00FF87] bg-clip-text text-transparent">en</span>
          </h1>
          <p className="text-[#4B5563] text-xs font-medium tracking-widest uppercase mt-3">
            AI-Powered Financial Intelligence
          </p>
        </div>

        <div className="rounded-3xl p-8 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          {!isConfigured && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-200">
                Authentication isn't configured. Add <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your <code className="font-mono">.env</code> and enable Google / Microsoft providers in the Supabase dashboard.
              </div>
            </div>
          )}

          {/* OAuth buttons — primary */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!isConfigured || loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-[#0A0A0F] text-sm font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading === 'google' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('azure')}
              disabled={!isConfigured || loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#2F2F2F] text-white text-sm font-semibold hover:bg-[#3A3A3A] transition disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.06]"
            >
              {loading === 'azure' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MicrosoftIcon className="w-5 h-5" />
              )}
              Continue with Microsoft
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl px-4 py-3 text-xs text-[#FF6B6B] font-semibold flex items-start gap-2">
              <Zap className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email/password (collapsed by default) */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => { setShowEmail(s => !s); setError(null); }}
              className="text-xs text-[#9CA3AF] hover:text-[#00F0A0] transition w-full text-center"
            >
              {showEmail ? 'Hide email sign-in' : 'Or sign in with email'}
            </button>
          </div>

          {showEmail && (
            <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pl-11 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pl-11 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pl-11 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!isConfigured || loading !== null}
                className="w-full bg-gradient-to-r from-[#00F0A0] to-[#00CC88] text-[#0A0A0F] font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-[#00F0A0]/15 hover:shadow-xl hover:shadow-[#00F0A0]/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'email' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="w-full text-xs text-[#9CA3AF] hover:text-[#00F0A0] transition"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          <p className="text-center text-[11px] text-[#374151] font-semibold uppercase tracking-widest">
            Secured with OAuth 2.0 & JWT
          </p>
          <div className="flex justify-center gap-4 text-xs text-[#374151]">
            <button onClick={() => navigate('/privacy')} className="hover:text-[#00F0A0] transition">Privacy Policy</button>
            <span className="text-white/20">•</span>
            <button onClick={() => navigate('/terms')} className="hover:text-[#00F0A0] transition">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}
