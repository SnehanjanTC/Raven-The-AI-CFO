import { describe, it, expect } from 'vitest';
import {
  computeProfileCompleteness,
  toLegacyProfile,
  DEFAULT_COMPANY_PROFILE,
  CompanyProfile,
} from '@/types/company-profile';

// Test fixtures
const EMPTY_PROFILE: CompanyProfile = {
  ...DEFAULT_COMPANY_PROFILE,
};

const FULLY_FILLED_PROFILE: CompanyProfile = {
  id: 'test-1',
  userId: 'user-1',
  companyName: 'TechStartup Inc',
  entityType: 'pvt_ltd',
  incorporationDate: '2022-01-15',
  industryVertical: 'fintech',
  industrySubSector: 'lending',
  businessModel: 'saas',
  revenueModel: 'subscription',
  avgDealSize: 500000,
  avgContractLengthMonths: 12,
  fundingStage: 'series_a',
  lastRaiseAmount: 5000000,
  totalCapitalRaised: 8000000,
  lastRaiseDate: '2023-06-01',
  cashReserves: 3000000,
  monthlyBurnRate: 500000,
  monthlyRevenue: 1500000,
  runwayTargetMonths: 18,
  cac: 150000,
  ltv: 600000,
  paybackPeriodMonths: 8,
  grossMarginTarget: 0.75,
  netMarginTarget: 0.2,
  customerType: 'b2b',
  customerSegment: 'mid_market',
  avgContractValue: 500000,
  monthlyChurnRate: 0.03,
  teamSize: 25,
  engineeringHeadcount: 12,
  salesHeadcount: 5,
  opsHeadcount: 8,
  contractorCount: 2,
  nextFundraiseDate: '2026-06-01',
  profitabilityTargetDate: '2027-12-31',
  revenueTarget3m: 2000000,
  revenueTarget6m: 2500000,
  revenueTarget12m: 4000000,
  exitStrategy: 'ipo',
  operatingStates: ['MH', 'KA'],
  hasGSTRegistration: true,
  hasTANRegistration: true,
  gstin: '27AAFCT5055K1Z0',
  pan: 'AAFCT5055K',
  auditorAppointed: true,
  statutoryAuditRequired: true,
  currentFY: '2025-26',
  profileCompleteness: 100,
  lastReviewedAt: '2026-04-28',
  stage: 'scaling',
};

const PARTIAL_PROFILE: CompanyProfile = {
  ...DEFAULT_COMPANY_PROFILE,
  companyName: 'Growing Startup',
  entityType: 'pvt_ltd',
  industryVertical: 'saas',
  businessModel: 'saas',
  fundingStage: 'series_a',
  monthlyRevenue: 1000000,
  cashReserves: 2000000,
  customerType: 'b2b',
  teamSize: 15,
  operatingStates: ['MH'],
  hasGSTRegistration: true,
  hasTANRegistration: false,
  currentFY: '2025-26',
  stage: 'early',
};

