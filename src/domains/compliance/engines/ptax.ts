/**
 * Professional Tax Rule Engine — State-wise P-Tax Acts
 * Covers major states with monthly salary slab-based calculation
 *
 * Last updated: FY 2025-26
 */

import type { CompanyProfile } from '@/types/company-profile';

export interface PTaxSlab {
  minSalary: number;      // Monthly salary ₹ (inclusive)
  maxSalary: number | null; // null = no upper limit
  monthlyTax: number;     // ₹ per month
}

export interface StateConfig {
  state: string;
  code: string;
  act: string;
  frequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Annual';
  maxAnnualTax: number;
  slabs: PTaxSlab[];
  notes?: string;
}

// ── State-wise Professional Tax Slabs ────────────────────────────────────
export const PTAX_STATES: StateConfig[] = [
  {
    state: 'Maharashtra',
    code: 'MH',
    act: 'Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 7500,  monthlyTax: 0 },
      { minSalary: 7501,  maxSalary: 10000, monthlyTax: 175 },
      { minSalary: 10001, maxSalary: null,   monthlyTax: 200 },
    ],
    notes: 'Feb month: ₹300 for salary >₹10K (to reach ₹2,500 annual cap)'
  },
  {
    state: 'Karnataka',
    code: 'KA',
    act: 'Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 25000, monthlyTax: 0 },
      { minSalary: 25001, maxSalary: null,   monthlyTax: 200 },
    ],
    notes: 'Revised effective Apr 2025 — exemption raised to ₹25K'
  },
  {
    state: 'West Bengal',
    code: 'WB',
    act: 'West Bengal State Tax on Professions, Trades, Callings and Employments Act, 1979',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 10000, monthlyTax: 0 },
      { minSalary: 10001, maxSalary: 15000, monthlyTax: 110 },
      { minSalary: 15001, maxSalary: 25000, monthlyTax: 130 },
      { minSalary: 25001, maxSalary: 40000, monthlyTax: 150 },
      { minSalary: 40001, maxSalary: null,   monthlyTax: 200 },
    ]
  },
  {
    state: 'Telangana',
    code: 'TS',
    act: 'Telangana Tax on Professions, Trades, Callings and Employments Act, 1987',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 15000, monthlyTax: 0 },
      { minSalary: 15001, maxSalary: 20000, monthlyTax: 150 },
      { minSalary: 20001, maxSalary: null,   monthlyTax: 200 },
    ]
  },
  {
    state: 'Andhra Pradesh',
    code: 'AP',
    act: 'Andhra Pradesh Tax on Professions, Trades, Callings and Employments Act, 1987',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 15000, monthlyTax: 0 },
      { minSalary: 15001, maxSalary: 20000, monthlyTax: 150 },
      { minSalary: 20001, maxSalary: null,   monthlyTax: 200 },
    ]
  },
  {
    state: 'Tamil Nadu',
    code: 'TN',
    act: 'Tamil Nadu Municipal Laws (Second Amendment) Act, 1998 — Schedule VI',
    frequency: 'Half-Yearly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 21000, monthlyTax: 0 },
      { minSalary: 21001, maxSalary: 30000, monthlyTax: 100 },
      { minSalary: 30001, maxSalary: 45000, monthlyTax: 235 },
      { minSalary: 45001, maxSalary: 60000, monthlyTax: 510 },
      { minSalary: 60001, maxSalary: 75000, monthlyTax: 760 },
      { minSalary: 75001, maxSalary: null,   monthlyTax: 1095 },
    ],
    notes: 'Tamil Nadu follows half-yearly slabs; amounts shown as half-yearly equivalent ÷ 6 for monthly'
  },
  {
    state: 'Gujarat',
    code: 'GJ',
    act: 'Gujarat State Tax on Professions, Trades, Callings and Employments Act, 1976',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 12000, monthlyTax: 0 },
      { minSalary: 12001, maxSalary: null,   monthlyTax: 200 },
    ]
  },
  {
    state: 'Madhya Pradesh',
    code: 'MP',
    act: 'Madhya Pradesh Vritti Kar Adhiniyam, 1995',
    frequency: 'Monthly',
    maxAnnualTax: 2500,
    slabs: [
      { minSalary: 0,     maxSalary: 18750, monthlyTax: 0 },
      { minSalary: 18751, maxSalary: 25000, monthlyTax: 125 },
      { minSalary: 25001, maxSalary: null,   monthlyTax: 208 },
    ]
  },
];

