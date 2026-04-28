/**
 * Indian GAAP Rule Engine — Accounting Standards (AS) + Companies Act 2013
 * Covers Schedule III P&L format, depreciation, revenue recognition, and key AS references
 *
 * Last updated: FY 2025-26
 */

import type { CompanyProfile } from '@/types/company-profile';

// ── Accounting Standards Reference ───────────────────────────────────────
export interface AccountingStandard {
  code: string;
  title: string;
  summary: string;
  keyRules: string[];
  applicability: string;
}

export const ACCOUNTING_STANDARDS: AccountingStandard[] = [
  {
    code: 'AS-1',
    title: 'Disclosure of Accounting Policies',
    summary: 'Requires disclosure of all significant accounting policies adopted in preparation of financial statements.',
    keyRules: [
      'Going concern, consistency, and accrual are fundamental assumptions',
      'Change in policy only if required by statute or for better presentation',
      'Impact of change must be disclosed',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-2',
    title: 'Valuation of Inventories',
    summary: 'Inventory valued at lower of cost or net realizable value.',
    keyRules: [
      'Cost = purchase price + conversion costs + other costs to bring to present condition',
      'Methods: FIFO or Weighted Average (LIFO not permitted)',
      'Write-down to NRV if cost > NRV',
    ],
    applicability: 'All enterprises (except service contracts, WIP of contractors)'
  },
  {
    code: 'AS-4',
    title: 'Contingencies and Events After Balance Sheet Date',
    summary: 'Adjustments for events providing evidence of conditions at balance sheet date.',
    keyRules: [
      'Adjusting events: must adjust financial statements',
      'Non-adjusting events: disclose in notes only',
      'Contingent losses: provide if probable, disclose if possible',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-6',
    title: 'Depreciation Accounting',
    summary: 'Systematic allocation of depreciable amount over useful life.',
    keyRules: [
      'Methods: Straight-Line (SLM) or Written-Down Value (WDV)',
      'Useful life as per Schedule II of Companies Act 2013 (minimum)',
      'Residual value: max 5% of original cost',
      'Change in method: retrospective effect disclosed',
      'Component accounting: significant parts depreciated separately',
    ],
    applicability: 'All enterprises with depreciable assets'
  },
  {
    code: 'AS-9',
    title: 'Revenue Recognition',
    summary: 'Revenue recognized when property in goods transferred or service rendered.',
    keyRules: [
      'Sale of goods: recognized at point of transfer of risks and rewards',
      'Services: proportionate completion method or completed service contract method',
      'Interest: time proportion basis',
      'Royalties: accrual basis per agreement',
      'Dividends: when right to receive is established',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-10',
    title: 'Property, Plant and Equipment',
    summary: 'Recognition, measurement, and disclosure of PPE.',
    keyRules: [
      'Cost model: historical cost less depreciation and impairment',
      'Subsequent expenditure: capitalized if it increases future benefit',
      'Disposal: difference between proceeds and carrying value = gain/loss',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-12',
    title: 'Accounting for Government Grants',
    summary: 'Recognition and treatment of government grants and subsidies.',
    keyRules: [
      'Recognize when reasonable assurance of compliance and receipt',
      'Capital grants: credit to capital reserve or deducted from asset',
      'Revenue grants: credit to P&L or deducted from expense',
    ],
    applicability: 'All enterprises receiving government grants'
  },
  {
    code: 'AS-15',
    title: 'Employee Benefits',
    summary: 'Accounting for short-term and long-term employee benefits.',
    keyRules: [
      'Gratuity: defined benefit — actuarial valuation required',
      'Leave encashment: present value of obligation',
      'Provident fund: defined contribution — expense as incurred',
      'Actuarial gains/losses: recognized in P&L immediately',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-17',
    title: 'Segment Reporting',
    summary: 'Disclosure of financial information by business and geographical segments.',
    keyRules: [
      'Primary basis: business or geographical segments',
      'Segment revenue, result, assets, and liabilities to be disclosed',
      'Inter-segment transfers at market price or actual prices',
    ],
    applicability: 'Listed companies and enterprises with turnover > ₹50 Cr'
  },
  {
    code: 'AS-22',
    title: 'Accounting for Taxes on Income',
    summary: 'Tax effect accounting — deferred tax assets and liabilities.',
    keyRules: [
      'Timing differences: create DTA/DTL',
      'DTA recognized only if virtual certainty of realization',
      'Tax rates: enacted or substantially enacted at balance sheet date',
      'MAT credit: recognized as DTA if expected to be available in future',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-26',
    title: 'Intangible Assets',
    summary: 'Recognition and amortization of intangible assets.',
    keyRules: [
      'Recognize if probable future benefit and cost measurable',
      'Amortize over useful life (rebuttable presumption: max 10 years)',
      'Research cost: expense | Development cost: capitalize if criteria met',
    ],
    applicability: 'All enterprises'
  },
  {
    code: 'AS-28',
    title: 'Impairment of Assets',
    summary: 'Recognition and measurement of impairment losses.',
    keyRules: [
      'Test if carrying amount > recoverable amount',
      'Recoverable amount = higher of (net selling price, value in use)',
      'Impairment loss: recognized in P&L immediately',
      'Reversal: allowed if circumstances change (not goodwill)',
    ],
    applicability: 'All enterprises'
  }
];

// ── Schedule III P&L Line Items ──────────────────────────────────────────
export const SCHEDULE_III_PNL = {
  partI: 'Statement of P&L for the period ended __',
  sections: [
    {
      heading: 'I. Revenue from Operations',
      items: ['Sale of products', 'Sale of services', 'Other operating revenue'],
      note: 'Gross revenue less GST/excise/service tax'
    },
    {
      heading: 'II. Other Income',
      items: ['Interest income', 'Dividend income', 'Net gain on investments', 'Other non-operating income']
    },
    {
      heading: 'III. Total Income (I + II)',
      items: []
    },
    {
      heading: 'IV. Expenses',
      items: [
        'Cost of materials consumed',
        'Purchases of stock-in-trade',
        'Changes in inventories of FG, WIP, stock-in-trade',
        'Employee benefits expense',
        'Finance costs',
        'Depreciation and amortization expense',
        'Other expenses'
      ]
    },
    {
      heading: 'V. Profit Before Exceptional Items and Tax (III - IV)',
      items: []
    },
    {
      heading: 'VI. Exceptional Items',
      items: []
    },
    {
      heading: 'VII. Profit Before Tax (V + VI)',
      items: []
    },
    {
      heading: 'VIII. Tax Expense',
      items: ['Current tax', 'Deferred tax']
    },
    {
      heading: 'IX. Profit After Tax (VII - VIII)',
      items: []
    },
    {
      heading: 'X. Earnings Per Share',
      items: ['Basic EPS', 'Diluted EPS']
    }
  ]
};

// ── Depreciation Rates (Schedule II — SLM) ───────────────────────────────
export interface DepreciationAsset {
  category: string;
  usefulLifeYears: number;
  slmRate: number;     // % per year
  wdvRate: number;     // % per year (approx)
}

export const DEPRECIATION_SCHEDULE: DepreciationAsset[] = [
  { category: 'Buildings — Factory',           usefulLifeYears: 30, slmRate: 3.17,  wdvRate: 10.0 },
  { category: 'Buildings — Non-factory',       usefulLifeYears: 60, slmRate: 1.58,  wdvRate: 5.0 },
  { category: 'Furniture & Fittings',          usefulLifeYears: 10, slmRate: 9.50,  wdvRate: 25.89 },
  { category: 'Plant & Machinery — General',   usefulLifeYears: 15, slmRate: 6.33,  wdvRate: 18.10 },
  { category: 'Plant & Machinery — Computers', usefulLifeYears: 3,  slmRate: 31.67, wdvRate: 63.16 },
  { category: 'Plant & Machinery — Servers',   usefulLifeYears: 6,  slmRate: 15.83, wdvRate: 39.30 },
  { category: 'Vehicles — Motor Cars',         usefulLifeYears: 8,  slmRate: 11.88, wdvRate: 31.23 },
  { category: 'Vehicles — Commercial',         usefulLifeYears: 6,  slmRate: 15.83, wdvRate: 39.30 },
  { category: 'Intangible — Software',         usefulLifeYears: 5,  slmRate: 19.00, wdvRate: 45.07 },
  { category: 'Intangible — Patents/Copyrights', usefulLifeYears: 10, slmRate: 9.50, wdvRate: 25.89 },
  { category: 'Office Equipment',              usefulLifeYears: 5,  slmRate: 19.00, wdvRate: 45.07 },
  { category: 'Electrical Installations',      usefulLifeYears: 10, slmRate: 9.50,  wdvRate: 25.89 },
];

// ── MAT (Minimum Alternate Tax) Configuration ────────────────────────────
export interface MATCalculation {
  bookProfit: number;
  matRate: number;      // 15%
  matBefore: number;    // MAT amount before surcharge/cess
  surchargeRate: number;
  matSurcharge: number;
  heccRate: number;
  matCess: number;
  totalMAT: number;
  notes: string;
}

export interface MATCredit {
  matPaid: number;
  normalTax: number;
  matCreditAvailable: number;
  normalTaxPayable: number;
  creditUtilized: number;
  creditCarryForward: number;
  carryForwardYears: number;  // 15 years
  notes: string;
}

// ── Deferred Tax Configuration ───────────────────────────────────────────
export interface TimingDifference {
  description: string;
  amount: number;
  type: 'taxable' | 'deductible';  // taxable = future taxable amt (DTA), deductible = future deductible amt (DTL)
}

export interface DeferredTaxCalculation {
  timingDifferences: TimingDifference[];
  taxRate: number;
  deferredTaxAssets: number;
  deferredTaxLiabilities: number;
  netDeferredTax: number;
  assumptions: string;
  notes: string;
}

// ── Related Party Configuration ──────────────────────────────────────────
export interface RelatedPartyCategory {
  code: string;
  description: string;
  criteria: string;
}

export const RELATED_PARTY_CATEGORIES: RelatedPartyCategory[] = [
  { code: 'Parent', description: 'Parent company', criteria: 'Direct or indirect ownership >50%' },
  { code: 'Subsidiary', description: 'Subsidiary company', criteria: 'Controlled by entity >50%' },
  { code: 'Associate', description: 'Associate company', criteria: 'Significant influence (20–50%)' },
  { code: 'JointVenture', description: 'Joint venture partner', criteria: 'Joint control arrangement' },
  { code: 'Key Management', description: 'Key management personnel', criteria: 'Directors, senior executives' },
  { code: 'Entity with Common Director', description: 'Entity with common director', criteria: 'Same individual as director' },
  { code: 'Relative', description: 'Relative of KMP', criteria: 'Family member as defined in Act' },
];

// ── Segment Reporting Configuration ──────────────────────────────────────
export interface SegmentInfo {
  name: string;
  revenue: number;
  profit: number;
  assets: number;
  liabilities?: number;
}

export const SEGMENT_REPORTING_THRESHOLDS = {
  revenueThreshold: 0.10,  // 10% of total segment revenue
  profitThreshold: 0.10,   // 10% of total segment profit (absolute)
  assetThreshold: 0.10,    // 10% of total segment assets
};

export interface ReportableSegment {
  name: string;
  revenue: number;
  profit: number;
  assets: number;
  reasonForReporting: string[];  // e.g., ['revenue threshold', 'profit threshold']
}

// ── Impairment of Assets Configuration ───────────────────────────────────
export interface ImpairmentCalculation {
  description: string;
  carryingAmount: number;
  recoverableAmount: number;
  impairmentLoss: number;
  requiresImpairment: boolean;
  notes: string;
}

export const IMPAIRMENT_INDICATORS = [
  'Significant decline in asset market price',
  'Technological obsolescence',
  'Significant change in legal or regulatory environment',
  'Market interest rates or rates of return have increased significantly',
  'Carrying amount exceeds market cap (entity level)',
  'Evidence of obsolescence or physical deterioration',
  'Significant underperformance relative to expectations',
  'Economic conditions have deteriorated',
  'Business restructuring or discontinued operations',
];

// ── Depreciation Calculator ──────────────────────────────────────────────
export interface DepreciationCalc {
  category: string;
  originalCost: number;
  residualValue: number;
  depreciableAmount: number;
  method: 'SLM' | 'WDV';
  annualDepreciation: number;
  rate: number;
  usefulLife: number;
}

// ── MAT Calculation ─────────────────────────────────────────────────────
export function calculateMAT(bookProfit: number, surchargeRate: number = 0): MATCalculation {
  const matRate = 15;
  const matBefore = Math.round(bookProfit * matRate / 100);
  const matSurcharge = Math.round(matBefore * surchargeRate / 100);
  const heccRate = 4;
  const matCess = Math.round((matBefore + matSurcharge) * heccRate / 100);
  const totalMAT = matBefore + matSurcharge + matCess;

  return {
    bookProfit,
    matRate,
    matBefore,
    surchargeRate,
    matSurcharge,
    heccRate,
    matCess,
    totalMAT,
    notes: `MAT @${matRate}% on book profit ₹${bookProfit.toLocaleString('en-IN')}. Total with surcharge & H&EC: ₹${totalMAT.toLocaleString('en-IN')}. Sec 115JB applies if company's income-tax is less than MAT.`
  };
}

// ── MAT Credit Tracking ──────────────────────────────────────────────────
export function calculateMATCredit(matPaid: number, normalTax: number): MATCredit {
  const matCreditAvailable = matPaid;
  const creditUtilized = Math.min(matCreditAvailable, Math.max(0, normalTax - matPaid));
  const creditCarryForward = matCreditAvailable - creditUtilized;
  const carryForwardYears = 15;

  return {
    matPaid,
    normalTax,
    matCreditAvailable,
    normalTaxPayable: Math.max(normalTax, matPaid),
    creditUtilized,
    creditCarryForward,
    carryForwardYears,
    notes: `MAT credit: ₹${creditUtilized.toLocaleString('en-IN')} utilized against current year tax. ₹${creditCarryForward.toLocaleString('en-IN')} to be carried forward for next ${carryForwardYears} years.`
  };
}

// ── Deferred Tax Calculation ─────────────────────────────────────────────
export function calculateDeferredTax(
  timingDifferences: TimingDifference[],
  taxRate: number
): DeferredTaxCalculation {
  let totalDeductible = 0;
  let totalTaxable = 0;

  timingDifferences.forEach(td => {
    if (td.type === 'deductible') {
      totalDeductible += td.amount;  // Creates DTA
    } else {
      totalTaxable += td.amount;     // Creates DTL
    }
  });

  const deferredTaxAssets = Math.round(totalDeductible * taxRate / 100);
  const deferredTaxLiabilities = Math.round(totalTaxable * taxRate / 100);
  const netDeferredTax = deferredTaxAssets - deferredTaxLiabilities;

  return {
    timingDifferences,
    taxRate,
    deferredTaxAssets,
    deferredTaxLiabilities,
    netDeferredTax,
    assumptions: `Tax rate: ${taxRate}%. DTA recognized only if virtual certainty of realization. AS-22 compliant.`,
    notes: `Net DTA/(DTL): ₹${netDeferredTax.toLocaleString('en-IN')}. Total deductible timing differences: ₹${totalDeductible.toLocaleString('en-IN')}; Taxable: ₹${totalTaxable.toLocaleString('en-IN')}.`
  };
}

// ── Related Party Disclosure Template ────────────────────────────────────
export function getRelatedPartyDisclosureTemplate(): string {
  const categories = RELATED_PARTY_CATEGORIES
    .map(c => `${c.code}: ${c.description} — ${c.criteria}`)
    .join('\n');

  return `## Related Party Disclosures (AS-18) Template

### Related Party Categories:
${categories}

### Disclosure Requirements:
1. Nature of relationship (e.g., parent, subsidiary, associate, KMP)
2. Name and location of related party
3. Nature and volume of transactions
4. Amounts outstanding
5. Pricing policy (if applicable)
6. Terms and conditions (if applicable)
7. Amount of transactions as % of total transactions (if material)

### Transactions to Disclose:
- Sale/purchase of goods or services
- Transfers of research and development
- Transfers of assets and liabilities
- Lease agreements
- Financing arrangements
- Guarantees and collateral
- Management service contracts
- Related party commitments and contingencies`;
}

// ── Segment Reporting Identification ─────────────────────────────────────
export function identifyReportableSegments(
  segments: SegmentInfo[],
  totals: { revenue: number; profit: number; assets: number }
): ReportableSegment[] {
  const reportable: ReportableSegment[] = [];

  segments.forEach(segment => {
    const reasons: string[] = [];

    // Revenue threshold: 10%
    if (segment.revenue >= totals.revenue * SEGMENT_REPORTING_THRESHOLDS.revenueThreshold) {
      reasons.push(`Revenue >10% (₹${segment.revenue.toLocaleString('en-IN')} vs threshold ₹${(totals.revenue * 0.1).toLocaleString('en-IN')})`);
    }

    // Profit threshold: 10% (absolute value)
    if (Math.abs(segment.profit) >= Math.abs(totals.profit) * SEGMENT_REPORTING_THRESHOLDS.profitThreshold) {
      reasons.push(`Profit >10% (₹${segment.profit.toLocaleString('en-IN')} vs threshold ₹${(totals.profit * 0.1).toLocaleString('en-IN')})`);
    }

    // Asset threshold: 10%
    if (segment.assets >= totals.assets * SEGMENT_REPORTING_THRESHOLDS.assetThreshold) {
      reasons.push(`Assets >10% (₹${segment.assets.toLocaleString('en-IN')} vs threshold ₹${(totals.assets * 0.1).toLocaleString('en-IN')})`);
    }

    if (reasons.length > 0) {
      reportable.push({
        name: segment.name,
        revenue: segment.revenue,
        profit: segment.profit,
        assets: segment.assets,
        reasonForReporting: reasons
      });
    }
  });

  return reportable;
}

// ── Impairment of Assets Calculation ─────────────────────────────────────
export function calculateImpairment(
  carryingAmount: number,
  recoverableAmount: number,
  description: string = 'Asset'
): ImpairmentCalculation {
  const impairmentLoss = Math.max(0, carryingAmount - recoverableAmount);
  const requiresImpairment = impairmentLoss > 0;

  return {
    description,
    carryingAmount,
    recoverableAmount,
    impairmentLoss,
    requiresImpairment,
    notes: requiresImpairment
      ? `Impairment loss of ₹${impairmentLoss.toLocaleString('en-IN')} required (AS-28). Carrying amount ₹${carryingAmount.toLocaleString('en-IN')} exceeds recoverable amount ₹${recoverableAmount.toLocaleString('en-IN')}.`
      : `No impairment required. Carrying amount ₹${carryingAmount.toLocaleString('en-IN')} ≤ recoverable amount ₹${recoverableAmount.toLocaleString('en-IN')}.`
  };
}

// ── Get Impairment Indicators ────────────────────────────────────────────
export function getImpairmentIndicators(): string[] {
  return IMPAIRMENT_INDICATORS;
}

export function calculateDepreciation(
  category: string,
  originalCost: number,
  method: 'SLM' | 'WDV' = 'SLM',
  residualPercent: number = 5
): DepreciationCalc | null {
  const asset = DEPRECIATION_SCHEDULE.find(a =>
    a.category.toLowerCase().includes(category.toLowerCase())
  );
  if (!asset) return null;

  const residualValue = Math.round(originalCost * residualPercent / 100);
  const depreciableAmount = originalCost - residualValue;
  const rate = method === 'SLM' ? asset.slmRate : asset.wdvRate;
  const annualDepreciation = method === 'SLM'
    ? Math.round(depreciableAmount / asset.usefulLifeYears)
    : Math.round(originalCost * rate / 100);

  return {
    category: asset.category,
    originalCost,
    residualValue,
    depreciableAmount,
    method,
    annualDepreciation,
    rate,
    usefulLife: asset.usefulLifeYears
  };
}

// ── Enriched Indian GAAP Context (Entity & Turnover-Aware) ───────────────
export function getEnrichedGAAPContext(profile: CompanyProfile): string {
  let context = '## Enriched Indian GAAP & Audit Compliance Context\n\n';

  context += `### Your Company Profile\n`;
  context += `- Entity Type: ${profile.entityType?.toUpperCase() || 'Unknown'}\n`;

  // Calculate incorporation years
  let yearsIncorporated = 0;
  if (profile.incorporationDate) {
    const incorporationYear = new Date(profile.incorporationDate).getFullYear();
    const currentYear = new Date().getFullYear();
    yearsIncorporated = currentYear - incorporationYear;
    context += `- Incorporation Date: ${profile.incorporationDate}\n`;
    context += `- Years Incorporated: ${yearsIncorporated}\n`;
  }

  const annualRev = profile.monthlyRevenue ? profile.monthlyRevenue * 12 : 0;
  if (annualRev > 0) {
    context += `- Annual Turnover (estimated): ₹${annualRev.toLocaleString('en-IN')}\n`;
  }

  // Statutory Audit Requirement Determination
  context += `\n### Statutory Audit Requirement\n`;

  let auditRequired = false;
  let auditReason = '';

  switch (profile.entityType) {
    case 'pvt_ltd':
      auditRequired = true;
      auditReason = 'Private Limited companies must have statutory audit under Companies Act 2013 (Section 138) — MANDATORY, no turnover threshold';
      break;

    case 'opc':
      if (annualRev > 200000000) {  // ₹2Cr
        auditRequired = true;
        auditReason = 'OPC with turnover >₹2Cr: Statutory audit required (Sec 44AB)';
      }
      break;

    case 'llp':
      if (annualRev > 4000000 || (profile.totalCapitalRaised && profile.totalCapitalRaised > 2500000)) {
        auditRequired = true;
        auditReason = `LLP with turnover >₹40L or capital >₹25L: Statutory audit required`;
      }
      break;

    case 'partnership':
    case 'sole_proprietor':
      if (annualRev > 100000000) {  // ₹1Cr
        auditRequired = true;
        auditReason = 'Partnership/Sole Proprietor with turnover >₹1Cr: Tax audit required under Sec 44AB';
      }
      break;

    default:
      break;
  }

  if (auditRequired) {
    context += `- AUDIT REQUIRED: ${auditReason}\n`;
    if (!profile.auditorAppointed) {
      context += `- URGENT: No auditor appointed yet. You must appoint a Chartered Accountant immediately.\n`;
    } else {
      context += `- Auditor Status: Appointed (good compliance posture)\n`;
    }
  } else {
    context += `- Audit Status: NOT required for your entity type/turnover\n`;
    if (profile.auditorAppointed) {
      context += `- Note: Even though not mandatory, you've appointed an auditor (best practice for credibility)\n`;
    }
  }

  // Revenue Recognition by Business Model
  context += `\n### Revenue Recognition Guidance (AS-9)\n`;
  if (profile.businessModel === 'saas' || profile.businessModel === 'hybrid') {
    context += `- SaaS/Subscription Revenue: Recognized OVER service period, NOT upfront\n`;
    context += `  • Monthly/annual subscription: recognize ratably over months/year\n`;
    context += `  • One-time setup fees: can be recognized upfront (with supporting policy)\n`;
    context += `  • Refunds: reduce revenue if probable\n`;
  }

  if (profile.businessModel === 'marketplace') {
    context += `- Marketplace Revenue: ONLY commission/take-rate counts — NOT Gross Merchandise Value\n`;
    context += `  • GMV is a vanity metric; report it separately but not as revenue\n`;
    context += `  • Commission revenue recognized when transaction settles\n`;
    context += `  • Refunds/chargebacks reduce revenue immediately\n`;
  }

  if (profile.businessModel === 'd2c' || profile.businessModel === 'hardware') {
    context += `- D2C/Goods Revenue: Recognized at point of delivery/customer acceptance\n`;
    context += `  • Revenue is NET of returns and refunds\n`;
    context += `  • Warranty claims reduce revenue if measurable\n`;
    context += `  • FOB rules: Incoterm determines revenue recognition date\n`;
  }

  // Startup India Benefits
  if (yearsIncorporated <= 10 && annualRev < 1000000000) {  // <₹100Cr
    context += `\n### Startup India Benefits (Eligible)\n`;
    context += `- Your company is likely eligible for Startup India benefits\n`;
    context += `- Benefits: Income tax holiday (Sec 80-IAC), exemption from angel tax, trademark/patent fee waiver\n`;
    context += `- Note: Ensure incorporation via registration with Startup India portal\n`;
  }

  // Key Accounting Standards to track
  context += `\n### Critical Accounting Standards for Your Business\n`;
  context += `- AS-1: Accounting Policy disclosures (consistency, going concern)\n`;
  context += `- AS-2: Inventory valuation (if applicable) — FIFO/Weighted Avg only\n`;
  context += `- AS-6: Depreciation (if you have fixed assets) — SLM or WDV method\n`;
  context += `- AS-9: Revenue Recognition — critical for SaaS/marketplace/goods models\n`;
  context += `- AS-15: Employee Benefits — gratuity requires actuarial valuation\n`;
  context += `- AS-22: Deferred Tax — timing differences and MAT credit tracking\n`;

  // Schedule III P&L Format
  context += `\n### Schedule III P&L Format (Mandatory)\n`;
  context += `- All Indian companies must file financials in Schedule III format\n`;
  context += `- Revenue from Operations (gross less returns, excise, GST)\n`;
  context += `- Other Income (interest, dividend, gain on investments)\n`;
  context += `- Expenses by category (cost of materials, employee benefits, depreciation, finance costs)\n`;
  context += `- Profit Before Tax → Tax Expense → Profit After Tax\n`;

  return context;
}

// ── Format for AI context injection ──────────────────────────────────────
export function getIndianGAAPContext(): string {
  const asRefs = ACCOUNTING_STANDARDS.map(as =>
    `${as.code} — ${as.title}: ${as.summary}`
  ).join('\n');

  const depRates = DEPRECIATION_SCHEDULE.map(d =>
    `${d.category}: ${d.usefulLifeYears}yr, SLM ${d.slmRate}%, WDV ${d.wdvRate}%`
  ).join('\n');

  const pnlFormat = SCHEDULE_III_PNL.sections.map(s =>
    `${s.heading}${s.items.length ? '\n  ' + s.items.join('\n  ') : ''}`
  ).join('\n');

  const relatedParties = RELATED_PARTY_CATEGORIES.map(rp =>
    `${rp.code}: ${rp.description} — ${rp.criteria}`
  ).join('\n');

  const impairmentIndicatorsList = IMPAIRMENT_INDICATORS.join('\n- ');

  return `## Indian GAAP Rule Engine — Accounting Standards + Companies Act 2013 (FY 2025-26)

### Applicable Accounting Standards:
${asRefs}

### Schedule III P&L Format (Companies Act 2013):
${pnlFormat}

### Depreciation Rates (Schedule II):
${depRates}

### MAT (Minimum Alternate Tax) — Section 115JB:
- Rate: 15% of book profit
- Applicable when company's income-tax < MAT
- Plus surcharge & H&EC (4%) as per income tax rates
- MAT credit can be carried forward for 15 years

### Deferred Tax (AS-22):
- Timing differences create Deferred Tax Assets (DTA) or Liabilities (DTL)
- DTA recognized only if virtual certainty of realization
- Tax rates: enacted or substantially enacted at balance sheet date
- MAT credit recognized as DTA if expected to be available in future

### Related Party Disclosures (AS-18):
${relatedParties}

### Segment Reporting (AS-17):
- Reportable if: Revenue ≥10% of total, or Profit ≥10%, or Assets ≥10%
- Primary basis: business or geographical segments
- Required for listed companies and entities with turnover >₹50 Cr
- Disclosure: revenue, result, assets, liabilities, inter-segment transfers

### Impairment of Assets (AS-28):
- Test if carrying amount > recoverable amount
- Recoverable amount = higher of (net selling price, value in use)
- Impairment loss recognized immediately in P&L
- Reversal allowed if circumstances change (not goodwill)
- Indicators: market decline, obsolescence, regulatory changes, underperformance

Impairment indicators:
- ${impairmentIndicatorsList}

### Key Rules:
- Residual value: max 5% of original cost (Companies Act 2013)
- Depreciation methods: SLM (Straight-Line) or WDV (Written-Down Value)
- Component accounting required for significant parts
- Revenue under AS-9: recognized at transfer of risks/rewards
- Employee benefits under AS-15: gratuity requires actuarial valuation
- Deferred tax under AS-22: timing differences create DTA/DTL
- Tax Audit under Sec 44AB: mandatory if turnover > ₹1Cr (₹10Cr if cash receipts/payments < 5%)

### Calculators available:
- calculateDepreciation(category, originalCost, method, residualPercent)
  → Annual depreciation per accounting standard
- calculateMAT(bookProfit, surchargeRate)
  → MAT computation under Sec 115JB
- calculateMATCredit(matPaid, normalTax)
  → MAT credit utilization and carry-forward
- calculateDeferredTax(timingDifferences, taxRate)
  → DTA/DTL calculation per AS-22
- identifyReportableSegments(segments, totals)
  → Segment reporting determination per AS-17
- calculateImpairment(carryingAmount, recoverableAmount, description)
  → Impairment loss per AS-28
- getRelatedPartyDisclosureTemplate()
  → AS-18 disclosure template
- getImpairmentIndicators()
  → List of impairment indicators for review

Use these exact standards and rates. Never approximate depreciation, MAT, or AS references.`;
}