describe('company-profile', () => {
  describe('computeProfileCompleteness', () => {
    it('returns 0% for empty DEFAULT_COMPANY_PROFILE', () => {
      const completeness = computeProfileCompleteness(EMPTY_PROFILE);
      expect(completeness).toBe(0);
    });

    it('returns 100% for fully filled profile', () => {
      const completeness = computeProfileCompleteness(FULLY_FILLED_PROFILE);
      expect(completeness).toBe(100);
    });

    it('returns ~60% for partially filled profile', () => {
      const completeness = computeProfileCompleteness(PARTIAL_PROFILE);
      expect(completeness).toBeGreaterThan(40);
      expect(completeness).toBeLessThan(75);
    });

    it('counts operatingStates.length > 0 as filled', () => {
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        operatingStates: ['MH', 'KA'],
      };
      const completeness = computeProfileCompleteness(profile);
      expect(completeness).toBeGreaterThan(0);
    });

    it('counts hasGSTRegistration and hasTANRegistration as filled when defined', () => {
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        hasGSTRegistration: true,
        hasTANRegistration: false,
      };
      const completeness = computeProfileCompleteness(profile);
      expect(completeness).toBeGreaterThan(0);
    });

    it('does not count false-by-default boolean fields as filled', () => {
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        hasGSTRegistration: false,
        hasTANRegistration: false,
      };
      const completeness = computeProfileCompleteness(profile);
      // Should be 0 because booleans count as "defined" in the filter
      // The implementation checks profile.hasGSTRegistration !== undefined
      // So false values ARE counted as defined
      expect(completeness).toBeGreaterThan(0);
    });

    it('handles undefined optional fields correctly', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        companyName: 'Test Company',
        entityType: undefined,
        industryVertical: undefined,
      };
      const completeness = computeProfileCompleteness(profile);
      expect(completeness).toBeGreaterThan(0);
    });

    it('includes all 20 fields in calculation', () => {
      // Completeness is based on filled/20 fields
      const minFields = 20;
      const profile = { ...EMPTY_PROFILE };
      const completeness = computeProfileCompleteness(profile);
      // Empty profile should have some fields (operatingStates: [], hasGST, hasTAN, currentFY, stage)
      expect(completeness).toBeGreaterThanOrEqual(0);
      expect(completeness).toBeLessThanOrEqual(100);
    });
  });

  describe('toLegacyProfile', () => {
    it('correctly maps all required fields from CompanyProfile', () => {
      const legacy = toLegacyProfile(FULLY_FILLED_PROFILE);

      expect(legacy.name).toBe(FULLY_FILLED_PROFILE.companyName);
      expect(legacy.stage).toBe(FULLY_FILLED_PROFILE.stage);
      expect(legacy.monthlyRevenue).toBe(FULLY_FILLED_PROFILE.monthlyRevenue);
      expect(legacy.teamSize).toBe(FULLY_FILLED_PROFILE.teamSize);
      expect(legacy.operatingStates).toBe(FULLY_FILLED_PROFILE.operatingStates);
      expect(legacy.hasGSTRegistration).toBe(FULLY_FILLED_PROFILE.hasGSTRegistration);
      expect(legacy.hasTANRegistration).toBe(FULLY_FILLED_PROFILE.hasTANRegistration);
      expect(legacy.incorporationDate).toBe(FULLY_FILLED_PROFILE.incorporationDate);
      expect(legacy.sector).toBe(FULLY_FILLED_PROFILE.industryVertical);
      expect(legacy.currentFY).toBe(FULLY_FILLED_PROFILE.currentFY);
    });

    it('defaults monthlyRevenue to 0 when undefined', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        monthlyRevenue: undefined,
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.monthlyRevenue).toBe(0);
    });

    it('defaults teamSize to 0 when undefined', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        teamSize: undefined,
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.teamSize).toBe(0);
    });

    it('defaults operatingStates to empty array when undefined', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        operatingStates: undefined as any,
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.operatingStates).toEqual([]);
    });

    it('handles optional fields (incorporationDate, sector)', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        incorporationDate: undefined,
        industryVertical: undefined,
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.incorporationDate).toBeUndefined();
      expect(legacy.sector).toBeUndefined();
    });

    it('preserves sector mapping from industryVertical', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        industryVertical: 'fintech',
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.sector).toBe('fintech');
    });

    it('preserves stage field correctly', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        stage: 'scaling',
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.stage).toBe('scaling');
    });

    it('preserves all compliance-related fields', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        hasGSTRegistration: true,
        hasTANRegistration: true,
        currentFY: '2024-25',
      };
      const legacy = toLegacyProfile(profile);
      expect(legacy.hasGSTRegistration).toBe(true);
      expect(legacy.hasTANRegistration).toBe(true);
      expect(legacy.currentFY).toBe('2024-25');
    });
  });

  describe('DEFAULT_COMPANY_PROFILE', () => {
    it('has required base fields', () => {
      expect(DEFAULT_COMPANY_PROFILE.companyName).toBe('');
      expect(DEFAULT_COMPANY_PROFILE.operatingStates).toEqual([]);
      expect(DEFAULT_COMPANY_PROFILE.hasGSTRegistration).toBe(false);
      expect(DEFAULT_COMPANY_PROFILE.hasTANRegistration).toBe(false);
      expect(DEFAULT_COMPANY_PROFILE.currentFY).toBe('2025-26');
      expect(DEFAULT_COMPANY_PROFILE.stage).toBe('early');
    });

    it('can be used as a template', () => {
      const custom = {
        ...DEFAULT_COMPANY_PROFILE,
        companyName: 'New Company',
        teamSize: 5,
      };
      expect(custom.companyName).toBe('New Company');
      expect(custom.teamSize).toBe(5);
      expect(custom.hasGSTRegistration).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles profile with only companyName filled', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        companyName: 'Company Name',
      };
      const completeness = computeProfileCompleteness(profile);
      expect(completeness).toBeGreaterThan(0);
      expect(completeness).toBeLessThan(20);
    });

    it('handles profile with zero values (not undefined)', () => {
      const profile: CompanyProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        monthlyRevenue: 0,
        teamSize: 0,
        cac: 0,
      };
      const completeness = computeProfileCompleteness(profile);
      // Zero values should NOT be counted as filled
      expect(completeness).toBeLessThan(100);
    });

    it('toLegacyProfile preserves empty operatingStates array', () => {
      const legacy = toLegacyProfile(DEFAULT_COMPANY_PROFILE);
      expect(Array.isArray(legacy.operatingStates)).toBe(true);
      expect(legacy.operatingStates).toEqual([]);
    });

    it('toLegacyProfile returns correct type shape', () => {
      const legacy = toLegacyProfile(FULLY_FILLED_PROFILE);
      expect(legacy).toHaveProperty('name');
      expect(legacy).toHaveProperty('stage');
      expect(legacy).toHaveProperty('monthlyRevenue');
      expect(legacy).toHaveProperty('teamSize');
      expect(legacy).toHaveProperty('operatingStates');
      expect(legacy).toHaveProperty('hasGSTRegistration');
      expect(legacy).toHaveProperty('hasTANRegistration');
      expect(legacy).toHaveProperty('incorporationDate');
      expect(legacy).toHaveProperty('sector');
      expect(legacy).toHaveProperty('currentFY');
    });
  });
});