// ── Employer PT Configuration ───────────────────────────────────────────
export interface EmployerPTConfig {
  state: string;
  code: string;
  annualEnrollmentFee: number;
  notes?: string;
}

export const EMPLOYER_PT_FEES: EmployerPTConfig[] = [
  { state: 'Maharashtra', code: 'MH', annualEnrollmentFee: 2500, notes: 'Employer enrolment tax per year' },
  { state: 'Karnataka', code: 'KA', annualEnrollmentFee: 2500, notes: 'Employer enrolment tax per year' },
  { state: 'West Bengal', code: 'WB', annualEnrollmentFee: 1500, notes: 'Employer enrolment tax per year' },
  { state: 'Telangana', code: 'TS', annualEnrollmentFee: 1500, notes: 'Employer enrolment tax per year' },
  { state: 'Andhra Pradesh', code: 'AP', annualEnrollmentFee: 1500, notes: 'Employer enrolment tax per year' },
  { state: 'Tamil Nadu', code: 'TN', annualEnrollmentFee: 1000, notes: 'Employer enrolment tax per year' },
  { state: 'Gujarat', code: 'GJ', annualEnrollmentFee: 2500, notes: 'Employer enrolment tax per year' },
  { state: 'Madhya Pradesh', code: 'MP', annualEnrollmentFee: 1500, notes: 'Employer enrolment tax per year' },
];

// ── PT Exemptions ───────────────────────────────────────────────────────
export interface ExemptionConfig {
  state: string;
  code: string;
  exemptions: {
    category: string;
    description: string;
  }[];
}

export const PTAX_EXEMPTIONS: ExemptionConfig[] = [
  {
    state: 'Maharashtra',
    code: 'MH',
    exemptions: [
      { category: 'DisabledChild', description: 'Parents with disabled child (>50% disability)' },
      { category: 'ArmedForces', description: 'Members of armed forces' },
      { category: 'BadliWorkers', description: 'Badli (temporary) workers' },
    ]
  },
  {
    state: 'Karnataka',
    code: 'KA',
    exemptions: [
      { category: 'DisabledChild', description: 'Parents with disabled child (>50% disability)' },
      { category: 'ArmedForces', description: 'Members of armed forces' },
    ]
  },
  {
    state: 'West Bengal',
    code: 'WB',
    exemptions: [
      { category: 'ArmedForces', description: 'Members of armed forces' },
    ]
  },
];

// ── PT Late Payment Penalty ──────────────────────────────────────────────
export interface PTaxPenalty {
  state: string;
  monthsLate: number;
  amountDue: number;
  interestRate: number;  // % per month
  penaltyAmount: number;
  totalDueWithPenalty: number;
  notes: string;
}

// ── Calculator ───────────────────────────────────────────────────────────
export interface PTaxCalculation {
  state: string;
  monthlySalary: number;
  monthlyTax: number;
  annualTax: number;
  maxAnnualCap: number;
  incomeType?: string;  // 'salary', 'directorsFees', 'partnershipProfit', 'freelancer'
  applicable: boolean;
  slabNote: string;
}

export interface EmployerPTCalculation {
  state: string;
  annualEnrollmentFee: number;
  frequency: string;
  notes: string;
}

