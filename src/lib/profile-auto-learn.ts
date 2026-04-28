/**
 * @file Profile Auto-Learning
 * @description Analyzes financial data flowing through Raven and suggests profile updates.
 * All suggestions require user confirmation before updating.
 */

import type { CompanyProfile } from '@/types/company-profile';

export interface ProfileSuggestion {
  field: keyof CompanyProfile;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze CSV upload data and suggest profile updates.
 * Looks at invoice/transaction patterns to infer business characteristics.
 */
export function analyzeCSVForProfileSuggestions(
  csvData: Record<string, any>[],
  currentProfile: CompanyProfile
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];

  if (!csvData || csvData.length === 0) return suggestions;

  // Detect revenue model from invoice patterns
  const amounts = csvData
    .map(row => parseFloat(row.amount || row.Amount || row.total || row.Total || '0'))
    .filter(a => !isNaN(a) && a > 0);

  if (amounts.length > 3) {
    // Check if amounts are similar (subscription pattern)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length;
    const cv = Math.sqrt(variance) / avg; // coefficient of variation

    if (cv < 0.15 && !currentProfile.revenueModel) {
      suggestions.push({
        field: 'revenueModel',
        currentValue: currentProfile.revenueModel,
        suggestedValue: 'subscription',
        reason: `Invoice amounts are consistent (±${(cv * 100).toFixed(0)}% variation), suggesting a subscription model`,
        confidence: cv < 0.05 ? 'high' : 'medium',
      });
    } else if (cv > 0.5 && !currentProfile.revenueModel) {
      suggestions.push({
        field: 'revenueModel',
        currentValue: currentProfile.revenueModel,
        suggestedValue: 'transactional',
        reason: `Invoice amounts vary significantly (${(cv * 100).toFixed(0)}% variation), suggesting transactional revenue`,
        confidence: 'medium',
      });
    }

    // Suggest monthly revenue if not set
    const totalRevenue = amounts.reduce((a, b) => a + b, 0);
    const months = new Set(csvData.map(row => {
      const date = row.date || row.Date || row.invoice_date;
      return date ? date.substring(0, 7) : null;
    }).filter(Boolean)).size || 1;
    const monthlyAvg = totalRevenue / months;

    if (!currentProfile.monthlyRevenue || Math.abs(monthlyAvg - (currentProfile.monthlyRevenue || 0)) > currentProfile.monthlyRevenue * 0.2) {
      suggestions.push({
        field: 'monthlyRevenue',
        currentValue: currentProfile.monthlyRevenue,
        suggestedValue: Math.round(monthlyAvg),
        reason: `Based on ${amounts.length} invoices over ${months} month(s), average monthly revenue is ₹${(monthlyAvg / 100000).toFixed(1)}L`,
        confidence: months >= 3 ? 'high' : 'medium',
      });
    }
  }

  // Detect customer type from invoice data
  const customers = new Set(csvData.map(row => row.customer || row.Customer || row.client || row.Client).filter(Boolean));
  if (customers.size > 0 && !currentProfile.customerType) {
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / customers.size;
    if (avgAmount > 100000) {
      suggestions.push({
        field: 'customerType',
        currentValue: currentProfile.customerType,
        suggestedValue: 'b2b',
        reason: `Average revenue per customer (₹${(avgAmount / 1000).toFixed(0)}K) suggests B2B customers`,
        confidence: avgAmount > 500000 ? 'high' : 'medium',
      });
    } else if (avgAmount < 5000 && customers.size > 50) {
      suggestions.push({
        field: 'customerType',
        currentValue: currentProfile.customerType,
        suggestedValue: 'b2c',
        reason: `Many customers (${customers.size}) with small transaction sizes suggest B2C`,
        confidence: 'medium',
      });
    }
  }

  return suggestions;
}

/**
 * Analyze transaction/ledger data and suggest burn rate and expense profile updates.
 */
export function analyzeTransactionsForProfile(
  transactions: Record<string, any>[],
  currentProfile: CompanyProfile
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];

  if (!transactions || transactions.length === 0) return suggestions;

  // Calculate actual burn rate from expenses
  const expenses = transactions
    .filter(t => {
      const type = (t.type || t.Type || '').toLowerCase();
      return type === 'expense' || type === 'debit' || parseFloat(t.amount || '0') < 0;
    })
    .map(t => Math.abs(parseFloat(t.amount || t.Amount || '0')));

  if (expenses.length > 0) {
    const months = new Set(transactions.map(t => {
      const date = t.date || t.Date;
      return date ? date.substring(0, 7) : null;
    }).filter(Boolean)).size || 1;

    const monthlyBurn = expenses.reduce((a, b) => a + b, 0) / months;

    if (!currentProfile.monthlyBurnRate || Math.abs(monthlyBurn - (currentProfile.monthlyBurnRate || 0)) > (currentProfile.monthlyBurnRate || 0) * 0.15) {
      suggestions.push({
        field: 'monthlyBurnRate',
        currentValue: currentProfile.monthlyBurnRate,
        suggestedValue: Math.round(monthlyBurn),
        reason: `Calculated from ${expenses.length} expense transactions over ${months} month(s): ₹${(monthlyBurn / 100000).toFixed(1)}L/month`,
        confidence: months >= 3 ? 'high' : 'medium',
      });
    }
  }

  // Detect salary expenses → estimate team size
  const salaryTxns = transactions.filter(t => {
    const cat = (t.category || t.Category || '').toLowerCase();
    const desc = (t.description || t.Description || '').toLowerCase();
    return cat.includes('salary') || cat.includes('payroll') || desc.includes('salary') || desc.includes('payroll');
  });

  if (salaryTxns.length > 0 && !currentProfile.teamSize) {
    const uniqueMonths = new Set(salaryTxns.map(t => (t.date || '').substring(0, 7))).size || 1;
    const estimatedEmployees = Math.round(salaryTxns.length / uniqueMonths);
    suggestions.push({
      field: 'teamSize',
      currentValue: currentProfile.teamSize,
      suggestedValue: estimatedEmployees,
      reason: `Detected ~${estimatedEmployees} salary payments per month from transaction data`,
      confidence: 'low',
    });
  }

  return suggestions;
}

