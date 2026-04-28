import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Zap, CheckCircle2 } from 'lucide-react';
import { CompanyProfile } from '@/types/company-profile';
import { cn } from '@/lib/utils';

interface ProfileSummaryCardProps {
  profile: CompanyProfile;
}

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const stageBadgeColor = {
    'pre-revenue': 'bg-secondary/10 text-secondary border-secondary/25',
    'early': 'bg-primary/10 text-primary border-primary/25',
    'scaling': 'bg-tertiary/10 text-tertiary border-tertiary/25',
    'growth': 'bg-tertiary/10 text-tertiary border-tertiary/25',
  };

  const completeness = profile.profileCompleteness || 0;
  const isLowCompleteness = completeness < 70;

  // Format INR compactly
  const formatINRCompact = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(Number(n))) return '—';
    const v = Number(n);
    if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
    return `₹${Math.round(v).toLocaleString('en-IN')}`;
  };

  // Compute runway in months if we have burn rate and cash reserves
  const computeRunway = (): string => {
    if (!profile.cashReserves || !profile.monthlyBurnRate) return '—';
    if (profile.monthlyBurnRate === 0) return '∞';
    const months = profile.cashReserves / profile.monthlyBurnRate;
    return `${months.toFixed(1)}`;
  };

  const runway = computeRunway();

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 animate-slide-up">
      {/* Header: Company Name + Stage Badge */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{profile.companyName || 'Unnamed Company'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile.industryVertical ? profile.industryVertical.charAt(0).toUpperCase() + profile.industryVertical.slice(1) : 'Industry'} · {profile.businessModel ? profile.businessModel.toUpperCase() : 'Model'}
            </p>
          </div>
        </div>
        <span className={cn(
          'text-xs font-bold uppercase px-2.5 py-1 rounded-lg border',
          stageBadgeColor[profile.stage as keyof typeof stageBadgeColor] || 'bg-slate-800 text-slate-300 border-slate-700'
        )}>
          {profile.stage.charAt(0).toUpperCase() + profile.stage.slice(1)}
        </span>
      </div>

      {/* Key Financial Metrics - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Monthly Revenue */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Monthly Revenue</p>
          <p className="text-base font-bold text-white">{formatINRCompact(profile.monthlyRevenue)}</p>
        </div>

        {/* Burn Rate */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Monthly Burn</p>
          <p className="text-base font-bold text-white">{formatINRCompact(profile.monthlyBurnRate)}</p>
        </div>

        {/* Runway */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Runway</p>
          <p className="text-base font-bold text-white">{runway} <span className="text-xs text-slate-400">mo</span></p>
        </div>

        {/* Profile Completeness */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Profile</p>
          <p className="text-base font-bold text-white">{completeness}%</p>
        </div>
      </div>

      {/* Progress bar for profile completeness */}
      <div className="mb-5">
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isLowCompleteness ? 'bg-gradient-to-r from-secondary to-error' : 'bg-gradient-to-r from-primary to-tertiary'
            )}
            style={{ width: `${Math.max(5, completeness)}%` }}
          />
        </div>
      </div>

      {/* CTA if profile is incomplete */}
      {isLowCompleteness && (
        <Link
          to="/onboarding"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/25 hover:bg-primary/15 transition-colors text-xs font-semibold text-primary"
        >
          <Zap className="w-3.5 h-3.5" />
          Complete your profile
        </Link>
      )}

      {/* Footer note */}
      <p className="text-[11px] text-slate-500 mt-4 text-center">
        {completeness >= 90 ? (
          <span className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-tertiary" />
            Profile is complete
          </span>
        ) : (
          `${100 - completeness}% to go`
        )}
      </p>
    </div>
  );
}