export function calculatePTax(
  stateCode: string,
  monthlySalary: number,
  incomeType: string = 'salary'
): PTaxCalculation | null {
  const stateConfig = PTAX_STATES.find(s => s.code === stateCode);
  if (!stateConfig) return null;

  const slab = stateConfig.slabs.find(s =>
    monthlySalary >= s.minSalary && (s.maxSalary === null || monthlySalary <= s.maxSalary)
  );

  if (!slab) return null;

  const annualTax = Math.min(slab.monthlyTax * 12, stateConfig.maxAnnualTax);

  return {
    state: stateConfig.state,
    monthlySalary,
    monthlyTax: slab.monthlyTax,
    annualTax,
    maxAnnualCap: stateConfig.maxAnnualTax,
    incomeType,
    applicable: slab.monthlyTax > 0,
    slabNote: slab.monthlyTax === 0
      ? `Exempt — ${incomeType} ≤ ₹${(slab.maxSalary || 0).toLocaleString('en-IN')}/month in ${stateConfig.state}`
      : `₹${slab.monthlyTax}/month (${incomeType}) under ${stateConfig.act} (annual cap ₹${stateConfig.maxAnnualTax})`
  };
}

// ── Employer PT Calculation ──────────────────────────────────────────────
export function calculatePTaxEmployer(stateCode: string): EmployerPTCalculation | null {
  const employerConfig = EMPLOYER_PT_FEES.find(e => e.code === stateCode);
  if (!employerConfig) return null;

  return {
    state: employerConfig.state,
    annualEnrollmentFee: employerConfig.annualEnrollmentFee,
    frequency: 'Annual',
    notes: `Employer PT (separate from employee PT): ₹${employerConfig.annualEnrollmentFee.toLocaleString('en-IN')}/year. ${employerConfig.notes || 'Enrolment certificate (PTEC) required.'}`
  };
}

// ── PT Exemption Check ───────────────────────────────────────────────────
export function checkExemption(stateCode: string, exemptionCategory: string): boolean {
  const stateExemptions = PTAX_EXEMPTIONS.find(e => e.code === stateCode);
  if (!stateExemptions) return false;

  return stateExemptions.exemptions.some(ex => ex.category === exemptionCategory);
}

// ── PT Late Payment Penalty ──────────────────────────────────────────────
export function calculatePTaxPenalty(
  stateCode: string,
  monthsLate: number,
  amountDue: number
): PTaxPenalty | null {
  const stateConfig = PTAX_STATES.find(s => s.code === stateCode);
  if (!stateConfig) return null;

  // Standard interest rate: 1-2% per month depending on state
  const interestRateMap: { [key: string]: number } = {
    'MH': 1.25,
    'KA': 1.5,
    'WB': 1.0,
    'TS': 1.5,
    'AP': 1.5,
    'TN': 1.0,
    'GJ': 1.5,
    'MP': 1.0,
  };

  const interestRate = interestRateMap[stateCode] || 1.5;
  const penaltyAmount = Math.round(amountDue * interestRate * monthsLate / 100);
  const totalDueWithPenalty = amountDue + penaltyAmount;

  return {
    state: stateConfig.state,
    monthsLate,
    amountDue,
    interestRate,
    penaltyAmount,
    totalDueWithPenalty,
    notes: `Late payment penalty: ₹${amountDue.toLocaleString('en-IN')} × ${interestRate}% per month × ${monthsLate} months = ₹${penaltyAmount.toLocaleString('en-IN')}. Total due: ₹${totalDueWithPenalty.toLocaleString('en-IN')}`
  };
}

// ── Bulk payroll calculation ─────────────────────────────────────────────
export function calculatePTaxPayroll(
  employees: { name: string; stateCode: string; monthlySalary: number }[]
): { results: (PTaxCalculation & { name: string })[]; totalMonthly: number; totalAnnual: number } {
  const results = employees.map(emp => {
    const calc = calculatePTax(emp.stateCode, emp.monthlySalary);
    return calc ? { ...calc, name: emp.name } : null;
  }).filter(Boolean) as (PTaxCalculation & { name: string })[];

  return {
    results,
    totalMonthly: results.reduce((sum, r) => sum + r.monthlyTax, 0),
    totalAnnual: results.reduce((sum, r) => sum + r.annualTax, 0),
  };
}

