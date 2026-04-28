/**
 * TDS Rule Engine — Income Tax Act 1961, Chapter XVII-B
 * Covers Sections 192–206C for Tax Deducted at Source
 *
 * Last updated: FY 2025-26 (Budget 2025 rates)
 */

import type { CompanyProfile } from '@/types/company-profile';

export interface TDSRate {
  section: string;
  nature: string;
  threshold: number;        // Annual threshold in ₹ (0 = no threshold)
  rate: number;             // Rate in % (with PAN)
  rateNoPan: number;        // Rate in % (without PAN — Sec 206AA)
  surcharge?: string;       // Notes on surcharge/cess applicability
}

// ── TDS Rate Table (FY 2025-26) ──────────────────────────────────────────
export const TDS_RATES: TDSRate[] = [
  { section: '192',   nature: 'Salary',                                threshold: 0,       rate: -1,   rateNoPan: 20,  surcharge: 'As per income tax slab rates' },
  { section: '193',   nature: 'Interest on securities',                threshold: 10000,   rate: 10,   rateNoPan: 20 },
  { section: '194',   nature: 'Dividend',                              threshold: 5000,    rate: 10,   rateNoPan: 20 },
  { section: '194A',  nature: 'Interest (other than securities)',      threshold: 40000,   rate: 10,   rateNoPan: 20,  surcharge: '₹50K for senior citizens' },
  { section: '194B',  nature: 'Winnings from lottery',                 threshold: 10000,   rate: 30,   rateNoPan: 30 },
  { section: '194BB', nature: 'Winnings from horse race',              threshold: 10000,   rate: 30,   rateNoPan: 30 },
  { section: '194C',  nature: 'Contractor — Individual/HUF',          threshold: 30000,   rate: 1,    rateNoPan: 20,  surcharge: 'Single payment ₹30K or aggregate ₹1L' },
  { section: '194C',  nature: 'Contractor — Others',                   threshold: 30000,   rate: 2,    rateNoPan: 20 },
  { section: '194D',  nature: 'Insurance commission',                  threshold: 15000,   rate: 5,    rateNoPan: 20 },
  { section: '194DA', nature: 'Life insurance policy maturity',        threshold: 100000,  rate: 5,    rateNoPan: 20 },
  { section: '194E',  nature: 'Non-resident sportsperson / entertainer', threshold: 0,    rate: 20,   rateNoPan: 20 },
  { section: '194G',  nature: 'Lottery commission/prize',              threshold: 15000,   rate: 5,    rateNoPan: 20 },
  { section: '194H',  nature: 'Commission / Brokerage',               threshold: 15000,   rate: 5,    rateNoPan: 20 },
  { section: '194I',  nature: 'Rent — Plant/Machinery/Equipment',     threshold: 240000,  rate: 2,    rateNoPan: 20 },
  { section: '194I',  nature: 'Rent — Land/Building/Furniture',       threshold: 240000,  rate: 10,   rateNoPan: 20 },
  { section: '194IA', nature: 'Property transfer (>₹50L)',            threshold: 5000000, rate: 1,    rateNoPan: 20 },
  { section: '194IB', nature: 'Rent by individual/HUF (>₹50K/mo)',   threshold: 50000,   rate: 5,    rateNoPan: 20,  surcharge: 'Monthly threshold' },
  { section: '194J',  nature: 'Professional / Technical fees',        threshold: 30000,   rate: 10,   rateNoPan: 20 },
  { section: '194J',  nature: 'Fees for technical services (194J-a)', threshold: 30000,   rate: 2,    rateNoPan: 20 },
  { section: '194K',  nature: 'Mutual fund income',                   threshold: 5000,    rate: 10,   rateNoPan: 20 },
  { section: '194LA', nature: 'Compensation on land acquisition',     threshold: 250000,  rate: 10,   rateNoPan: 20 },
  { section: '194N',  nature: 'Cash withdrawal (>₹1Cr)',             threshold: 10000000, rate: 2,   rateNoPan: 20 },
  { section: '194O',  nature: 'E-commerce operator payment',          threshold: 500000,  rate: 1,    rateNoPan: 20 },
  { section: '194Q',  nature: 'Purchase of goods (>₹50L)',           threshold: 5000000, rate: 0.1,  rateNoPan: 5 },
  { section: '195',   nature: 'Non-resident (other than salary)',     threshold: 0,       rate: -1,   rateNoPan: 20,  surcharge: 'Rate depends on DTAA / nature' },
  { section: '206C',  nature: 'TCS — Sale of goods (>₹50L)',        threshold: 5000000, rate: 0.1,  rateNoPan: 1 },
];

