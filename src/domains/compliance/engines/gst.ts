/**
 * GST Rule Engine — CGST Act 2017 + IGST Act 2017
 * Covers registration, rates, ITC, returns, and e-invoicing
 *
 * Last updated: FY 2025-26
 */

export interface GSTRate {
  hsnChapter: string;
  description: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess?: number;
}

// ── Common GST Rate Slabs ────────────────────────────────────────────────
export const GST_SLABS = [
  { rate: 0,  label: 'Nil',      examples: 'Fresh fruits, vegetables, milk, curd, bread, salt, natural honey' },
  { rate: 5,  label: '5% GST',   examples: 'Sugar, tea, edible oil, coal, footwear <₹500, transport, economy air tickets' },
  { rate: 12, label: '12% GST',  examples: 'Butter, ghee, almonds, mobile phones, business class air tickets, umbrella' },
  { rate: 18, label: '18% GST',  examples: 'Most goods & services — IT services, consulting, telecom, financial services, restaurant (AC)' },
  { rate: 28, label: '28% GST',  examples: 'Luxury items — cars, AC, washing machine, cement, aerated beverages' },
];

// ── SAC Codes for Services ───────────────────────────────────────────────
export const COMMON_SAC_CODES = [
  { sac: '9971', description: 'Financial & related services', rate: 18 },
  { sac: '9973', description: 'Leasing / rental services', rate: 18 },
  { sac: '9983', description: 'Other professional/technical services', rate: 18 },
  { sac: '9954', description: 'Construction services', rate: 12 },
  { sac: '9963', description: 'Accommodation services', rate: 12 },
  { sac: '9964', description: 'Passenger transport', rate: 5 },
  { sac: '9962', description: 'Courier services', rate: 18 },
  { sac: '9972', description: 'Real estate services', rate: 18 },
  { sac: '998313', description: 'IT consulting services', rate: 18 },
  { sac: '998314', description: 'IT infrastructure management', rate: 18 },
];

// ── Return Filing Schedule ───────────────────────────────────────────────
export const GST_RETURNS = [
  { form: 'GSTR-1',  description: 'Outward supplies',        frequency: 'Monthly (11th) / Quarterly (QRMP: 13th)', who: 'All registered taxpayers' },
  { form: 'GSTR-3B', description: 'Summary return + tax payment', frequency: 'Monthly (20th) / Quarterly (QRMP: 22nd/24th)', who: 'All registered taxpayers' },
  { form: 'GSTR-2A', description: 'Auto-populated inward supplies', frequency: 'Auto-generated', who: 'View-only for recipients' },
  { form: 'GSTR-2B', description: 'Auto-drafted ITC statement', frequency: 'Monthly (14th)', who: 'View-only for ITC claim' },
  { form: 'GSTR-9',  description: 'Annual return',            frequency: 'Dec 31 of next FY', who: 'Turnover > ₹2Cr' },
  { form: 'GSTR-9C', description: 'Reconciliation statement', frequency: 'Dec 31 of next FY', who: 'Turnover > ₹5Cr' },
  { form: 'ITC-04',  description: 'Job work return',          frequency: 'Annual', who: 'If goods sent for job work' },
];

// ── ITC Rules ────────────────────────────────────────────────────────────
export const ITC_RULES = {
  eligibleConditions: [
    'Invoice/debit note in possession',
    'Goods/services received',
    'Tax paid to government by supplier',
    'Return filed by recipient (GSTR-3B)',
    'Supplier has filed GSTR-1 (reflects in GSTR-2B)',
  ],
  blockedCredits: [
    'Motor vehicles (except certain cases)',
    'Food, beverages, outdoor catering',
    'Membership of club, health, fitness',
    'Travel benefits to employees',
    'Works contract for immovable property (except plant)',
    'Goods/services for personal consumption',
    'Goods lost, stolen, destroyed, written off, or given as free samples',
    'Tax paid under composition scheme',
  ],
  rule36_4: 'ITC cannot exceed 105% of ITC available in GSTR-2B (5% provisional over auto-populated)',
  reversalOnNonPayment: 'If payment not made within 180 days, ITC must be reversed with interest @18%',
};

// ── E-Invoice Thresholds ─────────────────────────────────────────────────
export const E_INVOICE = {
  mandatoryThreshold: 50000000, // ₹5 Cr aggregate turnover
  irn: 'Invoice Registration Number — unique 64-char hash from IRP',
  applicableTo: 'B2B supplies, exports, supplies to SEZ',
  notApplicableTo: 'B2C supplies, import of goods, reverse charge self-invoices',
};

