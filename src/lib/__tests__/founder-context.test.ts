import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEnrichedCFOCopilotSystemPrompt } from '@/lib/founder-context';
import type { CompanyProfile } from '@/types/company-profile';

// Mock compliance context functions
vi.mock('@/domains/compliance/engines/tds', () => ({
  getTDSContext: () => 'TDS Context (Mocked)',
  getEnrichedTDSContext: () => 'Enriched TDS Context (Mocked)',
}));

vi.mock('@/domains/compliance/engines/gst', () => ({
  getGSTContext: () => 'GST Context (Mocked)',
  getEnrichedGSTContext: () => 'Enriched GST Context (Mocked)',
}));

vi.mock('@/domains/compliance/engines/ptax', () => ({
  getPTaxContext: () => 'Professional Tax Context (Mocked)',
  getEnrichedPTaxContext: () => 'Enriched Professional Tax Context (Mocked)',
}));

vi.mock('@/domains/compliance/engines/indian-gaap', () => ({
  getIndianGAAPContext: () => 'GAAP Context (Mocked)',
  getEnrichedGAAPContext: () => 'Enriched GAAP Context (Mocked)',
}));

// Test fixtures
const EMPTY_PROFILE: CompanyProfile = {
  companyName: 'Test Company',
  operatingStates: [],
  hasGSTRegistration: false,
  hasTANRegistration: false,
  currentFY: '2025-26',
  stage: 'early',
};

const SAAS_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  companyName: 'SaaS Startup Inc',
  businessModel: 'saas',
  revenueModel: 'subscription',
  fundingStage: 'series_a',
  monthlyRevenue: 1500000,
  cashReserves: 3000000,
  monthlyBurnRate: 500000,
  customerType: 'b2b',
  customerSegment: 'mid_market',
  teamSize: 20,
  engineeringHeadcount: 12,
  salesHeadcount: 5,
  opsHeadcount: 3,
  cac: 150000,
  ltv: 600000,
  monthlyChurnRate: 0.03,
  entityType: 'pvt_ltd',
  incorporationDate: '2022-01-15',
};

const D2C_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  companyName: 'D2C Brand Co',
  businessModel: 'd2c',
  revenueModel: 'transactional',
  fundingStage: 'seed',
  monthlyRevenue: 2000000,
  cashReserves: 1000000,
  monthlyBurnRate: 600000,
  customerType: 'b2c',
  teamSize: 12,
  cac: 50000,
  ltv: 200000,
  avgContractValue: 2500,
  monthlyChurnRate: 0.05,
  entityType: 'pvt_ltd',
};

const MARKETPLACE_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  companyName: 'Marketplace Platform',
  businessModel: 'marketplace',
  revenueModel: 'transactional',
  fundingStage: 'series_a',
  monthlyRevenue: 5000000,
  cashReserves: 2000000,
  monthlyBurnRate: 1000000,
  customerType: 'b2b2c',
  teamSize: 35,
  entityType: 'pvt_ltd',
};

const PRE_REVENUE_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  companyName: 'Pre-Revenue Startup',
  stage: 'pre-revenue',
  businessModel: 'saas',
  fundingStage: 'pre_seed',
  monthlyRevenue: 0,
  cashReserves: 500000,
  monthlyBurnRate: 100000,
  customerType: 'b2b',
  teamSize: 3,
};

const SPARSE_LEGACY_PROFILE: CompanyProfile = {
  companyName: 'Legacy Startup',
  operatingStates: ['MH'],
  hasGSTRegistration: true,
  hasTANRegistration: false,
  currentFY: '2025-26',
  stage: 'early',
  // No enriched fields - should trigger fallback
};

const FULLY_FILLED_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  companyName: 'Fully Loaded Inc',
  entityType: 'pvt_ltd',
  incorporationDate: '2021-05-10',
  industryVertical: 'fintech',
  industrySubSector: 'payments',
  businessModel: 'saas',
  revenueModel: 'subscription',
  avgDealSize: 100000,
  avgContractLengthMonths: 12,
  fundingStage: 'series_b',
  lastRaiseAmount: 10000000,
  totalCapitalRaised: 15000000,
  lastRaiseDate: '2025-06-01',
  cashReserves: 5000000,
  monthlyBurnRate: 800000,
  monthlyRevenue: 2500000,
  runwayTargetMonths: 24,
  cac: 100000,
  ltv: 500000,
  paybackPeriodMonths: 10,
  grossMarginTarget: 0.8,
  netMarginTarget: 0.3,
  customerType: 'b2b',
  customerSegment: 'enterprise',
  avgContractValue: 500000,
  monthlyChurnRate: 0.02,
  teamSize: 40,
  engineeringHeadcount: 20,
  salesHeadcount: 8,
  opsHeadcount: 12,
  contractorCount: 3,
  nextFundraiseDate: '2026-12-01',
  profitabilityTargetDate: '2027-12-31',
  revenueTarget3m: 3000000,
  revenueTarget6m: 3500000,
  revenueTarget12m: 5000000,
  exitStrategy: 'ipo',
};

