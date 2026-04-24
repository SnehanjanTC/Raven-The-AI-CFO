import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, RefreshCw, Zap, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

export function Login() {
  const navigate = useNavigate();
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
      localStorage.setItem('raven_guest_mode', 'true');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Gradient Orbs — neon green tones */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-[#00F0A0]/15 to-[#9CA3AF]/8 rounded-full blur-3xl animate-float-slow animate-glow-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-br from-[#9CA3AF]/12 to-[#00F0A0]/8 rounded-full blur-3xl animate-float-slower animate-glow-pulse pointer-events-none" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#00F0A0]/8 to-[#00FF87]/5 rounded-full blur-3xl animate-float-slow pointer-events-none" style={{ animationDelay: '-10s' }}></div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0F] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 relative">
        {/* Logo and Branding */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-white">Rav</span>
              <span className="bg-gradient-to-r from-[#00F0A0] via-[#9CA3AF] to-[#00FF87] bg-clip-text text-transparent">en</span>
            </h1>
          </div>
          <p className="text-[#4B5563] text-xs font-medium tracking-widest uppercase">
            AI-Powered Financial Intelligence
          </p>
        </div>

        {/* Glass Card */}
        <div className="rounded-3xl p-8 relative group transition-all duration-300 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30">
          {/* Subtle border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00F0A0]/8 via-transparent to-[#00FF87]/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-3xl"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Full Name Field - Signup only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors duration-200" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}

            {/* Company Name Field - Signup only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">
                  Company Name
                </label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors duration-200" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors duration-200" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4B5563] font-semibold block">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#374151] group-focus-within:text-[#00F0A0] transition-colors duration-200" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 pl-12 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#00F0A0]/30 focus:border-white/10 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl px-4 py-3 text-xs text-[#FF6B6B] font-semibold flex items-center gap-2 animate-pulse">
                <Zap className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-gradient-to-r from-[#00F0A0] to-[#00CC88] text-[#0A0A0F] font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-[#00F0A0]/15 hover:shadow-xl hover:shadow-[#00F0A0]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#4DFFC0] to-[#00F0A0] opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
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
              <span className="text-xs text-[#374151] font-semibold uppercase tracking-widest">
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
              className="w-full text-sm text-[#9CA3AF] hover:text-[#00F0A0] transition-colors duration-200 font-medium"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>

            {/* Guest Mode */}
            <button
              onClick={handleGuestMode}
              disabled={loading}
              className="w-full border border-white/[0.06] rounded-xl py-3 text-xs font-semibold text-[#9CA3AF] hover:text-[#E8ECF0] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Footer with Policy Links */}
        <div className="mt-8 space-y-4">
          <p className="text-center text-[11px] text-[#374151] font-semibold uppercase tracking-widest">
            Secured with AES-256 & JWT
          </p>
          <div className="flex justify-center gap-4 text-xs text-[#374151]">
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-[#00F0A0] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => navigate('/terms')}
              className="hover:text-[#00F0A0] transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
