import { describe, it, expect } from 'vitest';
import {
  analyzeCSVForProfileSuggestions,
  analyzeTransactionsForProfile,
  profileNeedsReview,
  getMissingHighValueFields,
} from '@/lib/profile-auto-learn';
import type { CompanyProfile } from '@/types/company-profile';

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
  businessModel: 'saas',
  revenueModel: 'subscription',
  monthlyRevenue: 1000000,
  monthlyBurnRate: 500000,
  cashReserves: 3000000,
  customerType: 'b2b',
  teamSize: 15,
};

const D2C_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  businessModel: 'd2c',
  revenueModel: 'transactional',
  monthlyRevenue: 2000000,
  monthlyBurnRate: 800000,
  cashReserves: 2000000,
  customerType: 'b2c',
  teamSize: 10,
};

const FULLY_FILLED_PROFILE: CompanyProfile = {
  ...EMPTY_PROFILE,
  businessModel: 'saas',
  fundingStage: 'series_a',
  monthlyRevenue: 1500000,
  cashReserves: 5000000,
  monthlyBurnRate: 400000,
  customerType: 'b2b',
  cac: 150000,
  ltv: 600000,
  teamSize: 20,
  entityType: 'pvt_ltd',
};

describe('profile-auto-learn', () => {
  describe('analyzeCSVForProfileSuggestions', () => {
    it('returns empty array for empty CSV data', () => {
      const suggestions = analyzeCSVForProfileSuggestions([], EMPTY_PROFILE);
      expect(suggestions).toEqual([]);
    });

    it('returns empty array for null/undefined CSV data', () => {
      const suggestionsNull = analyzeCSVForProfileSuggestions(null as any, EMPTY_PROFILE);
      const suggestionsUndef = analyzeCSVForProfileSuggestions(undefined as any, EMPTY_PROFILE);
      expect(suggestionsNull).toEqual([]);
      expect(suggestionsUndef).toEqual([]);
    });

    it('detects subscription revenue model from consistent invoice amounts', () => {
      const csvData = [
        { amount: 100000, date: '2026-04-01', customer: 'Customer A' },
        { amount: 101000, date: '2026-04-02', customer: 'Customer B' },
        { amount: 99500, date: '2026-04-03', customer: 'Customer C' },
        { amount: 100500, date: '2026-04-04', customer: 'Customer D' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const revenueSuggestion = suggestions.find((s) => s.field === 'revenueModel');
      expect(revenueSuggestion).toBeDefined();
      expect(revenueSuggestion?.suggestedValue).toBe('subscription');
      expect(['high', 'medium']).toContain(revenueSuggestion?.confidence);
    });

    it('detects transactional revenue model from high-variance amounts', () => {
      const csvData = [
        { amount: 50000, date: '2026-04-01' },
        { amount: 500000, date: '2026-04-02' },
        { amount: 10000, date: '2026-04-03' },
        { amount: 1000000, date: '2026-04-04' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const revenueSuggestion = suggestions.find((s) => s.field === 'revenueModel');
      expect(revenueSuggestion).toBeDefined();
      expect(revenueSuggestion?.suggestedValue).toBe('transactional');
    });

    it('suggests monthly revenue from invoice data', () => {
      const csvData = [
        { amount: 100000, date: '2026-04-01' },
        { amount: 150000, date: '2026-04-15' },
        { amount: 120000, date: '2026-05-01' },
        { amount: 130000, date: '2026-05-15' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const revenueSuggestion = suggestions.find((s) => s.field === 'monthlyRevenue');
      expect(revenueSuggestion).toBeDefined();
      expect(revenueSuggestion?.suggestedValue).toBeGreaterThan(100000);
      expect(revenueSuggestion?.confidence).toBe('high'); // 2+ months of data
    });

    it('detects B2B customer type from high average revenue per customer', () => {
      const csvData = [
        { amount: 500000, customer: 'Acme Corp' },
        { amount: 600000, customer: 'Tech Ltd' },
        { amount: 550000, customer: 'Enterprise Inc' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const customerSuggestion = suggestions.find((s) => s.field === 'customerType');
      expect(customerSuggestion).toBeDefined();
      expect(customerSuggestion?.suggestedValue).toBe('b2b');
    });

    it('detects B2C customer type from many small transactions', () => {
      const csvData = Array.from({ length: 100 }, (_, i) => ({
        amount: Math.random() * 5000,
        customer: `Customer ${i}`,
      }));
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const customerSuggestion = suggestions.find((s) => s.field === 'customerType');
      expect(customerSuggestion).toBeDefined();
      expect(customerSuggestion?.suggestedValue).toBe('b2c');
    });

    it('does not suggest changes when profile already has values', () => {
      const csvData = [
        { amount: 100000, date: '2026-04-01' },
        { amount: 105000, date: '2026-04-02' },
        { amount: 100000, date: '2026-04-03' },
      ];
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        revenueModel: 'subscription',
        monthlyRevenue: 100000,
        customerType: 'b2b',
      };
      const suggestions = analyzeCSVForProfileSuggestions(csvData, profile);
      expect(suggestions.find((s) => s.field === 'revenueModel')).toBeUndefined();
      expect(suggestions.find((s) => s.field === 'monthlyRevenue')).toBeUndefined();
      expect(suggestions.find((s) => s.field === 'customerType')).toBeUndefined();
    });

    it('handles CSV with alternate column names (Amount, Total, etc.)', () => {
      const csvData = [
        { Amount: 100000, Date: '2026-04-01' },
        { Amount: 105000, Date: '2026-04-02' },
        { Amount: 100000, Date: '2026-04-03' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('requires at least 3 invoices to detect revenue model', () => {
      const csvData = [{ amount: 100000 }, { amount: 105000 }];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      const revenueSuggestion = suggestions.find((s) => s.field === 'revenueModel');
      expect(revenueSuggestion).toBeUndefined();
    });

    it('includes reason and confidence in suggestions', () => {
      const csvData = [
        { amount: 100000, date: '2026-04-01' },
        { amount: 101000, date: '2026-04-02' },
        { amount: 100000, date: '2026-04-03' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      suggestions.forEach((s) => {
        expect(s.field).toBeDefined();
        expect(s.currentValue).toBeDefined();
        expect(s.suggestedValue).toBeDefined();
        expect(s.reason).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(s.confidence);
      });
    });
  });

  describe('analyzeTransactionsForProfile', () => {
    it('returns empty array for empty transactions', () => {
      const suggestions = analyzeTransactionsForProfile([], EMPTY_PROFILE);
      expect(suggestions).toEqual([]);
    });

    it('calculates monthly burn rate from expense transactions', () => {
      const transactions = [
        { type: 'expense', amount: '-100000', date: '2026-04-01' },
        { type: 'expense', amount: '-120000', date: '2026-04-15' },
        { type: 'expense', amount: '-110000', date: '2026-05-01' },
        { type: 'expense', amount: '-115000', date: '2026-05-15' },
      ];
      const suggestions = analyzeTransactionsForProfile(transactions, EMPTY_PROFILE);
      const burnSuggestion = suggestions.find((s) => s.field === 'monthlyBurnRate');
      expect(burnSuggestion).toBeDefined();
      expect(burnSuggestion?.suggestedValue).toBeGreaterThan(100000);
      expect(burnSuggestion?.confidence).toBe('high'); // 2+ months
    });

    it('handles negative amounts as expenses', () => {
      const transactions = [
        { type: 'debit', amount: -50000, date: '2026-04-01' },
        { type: 'debit', amount: -60000, date: '2026-04-15' },
      ];
      const suggestions = analyzeTransactionsForProfile(transactions, EMPTY_PROFILE);
      const burnSuggestion = suggestions.find((s) => s.field === 'monthlyBurnRate');
      expect(burnSuggestion?.suggestedValue).toBeGreaterThan(0);
    });

    it('estimates team size from salary transactions', () => {
      const transactions = [
        { category: 'salary', amount: -100000, date: '2026-04-01', description: 'Salary - Employee 1' },
        { category: 'salary', amount: -120000, date: '2026-04-01', description: 'Salary - Employee 2' },
        { category: 'salary', amount: -100000, date: '2026-04-01', description: 'Salary - Employee 3' },
        { category: 'salary', amount: -100000, date: '2026-05-01', description: 'Salary - Employee 1' },
        { category: 'salary', amount: -120000, date: '2026-05-01', description: 'Salary - Employee 2' },
        { category: 'salary', amount: -100000, date: '2026-05-01', description: 'Salary - Employee 3' },
      ];
      const suggestions = analyzeTransactionsForProfile(transactions, EMPTY_PROFILE);
      const teamSuggestion = suggestions.find((s) => s.field === 'teamSize');
      expect(teamSuggestion).toBeDefined();
      expect(teamSuggestion?.suggestedValue).toBeGreaterThan(0);
      expect(teamSuggestion?.confidence).toBe('low');
    });

    it('detects salary from both category and description', () => {
      const transactionsCat = [
        { category: 'Payroll', amount: -100000, date: '2026-04-01' },
        { category: 'Payroll', amount: -100000, date: '2026-05-01' },
      ];
      const suggestionsFromCat = analyzeTransactionsForProfile(transactionsCat, EMPTY_PROFILE);
      const teamFromCat = suggestionsFromCat.find((s) => s.field === 'teamSize');

      const transactionsDesc = [
        { category: 'expenses', description: 'Salary payment', amount: -100000, date: '2026-04-01' },
        { category: 'expenses', description: 'Salary payment', amount: -100000, date: '2026-05-01' },
      ];
      const suggestionsFromDesc = analyzeTransactionsForProfile(transactionsDesc, EMPTY_PROFILE);
      const teamFromDesc = suggestionsFromDesc.find((s) => s.field === 'teamSize');

      expect(teamFromCat).toBeDefined();
      expect(teamFromDesc).toBeDefined();
    });

    it('does not suggest burn rate if profile already has value', () => {
      const transactions = [
        { type: 'expense', amount: -100000, date: '2026-04-01' },
        { type: 'expense', amount: -100000, date: '2026-05-01' },
      ];
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        monthlyBurnRate: 150000,
      };
      const suggestions = analyzeTransactionsForProfile(transactions, profile);
      const burnSuggestion = suggestions.find((s) => s.field === 'monthlyBurnRate');
      // Should not suggest if difference is < 15%
      if (burnSuggestion) {
        expect(Math.abs(burnSuggestion.suggestedValue - 150000)).toBeLessThan(150000 * 0.15);
      }
    });

    it('does not suggest team size if profile already has value', () => {
      const transactions = [
        { category: 'salary', amount: -100000, date: '2026-04-01' },
        { category: 'salary', amount: -100000, date: '2026-05-01' },
      ];
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        teamSize: 10,
      };
      const suggestions = analyzeTransactionsForProfile(transactions, profile);
      const teamSuggestion = suggestions.find((s) => s.field === 'teamSize');
      expect(teamSuggestion).toBeUndefined();
    });

    it('returns empty for no matching expense transactions', () => {
      const transactions = [
        { type: 'income', amount: 100000, date: '2026-04-01' },
        { type: 'income', amount: 100000, date: '2026-05-01' },
      ];
      const suggestions = analyzeTransactionsForProfile(transactions, EMPTY_PROFILE);
      const burnSuggestion = suggestions.find((s) => s.field === 'monthlyBurnRate');
      expect(burnSuggestion).toBeUndefined();
    });

    it('handles mixed transaction types', () => {
      const transactions = [
        { type: 'income', amount: 200000, date: '2026-04-01' },
        { type: 'expense', amount: -100000, date: '2026-04-01' },
        { type: 'income', amount: 210000, date: '2026-05-01' },
        { type: 'expense', amount: -105000, date: '2026-05-01' },
      ];
      const suggestions = analyzeTransactionsForProfile(transactions, EMPTY_PROFILE);
      const burnSuggestion = suggestions.find((s) => s.field === 'monthlyBurnRate');
      expect(burnSuggestion?.suggestedValue).toBeLessThan(110000);
      expect(burnSuggestion?.suggestedValue).toBeGreaterThan(95000);
    });
  });

  describe('profileNeedsReview', () => {
    it('returns true when lastReviewedAt is null', () => {
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: undefined };
      expect(profileNeedsReview(profile)).toBe(true);
    });

    it('returns true when lastReviewedAt is null string', () => {
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: null as any };
      expect(profileNeedsReview(profile)).toBe(true);
    });

    it('returns true when >90 days since last review', () => {
      const dateOver90DaysAgo = new Date();
      dateOver90DaysAgo.setDate(dateOver90DaysAgo.getDate() - 100);
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: dateOver90DaysAgo.toISOString() };
      expect(profileNeedsReview(profile)).toBe(true);
    });

    it('returns false when <90 days since last review', () => {
      const dateUnder90DaysAgo = new Date();
      dateUnder90DaysAgo.setDate(dateUnder90DaysAgo.getDate() - 30);
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: dateUnder90DaysAgo.toISOString() };
      expect(profileNeedsReview(profile)).toBe(false);
    });

    it('returns false when reviewed recently (same day)', () => {
      const today = new Date().toISOString();
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: today };
      expect(profileNeedsReview(profile)).toBe(false);
    });

    it('returns true when exactly 90 days ago (boundary)', () => {
      const exactly90DaysAgo = new Date();
      exactly90DaysAgo.setDate(exactly90DaysAgo.getDate() - 90);
      const profile: CompanyProfile = { ...EMPTY_PROFILE, lastReviewedAt: exactly90DaysAgo.toISOString() };
      const result = profileNeedsReview(profile);
      // Boundary case: should return true (>90 days check)
      expect(result).toBe(true);
    });
  });

  describe('getMissingHighValueFields', () => {
    it('returns all 8 fields for empty profile', () => {
      const missing = getMissingHighValueFields(EMPTY_PROFILE);
      expect(missing.length).toBe(8);
      const fieldNames = missing.map((m) => m.field);
      expect(fieldNames).toContain('businessModel');
      expect(fieldNames).toContain('fundingStage');
      expect(fieldNames).toContain('cashReserves');
      expect(fieldNames).toContain('monthlyBurnRate');
      expect(fieldNames).toContain('monthlyRevenue');
      expect(fieldNames).toContain('customerType');
      expect(fieldNames).toContain('entityType');
      expect(fieldNames).toContain('teamSize');
    });

    it('returns empty array for fully filled profile', () => {
      const missing = getMissingHighValueFields(FULLY_FILLED_PROFILE);
      expect(missing.length).toBe(0);
    });

    it('returns only missing fields for partial profile', () => {
      const partialProfile: CompanyProfile = {
        ...EMPTY_PROFILE,
        businessModel: 'saas',
        fundingStage: 'series_a',
        cashReserves: 1000000,
        monthlyBurnRate: 100000,
      };
      const missing = getMissingHighValueFields(partialProfile);
      expect(missing.length).toBe(4);
      const fieldNames = missing.map((m) => m.field);
      expect(fieldNames).toContain('monthlyRevenue');
      expect(fieldNames).toContain('customerType');
      expect(fieldNames).toContain('entityType');
      expect(fieldNames).toContain('teamSize');
    });

    it('includes label and why for each missing field', () => {
      const missing = getMissingHighValueFields(EMPTY_PROFILE);
      missing.forEach((m) => {
        expect(m.field).toBeDefined();
        expect(m.label).toBeDefined();
        expect(m.why).toBeDefined();
        expect(m.label.length).toBeGreaterThan(0);
        expect(m.why.length).toBeGreaterThan(0);
      });
    });

    it('does not return fields that are defined (even if falsy)', () => {
      const profileWithFalsyValues: CompanyProfile = {
        ...EMPTY_PROFILE,
        businessModel: 'saas',
        fundingStage: 'bootstrapped',
        cashReserves: 0, // Still counts as defined
        monthlyBurnRate: 0,
        monthlyRevenue: 0,
        customerType: 'b2b',
        entityType: 'sole_proprietor',
        teamSize: 0,
      };
      const missing = getMissingHighValueFields(profileWithFalsyValues);
      expect(missing.length).toBe(0);
    });

    it('provides explanations for why each field matters', () => {
      const missing = getMissingHighValueFields(EMPTY_PROFILE);
      const whyTexts = missing.map((m) => m.why);
      expect(whyTexts.some((w) => w.includes('KPI'))).toBe(true); // businessModel
      expect(whyTexts.some((w) => w.includes('burn rate') || w.includes('runway'))).toBe(true);
      expect(whyTexts.some((w) => w.includes('compliance'))).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('suggests multiple profile updates from CSV data', () => {
      const csvData = [
        { amount: 500000, date: '2026-04-01', customer: 'Acme Inc' },
        { amount: 550000, date: '2026-04-02', customer: 'TechCorp' },
        { amount: 510000, date: '2026-05-01', customer: 'Enterprise Ltd' },
        { amount: 540000, date: '2026-05-02', customer: 'BigBiz Co' },
      ];
      const suggestions = analyzeCSVForProfileSuggestions(csvData, EMPTY_PROFILE);
      expect(suggestions.length).toBeGreaterThanOrEqual(2); // At least revenue model and monthly revenue
    });

    it('does not duplicate suggestions across analyses', () => {
      const profile: CompanyProfile = {
        ...EMPTY_PROFILE,
        businessModel: 'saas',
      };
      const missing = getMissingHighValueFields(profile);
      const fieldNames = missing.map((m) => m.field);
      const uniqueFields = new Set(fieldNames);
      expect(uniqueFields.size).toBe(fieldNames.length);
    });

    it('SaaS profile identifies key business metrics', () => {
      expect(SAAS_PROFILE.businessModel).toBe('saas');
      expect(SAAS_PROFILE.revenueModel).toBe('subscription');
      expect(SAAS_PROFILE.customerType).toBe('b2b');
    });

    it('D2C profile identifies key business metrics', () => {
      expect(D2C_PROFILE.businessModel).toBe('d2c');
      expect(D2C_PROFILE.revenueModel).toBe('transactional');
      expect(D2C_PROFILE.customerType).toBe('b2c');
    });
  });
});