/**
 * Analyze Zoho Books data and suggest profile updates.
 */
export function analyzeZohoDataForProfile(
  zohoRevenue: Record<string, any>,
  currentProfile: CompanyProfile
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];

  if (!zohoRevenue) return suggestions;

  // Update monthly revenue from Zoho MRR
  if (zohoRevenue.metrics?.mrr && (!currentProfile.monthlyRevenue || Math.abs(zohoRevenue.metrics.mrr - (currentProfile.monthlyRevenue || 0)) > (currentProfile.monthlyRevenue || 0) * 0.1)) {
    suggestions.push({
      field: 'monthlyRevenue',
      currentValue: currentProfile.monthlyRevenue,
      suggestedValue: Math.round(zohoRevenue.metrics.mrr),
      reason: `Zoho Books reports MRR of ₹${(zohoRevenue.metrics.mrr / 100000).toFixed(1)}L`,
      confidence: 'high',
    });
  }

  // Detect GST registration from Zoho
  if (zohoRevenue.total_revenue > 2000000 && !currentProfile.hasGSTRegistration) {
    suggestions.push({
      field: 'hasGSTRegistration',
      currentValue: false,
      suggestedValue: true,
      reason: `Total revenue (₹${(zohoRevenue.total_revenue / 100000).toFixed(1)}L) exceeds ₹20L — GST registration required`,
      confidence: 'high',
    });
  }

  // Detect recurring customers for churn estimation
  if (zohoRevenue.metrics?.recurring_customers?.length > 0 && !currentProfile.monthlyChurnRate) {
    const recurring = zohoRevenue.metrics.recurring_customers.length;
    const total = zohoRevenue.top_customers?.length || recurring;
    const retentionRate = recurring / total;
    const estimatedChurn = 1 - Math.pow(retentionRate, 1 / 12); // monthly
    suggestions.push({
      field: 'monthlyChurnRate',
      currentValue: currentProfile.monthlyChurnRate,
      suggestedValue: parseFloat(estimatedChurn.toFixed(3)),
      reason: `${recurring} of ${total} customers are recurring — estimated ${(estimatedChurn * 100).toFixed(1)}% monthly churn`,
      confidence: 'low',
    });
  }

  return suggestions;
}

/**
 * Check if profile needs a review (>90 days since last review).
 */
export function profileNeedsReview(profile: CompanyProfile): boolean {
  if (!profile.lastReviewedAt) return true;
  const lastReview = new Date(profile.lastReviewedAt);
  const daysSince = (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 90;
}

/**
 * Get fields that are still empty but would be valuable to fill.
 */
export function getMissingHighValueFields(profile: CompanyProfile): { field: string; label: string; why: string }[] {
  const missing: { field: string; label: string; why: string }[] = [];

  if (!profile.businessModel) missing.push({ field: 'businessModel', label: 'Business Model', why: 'Drives which KPIs and benchmarks matter' });
  if (!profile.fundingStage) missing.push({ field: 'fundingStage', label: 'Funding Stage', why: 'Determines acceptable burn rate and growth expectations' });
  if (!profile.cashReserves) missing.push({ field: 'cashReserves', label: 'Cash Reserves', why: 'Essential for runway calculation' });
  if (!profile.monthlyBurnRate) missing.push({ field: 'monthlyBurnRate', label: 'Monthly Burn Rate', why: 'Core metric for financial health' });
  if (!profile.monthlyRevenue) missing.push({ field: 'monthlyRevenue', label: 'Monthly Revenue', why: 'Needed for growth tracking and compliance thresholds' });
  if (!profile.customerType) missing.push({ field: 'customerType', label: 'Customer Type', why: 'Affects unit economics benchmarks' });
  if (!profile.entityType) missing.push({ field: 'entityType', label: 'Entity Type', why: 'Determines compliance obligations and audit requirements' });
  if (!profile.teamSize) missing.push({ field: 'teamSize', label: 'Team Size', why: 'Needed for payroll compliance and burn rate context' });

  return missing;
}
