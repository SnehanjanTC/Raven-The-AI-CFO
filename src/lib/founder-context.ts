/**
 * @file Founder Context System
 * @description Startup profile management and progressive disclosure system.
 * Drives the CFO Copilot's understanding of startup stage, compliance obligations,
 * and plain-English communication patterns.
 */

import { getTDSContext, getEnrichedTDSContext } from '@/domains/compliance/engines/tds';
import { getGSTContext, getEnrichedGSTContext } from '@/domains/compliance/engines/gst';
import { getPTaxContext, getEnrichedPTaxContext } from '@/domains/compliance/engines/ptax';
import { getIndianGAAPContext, getEnrichedGAAPContext } from '@/domains/compliance/engines/indian-gaap';
import type { CompanyProfile } from '@/types/company-profile';

// ── Startup Profile & Stage ──────────────────────────────────────────────────

export type StartupStage = 'pre-revenue' | 'early' | 'scaling' | 'growth';

export interface StartupProfile {
  name: string;
  stage: StartupStage;
  monthlyRevenue: number;        // in INR
  teamSize: number;
  operatingStates: string[];     // state codes: 'MH', 'KA', etc.
  hasGSTRegistration: boolean;
  hasTANRegistration: boolean;   // for TDS
  incorporationDate?: string;
  sector?: string;
  currentFY: string;             // '2025-26'
}

// Default profile for demo
const DEFAULT_PROFILE: StartupProfile = {
  name: 'My Startup',
  stage: 'early',
  monthlyRevenue: 800000,       // ₹8L/month
  teamSize: 12,
  operatingStates: ['MH', 'KA'],
  hasGSTRegistration: true,
  hasTANRegistration: true,
  currentFY: '2025-26'
};

const STORAGE_KEY = 'raven_startup_profile';

// ── Compliance Relevance ─────────────────────────────────────────────────────

export interface ComplianceRelevance {
  tds: { relevant: boolean; reason: string };
  gst: { relevant: boolean; reason: string };
  ptax: { relevant: boolean; reason: string };
  gaap: { relevant: boolean; reason: string };
}

export interface FounderDeadline {
  title: string;
  urgency: 'warning' | 'critical' | 'info';
  action: string;
  plainEnglish: string;
  agentId: 'tds' | 'gst' | 'ptax' | 'gaap-pnl';
  daysUntilDue: number;
  dueDate: string;
}

export interface TrafficLight {
  color: 'green' | 'yellow' | 'red';
  message: string;
  details: FounderDeadline[];
  nextDeadlineInDays: number;
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get the current startup profile from localStorage or return default.
 * Falls back to default for demo mode.
 */
export function getStartupProfile(): StartupProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StartupProfile;
    }
  } catch (err) {
    console.error('[founder-context] Error reading profile:', err);
  }
  return DEFAULT_PROFILE;
}

/**
 * Update the startup profile in localStorage.
 */
export function updateStartupProfile(updates: Partial<StartupProfile>): void {
  try {
    const current = getStartupProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[founder-context] Error updating profile:', err);
  }
}

/**
 * Auto-detect startup stage based on revenue and team size.
 * Overrides stored stage if revenue/team crosses boundaries.
 */
export function detectStage(profile: StartupProfile): StartupStage {
  const { monthlyRevenue, teamSize } = profile;
  const annualRevenue = monthlyRevenue * 12;

  // Pre-revenue: <₹5L/month, <5 team members
  if (annualRevenue < 6000000 && teamSize < 5) return 'pre-revenue';

  // Early: ₹5L–₹1Cr annual, 5–20 team members
  if (annualRevenue < 120000000 && teamSize < 20) return 'early';

  // Scaling: ₹1–5Cr annual, 20–100 team members
  if (annualRevenue < 600000000 && teamSize < 100) return 'scaling';

  // Growth: ₹5Cr+, 100+ team members
  return 'growth';
}

/**
 * Determine which compliance domains are relevant for this startup.
 * Returns plain-English explanations for why each is/isn't relevant.
 */