// ── Deposit Deadlines ────────────────────────────────────────────────────
export const TDS_DEPOSIT_DEADLINES = {
  governmentDeductor: 'Same day of deduction',
  nonGovernment: '7th of the following month',
  marchDeduction: 'April 30 of the next financial year'
};

// ── Return Filing Due Dates ──────────────────────────────────────────────
export const TDS_RETURN_DUE_DATES = [
  { quarter: 'Q1 (Apr–Jun)', form24Q: 'Jul 31', form26Q: 'Jul 31' },
  { quarter: 'Q2 (Jul–Sep)', form24Q: 'Oct 31', form26Q: 'Oct 31' },
  { quarter: 'Q3 (Oct–Dec)', form24Q: 'Jan 31', form26Q: 'Jan 31' },
  { quarter: 'Q4 (Jan–Mar)', form24Q: 'May 31', form26Q: 'May 31' },
];

// ── Surcharge and H&EC Slabs ────────────────────────────────────────────
export interface SurchargeAndCess {
  surchargeSlabs: { minAmount: number; rate: number }[];
  heccRate: number;
}

export const SURCHARGE_AND_CESS: SurchargeAndCess = {
  surchargeSlabs: [
    { minAmount: 0, rate: 0 },
    { minAmount: 5000000, rate: 10 },    // ₹50L+: 10%
    { minAmount: 10000000, rate: 15 },   // ₹1Cr+: 15%
    { minAmount: 20000000, rate: 25 },   // ₹2Cr+: 25%
    { minAmount: 50000000, rate: 37 },   // ₹5Cr+: 37%
  ],
  heccRate: 4,                             // 4% H&EC on (tax + surcharge)
};

// ── Section 206AB (Higher TDS Rates) ─────────────────────────────────────
export interface TDS206ABConfig {
  specifiedPersonThreshold: number;        // ₹50K aggregate TDS/TCS
  yearsNotFiledReturns: number;             // 2 preceding years
}

export const TDS_206AB_CONFIG: TDS206ABConfig = {
  specifiedPersonThreshold: 50000,
  yearsNotFiledReturns: 2,
};

// ── Lower Deduction Certificate ──────────────────────────────────────────
export interface LowerDeductionCertificate {
  certificateNumber: string;
  lowerRate: number;
  validFrom: string;  // YYYY-MM-DD
  validTo: string;    // YYYY-MM-DD
}

// ── TDS Non-Resident (Sec 195) Configuration ────────────────────────────
export interface DTAARate {
  country: string;
  rate: number;
  applicableNature: string;
}

export const DTAA_RATES: DTAARate[] = [
  { country: 'USA', rate: 15, applicableNature: 'Interest, Royalties, Professional Fees' },
  { country: 'UK', rate: 10, applicableNature: 'Interest, Royalties, Professional Fees' },
  { country: 'Germany', rate: 10, applicableNature: 'Interest, Royalties' },
  { country: 'Singapore', rate: 15, applicableNature: 'Interest, Dividends' },
  { country: 'Japan', rate: 10, applicableNature: 'Interest, Royalties' },
];

// ── Calculator ───────────────────────────────────────────────────────────
export interface TDSCalculation {
  section: string;
  nature: string;
  amount: number;
  hasPan: boolean;
  rate: number;
  tdsAmount: number;
  surchargeAmount: number;
  heccAmount: number;
  totalTDS: number;
  netPayable: number;
  thresholdApplies: boolean;
  notes: string;
}

export interface TDS206ABCalculation {
  section: string;
  amount: number;
  baseRate: number;
  applicableRate: number;  // Whichever is higher: 2x rate or 5%
  tdsAmount: number;
  notes: string;
}

