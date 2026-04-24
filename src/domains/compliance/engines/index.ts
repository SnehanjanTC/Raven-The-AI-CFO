// ── Calculation Engines ──
export {
  calculateTDS,
  calculateTDS206AB,
  calculateTDSNonResident,
  getRatesForSection,
  getTDSContext,
  TDS_RATES,
  TDS_DEPOSIT_DEADLINES,
  TDS_RETURN_DUE_DATES,
  SURCHARGE_AND_CESS,
  TDS_206AB_CONFIG,
  DTAA_RATES
} from './tds';
export type {
  TDSRate,
  TDSCalculation,
  TDS206ABCalculation,
  TDSNonResidentCalculation,
  SurchargeAndCess,
  TDS206ABConfig,
  LowerDeductionCertificate,
  DTAARate
} from './tds';

export {
  calculateGST,
  reverseCalculateGST,
  reconcileITC,
  calculateCompositionTax,
  determinePlaceOfSupply,
  isRCMApplicable,
  calculateCreditNote,
  calculateLateFee,
  getGSTContext,
  GST_SLABS,
  GST_RETURNS,
  ITC_RULES,
  COMMON_SAC_CODES,
  E_INVOICE,
  COMPOSITION_SCHEME,
  COMPOSITION_RATES,
  RCM_SERVICES
} from './gst';
export type {
  GSTRate,
  GSTCalculation,
  ITCMismatch,
  CompositionTaxCalculation,
  PlaceOfSupply,
  CreditNoteCalculation,
  LateFeeCalculation,
  CompositionSchemeConfig,
  RCMService
} from './gst';

export {
  calculatePTax,
  calculatePTaxPayroll,
  calculatePTaxEmployer,
  checkExemption,
  calculatePTaxPenalty,
  getPTaxContext,
  PTAX_STATES,
  EMPLOYER_PT_FEES,
  PTAX_EXEMPTIONS
} from './ptax';
export type {
  PTaxSlab,
  StateConfig,
  PTaxCalculation,
  EmployerPTCalculation,
  EmployerPTConfig,
  ExemptionConfig,
  PTaxPenalty
} from './ptax';

export {
  calculateDepreciation,
  calculateMAT,
  calculateMATCredit,
  calculateDeferredTax,
  getRelatedPartyDisclosureTemplate,
  identifyReportableSegments,
  calculateImpairment,
  getImpairmentIndicators,
  getIndianGAAPContext,
  ACCOUNTING_STANDARDS,
  DEPRECIATION_SCHEDULE,
  SCHEDULE_III_PNL,
  RELATED_PARTY_CATEGORIES,
  SEGMENT_REPORTING_THRESHOLDS,
  IMPAIRMENT_INDICATORS
} from './indian-gaap';
export type {
  AccountingStandard,
  DepreciationAsset,
  DepreciationCalc,
  MATCalculation,
  MATCredit,
  TimingDifference,
  DeferredTaxCalculation,
  RelatedPartyCategory,
  SegmentInfo,
  ReportableSegment,
  ImpairmentCalculation
} from './indian-gaap';

// ── Compliance API Service & Types ──
export type * from '../types';
export { ComplianceService } from '../api';

// ── React Hooks ──
export {
  useComplianceFilings,
  useComplianceDeadlines,
  useComplianceSummary,
  useLedgerData,
  useAuditLog,
  useTDSLiability,
  useGSTLiability,
  usePTaxSummary,
  usePnLSummary,
} from '../hooks';