export function getRelevantCompliance(profile: StartupProfile): ComplianceRelevance {
  const annualRevenue = profile.monthlyRevenue * 12;
  const { teamSize, hasGSTRegistration, operatingStates } = profile;

  return {
    tds: {
      relevant: teamSize >= 1 || hasGSTRegistration, // Even solo founders with contractors
      reason: teamSize >= 1
        ? `You have ${teamSize} team members — TDS applies on salary + contractor payments`
        : 'TDS applies if you pay contractors or vendors'
    },
    gst: {
      relevant: hasGSTRegistration || annualRevenue >= 2000000, // ₹20L threshold
      reason: hasGSTRegistration
        ? 'You\'re GST-registered — file monthly/quarterly returns'
        : annualRevenue >= 2000000
          ? `Your revenue (₹${(annualRevenue / 100000).toFixed(0)}L/year) exceeds ₹20L threshold`
          : 'Not required yet, but track once you hit ₹20L turnover'
    },
    ptax: {
      relevant: teamSize >= 1 && operatingStates.length > 0,
      reason: teamSize >= 1 && operatingStates.length > 0
        ? `You have ${teamSize} employees in ${operatingStates.join(', ')} — Professional Tax is mandatory`
        : 'Not applicable yet'
    },
    gaap: {
      relevant: annualRevenue >= 20000000 || profile.incorporationDate !== undefined, // ₹2Cr or any pvt company
      reason: annualRevenue >= 20000000
        ? `Revenue (₹${(annualRevenue / 10000000).toFixed(1)}Cr) requires formal accounting under AS standards`
        : 'Not required yet, but recommended for audit readiness'
    }
  };
}

/**
 * Get founder-friendly deadline summaries with urgency indicators.
 * This is what shows in the traffic light + quick actions.
 */
