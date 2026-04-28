import { useState, useEffect } from 'react';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from '@/types/company-profile';
import { companyProfileAPI } from '@/lib/company-profile-api';

let cachedProfile: CompanyProfile | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(cachedProfile || DEFAULT_COMPANY_PROFILE);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    // Check cache first
    if (cachedProfile && Date.now() - cacheTimestamp < CACHE_TTL) {
      setProfile(cachedProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await companyProfileAPI.get();
      // Map snake_case API response to camelCase CompanyProfile
      const mapped: CompanyProfile = {
        id: data.id,
        userId: data.userId,
        companyName: data.companyName || '',
        entityType: data.entityType,
        incorporationDate: data.incorporationDate,
        industryVertical: data.industryVertical,
        industrySubSector: data.industrySubSector,
        businessModel: data.businessModel,
        revenueModel: data.revenueModel,
        avgDealSize: data.avgDealSize,
        avgContractLengthMonths: data.avgContractLengthMonths,
        fundingStage: data.fundingStage,
        lastRaiseAmount: data.lastRaiseAmount,
        totalCapitalRaised: data.totalCapitalRaised,
        lastRaiseDate: data.lastRaiseDate,
        cashReserves: data.cashReserves,
        monthlyBurnRate: data.monthlyBurnRate,
        monthlyRevenue: data.monthlyRevenue,
        runwayTargetMonths: data.runwayTargetMonths,
        cac: data.cac,
        ltv: data.ltv,
        paybackPeriodMonths: data.paybackPeriodMonths,
        grossMarginTarget: data.grossMarginTarget,
        netMarginTarget: data.netMarginTarget,
        customerType: data.customerType,
        customerSegment: data.customerSegment,
        avgContractValue: data.avgContractValue,
        monthlyChurnRate: data.monthlyChurnRate,
        teamSize: data.teamSize,
        engineeringHeadcount: data.engineeringHeadcount,
        salesHeadcount: data.salesHeadcount,
        opsHeadcount: data.opsHeadcount,
        contractorCount: data.contractorCount,
        nextFundraiseDate: data.nextFundraiseDate,
        profitabilityTargetDate: data.profitabilityTargetDate,
        revenueTarget3m: data.revenueTarget3m,
        revenueTarget6m: data.revenueTarget6m,
        revenueTarget12m: data.revenueTarget12m,
        exitStrategy: data.exitStrategy,
        operatingStates: data.operatingStates ? JSON.parse(data.operatingStates) : [],
        hasGSTRegistration: data.hasGSTRegistration || false,
        hasTANRegistration: data.hasTANRegistration || false,
        gstin: data.gstin,
        pan: data.pan,
        auditorAppointed: data.auditorAppointed || false,
        statutoryAuditRequired: data.statutoryAuditRequired || false,
        currentFY: data.currentFY || '2025-26',
        profileCompleteness: data.profileCompleteness,
        lastReviewedAt: data.lastReviewedAt,
        stage: data.stage || 'early',
      };
      cachedProfile = mapped;
      cacheTimestamp = Date.now();
      setProfile(mapped);
      setError(null);
    } catch (err) {
      // Fallback to localStorage legacy profile
      try {
        const stored = localStorage.getItem('raven_startup_profile');
        if (stored) {
          const legacy = JSON.parse(stored);
          const fallback: CompanyProfile = {
            companyName: legacy.name || '',
            stage: legacy.stage || 'early',
            monthlyRevenue: legacy.monthlyRevenue,
            teamSize: legacy.teamSize,
            operatingStates: legacy.operatingStates || [],
            hasGSTRegistration: legacy.hasGSTRegistration || false,
            hasTANRegistration: legacy.hasTANRegistration || false,
            incorporationDate: legacy.incorporationDate,
            industryVertical: legacy.sector,
            currentFY: legacy.currentFY || '2025-26',
          };
          setProfile(fallback);
        }
      } catch {}
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  return { profile, loading, error, refetch: fetchProfile };
}

// Export cache invalidation for use after profile updates
export function invalidateProfileCache() {
  cachedProfile = null;
  cacheTimestamp = 0;
}