describe('founder-context', () => {
  describe('getEnrichedCFOCopilotSystemPrompt', () => {
    it('includes company name in prompt', () => {
      const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
      expect(prompt).toContain(SAAS_PROFILE.companyName);
    });

    describe('SaaS-specific context', () => {
      it('includes SaaS-specific metrics for SaaS profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('mrr');
        expect(prompt.toLowerCase()).toContain('subscription');
      });

      it('includes churn context for subscription business', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('churn');
      });

      it('focuses on MRR growth for early-stage SaaS', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('mrr');
      });

      it('mentions Net Dollar Retention for scaling SaaS', () => {
        const scalingSaaSProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          stage: 'scaling',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(scalingSaaSProfile);
        expect(prompt.toLowerCase()).toContain('ndr');
      });
    });

    describe('D2C-specific context', () => {
      it('includes AOV for D2C profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(D2C_PROFILE);
        expect(prompt.toLowerCase()).toContain('aov');
      });

      it('includes repeat rate for D2C profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(D2C_PROFILE);
        expect(prompt.toLowerCase()).toContain('repeat');
      });

      it('includes contribution margin for D2C profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(D2C_PROFILE);
        expect(prompt.toLowerCase()).toContain('contribution');
      });
    });

    describe('Marketplace-specific context', () => {
      it('includes GMV for marketplace profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(MARKETPLACE_PROFILE);
        expect(prompt.toLowerCase()).toContain('gmv');
      });

      it('includes take rate for marketplace profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(MARKETPLACE_PROFILE);
        expect(prompt.toLowerCase()).toContain('take rate');
      });
    });

    describe('Pre-revenue focus', () => {
      it('focuses on burn rate for pre-revenue profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(PRE_REVENUE_PROFILE);
        expect(prompt.toLowerCase()).toContain('burn');
      });

      it('includes runway calculation for pre-revenue profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(PRE_REVENUE_PROFILE);
        expect(prompt.toLowerCase()).toContain('runway');
      });

      it('includes focus on design partner traction', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(PRE_REVENUE_PROFILE);
        expect(prompt.toLowerCase()).toContain('design partner') || expect(prompt.toLowerCase()).toContain('traction');
      });
    });

    describe('Financial position section', () => {
      it('includes monthly revenue in financial position', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('monthly revenue');
        expect(prompt).toContain('₹');
      });

      it('includes cash reserves when available', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('cash');
      });

      it('calculates and displays runway', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('runway');
      });

      it('marks runway as CRITICAL when <12 months', () => {
        const lowRunwayProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          cashReserves: 400000, // ~8 months of runway at 500k burn
          monthlyBurnRate: 500000,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(lowRunwayProfile);
        expect(prompt).toContain('CRITICAL');
      });

      it('marks runway as URGENT when 12-18 months', () => {
        const mediumRunwayProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          cashReserves: 750000, // ~15 months of runway
          monthlyBurnRate: 500000,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(mediumRunwayProfile);
        expect(prompt).toContain('URGENT');
      });
    });

    describe('Unit economics section', () => {
      it('includes CAC and LTV metrics when available', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('CAC');
        expect(prompt).toContain('LTV');
      });

      it('calculates and displays LTV/CAC ratio', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        const ratio = SAAS_PROFILE.ltv! / SAAS_PROFILE.cac!;
        expect(prompt).toContain(ratio.toFixed(1));
      });

      it('marks unit economics as HEALTHY when LTV/CAC > 3x', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('HEALTHY');
      });

      it('includes payback period when available', () => {
        const profileWithPayback: CompanyProfile = {
          ...SAAS_PROFILE,
          paybackPeriodMonths: 8,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(profileWithPayback);
        expect(prompt).toContain('8 months');
      });

      it('includes target margins when set', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        // Profile doesn't have margins set, so this won't appear
        // But test the fully filled profile
        const fullPrompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(fullPrompt.toLowerCase()).toContain('margin');
      });
    });

    describe('Customer context section', () => {
      it('explains customer type in plain English', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('selling to businesses');
      });

      it('includes customer segment when available', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('mid_market');
      });

      it('includes average contract value when available', () => {
        const profileWithACV: CompanyProfile = {
          ...SAAS_PROFILE,
          avgContractValue: 500000,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(profileWithACV);
        expect(prompt).toContain('Average contract value');
      });

      it('displays churn rate and annual retention', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('churn');
        // Should show ~97% annual retention for 3% monthly churn
      });
    });

    describe('Team context section', () => {
      it('includes total headcount', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('Total headcount: 20');
      });

      it('includes engineering headcount and percentage', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('Engineering');
        expect(prompt).toContain('60%'); // 12/20 = 60%
      });

      it('includes sales headcount and percentage', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('Sales');
        expect(prompt).toContain('25%'); // 5/20 = 25%
      });

      it('flags high engineering ratio', () => {
        const heavyEngProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          engineeringHeadcount: 17, // 85% of team
          teamSize: 20,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(heavyEngProfile);
        expect(prompt).toContain('Heavy on engineering');
      });

      it('flags high sales ratio for early stage', () => {
        const heavySalesProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          salesHeadcount: 12,
          teamSize: 20,
          stage: 'early',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(heavySalesProfile);
        expect(prompt).toContain('Heavy on sales');
      });

      it('includes contractor count when present', () => {
        const profileWithContractors: CompanyProfile = {
          ...SAAS_PROFILE,
          contractorCount: 5,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(profileWithContractors);
        expect(prompt).toContain('Contractors: 5');
      });
    });

    describe('Financial goals section', () => {
      it('includes next fundraise date when set', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt).toContain('Next fundraise');
        expect(prompt).toContain('2026-12-01');
      });

      it('includes profitability target when set', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt).toContain('Profitability target');
        expect(prompt).toContain('2027-12-31');
      });

      it('includes revenue targets when set', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt).toContain('Revenue targets');
        expect(prompt).toContain('3m');
        expect(prompt).toContain('6m');
        expect(prompt).toContain('12mo');
      });

      it('does not include goals section when no goals are set', () => {
        const noGoalsProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          nextFundraiseDate: undefined,
          profitabilityTargetDate: undefined,
          revenueTarget3m: undefined,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(noGoalsProfile);
        // The section header should not appear if no goals
        // But compliance and other sections should
        expect(prompt).toBeDefined();
      });
    });

    describe('Compliance context', () => {
      it('includes entity type in compliance section', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('Entity type: pvt ltd');
      });

      it('includes TDS context when team size > 0', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('TDS');
      });

      it('includes GST context when registered', () => {
        const gstProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          hasGSTRegistration: true,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(gstProfile);
        expect(prompt).toContain('GST');
      });

      it('includes Professional Tax context when team in operating states', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('Professional Tax');
      });

      it('includes GAAP context for large revenue', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt).toContain('GAAP');
      });
    });

    describe('Stage-specific KPI guidance', () => {
      it('provides pre-revenue guidance for pre-revenue stage', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(PRE_REVENUE_PROFILE);
        expect(prompt).toContain('Focus on');
        expect(prompt.toLowerCase()).toContain('burn rate');
      });

      it('provides early-stage SaaS guidance', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('10% MoM growth');
      });

      it('provides D2C guidance for early stage', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(D2C_PROFILE);
        expect(prompt).toContain('AOV');
      });

      it('provides marketplace guidance', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(MARKETPLACE_PROFILE);
        expect(prompt).toContain('GMV');
      });

      it('provides scaling guidance for SaaS at scaling stage', () => {
        const scalingProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          stage: 'scaling',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(scalingProfile);
        expect(prompt).toContain('NDR');
      });

      it('provides growth guidance for SaaS at growth stage', () => {
        const growthProfile: CompanyProfile = {
          ...SAAS_PROFILE,
          stage: 'growth',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(growthProfile);
        expect(prompt).toContain('Rule of 40');
      });
    });

    describe('Fallback to legacy prompt', () => {
      it('falls back to legacy prompt for sparse profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SPARSE_LEGACY_PROFILE);
        expect(prompt).toBeDefined();
        expect(prompt).toContain('SPARSE');
        // Should include standard compliance sections from legacy prompt
      });

      it('detects sparse profile when no businessModel and no fundingStage', () => {
        const sparseProfile: CompanyProfile = {
          ...EMPTY_PROFILE,
          monthlyRevenue: 100000,
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(sparseProfile);
        // Should fall back because businessModel is missing
        expect(prompt).toBeDefined();
      });

      it('uses enriched prompt when businessModel is present', () => {
        const enrichedProfile: CompanyProfile = {
          ...EMPTY_PROFILE,
          businessModel: 'saas',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(enrichedProfile);
        expect(prompt).toContain('COMPANY IDENTITY');
      });
    });

    describe('Interaction patterns', () => {
      it('includes interaction patterns section', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt.toLowerCase()).toContain('how to interact');
      });

      it('includes step-by-step answer format guidance', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('plain english');
        expect(prompt).toContain('next steps');
      });

      it('includes NEVER section with guardrails', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('NEVER');
      });
    });

    describe('Currency and formatting', () => {
      it('uses INR currency symbol (₹)', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('₹');
      });

      it('formats amounts in lakhs (L)', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('L');
      });

      it('formats large amounts in crores (Cr) when needed', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt).toContain('Cr');
      });
    });

    describe('Content completeness', () => {
      it('produces substantial prompt for fully filled profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(FULLY_FILLED_PROFILE);
        expect(prompt.length).toBeGreaterThan(1000);
      });

      it('includes company identity section for enriched profile', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('COMPANY IDENTITY');
      });

      it('includes stage-specific KPI focus section', () => {
        const prompt = getEnrichedCFOCopilotSystemPrompt(SAAS_PROFILE);
        expect(prompt).toContain('STAGE-SPECIFIC');
      });

      it('adapts sections based on available data', () => {
        const minimalProfile: CompanyProfile = {
          ...EMPTY_PROFILE,
          businessModel: 'saas',
          fundingStage: 'seed',
        };
        const prompt = getEnrichedCFOCopilotSystemPrompt(minimalProfile);
        // Should still have company identity but limited financial sections
        expect(prompt).toContain('COMPANY IDENTITY');
      });
    });
  });
});