export function getFounderDeadlineSummary(profile: StartupProfile): FounderDeadline[] {
  const deadlines: FounderDeadline[] = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const relevance = getRelevantCompliance(profile);

  // ── GST Return (Monthly/Quarterly) ────────────────────────────────
  if (relevance.gst.relevant && profile.hasGSTRegistration) {
    // GSTR-3B due 20th of next month (3:00 PM)
    const nextMonth = new Date(currentYear, currentMonth + 1, 20);
    const daysUntil = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    deadlines.push({
      title: 'GST return due in ' + (daysUntil <= 1 ? 'today' : `${daysUntil} days`),
      urgency: daysUntil <= 5 ? 'warning' : daysUntil <= 0 ? 'critical' : 'info',
      action: `File GSTR-3B for ${new Date(currentYear, currentMonth, 1).toLocaleString('en-IN', { month: 'long' })}`,
      plainEnglish: `Your monthly GST return is due on the 20th. Based on your sales, you owe roughly ₹${(profile.monthlyRevenue * 0.18 / 100000).toFixed(1)}L in tax.`,
      agentId: 'gst',
      daysUntilDue: daysUntil,
      dueDate: nextMonth.toISOString().split('T')[0]
    });
  }

  // ── TDS Quarterly Return (24Q) ─────────────────────────────────────
  if (relevance.tds.relevant && profile.hasTANRegistration) {
    // Quarter ending months: June, Sept, Dec, Mar → returns due by 31st of next month
    const quarterEnds = [5, 8, 11, 2]; // June=5, Sept=8, Dec=11, Mar=2
    const nextQuarterEnd = quarterEnds.find(m => m > currentMonth) || quarterEnds[0];
    const nextQuarterEndDate = new Date(currentYear, nextQuarterEnd, 1);
    const dueDate = new Date(currentYear, nextQuarterEnd + 1, 31);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 0 && daysUntil <= 60) { // Only show if within 2 months
      deadlines.push({
        title: `TDS quarterly return (Q${Math.floor(nextQuarterEnd / 3) + 1}) due in ${daysUntil} days`,
        urgency: daysUntil <= 10 ? 'warning' : 'info',
        action: `File Form 24Q for quarter ending ${nextQuarterEndDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
        plainEnglish: `File quarterly TDS return (Form 24Q) by the 31st. Include all contractor/vendor payments where you deducted tax.`,
        agentId: 'tds',
        daysUntilDue: daysUntil,
        dueDate: dueDate.toISOString().split('T')[0]
      });
    }
  }

  // ── Professional Tax (Monthly/Quarterly by state) ────────────────
  if (relevance.ptax.relevant && profile.operatingStates.length > 0) {
    // Most states: monthly due by 21st of next month
    const nextMonth = new Date(currentYear, currentMonth + 1, 21);
    const daysUntil = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    deadlines.push({
      title: `Professional Tax due in ${daysUntil} days`,
      urgency: daysUntil <= 5 ? 'warning' : 'info',
      action: `Deposit PT for ${new Date(currentYear, currentMonth, 1).toLocaleString('en-IN', { month: 'long' })} in ${profile.operatingStates.join(', ')}`,
      plainEnglish: `Monthly Professional Tax for your team of ${profile.teamSize} is due by the 21st. This is a state tax, not deducted from salary.`,
      agentId: 'ptax',
      daysUntilDue: daysUntil,
      dueDate: nextMonth.toISOString().split('T')[0]
    });
  }

  // ── Annual Compliance (only for growth stage) ────────────────────
  if (profile.stage === 'growth' && relevance.gaap.relevant) {
    // FY 2025-26 ends March 31 → audit/returns due May 31
    const fyEndDate = new Date(currentYear, 2, 31); // March 31
    const auditDue = new Date(currentYear, 4, 31); // May 31
    const daysUntil = Math.ceil((auditDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil > -180) { // Show if within 6 months after FY end
      deadlines.push({
        title: 'Annual audit & ITR due in ' + (daysUntil > 0 ? `${daysUntil} days` : 'overdue'),
        urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 30 ? 'warning' : 'info',
        action: 'Complete FY 2025-26 financial statements & file ITR-4 (CA required)',
        plainEnglish: 'Your financial year ends March 31. Audit + tax return must be filed by May 31. Engage your CA now if not done.',
        agentId: 'gaap-pnl',
        daysUntilDue: daysUntil,
        dueDate: auditDue.toISOString().split('T')[0]
      });
    }
  }

  // Sort by urgency and days until due
  return deadlines.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    return urgencyDiff !== 0 ? urgencyDiff : a.daysUntilDue - b.daysUntilDue;
  });
}

/**
 * Get compliance traffic light (green/yellow/red) + next deadline.
 */
export function getComplianceTrafficLight(profile: StartupProfile): TrafficLight {
  const deadlines = getFounderDeadlineSummary(profile);

  if (deadlines.length === 0) {
    return {
      color: 'green',
      message: 'All clear — next deadline unknown',
      details: [],
      nextDeadlineInDays: 30
    };
  }

  const nextDeadline = deadlines[0];
  const urgencyMap = { critical: 'red' as const, warning: 'yellow' as const, info: 'green' as const };

  return {
    color: urgencyMap[nextDeadline.urgency],
    message:
      nextDeadline.urgency === 'critical'
        ? `${nextDeadline.title} — ACTION NEEDED`
        : nextDeadline.urgency === 'warning'
          ? `Heads up — ${nextDeadline.title.toLowerCase()}`
          : `Next deadline: ${nextDeadline.title.toLowerCase()}`,
    details: deadlines.slice(0, 3), // Top 3 deadlines
    nextDeadlineInDays: nextDeadline.daysUntilDue
  };
}

// ── CFO Copilot System Prompt ────────────────────────────────────────────────

/**
 * Generate the unified CFO Copilot system prompt.
 * Adapts based on startup stage and injects relevant compliance context.
 * This is THE key function that makes the CFO friendly but accurate.
 */
export function getCFOCopilotSystemPrompt(profile: StartupProfile): string {
  const stage = detectStage(profile);
  const relevance = getRelevantCompliance(profile);

  // Base personality + stage context
  let prompt = `You are ${profile.name}'s personal CFO — a friendly, smart advisor who speaks plain English, not jargon.

ABOUT THE FOUNDER:
- Company stage: ${stage === 'pre-revenue' ? 'Pre-revenue, building' : stage === 'early' ? 'Early-stage, finding PMF' : stage === 'scaling' ? 'Scaling the business' : 'Growing fast'}
- Monthly revenue: ₹${(profile.monthlyRevenue / 100000).toFixed(1)}L
- Team size: ${profile.teamSize} people
- Operating in: ${profile.operatingStates.join(', ')}
- FY: ${profile.currentFY}

TONE & BEHAVIOR:
- Be warm, conversational, like a mentor they trust
- Lead with plain English explanations, then show numbers if asked
- Proactively flag deadlines: "Heads up — your GST is due in 5 days"
- Never use jargon without explaining (e.g., "GSTR-3B" → "your monthly GST filing")
- If unsure, say "Let me dig into this" rather than guessing
- Always cite the law/rule when relevant (e.g., Section 194C, Rule 36)
- Suggest actions in founder language (not CA language)

COMPLIANCE DOMAINS RELEVANT TO ${profile.name}:
`;

  // Inject only relevant compliance contexts with translation layers
  if (relevance.tds.relevant) {
    prompt += `

## TDS (Tax Deducted at Source) — FOR YOU
${relevance.tds.reason}

Key things to know (in plain English):
- When you pay a contractor ₹5L+, you must deduct 1–2% as "TDS" and send it to the government
- File quarterly returns (Form 24Q) by the 31st of the next quarter
- Penalties are steep for missed deposits (₹100/day or higher)
- If a contractor has NO PAN, deduct 20% instead

TECHNICAL REFERENCE (for complex Q's):
${getTDSContext()}
`;
  }

  if (relevance.gst.relevant) {
    prompt += `

## GST (Goods & Services Tax) — FOR YOU
${relevance.gst.reason}

Key things to know (in plain English):
- You charge 18% GST on invoices (varies by product/service, some are lower/zero)
- File monthly or quarterly (depending on turnover) by the 20th
- You can claim "input tax" (GST you paid suppliers) as credit
- ITC (input tax credit) is only valid if supplier filed their GST return
- Non-compliance = ₹10K + penalty + interest

TECHNICAL REFERENCE (for complex Q's):
${getGSTContext()}
`;
  }

  if (relevance.ptax.relevant) {
    prompt += `

## Professional Tax — FOR YOU
${relevance.ptax.reason}

Key things to know (in plain English):
- This is a state tax on your payroll (₹0–₹2,500/month per employee)
- DIFFERENT amounts in MH vs KA vs other states — do NOT assume they're the same
- You deduct from salary, but it's paid separately to the state
- File monthly or quarterly (depends on state)
- Non-compliance = penalty + interest + dept notice

TECHNICAL REFERENCE (for complex Q's):
${getPTaxContext()}
`;
  }

  if (relevance.gaap.relevant) {
    prompt += `

## Accounting & P&L (Indian GAAP) — FOR YOU
${relevance.gaap.reason}

Key things to know (in plain English):
- Use proper Accounting Standards (AS) to record revenue, expenses, depreciation
- Depreciation: assets lose value each year; the amount is a deduction
- P&L format must follow Schedule III (gov standard)
- You need audited P&L if revenue > ₹2Cr or certain triggers
- This is mandatory for any company, but most founders ignore it until audit

TECHNICAL REFERENCE (for complex Q's):
${getIndianGAAPContext()}
`;
  }

  prompt += `

WHEN ANSWERING:
1. Start with plain English: "Here's what's happening..."
2. Then the number: "That means you owe ₹X"
3. Then the deadline: "This is due by DATE"
4. Then next steps: "Here's what to do: 1) ... 2) ... 3)"
5. Only go deep on technical rules if they ask "Show me the rule"

EXAMPLES OF GOOD ANSWERS:
Q: "Do I need to file GST?"
A: "Since your monthly revenue is ₹8L, yes — GST kicks in at ₹20L turnover and you're above it. File by the 20th each month. You claim back any GST you paid suppliers."

Q: "How much TDS do I deduct on a ₹10L vendor payment?"
A: "For a contractor, it's 2% (₹20,000) if they have a PAN, or 20% (₹2L) if they don't. Deposit by the 7th next month. I can help you file Form 24Q."

NEVER:
- Give investment advice
- Promise tax savings (only suggest legal strategies)
- File returns or forms on behalf of the founder
- Make up rules or rates
- Be overly formal or use "pursuant to" / "herein" language

You are a trusted advisor. Be helpful, honest, and human.`;

  return prompt;
}

/**
 * Format a date in founder-friendly way.
 * e.g., "April 20, 2026" or "in 5 days"
 */
export function formatFounderDeadline(daysUntil: number, dueDate?: string): string {
  if (daysUntil <= 0) return 'Today or overdue';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil <= 7) return `in ${daysUntil} days`;
  if (daysUntil <= 30) return `in ${Math.ceil(daysUntil / 7)} weeks`;

  if (dueDate) {
    return new Date(dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }
  return `in ${Math.ceil(daysUntil / 30)} months`;
}

// ── Enriched CFO Copilot System Prompt ────────────────────────────────────────

/**
 * Generate a deeply context-aware CFO Copilot system prompt from an enriched CompanyProfile.
 * Includes company identity, financial position, unit economics, customer context, team context,
 * financial goals, stage-specific guidance, and compliance obligations.
 * Falls through to the legacy getCFOCopilotSystemPrompt if the profile is sparse.
 */
export function getEnrichedCFOCopilotSystemPrompt(profile: CompanyProfile): string {
  // Check if this is a sparse profile (only legacy fields); fall back if so
  const isSparseLegacyProfile =
    !profile.businessModel &&
    !profile.fundingStage &&
    !profile.cashReserves &&
    !profile.monthlyBurnRate &&
    !profile.cac &&
    !profile.ltv &&
    !profile.customerType &&
    !profile.teamSize;

  if (isSparseLegacyProfile) {
    // Convert to legacy StartupProfile and use old prompt
    const legacyProfile: StartupProfile = {
      name: profile.companyName,
      stage: profile.stage,
      monthlyRevenue: profile.monthlyRevenue || 0,
      teamSize: 0,
      operatingStates: profile.operatingStates,
      hasGSTRegistration: profile.hasGSTRegistration,
      hasTANRegistration: profile.hasTANRegistration,
      incorporationDate: profile.incorporationDate,
      sector: profile.industryVertical,
      currentFY: profile.currentFY,
    };
    return getCFOCopilotSystemPrompt(legacyProfile);
  }

  // ── Build enriched prompt ────────────────────────────────────────────────

  let prompt = `You are ${profile.companyName}'s personal CFO — a friendly, smart advisor who speaks plain English, not jargon.
You understand their business deeply and adapt your advice to their specific stage and challenges.

`;

  // ── COMPANY IDENTITY ─────────────────────────────────────────────────────────
  prompt += `## COMPANY IDENTITY & CONTEXT

Business Profile:
- What they do: ${profile.businessModel || 'N/A'} (${profile.industryVertical || 'sector not specified'})
- Business model: ${profile.revenueModel || 'not specified'} revenue
${profile.entityType ? `- Legal structure: ${profile.entityType.replace(/_/g, ' ')}` : ''}
${profile.incorporationDate ? `- Incorporated: ${profile.incorporationDate}` : ''}
${profile.industrySubSector ? `- Sub-sector: ${profile.industrySubSector}` : ''}

Stage & Ambition:
- Current stage: ${profile.stage}
${profile.fundingStage ? `- Funding stage: ${profile.fundingStage.replace(/_/g, ' ')}` : '- Bootstrapped or pre-seed'}
${profile.exitStrategy ? `- Exit vision: ${profile.exitStrategy}` : ''}

`;

  // ── FINANCIAL POSITION ───────────────────────────────────────────────────────
  if (profile.monthlyRevenue !== undefined || profile.cashReserves !== undefined || profile.monthlyBurnRate !== undefined) {
    prompt += `## FINANCIAL POSITION (Current State)

`;
    if (profile.monthlyRevenue !== undefined) {
      const monthlyRev = profile.monthlyRevenue;
      const annualRev = monthlyRev * 12;
      prompt += `- Monthly revenue: ₹${(monthlyRev / 100000).toFixed(1)}L (₹${(annualRev / 10000000).toFixed(1)}Cr annually)
`;
    }
    if (profile.cashReserves !== undefined) {
      prompt += `- Cash reserves: ₹${(profile.cashReserves / 100000).toFixed(1)}L
`;
    }
    if (profile.monthlyBurnRate !== undefined && profile.monthlyBurnRate > 0) {
      const burnRate = profile.monthlyBurnRate;
      const runway = profile.cashReserves && profile.monthlyBurnRate
        ? Math.floor(profile.cashReserves / burnRate)
        : 0;
      prompt += `- Monthly burn rate: ₹${(burnRate / 100000).toFixed(1)}L
`;
      if (runway > 0) {
        prompt += `- Runway: ${runway} months (${runway < 12 ? 'CRITICAL — raise soon' : runway < 18 ? 'URGENT — plan fundraise' : 'healthy window'})
`;
      }
    }
    prompt += '\n';
  }

  // ── UNIT ECONOMICS ───────────────────────────────────────────────────────────
  if ((profile.monthlyRevenue || 0) > 0 && (profile.cac !== undefined || profile.ltv !== undefined)) {
    prompt += `## UNIT ECONOMICS & Health Check

`;
    if (profile.cac !== undefined && profile.ltv !== undefined) {
      const ratio = (profile.ltv / profile.cac).toFixed(1);
      const health = parseFloat(ratio) > 3 ? 'HEALTHY' : parseFloat(ratio) > 2 ? 'OK' : 'CONCERNING';
      prompt += `- CAC (Customer Acquisition Cost): ₹${(profile.cac / 1000).toFixed(0)}K
- LTV (Lifetime Value): ₹${(profile.ltv / 1000).toFixed(0)}K
- LTV/CAC Ratio: ${ratio}x (${health} — ${parseFloat(ratio) > 3 ? 'you earn 3x+ what you spend per customer' : 'work on margin or expansion'})
`;
    } else {
      if (profile.cac !== undefined) prompt += `- CAC (Customer Acquisition Cost): ₹${(profile.cac / 1000).toFixed(0)}K\n`;
      if (profile.ltv !== undefined) prompt += `- LTV (Lifetime Value): ₹${(profile.ltv / 1000).toFixed(0)}K\n`;
    }

    if (profile.paybackPeriodMonths !== undefined) {
      prompt += `- Payback period: ${profile.paybackPeriodMonths} months (${profile.paybackPeriodMonths <= 6 ? 'efficient' : 'consider optimizing'})\n`;
    }
    if (profile.grossMarginTarget !== undefined || profile.netMarginTarget !== undefined) {
      prompt += '- Target margins: ';
      const parts = [];
      if (profile.grossMarginTarget !== undefined) parts.push(`Gross ${(profile.grossMarginTarget * 100).toFixed(0)}%`);
      if (profile.netMarginTarget !== undefined) parts.push(`Net ${(profile.netMarginTarget * 100).toFixed(0)}%`);
      prompt += parts.join(', ') + '\n';
    }
    prompt += '\n';
  }

  // ── CUSTOMER CONTEXT ─────────────────────────────────────────────────────────
  if (profile.customerType || profile.customerSegment || profile.avgContractValue !== undefined || profile.monthlyChurnRate !== undefined) {
    prompt += `## CUSTOMER CONTEXT & Strategy

`;
    if (profile.customerType) {
      const typeExplain = {
        b2b: 'selling to businesses',
        b2c: 'selling directly to consumers',
        b2b2c: 'platform connecting businesses to consumers'
      };
      prompt += `- Customer type: ${typeExplain[profile.customerType] || profile.customerType}
`;
    }
    if (profile.customerSegment) {
      prompt += `- Target segment: ${profile.customerSegment.replace(/_/g, ' ')}
`;
    }
    if (profile.avgContractValue !== undefined) {
      prompt += `- Average contract value: ₹${(profile.avgContractValue / 100000).toFixed(1)}L
`;
    }
    if (profile.monthlyChurnRate !== undefined) {
      const churnPct = (profile.monthlyChurnRate * 100).toFixed(1);
      const annual = (Math.pow(1 - profile.monthlyChurnRate, 12) * 100).toFixed(0);
      prompt += `- Monthly churn: ${churnPct}% (keeping ~${annual}% annually — ${profile.monthlyChurnRate > 0.1 ? 'focus on retention' : 'good shape'})
`;
    }
    prompt += '\n';
  }

  // ── TEAM CONTEXT ─────────────────────────────────────────────────────────────
  if (profile.teamSize !== undefined || profile.engineeringHeadcount !== undefined || profile.salesHeadcount !== undefined) {
    prompt += `## TEAM & Operations

`;
    if (profile.teamSize !== undefined) {
      prompt += `- Total headcount: ${profile.teamSize} people
`;
      const engPercent = profile.engineeringHeadcount ? ((profile.engineeringHeadcount / profile.teamSize) * 100).toFixed(0) : null;
      const salesPercent = profile.salesHeadcount ? ((profile.salesHeadcount / profile.teamSize) * 100).toFixed(0) : null;
      const opsPercent = profile.opsHeadcount ? ((profile.opsHeadcount / profile.teamSize) * 100).toFixed(0) : null;

      if (engPercent) prompt += `  - Engineering: ${profile.engineeringHeadcount} (${engPercent}%)
`;
      if (salesPercent) prompt += `  - Sales: ${profile.salesHeadcount} (${salesPercent}%)
`;
      if (opsPercent) prompt += `  - Ops/Admin: ${profile.opsHeadcount} (${opsPercent}%)
`;
    }
    if (profile.contractorCount !== undefined && profile.contractorCount > 0) {
      prompt += `- Contractors: ${profile.contractorCount} (watch TDS compliance)
`;
    }

    // Flag composition issues
    if (profile.teamSize && profile.engineeringHeadcount && profile.salesHeadcount) {
      const engRatio = profile.engineeringHeadcount / profile.teamSize;
      const salesRatio = profile.salesHeadcount / profile.teamSize;
      if (engRatio > 0.7) {
        prompt += `- FYI: Heavy on engineering — consider sales/GTM hire for next stage\n`;
      }
      if (salesRatio > 0.5 && profile.stage === 'early') {
        prompt += `- FYI: Heavy on sales for early stage — validate product-market fit first\n`;
      }
    }
    prompt += '\n';
  }

  // ── FINANCIAL GOALS ─────────────────────────────────────────────────────────
  if (profile.nextFundraiseDate || profile.profitabilityTargetDate || profile.revenueTarget3m || profile.revenueTarget6m || profile.revenueTarget12m) {
    prompt += `## FINANCIAL GOALS & Milestones

`;
    if (profile.nextFundraiseDate) {
      const today = new Date();
      const raiseDate = new Date(profile.nextFundraiseDate);
      const daysUntil = Math.ceil((raiseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      prompt += `- Next fundraise: ${profile.nextFundraiseDate} (${daysUntil > 0 ? `${daysUntil} days away` : 'upcoming'})
`;
    }
    if (profile.profitabilityTargetDate) {
      prompt += `- Profitability target: ${profile.profitabilityTargetDate}
`;
    }
    if (profile.revenueTarget3m || profile.revenueTarget6m || profile.revenueTarget12m) {
      prompt += `- Revenue targets: `;
      const targets = [];
      if (profile.revenueTarget3m) targets.push(`₹${(profile.revenueTarget3m / 100000).toFixed(1)}L in 3mo`);
      if (profile.revenueTarget6m) targets.push(`₹${(profile.revenueTarget6m / 100000).toFixed(1)}L in 6mo`);
      if (profile.revenueTarget12m) targets.push(`₹${(profile.revenueTarget12m / 100000).toFixed(1)}L in 12mo`);
      prompt += targets.join(' | ') + '\n';
    }
    prompt += '\n';
  }

  // ── STAGE-SPECIFIC GUIDANCE ──────────────────────────────────────────────────
  prompt += `## STAGE-SPECIFIC KPI FOCUS

Based on your ${profile.stage} stage${profile.businessModel ? ` ${profile.businessModel}` : ''}:
`;

  if (profile.stage === 'pre-revenue') {
    prompt += `- Focus on: Burn rate, runway, design partner traction, unit economics
- Key metrics: Monthly burn, cash reserves, customer discovery progress
- Milestone: Get to ₹5-10L MRR with repeatble sales motion
`;
  } else if (profile.stage === 'early') {
    if (profile.businessModel === 'saas') {
      prompt += `- Focus on: MRR growth, month-over-month growth rate, churn, time-to-PMF
- Key metrics: MoM growth %, CAC payback period, gross margin
- Rule: Aim for 10% MoM growth; if not there, focus on product not scaling
`;
    } else if (profile.businessModel === 'marketplace') {
      prompt += `- Focus on: GMV (Gross Merchandise Value), liquidity, take rate
- Key metrics: Monthly GMV, supply/demand ratio, repeat rate
- Rule: Balance supply growth with demand; watch cash burn carefully
`;
    } else if (profile.businessModel === 'd2c') {
      prompt += `- Focus on: AOV (Average Order Value), repeat rate, contribution margin
- Key metrics: CAC, LTV, repeat %, cash conversion cycle
- Rule: Unit economics must be positive (LTV > 3x CAC)
`;
    } else {
      prompt += `- Focus on: Revenue repeatability, unit economics, customer concentration
- Key metrics: MRR/ARR growth, CAC payback, gross margin
- Rule: Validate sustainable business model before scaling
`;
    }
  } else if (profile.stage === 'scaling') {
    if (profile.businessModel === 'saas') {
      prompt += `- Focus on: NDR (Net Dollar Retention), NRR (Net Revenue Retention), magic number
- Key metrics: Monthly churn <5%, CAC payback <12 months, Rule of 40
- Rule: If not hitting these, optimize before burning more
`;
    } else if (profile.businessModel === 'marketplace') {
      prompt += `- Focus on: Take rate optimization, category penetration, supply efficiency
- Key metrics: GMV per supplier, customer lifetime value, ROAS
- Rule: Reduce take rate friction while maintaining margins
`;
    } else {
      prompt += `- Focus on: Revenue predictability, unit economics at scale, operational leverage
- Key metrics: CAC payback, gross margin, opex ratio
- Rule: Every dollar spent should generate >3x return
`;
    }
  } else if (profile.stage === 'growth') {
    if (profile.businessModel === 'saas') {
      prompt += `- Focus on: ARR, magic number, burn multiple, Rule of 40
- Key metrics: Annual recurring revenue, net retention >110%, CAC payback <18 months
- Rule: Sustainable growth at CAC payback >3 years means fundraise soon
`;
    } else {
      prompt += `- Focus on: Unit economics at scale, profitability path, operational efficiency
- Key metrics: Revenue per employee, operating margin, customer payback
- Rule: Aim for path to profitability; investors expect sub-3 year paths
`;
    }
  }
  prompt += '\n';

  // ── COMPLIANCE CONTEXT ───────────────────────────────────────────────────────
  // Convert to legacy profile to reuse compliance logic with entity-type awareness
  const legacyProfile: StartupProfile = {
    name: profile.companyName,
    stage: profile.stage,
    monthlyRevenue: profile.monthlyRevenue || 0,
    teamSize: profile.teamSize || 0,
    operatingStates: profile.operatingStates,
    hasGSTRegistration: profile.hasGSTRegistration,
    hasTANRegistration: profile.hasTANRegistration,
    incorporationDate: profile.incorporationDate,
    sector: profile.industryVertical,
    currentFY: profile.currentFY,
  };

  const relevance = getRelevantCompliance(legacyProfile);

  prompt += `## COMPLIANCE OBLIGATIONS & Deadlines

Entity type: ${profile.entityType ? profile.entityType.replace(/_/g, ' ') : 'Not specified'}

`;

  if (relevance.tds.relevant) {
    prompt += `### TDS (Tax Deducted at Source)
${relevance.tds.reason}

${getEnrichedTDSContext(profile)}

`;
  }

  if (relevance.gst.relevant) {
    prompt += `### GST (Goods & Services Tax)
${relevance.gst.reason}

${getEnrichedGSTContext(profile)}

`;
  }

  if (relevance.ptax.relevant) {
    prompt += `### Professional Tax
${relevance.ptax.reason}

${getEnrichedPTaxContext(profile)}

`;
  }

  if (relevance.gaap.relevant) {
    prompt += `### Accounting & P&L (Indian GAAP)
${relevance.gaap.reason}

${getEnrichedGAAPContext(profile)}

`;
  }

  // ── INTERACTION PATTERNS ─────────────────────────────────────────────────────
  prompt += `
## HOW TO INTERACT WITH ME

When I answer your questions:
1. Start plain English: "Here's what's happening..."
2. Then the number: "That means ₹X impact"
3. Then the deadline: "Due by DATE"
4. Then next steps: "Here's what to do..."
5. Only go deep technical if you ask "Show me the rule"

Examples of good answers:
- Q: "Do I need GST?"
  A: "Yes — revenue is ₹${(legacyProfile.monthlyRevenue / 100000).toFixed(1)}L/month, above the ₹20L threshold. File by the 20th; claim back GST on expenses."

- Q: "How much TDS on a ₹10L vendor?"
  A: "2% (₹20K) if they have PAN, 20% (₹2L) if not. Deposit by 7th of next month."

NEVER:
- Give investment advice or promise tax savings
- File returns or forms on your behalf
- Use jargon without explaining (translate "GSTR-3B" → "monthly GST filing")
- Make up rules or rates
- Be overly formal; be a mentor, not a lawyer

You are a trusted advisor. Be warm, helpful, honest, and human.`;

  return prompt;
}