// ── Composition Scheme ───────────────────────────────────────────────────
export interface CompositionSchemeConfig {
  turnoverLimit: number;
  turnoverLimitServices: number;
  rates: { [key: string]: number };
  restrictions: string[];
}

export const COMPOSITION_SCHEME: CompositionSchemeConfig = {
  turnoverLimit: 15000000, // ₹1.5 Cr for goods
  turnoverLimitServices: 5000000, // ₹50L for services
  rates: {
    manufacturer: 1,
    restaurant: 5,
    others: 1,
  },
  restrictions: [
    'Cannot collect GST from customers',
    'Cannot claim ITC',
    'Cannot make inter-state supplies',
    'Cannot supply through e-commerce',
  ]
};

export const COMPOSITION_RATES = {
  manufacturer: 1,
  restaurant: 5,
  others: 1,
};

// ── RCM (Reverse Charge) Services ───────────────────────────────────────
export interface RCMService {
  sacCode: string;
  description: string;
  applicableSupplierType: string[];  // 'non-resident', 'overseas', 'unregistered', 'all'
}

export const RCM_SERVICES: RCMService[] = [
  { sacCode: '9983', description: 'Legal services', applicableSupplierType: ['non-resident', 'overseas'] },
  { sacCode: '9973', description: 'GTA (Goods Transport Agency)', applicableSupplierType: ['unregistered'] },
  { sacCode: '9965', description: 'Import of services', applicableSupplierType: ['overseas'] },
  { sacCode: '9983', description: 'Security services', applicableSupplierType: ['unregistered'] },
  { sacCode: '9983', description: 'Works contract services', applicableSupplierType: ['unregistered'] },
  { sacCode: '9983', description: 'Renting of immovable property', applicableSupplierType: ['unregistered'] },
];

// ── Credit Note / Debit Note ─────────────────────────────────────────────
export interface CreditNoteCalculation {
  originalInvoiceAmount: number;
  creditAmount: number;
  gstRate: number;
  isInterState: boolean;
  creditGST: number;
  creditCess: number;
  totalCredit: number;
  reason: string;
  notes: string;
}

// ── Late Fee Calculation ─────────────────────────────────────────────────
export interface LateFeeCalculation {
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C' | 'GSTR-2B' | 'ITC-04';
  daysLate: number;
  isNilReturn: boolean;
  dailyFeeRate: number;
  maxCap: number;
  totalLateFee: number;
  applicableMonths?: number;
  notes: string;
}

// ── Calculator ───────────────────────────────────────────────────────────
export interface GSTCalculation {
  baseAmount: number;
  gstRate: number;
  isInterState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  invoiceTotal: number;
}

export function calculateGST(
  baseAmount: number,
  gstRate: number,
  isInterState: boolean = false,
  cessRate: number = 0
): GSTCalculation {
  const totalGST = Math.round(baseAmount * gstRate / 100 * 100) / 100;
  const cessAmount = Math.round(baseAmount * cessRate / 100 * 100) / 100;

  return {
    baseAmount,
    gstRate,
    isInterState,
    cgst: isInterState ? 0 : Math.round(totalGST / 2 * 100) / 100,
    sgst: isInterState ? 0 : Math.round(totalGST / 2 * 100) / 100,
    igst: isInterState ? totalGST : 0,
    cess: cessAmount,
    totalTax: totalGST + cessAmount,
    invoiceTotal: baseAmount + totalGST + cessAmount
  };
}

export function reverseCalculateGST(
  invoiceTotal: number,
  gstRate: number,
  isInterState: boolean = false
): GSTCalculation {
  const baseAmount = Math.round(invoiceTotal / (1 + gstRate / 100) * 100) / 100;
  return calculateGST(baseAmount, gstRate, isInterState);
}

// ── ITC Reconciliation Helper ────────────────────────────────────────────
export interface ITCMismatch {
  vendor: string;
  gstr2bAmount: number;
  booksAmount: number;
  difference: number;
  reason: string;
}

export function reconcileITC(
  gstr2bEntries: { vendor: string; amount: number }[],
  bookEntries: { vendor: string; amount: number }[]
): ITCMismatch[] {
  const mismatches: ITCMismatch[] = [];

  for (const book of bookEntries) {
    const gstr2b = gstr2bEntries.find(g => g.vendor === book.vendor);
    if (!gstr2b) {
      mismatches.push({ vendor: book.vendor, gstr2bAmount: 0, booksAmount: book.amount, difference: book.amount, reason: 'Vendor has not filed GSTR-1' });
    } else if (Math.abs(gstr2b.amount - book.amount) > 1) {
      mismatches.push({ vendor: book.vendor, gstr2bAmount: gstr2b.amount, booksAmount: book.amount, difference: book.amount - gstr2b.amount, reason: 'Amount mismatch between GSTR-2B and books' });
    }
  }

  return mismatches;
}