export interface TDSNonResidentCalculation {
  section: string;
  nature: string;
  amount: number;
  dtaaCountry?: string;
  applicableRate: number;
  tdsAmount: number;
  notes: string;
}

export function calculateTDS(
  section: string,
  amount: number,
  hasPan: boolean = true,
  isIndividualHUF: boolean = false,
  applyHigherRates: boolean = false,
  applyLowerRate?: LowerDeductionCertificate
): TDSCalculation | null {
  // Find matching rate entry
  let entry = TDS_RATES.find(r => {
    if (r.section !== section) return false;
    // For 194C, pick individual vs others
    if (section === '194C') {
      if (isIndividualHUF && r.nature.includes('Individual')) return true;
      if (!isIndividualHUF && r.nature.includes('Others')) return true;
      return false;
    }
    return true;
  });

  // Fallback: try first match
  if (!entry) entry = TDS_RATES.find(r => r.section === section);
  if (!entry) return null;

  // Threshold validation
  const thresholdApplies = entry.threshold > 0 && amount < entry.threshold;

  // Determine applicable rate (considering lower certificate)
  let applicableRate = entry.rate === -1 ? 0 : (hasPan ? entry.rate : entry.rateNoPan);
  if (applyLowerRate) {
    applicableRate = applyLowerRate.lowerRate;
  }

  const baseTDS = thresholdApplies ? 0 : Math.round(amount * applicableRate / 100);

  // Surcharge and H&EC calculation (when applyHigherRates is true)
  let surchargeAmount = 0;
  let heccAmount = 0;

  if (applyHigherRates && !thresholdApplies) {
    // Calculate surcharge
    for (let i = SURCHARGE_AND_CESS.surchargeSlabs.length - 1; i >= 0; i--) {
      if (amount >= SURCHARGE_AND_CESS.surchargeSlabs[i].minAmount) {
        surchargeAmount = Math.round(baseTDS * SURCHARGE_AND_CESS.surchargeSlabs[i].rate / 100);
        break;
      }
    }
    // Calculate H&EC (4% on tax + surcharge)
    heccAmount = Math.round((baseTDS + surchargeAmount) * SURCHARGE_AND_CESS.heccRate / 100);
  }

  const totalTDS = baseTDS + surchargeAmount + heccAmount;
  let notes = '';
  if (thresholdApplies) {
    notes = `Amount below threshold of ₹${entry.threshold.toLocaleString('en-IN')}. No TDS applicable.`;
  } else if (applyLowerRate) {
    notes = `Lower rate of ${applyLowerRate.lowerRate}% applied under certificate ${applyLowerRate.certificateNumber} (valid ${applyLowerRate.validFrom} to ${applyLowerRate.validTo}). TDS @${applicableRate}% under Sec ${section}.`;
  } else if (entry.rate === -1) {
    notes = 'Rate depends on income tax slab / DTAA. Use slab-based calculation.';
  } else if (!hasPan) {
    notes = `Higher rate of ${entry.rateNoPan}% applied — payee PAN not available (Sec 206AA).`;
  } else {
    notes = `TDS @${applicableRate}% under Sec ${section}.`;
  }

  if (applyHigherRates && surchargeAmount > 0) {
    notes += ` | Surcharge @${SURCHARGE_AND_CESS.surchargeSlabs.find(s => amount >= s.minAmount)?.rate || 0}% + H&EC @${SURCHARGE_AND_CESS.heccRate}%.`;
  }

  return {
    section: entry.section,
    nature: entry.nature,
    amount,
    hasPan,
    rate: applicableRate,
    tdsAmount: baseTDS,
    surchargeAmount,
    heccAmount,
    totalTDS,
    netPayable: amount - totalTDS,
    thresholdApplies,
    notes
  };
}

