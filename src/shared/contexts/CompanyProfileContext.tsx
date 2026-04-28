import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { CompanyProfile } from '@/types/company-profile';
import { DEFAULT_COMPANY_PROFILE, computeProfileCompleteness } from '@/types/company-profile';
import { companyProfileAPI } from '@/lib/company-profile-api';
import { useAuth } from '@/shared/contexts/AuthContext';

interface CompanyProfileContextType {
  profile: CompanyProfile;
  loading: boolean;
  error: string | null;
  completeness: number;
  updateProfile: (updates: Partial<CompanyProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CompanyProfileContext = createContext<CompanyProfileContextType>({
  profile: DEFAULT_COMPANY_PROFILE,
  loading: true,
  error: null,
  completeness: 0,
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapApiToProfile = (data: any): CompanyProfile => ({
    id: data.id,
    userId: data.user_id,
    companyName: data.company_name || '',
    entityType: data.entity_type,
    incorporationDate: data.incorporation_date,
    industryVertical: data.industry_vertical,
    industrySubSector: data.industry_sub_sector,
    businessModel: data.business_model,
    revenueModel: data.revenue_model,
    avgDealSize: data.avg_deal_size,
    avgContractLengthMonths: data.avg_contract_length_months,
    fundingStage: data.funding_stage,
    lastRaiseAmount: data.last_raise_amount,
    totalCapitalRaised: data.total_capital_raised,
    lastRaiseDate: data.last_raise_date,
    cashReserves: data.cash_reserves,
    monthlyBurnRate: data.monthly_burn_rate,
    monthlyRevenue: data.monthly_revenue,
    runwayTargetMonths: data.runway_target_months,
    cac: data.cac,
    ltv: data.ltv,
    paybackPeriodMonths: data.payback_period_months,
    grossMarginTarget: data.gross_margin_target,
    netMarginTarget: data.net_margin_target,
    customerType: data.customer_type,
    customerSegment: data.customer_segment,
    avgContractValue: data.avg_contract_value,
    monthlyChurnRate: data.monthly_churn_rate,
    teamSize: data.team_size,
    engineeringHeadcount: data.engineering_headcount,
    salesHeadcount: data.sales_headcount,
    opsHeadcount: data.ops_headcount,
    contractorCount: data.contractor_count,
    nextFundraiseDate: data.next_fundraise_date,
    profitabilityTargetDate: data.profitability_target_date,
    revenueTarget3m: data.revenue_target_3m,
    revenueTarget6m: data.revenue_target_6m,
    revenueTarget12m: data.revenue_target_12m,
    exitStrategy: data.exit_strategy,
    operatingStates: data.operating_states ? (typeof data.operating_states === 'string' ? JSON.parse(data.operating_states) : data.operating_states) : [],
    hasGSTRegistration: data.has_gst_registration || false,
    hasTANRegistration: data.has_tan_registration || false,
    gstin: data.gstin,
    pan: data.pan,
    auditorAppointed: data.auditor_appointed || false,
    statutoryAuditRequired: data.statutory_audit_required || false,
    currentFY: data.current_fy || '2025-26',
    profileCompleteness: data.profile_completeness,
    lastReviewedAt: data.last_reviewed_at,
    stage: data.startup_stage || 'early',
  });

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await companyProfileAPI.get();
      setProfile(mapApiToProfile(data));
      setError(null);
    } catch (err) {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('raven_startup_profile');
        if (stored) {
          const legacy = JSON.parse(stored);
          setProfile({
            ...DEFAULT_COMPANY_PROFILE,
            companyName: legacy.name || '',
            stage: legacy.stage || 'early',
            monthlyRevenue: legacy.monthlyRevenue,
            teamSize: legacy.teamSize,
            operatingStates: legacy.operatingStates || [],
            hasGSTRegistration: legacy.hasGSTRegistration || false,
            hasTANRegistration: legacy.hasTANRegistration || false,
            currentFY: legacy.currentFY || '2025-26',
          });
        }
      } catch {}
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<CompanyProfile>) => {
    try {
      const data = await companyProfileAPI.update(updates);
      setProfile(mapApiToProfile(data));
    } catch (err) {
      throw err;
    }
  }, []);

  const completeness = computeProfileCompleteness(profile);

  return (
    <CompanyProfileContext.Provider value={{ profile, loading, error, completeness, updateProfile, refreshProfile: fetchProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfileContext() {
  return useContext(CompanyProfileContext);
}