// ── Enriched P-Tax Context (Team & State-Aware) ──────────────────────────
export function getEnrichedPTaxContext(profile: CompanyProfile): string {
  let context = '## Enriched Professional Tax Compliance Context\n\n';

  // Team composition
  context += `### Your Team\n`;
  if (profile.teamSize && profile.teamSize > 0) {
    context += `- Total Team Size: ${profile.teamSize}\n`;
    if (profile.engineeringHeadcount) {
      context += `  • Engineering: ${profile.engineeringHeadcount}\n`;
    }
    if (profile.salesHeadcount) {
      context += `  • Sales: ${profile.salesHeadcount}\n`;
    }
    if (profile.opsHeadcount) {
      context += `  • Operations: ${profile.opsHeadcount}\n`;
    }
  }

  // Contractor vs Employee distinction
  if (profile.contractorCount && profile.contractorCount > 0) {
    context += `- Contractor Count: ${profile.contractorCount}\n`;
    context += `- IMPORTANT: Contractors are NOT subject to Professional Tax\n`;
    context += `- PT applies ONLY to employees on your payroll\n`;
  }

  // Operating states with specific PT info
  if (profile.operatingStates && profile.operatingStates.length > 0) {
    context += `\n### Professional Tax by Operating State\n`;

    const stateConfig: { [key: string]: { threshold: number; monthlyRate: number; cap: number; notes: string } } = {
      'MH': { threshold: 7500, monthlyRate: 175, cap: 2500, notes: 'Feb special: ₹300 for salary >₹10K' },
      'KA': { threshold: 25000, monthlyRate: 200, cap: 2500, notes: 'Revised Apr 2025: exemption raised to ₹25K' },
      'WB': { threshold: 10000, monthlyRate: 110, cap: 2500, notes: 'Graduated slabs' },
      'TS': { threshold: 15000, monthlyRate: 150, cap: 2500, notes: 'Telangana specific rates' },
      'AP': { threshold: 15000, monthlyRate: 150, cap: 2500, notes: 'Andhra Pradesh specific rates' },
      'TN': { threshold: 21000, monthlyRate: 100, cap: 2500, notes: 'Half-yearly filing; progressive slabs' },
      'GJ': { threshold: 12000, monthlyRate: 200, cap: 2500, notes: 'Gujarat rates' },
      'MP': { threshold: 18750, monthlyRate: 125, cap: 2500, notes: 'Madhya Pradesh rates' },
      'DL': { threshold: null, monthlyRate: 0, cap: 0, notes: 'Delhi: NO Professional Tax' },
    };

    profile.operatingStates.forEach(state => {
      const config = stateConfig[state.toUpperCase()];
      if (config) {
        if (config.monthlyRate === 0) {
          context += `\n- ${state.toUpperCase()}: NO Professional Tax applicable\n`;
        } else {
          context += `\n- ${state.toUpperCase()}:\n`;
          context += `  • Exemption threshold: ₹${config.threshold?.toLocaleString('en-IN') || 'N/A'}/month\n`;
          context += `  • Tax rate: ₹${config.monthlyRate}/month (above threshold)\n`;
          context += `  • Annual cap: ₹${config.cap.toLocaleString('en-IN')}\n`;
          if (config.notes) {
            context += `  • Note: ${config.notes}\n`;
          }
        }
      }
    });
  }

  // PT Liability Calculation (rough estimate)
  if (profile.teamSize && profile.teamSize > 0 && profile.operatingStates) {
    context += `\n### Estimated Monthly PT Liability\n`;
    let estimatedMonthly = 0;
    let estimatedAnnual = 0;

    // Simple estimate: assume avg salary ₹50K per employee
    const avgSalary = 50000;

    profile.operatingStates.forEach(state => {
      const calc = calculatePTax(state.toUpperCase().substring(0, 2), avgSalary);
      if (calc && calc.applicable) {
        estimatedMonthly += calc.monthlyTax * (profile.teamSize || 0);
      }
    });

    estimatedAnnual = Math.min(estimatedMonthly * 12, 2500 * (profile.teamSize || 0));

    context += `- Rough estimate (assuming ₹50K avg salary): ₹${estimatedMonthly.toLocaleString('en-IN')}/month\n`;
    context += `- Estimated annual: ₹${estimatedAnnual.toLocaleString('en-IN')}\n`;
    context += `- Note: This is approximate — actual PT depends on individual salary slabs\n`;
  }

  // Employer PT Fee
  context += `\n### Employer Professional Tax\n`;
  if (profile.operatingStates && profile.operatingStates.length > 0) {
    context += `- Employer PT (separate from employee PT): ₹1,500–₹2,500/year per state\n`;
    context += `- Registration Certificate (PTRC) required for deduction authority\n`;
    context += `- Enrollment Certificate (PTEC) required for employer registration\n`;
  }

  // Compliance notes
  context += `\n### PT Compliance Checklist\n`;
  context += `1. Maintain payroll records with salary and PT deducted\n`;
  context += `2. Deposit PT monthly/quarterly as per state rules\n`;
  context += `3. Issue salary slips showing PT deduction\n`;
  context += `4. File state PT returns (varies by state — check calendar)\n`;
  context += `5. Renew employer registration annually\n`;
  context += `6. Non-compliance penalty: up to ₹5,000 + prosecution risk\n`;

  return context;
}

