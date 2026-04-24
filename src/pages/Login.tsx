import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, RefreshCw, Zap, User, Building2 } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';

export function Login() {
  const { signIn, register, guestLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await register(email, password, fullName || undefined, companyName || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    setError(null);
    try {
      await guestLogin();
    } catch (err: any) {
      localStorage.setItem('finos_guest_mode', 'true');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111110] flex items-center justify-center p-6 relative overflow-hidden">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -40px) rotate(120deg); }
          66% { transform: translate(-20px, 30px) rotate(240deg); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-40px, 30px) rotate(120deg); }
          66% { transform: translate(30px, -30px) rotate(240deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .orb-1 { animation: float-slow 20s ease-in-out infinite; }
        .orb-2 { animation: float-slower 24s ease-in-out infinite; }
        .glow-pulse { animation: glow-pulse 4s ease-in-out infinite; }
        .glass-login {
          background: rgba(255, 250, 240, 0.03);
          border: 1px solid rgba(255, 250, 240, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .glass-login:hover {
          border-color: rgba(255, 250, 240, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 250, 240, 0.05);
        }
      `}</style>

      {/* Floating Gradient Orbs — warm amber/stone tones */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-[#e5a764]/15 to-[#c4bdb4]/8 rounded-full blur-3xl orb-1 glow-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-br from-[#c4bdb4]/12 to-[#e5a764]/8 rounded-full blur-3xl orb-2 glow-pulse pointer-events-none" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#e5a764]/8 to-[#5bb98c]/5 rounded-full blur-3xl pointer-events-none" style={{ animation: 'float-slow 25s ease-in-out infinite', animationDelay: '-10s' }}></div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111110] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 relative">
        {/* Logo and Branding */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-white">Fin</span>
              <span className="bg-gradient-to-r from-[#e5a764] via-[#c4bdb4] to-[#5bb98c] bg-clip-text text-transparent">OS</span>
            </h1>
          </div>
          <p className="text-[#7c7a75] text-xs font-medium tracking-widest uppercase">
            AI-Powered Financial Intelligence
          </p>
        </div>

        {/* Glass Card */}
        <div className="glass-login rounded-3xl p-8 relative group transition-all duration-300">
          {/* Subtle border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#e5a764]/8 via-transparent to-[#5bb98c]/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-3xl"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Full Name Field - Signup only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#7c7a75] font-semibold block">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a4944] group-focus-within:text-[#e5a764] transition-colors duration-200" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#4a4944] focus:outline-none focus:ring-1 focus:ring-[#e5a764]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}

            {/* Company Name Field - Signup only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#7c7a75] font-semibold block">
                  Company Name
                </label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a4944] group-focus-within:text-[#e5a764] transition-colors duration-200" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#4a4944] focus:outline-none focus:ring-1 focus:ring-[#e5a764]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#7c7a75] font-semibold block">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a4944] group-focus-within:text-[#e5a764] transition-colors duration-200" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#4a4944] focus:outline-none focus:ring-1 focus:ring-[#e5a764]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#7c7a75] font-semibold block">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a4944] group-focus-within:text-[#e5a764] transition-colors duration-200" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#4a4944] focus:outline-none focus:ring-1 focus:ring-[#e5a764]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[#e8866a]/10 border border-[#e8866a]/20 rounded-xl px-4 py-3 text-xs text-[#e8866a] font-semibold flex items-center gap-2 animate-pulse">
                <Zap className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-gradient-to-r from-[#e5a764] to-[#d99850] text-[#1c1c1a] font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-[#e5a764]/15 hover:shadow-xl hover:shadow-[#e5a764]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#f0c78e] to-[#e5a764] opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
              <div className="relative flex items-center gap-2">
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Divider and Toggle */}
          <div className="mt-8 space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]"></div>
              <span className="text-xs text-[#4a4944] font-semibold uppercase tracking-widest">
                {mode === 'login' ? 'New user?' : 'Have account?'}
              </span>
              <div className="flex-1 h-px bg-white/[0.06]"></div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="w-full text-sm text-[#b5b1a9] hover:text-[#e5a764] transition-colors duration-200 font-medium"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>

            {/* Guest Mode */}
            <button
              onClick={handleGuestMode}
              disabled={loading}
              className="w-full border border-white/[0.06] rounded-xl py-3 text-xs font-semibold text-[#b5b1a9] hover:text-[#e8e4dd] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-[#4a4944] font-semibold uppercase tracking-widest">
          Secured with AES-256 & JWT
        </p>
      </div>
    </div>
  );
}