// ── Section 206AB Higher TDS Calculation ─────────────────────────────────
export function calculateTDS206AB(
  section: string,
  amount: number,
  aggregateTDSLastTwoYears: number = 0,
  hasNotFiledReturns: boolean = false
): TDS206ABCalculation | null {
  // Find base rate for section
  const entry = TDS_RATES.find(r => r.section === section);
  if (!entry || entry.rate === -1) return null;

  // Check if person qualifies as "specified person"
  const isSpecifiedPerson = hasNotFiledReturns && aggregateTDSLastTwoYears >= TDS_206AB_CONFIG.specifiedPersonThreshold;

  if (!isSpecifiedPerson) {
    return {
      section,
      amount,
      baseRate: entry.rate,
      applicableRate: entry.rate,
      tdsAmount: Math.round(amount * entry.rate / 100),
      notes: 'Sec 206AB not applicable — payee has filed returns or aggregate TDS < ₹50K.'
    };
  }

  // Apply higher rate: 2x base rate or 5%, whichever is higher
  const doubleRate = entry.rate * 2;
  const applicableRate = Math.max(doubleRate, 5);
  const tdsAmount = Math.round(amount * applicableRate / 100);

  return {
    section,
    amount,
    baseRate: entry.rate,
    applicableRate,
    tdsAmount,
    notes: `Sec 206AB: Higher TDS @${applicableRate}% (max of 2x normal rate or 5%) applied. Payee has not filed returns for ${TDS_206AB_CONFIG.yearsNotFiledReturns} preceding years and aggregate TDS ≥ ₹50K.`
  };
}

// ── TDS on Non-Resident (Sec 195) ────────────────────────────────────────
export function calculateTDSNonResident(
  section: string,
  nature: string,
  amount: number,
  dtaaCountry?: string
): TDSNonResidentCalculation | null {
  if (section !== '195') return null;

  let applicableRate = 20;  // Default for non-residents

  if (dtaaCountry) {
    const dtaaRate = DTAA_RATES.find(d => d.country.toLowerCase() === dtaaCountry.toLowerCase());
    if (dtaaRate && dtaaRate.applicableNature.toUpperCase().includes(nature.toUpperCase())) {
      applicableRate = dtaaRate.rate;
    }
  }

  const tdsAmount = Math.round(amount * applicableRate / 100);
  const notes = dtaaCountry
    ? `Non-resident (Sec 195): ${dtaaCountry} DTAA rate of ${applicableRate}% applied for ${nature}.`
    : `Non-resident (Sec 195): Default rate of ${applicableRate}% applied. No DTAA treaty rate available.`;

  return {
    section,
    nature,
    amount,
    dtaaCountry,
    applicableRate,
    tdsAmount,
    notes
  };
}

// ── Get all rates for a section ──────────────────────────────────────────
export function getRatesForSection(section: string): TDSRate[] {
  return TDS_RATES.filter(r => r.section === section);
}

// ── Enriched TDS Context (Entity-Aware) ──────────────────────────────────
export function getEnrichedTDSContext(profile: CompanyProfile): string {
  let context = '## Enriched TDS Compliance Context\n\n';

  // Entity type context
  context += `### Your Profile\n`;
  context += `- Entity Type: ${profile.entityType?.toUpperCase() || 'Unknown'}\n`;

  // TDS Deposit Schedule based on entity type
  if (profile.entityType === 'pvt_ltd' || profile.entityType === 'opc') {
    context += `- TDS Deposit Deadline: 7th of following month (government deductor-like rules apply)\n`;
  } else if (profile.entityType === 'llp' || profile.entityType === 'partnership') {
    context += `- TDS Deposit Deadline: 7th of following month (Sec 194A/194C timing varies by nature)\n`;
  } else if (profile.entityType === 'sole_proprietor') {
    context += `- TDS Deposit Deadline: 7th of following month\n`;
  }

  // Section 194C (Contractor) TDS Context
  if (profile.contractorCount && profile.contractorCount > 0) {
    context += `\n### Contractor TDS (Section 194C)\n`;
    context += `- You have ${profile.contractorCount} contractor(s) in your network\n`;
    context += `- TDS Applicability: 1% (Individual/HUF) or 2% (Others) when:\n`;
    context += `  • Single payment exceeds ₹30,000, OR\n`;
    context += `  • Aggregate payments in FY exceed ₹1,00,000\n`;
    context += `- Deduct from EACH payment >₹30K or aggregate it to monitor the ₹1L threshold\n`;
    context += `- Form 26Q (quarterly) must include all contractor payments\n`;
  }

  // Section 192 (Salary) TDS Context
  if (profile.teamSize && profile.teamSize > 0) {
    context += `\n### Salary TDS (Section 192)\n`;
    context += `- Team Size: ${profile.teamSize} employees\n`;
    context += `- Employer Responsibility: Deduct income tax from salary, deposit by 7th\n`;
    context += `- No fixed rate — depends on employee's slab (₹2.5L to ₹5L tax slab coverage for FY 2025-26)\n`;
    context += `- Form 16: Issue within 15 days of filing quarterly 24Q\n`;
    context += `- Surcharge applicability depends on individual taxable income\n`;
  }

  // Tax Audit Impact
  if (profile.auditorAppointed) {
    context += `\n### Tax Audit Scrutiny\n`;
    context += `- Your company has appointed an auditor\n`;
    context += `- TDS records will be audited under Sec 44AB/92 (if turnover threshold met)\n`;
    context += `- Ensure TDS deposits are on time — late deposits trigger Sec 201(1A) interest (1–1.5%/month)\n`;
    context += `- TDS return reconciliation with bank challan (281) is mandatory\n`;
  }

  // General best practices
  context += `\n### Key TDS Compliance Steps\n`;
  context += `1. File quarterly TDS returns (Form 24Q, 26Q, 27Q as applicable) by deadline\n`;
  context += `2. Maintain TDS deduction records (payee PAN, deduction date, amount)\n`;
  context += `3. Deposit TDS by 7th of following month (challan 281)\n`;
  context += `4. Issue Form 16/16A annually; reconcile with TRACES\n`;
  context += `5. Monitor Section 206AB (higher rates) if you haven't filed IT returns\n`;

  return context;
}