// ── Format for AI context injection ──────────────────────────────────────
export function getPTaxContext(): string {
  const stateInfo = PTAX_STATES.map(s => {
    const slabText = s.slabs.map(sl =>
      sl.monthlyTax === 0
        ? `Up to ₹${(sl.maxSalary || 0).toLocaleString('en-IN')}: Nil`
        : `₹${sl.minSalary.toLocaleString('en-IN')}${sl.maxSalary ? `–₹${sl.maxSalary.toLocaleString('en-IN')}` : '+'}: ₹${sl.monthlyTax}/mo`
    ).join(' | ');
    return `${s.state} (${s.code}): ${slabText} [Cap: ₹${s.maxAnnualTax}/yr, ${s.frequency}]`;
  }).join('\n');

  const employerFees = EMPLOYER_PT_FEES.map(e => `${e.state} (${e.code}): ₹${e.annualEnrollmentFee.toLocaleString('en-IN')}/year`).join('\n');

  const exemptions = PTAX_EXEMPTIONS.map(e => {
    const exempList = e.exemptions.map(ex => `${ex.category}: ${ex.description}`).join(', ');
    return `${e.state}: ${exempList}`;
  }).join('\n');

  return `## Professional Tax Rule Engine — State P-Tax Acts (FY 2025-26)

### Constitutional Basis: Article 276 — Max ₹2,500/year per person

### State-wise Employee Slabs:
${stateInfo}

### Employer PT (Annual Enrolment):
${employerFees}

### PT Exemptions (State-wise):
${exemptions}

### Income Type Coverage:
- Salary (regular employment)
- Directors' Fees (Sec 194J applicable)
- Partnership Profit Share (as per P&L attribution)
- Freelancer Income (professional services)

### Key Rules:
- Employer is responsible for deduction from salary and deposit to state government
- Employer PT (₹1,500–₹2,500/year) is separate from employee PT
- Enrollment certificate (PTEC) required for employer; registration certificate (PTRC) for deduction
- Late payment interest: 1.0–1.5% per month depending on state
- Non-compliance: penalties up to ₹5,000 + prosecution in some states
- PT paid is fully deductible under Section 16(iii) of Income Tax Act

### Late Payment Penalties:
- MH: 1.25%/month
- KA: 1.5%/month
- WB: 1.0%/month
- TS: 1.5%/month
- AP: 1.5%/month
- TN: 1.0%/month
- GJ: 1.5%/month
- MP: 1.0%/month

### Calculators:
- calculatePTax(stateCode, monthlySalary, incomeType) → employee PT with income type support
- calculatePTaxEmployer(stateCode) → annual employer enrolment fee
- calculatePTaxPayroll(employees) → bulk payroll calculation
- checkExemption(stateCode, exemptionCategory) → exemption eligibility check
- calculatePTaxPenalty(stateCode, monthsLate, amountDue) → late payment penalty calculation

Use these exact slabs and rates. Never guess state-wise rates or penalties.`;
}