// ── Composition Scheme Calculation ──────────────────────────────────────
export interface CompositionTaxCalculation {
  annualTurnover: number;
  businessType: string;  // 'manufacturer', 'restaurant', 'others'
  withinTurnoverLimit: boolean;
  applicableRate: number;
  annualCompositionTax: number;
  quarterlyPayment: number;
  restrictions: string[];
  notes: string;
}

export function calculateCompositionTax(
  annualTurnover: number,
  businessType: string
): CompositionTaxCalculation | null {
  const isGoods = businessType !== 'services';
  const limit = isGoods ? COMPOSITION_SCHEME.turnoverLimit : COMPOSITION_SCHEME.turnoverLimitServices;
  const withinLimit = annualTurnover <= limit;

  const rateKey = businessType.toLowerCase();
  const applicableRate = COMPOSITION_RATES[rateKey as keyof typeof COMPOSITION_RATES] || COMPOSITION_RATES.others;

  return {
    annualTurnover,
    businessType,
    withinTurnoverLimit: withinLimit,
    applicableRate,
    annualCompositionTax: withinLimit ? Math.round(annualTurnover * applicableRate / 100) : 0,
    quarterlyPayment: withinLimit ? Math.round(annualTurnover * applicableRate / 100 / 4) : 0,
    restrictions: COMPOSITION_SCHEME.restrictions,
    notes: withinLimit
      ? `Turnover within limit (₹${limit.toLocaleString('en-IN')}). Composition tax @${applicableRate}% applicable. Pay quarterly by 18th of following month.`
      : `Turnover exceeds limit (₹${limit.toLocaleString('en-IN')}). Composition scheme not available — regular GST registration required.`
  };
}

// ── Place of Supply Determination ───────────────────────────────────────
export interface PlaceOfSupply {
  supplierState: string;
  recipientState: string;
  supplyType: 'goods' | 'services';
  isIntraState: boolean;
  isInterState: boolean;
  applicableTax: 'CGST+SGST' | 'IGST';
  notes: string;
}

export function determinePlaceOfSupply(
  supplierState: string,
  recipientState: string,
  supplyType: 'goods' | 'services'
): PlaceOfSupply {
  const isIntraState = supplierState === recipientState;
  const isInterState = supplierState !== recipientState;

  let notes = '';
  if (supplyType === 'goods') {
    notes = isIntraState
      ? `Goods supplied within ${supplierState}. Intra-state supply — CGST + SGST applicable.`
      : `Goods supplied from ${supplierState} to ${recipientState}. Inter-state supply — IGST applicable.`;
  } else {
    notes = isIntraState
      ? `Services supplied within ${supplierState}. Intra-state supply — CGST + SGST applicable.`
      : `Services supplied from ${supplierState} to ${recipientState}. Inter-state supply — IGST applicable. Place of supply = recipient's location.`;
  }

  return {
    supplierState,
    recipientState,
    supplyType,
    isIntraState,
    isInterState,
    applicableTax: isIntraState ? 'CGST+SGST' : 'IGST',
    notes
  };
}

// ── RCM Applicability Check ─────────────────────────────────────────────
export function isRCMApplicable(
  sacCode: string,
  supplierType: 'non-resident' | 'overseas' | 'unregistered' | 'registered'
): boolean {
  const rcmEntry = RCM_SERVICES.find(r => r.sacCode === sacCode);
  if (!rcmEntry) return false;
  return rcmEntry.applicableSupplierType.includes(supplierType) ||
         rcmEntry.applicableSupplierType.includes('all');
}

// ── Credit Note Calculation ────────────────────────────────────────────
export function calculateCreditNote(
  originalInvoiceAmount: number,
  creditAmount: number,
  gstRate: number,
  isInterState: boolean = false,
  reason: string = 'Returns/Adjustment'
): CreditNoteCalculation {
  const creditGSTPercent = creditAmount * gstRate / 100;
  const creditGST = Math.round(creditGSTPercent * 100) / 100;
  const creditCess = 0;  // Simplified; can be extended for cess-applicable goods
  const totalCredit = creditAmount + creditGST;

  const notes = `Credit note for ${reason}. Original invoice: ₹${originalInvoiceAmount.toLocaleString('en-IN')}. ` +
                `Credited amount: ₹${creditAmount.toLocaleString('en-IN')} + GST ${creditGST.toLocaleString('en-IN')}. ` +
                `Credit ITC reversal required if already claimed under Sec 34 of CGST Act.`;

  return {
    originalInvoiceAmount,
    creditAmount,
    gstRate,
    isInterState,
    creditGST,
    creditCess,
    totalCredit,
    reason,
    notes
  };
}

