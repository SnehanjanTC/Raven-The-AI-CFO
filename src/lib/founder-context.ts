/**
 * @file Founder Context System
 * @description Startup profile management and progressive disclosure system.
 * Drives the CFO Copilot's understanding of startup stage, compliance obligations,
 * and plain-English communication patterns.
 */

import { getTDSContext } from '@/domains/compliance/engines/tds';
import { getGSTContext } from '@/domains/compliance/engines/gst';
import { getPTaxContext } from '@/domains/compliance/engines/ptax';
import { getIndianGAAPContext } from '@/domains/compliance/engines/indian-gaap';

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