// ── Format for AI context injection ──────────────────────────────────────
export function getTDSContext(): string {
  const rateTable = TDS_RATES
    .filter(r => r.rate !== -1)
    .map(r => `Sec ${r.section} | ${r.nature} | Threshold: ₹${r.threshold.toLocaleString('en-IN')} | Rate: ${r.rate}% (${r.rateNoPan}% w/o PAN)`)
    .join('\n');

  const dtaaInfo = DTAA_RATES.map(d => `${d.country}: ${d.rate}% for ${d.applicableNature}`).join('\n');

  return `## TDS Rule Engine — Indian Income Tax Act 1961 (FY 2025-26)

### Key Rules:
- TDS must be deposited by 7th of the following month (Challan 281)
- March deductions: deposit by April 30
- Form 16/16A: issued to deductee within 15 days of filing quarterly return
- Quarterly returns: 24Q (salary), 26Q (non-salary residents), 27Q (non-residents), 27EQ (TCS)
- Sec 206AA: If deductee has no PAN, TDS @20% or applicable rate, whichever is higher
- Sec 206AB: Higher TDS (2x rate or 5%, whichever is higher) for specified persons (not filed returns for 2 years + aggregate TDS ≥ ₹50K)
- Sec 195 (Non-residents): No threshold; rates per DTAA if applicable; else 20% default
- Late filing penalty: ₹200/day under Sec 234E (max = TDS amount)
- Interest: 1% per month (late deduction) or 1.5% per month (late deposit) under Sec 201(1A)
- Surcharge: 10% on income >₹50L, 15% >₹1Cr, 25% >₹2Cr, 37% >₹5Cr
- H&EC: 4% on (tax + surcharge)

### TDS Rate Table:
${rateTable}

### DTAA Rates (Non-Residents):
${dtaaInfo}

### Surcharge & H&EC Slabs:
- ₹50L+: 10% surcharge
- ₹1Cr+: 15% surcharge
- ₹2Cr+: 25% surcharge
- ₹5Cr+: 37% surcharge
- H&EC: 4% on (tax + surcharge)

### Calculators:
- calculateTDS(section, amount, hasPan, isIndividualHUF, applyHigherRates, applyLowerRate)
  → Returns TDSCalculation with surcharge, H&EC, and total TDS
- calculateTDS206AB(section, amount, aggregateTDSLastTwoYears, hasNotFiledReturns)
  → Higher TDS rate application for specified persons
- calculateTDSNonResident(section, nature, amount, dtaaCountry)
  → Sec 195 TDS calculation with DTAA treaty rates

When user asks about TDS, use these exact rates and always check thresholds & surcharge applicability.`;
}