// ── Late Fee Calculation ───────────────────────────────────────────────
export function calculateLateFee(
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C' | 'GSTR-2B' | 'ITC-04',
  daysLate: number,
  isNilReturn: boolean = false
): LateFeeCalculation {
  let dailyFeeRate = 50;  // Default
  let maxCap = 10000;     // Default

  // Fee structure per return type
  const feeStructure: { [key: string]: { daily: number; maxCap: number; nilDaily?: number } } = {
    'GSTR-1': { daily: 50, maxCap: 10000 },
    'GSTR-3B': { daily: 50, maxCap: 10000, nilDaily: 20 },
    'GSTR-9': { daily: 100, maxCap: 50000 },
    'GSTR-9C': { daily: 100, maxCap: 50000 },
    'GSTR-2B': { daily: 0, maxCap: 0 },  // View-only, no late fee
    'ITC-04': { daily: 50, maxCap: 5000 },
  };

  const structure = feeStructure[returnType] || { daily: 50, maxCap: 10000 };
  dailyFeeRate = isNilReturn && structure.nilDaily ? structure.nilDaily : structure.daily;
  maxCap = structure.maxCap;

  const totalLateFee = Math.min(daysLate * dailyFeeRate, maxCap);

  return {
    returnType,
    daysLate,
    isNilReturn,
    dailyFeeRate,
    maxCap,
    totalLateFee,
    notes: `Late fee for ${returnType}: ₹${dailyFeeRate}/day × ${daysLate} days = ₹${totalLateFee.toLocaleString('en-IN')} (capped at ₹${maxCap.toLocaleString('en-IN')}). ${isNilReturn ? '(Nil return applicable)' : ''}`
  };
}

// ── Format for AI context injection ──────────────────────────────────────
export function getGSTContext(): string {
  const slabInfo = GST_SLABS.map(s => `${s.rate}% — ${s.examples}`).join('\n');
  const returnInfo = GST_RETURNS.map(r => `${r.form}: ${r.description} | ${r.frequency}`).join('\n');

  return `## GST Rule Engine — CGST Act 2017 (FY 2025-26)

### GST Rate Slabs:
${slabInfo}

### Return Schedule:
${returnInfo}

### ITC Rules:
- Eligible only if supplier has filed GSTR-1 (auto-populated in GSTR-2B)
- Rule 36(4): Cannot claim more than 105% of ITC in GSTR-2B
- Reversal required if payment not made within 180 days
- Blocked credits: motor vehicles, food/beverages, personal consumption, club memberships

### Composition Scheme:
- Goods: Turnover limit ₹1.5 Cr (₹75L for special states)
- Services: Turnover limit ₹50L
- Rates: Manufacturer 1%, Restaurant 5%, Others 1%
- Restrictions: No GST collection, no ITC claim, no inter-state supplies, no e-commerce

### Place of Supply:
- Goods: Intra-state (CGST+SGST) or Inter-state (IGST) per destination
- Services: Location of recipient (intra/inter-state)

### RCM (Reverse Charge) Services:
- Legal services (non-resident/overseas supplier)
- GTA — Goods Transport Agency (unregistered supplier)
- Works contracts, Security services (unregistered suppliers)
- Renting of immovable property (unregistered supplier)

### Credit/Debit Notes:
- Must be issued within 30 days of original transaction
- Sec 34 requirements for ITC reversal

### Late Fee Structure:
- GSTR-1/GSTR-3B: ₹50/day (₹20/day if nil), capped at ₹10,000
- GSTR-9/GSTR-9C: ₹100/day, capped at ₹50,000
- ITC-04: ₹50/day, capped at ₹5,000

### E-Invoice:
- Mandatory for turnover > ₹5 Cr (B2B, exports, SEZ)
- Must generate IRN from Invoice Registration Portal before issuing

### Key Calculations:
- Intra-state: CGST = SGST = Rate/2 each
- Inter-state: IGST = full rate
- calculateGST(baseAmount, rate, isInterState) → { cgst, sgst, igst, totalTax, invoiceTotal }
- reverseCalculateGST(invoiceTotal, rate) → extracts base amount
- calculateCompositionTax(turnover, businessType) → composition scheme applicability
- determinePlaceOfSupply(supplier, recipient, type) → intra/inter-state determination
- isRCMApplicable(sacCode, supplierType) → RCM applicability check
- calculateCreditNote(amount, credit, rate, isInterState, reason)
- calculateLateFee(returnType, daysLate, isNilReturn)

Use these exact rules. Never approximate GST rates or late fees.`;
}
