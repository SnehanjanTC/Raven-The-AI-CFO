/**
 * @file Company Profile Types
 * @description Enriched company profile for contextual financial intelligence
 */

// Entity types for Indian companies
export type EntityType = 'pvt_ltd' | 'llp' | 'opc' | 'partnership' | 'sole_proprietor';

export type BusinessModel = 'saas' | 'marketplace' | 'd2c' | 'services' | 'hardware' | 'hybrid';

export type RevenueModel = 'subscription' | 'transactional' | 'one_time' | 'usage_based' | 'hybrid';

export type FundingStage = 'bootstrapped' | 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c_plus';

export type CustomerType = 'b2b' | 'b2c' | 'b2b2c';

export type CustomerSegment = 'enterprise' | 'mid_market' | 'smb' | 'consumer';

export type ExitStrategy = 'ipo' | 'acquisition' | 'lifestyle' | 'undecided';

export type IndustryVertical = 'fintech' | 'healthtech' | 'edtech' | 'ecommerce' | 'saas' | 'marketplace' | 'deeptech' | 'agritech' | 'cleantech' | 'logistics' | 'media' | 'gaming' | 'other';

export type StartupStage = 'pre-revenue' | 'early' | 'scaling' | 'growth';

export interface CompanyProfile {
  id?: string;
  userId?: string;

  // Company Basics
  companyName: string;
  entityType?: EntityType;
  incorporationDate?: string;
  industryVertical?: IndustryVertical;
  industrySubSector?: string;

  // Business Model
  businessModel?: BusinessModel;
  revenueModel?: RevenueModel;
  avgDealSize?: number;
  avgContractLengthMonths?: number;

  // Funding
  fundingStage?: FundingStage;
  lastRaiseAmount?: number;
  totalCapitalRaised?: number;
  lastRaiseDate?: string;

  // Cash & Burn
  cashReserves?: number;
  monthlyBurnRate?: number;
  monthlyRevenue?: number;
  runwayTargetMonths?: number;

  // Unit Economics
  cac?: number;
  ltv?: number;
  paybackPeriodMonths?: number;
  grossMarginTarget?: number;
  netMarginTarget?: number;

  // Customers
  customerType?: CustomerType;
  customerSegment?: CustomerSegment;
  avgContractValue?: number;
  monthlyChurnRate?: number;

  // Team
  teamSize?: number;
  engineeringHeadcount?: number;
  salesHeadcount?: number;
  opsHeadcount?: number;
  contractorCount?: number;

  // Financial Goals
  nextFundraiseDate?: string;
  profitabilityTargetDate?: string;
  revenueTarget3m?: number;
  revenueTarget6m?: number;
  revenueTarget12m?: number;
  exitStrategy?: ExitStrategy;

  // Compliance
  operatingStates: string[];
  hasGSTRegistration: boolean;
  hasTANRegistration: boolean;
  gstin?: string;
  pan?: string;
  auditorAppointed?: boolean;
  statutoryAuditRequired?: boolean;
  currentFY: string;

  // Meta
  profileCompleteness?: number;
  lastReviewedAt?: string;

  // Legacy compatibility (maps to old StartupProfile)
  stage: StartupStage;
}

// Helper to compute profile completeness
export function computeProfileCompleteness(profile: CompanyProfile): number {
  const fields = [
    profile.companyName,
    profile.entityType,
    profile.industryVertical,
    profile.businessModel,
    profile.revenueModel,
    profile.fundingStage,
    profile.monthlyRevenue,
    profile.cashReserves,
    profile.monthlyBurnRate,
    profile.customerType,
    profile.customerSegment,
    profile.teamSize,
    profile.operatingStates?.length > 0,
    profile.hasGSTRegistration !== undefined,
    profile.hasTANRegistration !== undefined,
    profile.currentFY,
    profile.exitStrategy,
    profile.cac,
    profile.ltv,
    profile.grossMarginTarget,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

// Convert enriched profile to legacy StartupProfile format for backward compatibility
export function toLegacyProfile(profile: CompanyProfile): {
  name: string;
  stage: StartupStage;
  monthlyRevenue: number;
  teamSize: number;
  operatingStates: string[];
  hasGSTRegistration: boolean;
  hasTANRegistration: boolean;
  incorporationDate?: string;
  sector?: string;
  currentFY: string;
} {
  return {
    name: profile.companyName,
    stage: profile.stage,
    monthlyRevenue: profile.monthlyRevenue || 0,
    teamSize: profile.teamSize || 0,
    operatingStates: profile.operatingStates || [],
    hasGSTRegistration: profile.hasGSTRegistration,
    hasTANRegistration: profile.hasTANRegistration,
    incorporationDate: profile.incorporationDate,
    sector: profile.industryVertical,
    currentFY: profile.currentFY,
  };
}

// Default empty profile
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
  operatingStates: [],
  hasGSTRegistration: false,
  hasTANRegistration: false,
  currentFY: '2025-26',
  stage: 'early',
};
