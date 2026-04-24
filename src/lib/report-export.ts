/**
 * Report Export Utilities — Indian GAAP / Schedule III Edition
 * Generates Excel (.xlsx), PDF, PPTX, and CSV files client-side
 * When report.gaap is present, exports follow Schedule III Division I format
 * per Companies Act 2013 Section 129.
 */

import type {
  Report, ReportMetric,
  ScheduleIIIBalanceSheet, ScheduleIIIProfitAndLoss, CashFlowStatement, GaapData, SaaSMonthlyPnL,
} from '@/types';
import { isDemoDataLoaded, getDemoSummary, getDemoExpenseBreakdown, formatCurrency } from '@/lib/demo-data';

// ============================================================================
// HELPERS
// ============================================================================

function fmtMetric(m: ReportMetric): string {
  if (m.format === 'currency') return formatCurrency(m.value);
  if (m.format === 'percentage') return `${m.value}%`;
  if (m.format === 'months') return `${m.value} months`;
  if (m.format === 'count') return m.value.toLocaleString('en-IN');
  return formatCurrency(m.value);
}

/** Format number in Indian notation (₹ with lakhs/crores) */
function inr(v: number): string { return formatCurrency(v); }

/** Absolute value formatted */
function absInr(v: number): string { return formatCurrency(Math.abs(v)); }

function confLabel(c?: string): string {
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
}

function fmtDate(d?: string): string {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}

// ── Schedule III computation helpers ──

function totalEquity(bs: ScheduleIIIBalanceSheet): number {
  return bs.equity.shareCapital + bs.equity.reservesAndSurplus + (bs.equity.moneyReceivedAgainstWarrants || 0);
}

function totalNonCurrentLiabilities(bs: ScheduleIIIBalanceSheet): number {
  const l = bs.nonCurrentLiabilities;
  return l.longTermBorrowings + l.deferredTaxLiabilities + l.otherLongTermLiabilities + l.longTermProvisions;
}

function totalCurrentLiabilities(bs: ScheduleIIIBalanceSheet): number {
  const l = bs.currentLiabilities;
  return l.shortTermBorrowings + l.tradePayablesMSME + l.tradePayablesOthers + l.otherCurrentLiabilities + l.shortTermProvisions;
}

function totalNonCurrentAssets(bs: ScheduleIIIBalanceSheet): number {
  const a = bs.nonCurrentAssets;
  return a.tangibleAssets + a.intangibleAssets + a.capitalWIP + a.nonCurrentInvestments + a.deferredTaxAssets + a.longTermLoans + a.otherNonCurrentAssets;
}

function totalCurrentAssets(bs: ScheduleIIIBalanceSheet): number {
  const a = bs.currentAssets;
  return a.currentInvestments + a.inventories + a.tradeReceivables + a.cashAndEquivalents + a.shortTermLoans + a.otherCurrentAssets;
}

function totalExpenses(pl: ScheduleIIIProfitAndLoss): number {
  const e = pl.expenses;
  return e.costOfMaterialsConsumed + e.purchasesOfStockInTrade + e.changesInInventories
    + e.employeeBenefitExpense + e.financeCosts + e.depreciationAndAmortization + e.otherExpenses;
}

function totalRevenue(pl: ScheduleIIIProfitAndLoss): number {
  return pl.revenueFromOperations + pl.otherIncome;
}

function profitBeforeTax(pl: ScheduleIIIProfitAndLoss): number {
  return totalRevenue(pl) - totalExpenses(pl) - pl.exceptionalItems;
}

function totalTax(pl: ScheduleIIIProfitAndLoss): number {
  return pl.taxExpense.currentTax + pl.taxExpense.deferredTax;
}

function profitAfterTax(pl: ScheduleIIIProfitAndLoss): number {
  return profitBeforeTax(pl) - totalTax(pl);
}

// ============================================================================
// CSV EXPORT
// ============================================================================

export function exportCSV(report: Report) {
  const csvHeaders = ['Particulars', 'Amount (₹)', 'Previous Period (₹)', 'Notes'];
  const csvRows: string[][] = [];
  const g = report.gaap;

  // Schedule III header
  if (g) {
    csvRows.push([g.companyName, '', '', '']);
    if (g.cin) csvRows.push([`CIN: ${g.cin}`, '', '', '']);
    if (g.registeredOffice) csvRows.push([`Registered Office: ${g.registeredOffice}`, '', '', '']);
    csvRows.push(['', '', '', '']);
  }

  // Schedule III P&L
  if (g?.profitAndLoss) {
    const pl = g.profitAndLoss;
    const prev = pl.previous;
    csvRows.push([`STATEMENT OF PROFIT AND LOSS`, '', '', '']);
    csvRows.push([pl.periodEnded, '', prev ? 'Previous Period' : '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['I. Revenue from Operations', inr(pl.revenueFromOperations), prev ? inr(prev.revenueFromOperations) : '', 'AS-9']);
    csvRows.push(['II. Other Income', inr(pl.otherIncome), prev ? inr(prev.otherIncome) : '', '']);
    csvRows.push(['III. Total Revenue (I+II)', inr(totalRevenue(pl)), prev ? inr(totalRevenue(prev as any)) : '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['IV. Expenses:', '', '', '']);
    csvRows.push(['  Cost of materials consumed', inr(pl.expenses.costOfMaterialsConsumed), prev ? inr(prev.expenses.costOfMaterialsConsumed) : '', '']);
    csvRows.push(['  Purchases of stock-in-trade', inr(pl.expenses.purchasesOfStockInTrade), prev ? inr(prev.expenses.purchasesOfStockInTrade) : '', '']);
    csvRows.push(['  Changes in inventories', inr(pl.expenses.changesInInventories), prev ? inr(prev.expenses.changesInInventories) : '', '']);
    csvRows.push(['  Employee benefit expense', inr(pl.expenses.employeeBenefitExpense), prev ? inr(prev.expenses.employeeBenefitExpense) : '', 'AS-15']);
    csvRows.push(['  Finance costs', inr(pl.expenses.financeCosts), prev ? inr(prev.expenses.financeCosts) : '', '']);
    csvRows.push(['  Depreciation and amortization', inr(pl.expenses.depreciationAndAmortization), prev ? inr(prev.expenses.depreciationAndAmortization) : '', 'AS-6']);
    csvRows.push(['  Other expenses', inr(pl.expenses.otherExpenses), prev ? inr(prev.expenses.otherExpenses) : '', '']);
    csvRows.push(['  Total Expenses', inr(totalExpenses(pl)), prev ? inr(totalExpenses(prev as any)) : '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['V. Profit before exceptional items and tax (III-IV)', inr(profitBeforeTax(pl) + pl.exceptionalItems), '', '']);
    csvRows.push(['VI. Exceptional items', inr(pl.exceptionalItems), '', '']);
    csvRows.push(['VII. Profit before tax (V-VI)', inr(profitBeforeTax(pl)), prev ? inr(profitBeforeTax(prev as any)) : '', '']);
    csvRows.push(['VIII. Tax expense:', '', '', 'AS-22']);
    csvRows.push(['  Current tax', inr(pl.taxExpense.currentTax), prev ? inr(prev.taxExpense.currentTax) : '', '']);
    csvRows.push(['  Deferred tax', inr(pl.taxExpense.deferredTax), prev ? inr(prev.taxExpense.deferredTax) : '', '']);
    csvRows.push(['IX. Profit/(Loss) for the period', inr(profitAfterTax(pl)), prev ? inr(profitAfterTax(prev as any)) : '', '']);
    if (pl.earningsPerShare) {
      csvRows.push(['', '', '', '']);
      csvRows.push(['X. Earnings per share (AS-20):', '', '', '']);
      csvRows.push(['  Basic (₹)', String(pl.earningsPerShare.basic), prev?.earningsPerShare ? String(prev.earningsPerShare.basic) : '', '']);
      csvRows.push(['  Diluted (₹)', String(pl.earningsPerShare.diluted), prev?.earningsPerShare ? String(prev.earningsPerShare.diluted) : '', '']);
    }
  }

  // Schedule III Balance Sheet
  if (g?.balanceSheet) {
    const bs = g.balanceSheet;
    const prev = bs.previous;
    if (csvRows.length > 0) csvRows.push(['', '', '', '']);
    csvRows.push(['BALANCE SHEET', '', '', '']);
    csvRows.push([bs.asAt, '', prev ? prev.asAt || 'Previous Period' : '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['EQUITY AND LIABILITIES', '', '', '']);
    csvRows.push(["1. Shareholders' Funds", '', '', '']);
    csvRows.push(['  (a) Share Capital', inr(bs.equity.shareCapital), prev ? inr(prev.equity.shareCapital) : '', 'Note 1']);
    csvRows.push(['  (b) Reserves and Surplus', inr(bs.equity.reservesAndSurplus), prev ? inr(prev.equity.reservesAndSurplus) : '', 'Note 2']);
    csvRows.push(['  Sub-total', inr(totalEquity(bs)), prev ? inr(totalEquity(prev as any)) : '', '']);
    csvRows.push(['2. Non-Current Liabilities', '', '', '']);
    csvRows.push(['  (a) Long-term borrowings', inr(bs.nonCurrentLiabilities.longTermBorrowings), prev ? inr(prev.nonCurrentLiabilities.longTermBorrowings) : '', '']);
    csvRows.push(['  (b) Deferred tax liabilities (Net)', inr(bs.nonCurrentLiabilities.deferredTaxLiabilities), prev ? inr(prev.nonCurrentLiabilities.deferredTaxLiabilities) : '', '']);
    csvRows.push(['  (c) Other long-term liabilities', inr(bs.nonCurrentLiabilities.otherLongTermLiabilities), prev ? inr(prev.nonCurrentLiabilities.otherLongTermLiabilities) : '', '']);
    csvRows.push(['  (d) Long-term provisions', inr(bs.nonCurrentLiabilities.longTermProvisions), prev ? inr(prev.nonCurrentLiabilities.longTermProvisions) : '', '']);
    csvRows.push(['  Sub-total', inr(totalNonCurrentLiabilities(bs)), prev ? inr(totalNonCurrentLiabilities(prev as any)) : '', '']);
    csvRows.push(['3. Current Liabilities', '', '', '']);
    csvRows.push(['  (a) Short-term borrowings', inr(bs.currentLiabilities.shortTermBorrowings), prev ? inr(prev.currentLiabilities.shortTermBorrowings) : '', '']);
    csvRows.push(['  (b) Trade payables — MSME', inr(bs.currentLiabilities.tradePayablesMSME), prev ? inr(prev.currentLiabilities.tradePayablesMSME) : '', 'Note 3']);
    csvRows.push(['  (c) Trade payables — Others', inr(bs.currentLiabilities.tradePayablesOthers), prev ? inr(prev.currentLiabilities.tradePayablesOthers) : '', '']);
    csvRows.push(['  (d) Other current liabilities', inr(bs.currentLiabilities.otherCurrentLiabilities), prev ? inr(prev.currentLiabilities.otherCurrentLiabilities) : '', '']);
    csvRows.push(['  (e) Short-term provisions', inr(bs.currentLiabilities.shortTermProvisions), prev ? inr(prev.currentLiabilities.shortTermProvisions) : '', '']);
    csvRows.push(['  Sub-total', inr(totalCurrentLiabilities(bs)), prev ? inr(totalCurrentLiabilities(prev as any)) : '', '']);
    csvRows.push(['TOTAL EQUITY AND LIABILITIES', inr(totalEquity(bs) + totalNonCurrentLiabilities(bs) + totalCurrentLiabilities(bs)), prev ? inr(totalEquity(prev as any) + totalNonCurrentLiabilities(prev as any) + totalCurrentLiabilities(prev as any)) : '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['ASSETS', '', '', '']);
    csvRows.push(['1. Non-Current Assets', '', '', '']);
    csvRows.push(['  (a) Property, Plant and Equipment', inr(bs.nonCurrentAssets.tangibleAssets), prev ? inr(prev.nonCurrentAssets.tangibleAssets) : '', '']);
    csvRows.push(['  (b) Intangible assets', inr(bs.nonCurrentAssets.intangibleAssets), prev ? inr(prev.nonCurrentAssets.intangibleAssets) : '', '']);
    csvRows.push(['  (c) Capital work-in-progress', inr(bs.nonCurrentAssets.capitalWIP), prev ? inr(prev.nonCurrentAssets.capitalWIP) : '', '']);
    csvRows.push(['  (d) Non-current investments', inr(bs.nonCurrentAssets.nonCurrentInvestments), prev ? inr(prev.nonCurrentAssets.nonCurrentInvestments) : '', '']);
    csvRows.push(['  (e) Deferred tax assets (Net)', inr(bs.nonCurrentAssets.deferredTaxAssets), prev ? inr(prev.nonCurrentAssets.deferredTaxAssets) : '', 'AS-22']);
    csvRows.push(['  (f) Long-term loans and advances', inr(bs.nonCurrentAssets.longTermLoans), prev ? inr(prev.nonCurrentAssets.longTermLoans) : '', '']);
    csvRows.push(['  (g) Other non-current assets', inr(bs.nonCurrentAssets.otherNonCurrentAssets), prev ? inr(prev.nonCurrentAssets.otherNonCurrentAssets) : '', '']);
    csvRows.push(['  Sub-total', inr(totalNonCurrentAssets(bs)), prev ? inr(totalNonCurrentAssets(prev as any)) : '', '']);
    csvRows.push(['2. Current Assets', '', '', '']);
    csvRows.push(['  (a) Current investments', inr(bs.currentAssets.currentInvestments), prev ? inr(prev.currentAssets.currentInvestments) : '', '']);
    csvRows.push(['  (b) Inventories', inr(bs.currentAssets.inventories), prev ? inr(prev.currentAssets.inventories) : '', '']);
    csvRows.push(['  (c) Trade receivables', inr(bs.currentAssets.tradeReceivables), prev ? inr(prev.currentAssets.tradeReceivables) : '', '']);
    csvRows.push(['  (d) Cash and cash equivalents', inr(bs.currentAssets.cashAndEquivalents), prev ? inr(prev.currentAssets.cashAndEquivalents) : '', '']);
    csvRows.push(['  (e) Short-term loans and advances', inr(bs.currentAssets.shortTermLoans), prev ? inr(prev.currentAssets.shortTermLoans) : '', '']);
    csvRows.push(['  (f) Other current assets', inr(bs.currentAssets.otherCurrentAssets), prev ? inr(prev.currentAssets.otherCurrentAssets) : '', '']);
    csvRows.push(['  Sub-total', inr(totalCurrentAssets(bs)), prev ? inr(totalCurrentAssets(prev as any)) : '', '']);
    csvRows.push(['TOTAL ASSETS', inr(totalNonCurrentAssets(bs) + totalCurrentAssets(bs)), prev ? inr(totalNonCurrentAssets(prev as any) + totalCurrentAssets(prev as any)) : '', '']);
  }

  // Cash Flow
  if (g?.cashFlow) {
    const cf = g.cashFlow;
    if (csvRows.length > 0) csvRows.push(['', '', '', '']);
    csvRows.push(['CASH FLOW STATEMENT (AS-3)', '', '', '']);
    csvRows.push(['A. Operating Activities', '', '', '']);
    cf.operatingActivities.items.forEach(i => csvRows.push([`  ${i.label}`, inr(i.amount), '', '']));
    csvRows.push(['  Net Cash from Operating Activities', inr(cf.operatingActivities.net), '', '']);
    csvRows.push(['B. Investing Activities', '', '', '']);
    cf.investingActivities.items.forEach(i => csvRows.push([`  ${i.label}`, inr(i.amount), '', '']));
    csvRows.push(['  Net Cash from Investing Activities', inr(cf.investingActivities.net), '', '']);
    csvRows.push(['C. Financing Activities', '', '', '']);
    cf.financingActivities.items.forEach(i => csvRows.push([`  ${i.label}`, inr(i.amount), '', '']));
    csvRows.push(['  Net Cash from Financing Activities', inr(cf.financingActivities.net), '', '']);
    csvRows.push(['', '', '', '']);
    csvRows.push(['Net increase/(decrease) in cash', inr(cf.operatingActivities.net + cf.investingActivities.net + cf.financingActivities.net), '', '']);
    csvRows.push(['Opening cash and cash equivalents', inr(cf.openingCash), '', '']);
    csvRows.push(['Closing cash and cash equivalents', inr(cf.closingCash), '', '']);
  }

  // Fallback: generic metrics/sections for non-GAAP reports
  if (!g) {
    csvRows.push(['Report Name', report.name, report.period, '']);
    csvRows.push(['Type', report.type, '', '']);
    csvRows.push(['Status', statusLabel(report.status), '', '']);
    csvRows.push(['Author', report.author || 'N/A', '', '']);
    if (report.summary) { csvRows.push(['', '', '', '']); csvRows.push([report.summary, '', '', '']); }
    if (report.metrics && report.metrics.length > 0) {
      csvRows.push(['', '', '', '']);
      csvRows.push(['--- Key Metrics ---', '', '', '']);
      report.metrics.forEach(m => csvRows.push([m.label, fmtMetric(m), m.trend || '', m.subtext || '']));
    }
    if (report.sections) {
      report.sections.forEach(sec => {
        csvRows.push(['', '', '', '']);
        csvRows.push([`--- ${sec.title} ---`, '', '', '']);
        sec.metrics.forEach(m => csvRows.push([m.label, fmtMetric(m), m.trend || '', m.subtext || '']));
        if (sec.findings) sec.findings.forEach(f => csvRows.push([`  Finding: ${f}`, '', '', '']));
        if (sec.risks) sec.risks.forEach(r => csvRows.push([`  Risk: ${r}`, '', '', '']));
      });
    }
  }

  // Notes & Accounting Policies
  if (g?.significantAccountingPolicies) {
    csvRows.push(['', '', '', '']);
    csvRows.push(['SIGNIFICANT ACCOUNTING POLICIES', '', '', '']);
    g.significantAccountingPolicies.forEach((p, i) => csvRows.push([`${i + 1}. ${p}`, '', '', '']));
  }
  if (g?.notes) {
    csvRows.push(['', '', '', '']);
    csvRows.push(['NOTES TO ACCOUNTS', '', '', '']);
    g.notes.forEach(n => csvRows.push([n, '', '', '']));
  }

  const csvContent = [csvHeaders, ...csvRows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  triggerDownload(blob, `${sanitizeFilename(report.name)}.csv`);
}

// ============================================================================
// EXCEL EXPORT — Schedule III
// ============================================================================

export async function exportXLSX(report: Report) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const g = report.gaap;

  // ── Cover sheet ──
  const coverData: (string | number)[][] = [
    [g ? g.companyName : 'RAVEN Technologies Private Limited'],
    [g?.cin ? `CIN: ${g.cin}` : ''],
    [g?.registeredOffice ? `Registered Office: ${g.registeredOffice}` : ''],
    [''],
    [report.name],
    [''],
    ['Particulars', 'Details'],
    ['Report Type', report.type],
    ['Period', report.period],
    ['Version', report.version],
    ['Status', statusLabel(report.status)],
    ['Author', report.author || 'N/A'],
    ['Department', report.department || 'N/A'],
    ['Confidentiality', confLabel(report.confidentiality) || 'Internal'],
    ['Standard', g ? `${g.standard} — Division ${g.division}` : 'Indian GAAP'],
    ['Generated', fmtDate(report.date)],
  ];
  if (report.reviewedBy) coverData.push(['Reviewed By', `${report.reviewedBy.name} (${report.reviewedBy.role})`]);
  if (report.approvedBy) coverData.push(['Approved By', `${report.approvedBy.name} (${report.approvedBy.role})`]);
  if (report.summary) { coverData.push(['']); coverData.push(['Summary']); coverData.push([report.summary]); }

  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  wsCover['!cols'] = [{ wch: 32 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsCover, 'Cover');

  // ── SaaS Monthly P&L (matching sample format) ──
  if (g?.saasPnl) {
    const sp = g.saasPnl;
    const M = sp.months.length;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const fyLabel = report.period || 'FY 25-26';

    // Build header row: blank, blank, Particulars, Apr (Actuals), May (Actuals)... , FY total
    const hdr: (string | number)[] = ['', '', 'Particulars'];
    sp.months.forEach(m => hdr.push(`${m} (Actuals)`));
    hdr.push(fyLabel);

    const rows: (string | number | null)[][] = [];
    rows.push(hdr as any);
    rows.push([]); // row 2 blank

    // Revenue section
    rows.push(['', '', 'No of Paid Customers', ...sp.paidCustomers, sum(sp.paidCustomers)]);
    rows.push(['', '', 'ARPA', ...sp.arpa, Math.round(sum(sp.arpa) / M)]);
    rows.push(['', '', 'TOTAL', ...sp.revenue, sum(sp.revenue)]);
    rows.push(['', '', 'Revenue Growth %', ...sp.revenueGrowthPct.map(v => v || null), null]);
    rows.push(['', '', 'ARR', ...sp.arr, null]);
    rows.push([]); // blank separator

    // Expenses header
    rows.push(['Sl. No.', '', 'Expenses', ...sp.months.map(m => `${m} (Actuals)`), fyLabel]);
    rows.push(['', '', 'Cloud Costs', ...sp.expenses.cloudCosts, sum(sp.expenses.cloudCosts)]);
    rows.push(['', '', 'Certifications done for clients', ...sp.expenses.certifications, sum(sp.expenses.certifications)]);
    rows.push([1, '', 'Salary', ...Array(M).fill(''), 0]);
    rows.push(['', '', 'Business', ...sp.expenses.salary.business, sum(sp.expenses.salary.business)]);
    rows.push(['', '', 'Engineering', ...sp.expenses.salary.engineering, sum(sp.expenses.salary.engineering)]);
    rows.push(['', '', 'Management', ...sp.expenses.salary.management, sum(sp.expenses.salary.management)]);
    rows.push(['', '', 'Operations', ...sp.expenses.salary.operations, sum(sp.expenses.salary.operations)]);
    rows.push(['', '', 'Product', ...sp.expenses.salary.product, sum(sp.expenses.salary.product)]);
    rows.push(['', '', 'Research & Development', ...sp.expenses.salary.researchAndDev, sum(sp.expenses.salary.researchAndDev)]);
    rows.push(['', '', 'Commission', ...sp.expenses.commission, sum(sp.expenses.commission)]);
    rows.push([2, '', 'Rent', ...sp.expenses.rent, sum(sp.expenses.rent)]);
    rows.push(['', '', 'Office Maintenance Charges(Elect)', ...sp.expenses.officeMaintenance, sum(sp.expenses.officeMaintenance)]);
    rows.push([3, '', 'Admin Charges(PF)', ...sp.expenses.adminChargesPF, sum(sp.expenses.adminChargesPF)]);
    rows.push([4, '', 'Marketing Cost', ...sp.expenses.marketingCost, sum(sp.expenses.marketingCost)]);
    rows.push([5, '', 'Software and Subscription', ...sp.expenses.softwareSubscriptions, sum(sp.expenses.softwareSubscriptions)]);
    rows.push([6, '', 'Traveling, Conveyance, and Lodging Cost', ...sp.expenses.travelConveyance, sum(sp.expenses.travelConveyance)]);
    rows.push([7, '', 'Insurance', ...sp.expenses.insurance, sum(sp.expenses.insurance)]);
    rows.push([8, '', 'Professional Fees', ...sp.expenses.professionalFees, sum(sp.expenses.professionalFees)]);
    rows.push(['', '', 'Duties and Taxes', ...sp.expenses.dutiesAndTaxes, sum(sp.expenses.dutiesAndTaxes)]);
    rows.push(['', '', 'Staff Welfare Expense', ...sp.expenses.staffWelfare, sum(sp.expenses.staffWelfare)]);
    rows.push(['', '', 'Training & Certification', ...sp.expenses.trainingCertification, sum(sp.expenses.trainingCertification)]);
    rows.push(['', '', 'Employers Share of PF', ...sp.expenses.employerPF, sum(sp.expenses.employerPF)]);
    rows.push([9, '', 'Others', ...sp.expenses.others, sum(sp.expenses.others)]);

    // Total expenses
    const totalExpArr = sp.months.map((_, i) => {
      const e = sp.expenses;
      return e.cloudCosts[i] + e.certifications[i] + e.salary.business[i] + e.salary.engineering[i]
        + e.salary.management[i] + e.salary.operations[i] + e.salary.product[i] + e.salary.researchAndDev[i]
        + e.commission[i] + e.rent[i] + e.officeMaintenance[i] + e.adminChargesPF[i] + e.marketingCost[i]
        + e.softwareSubscriptions[i] + e.travelConveyance[i] + e.insurance[i] + e.professionalFees[i]
        + e.dutiesAndTaxes[i] + e.staffWelfare[i] + e.trainingCertification[i] + e.employerPF[i] + e.others[i];
    });
    rows.push([10, '', 'Total', ...totalExpArr, sum(totalExpArr)]);

    // Blank rows
    rows.push([]);
    rows.push([]);
    rows.push([]);
    rows.push([]);
    rows.push([]);
    rows.push([]);

    // EBITDA section
    rows.push(['', '', 'EBITDA', ...sp.ebitda, sum(sp.ebitda)]);
    rows.push(['', '', 'Cumulative Burn', ...sp.cumulativeBurn, null]);
    rows.push(['', '', 'Burn Rate on Expenses', ...sp.burnRateOnExpenses, null]);
    rows.push(['', '', 'EBITDA Margin', ...sp.ebitdaMargin, null]);
    rows.push([]); // blank
    rows.push(['', '', 'Burn Multiple', ...((sp.burnMultiple || []).map(v => v || null)), null]);

    const wsPnl = XLSX.utils.aoa_to_sheet(rows);

    // Column widths matching sample: B=7, C=38, D-O=19.5, P=27
    const colWidths: { wch: number }[] = [
      { wch: 7 },   // A (Sl. No.)
      { wch: 4 },   // B
      { wch: 38 },  // C (Particulars)
    ];
    for (let i = 0; i < M; i++) colWidths.push({ wch: 20 }); // D-O monthly
    colWidths.push({ wch: 27 }); // FY total column
    wsPnl['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsPnl, `PNL_${fyLabel.replace(/\s+/g, '')}`);
  }

  // ── Schedule III: Statement of Profit and Loss ──
  if (g?.profitAndLoss) {
    const pl = g.profitAndLoss;
    const prev = pl.previous;
    const hasPrev = !!prev;
    const headers = hasPrev
      ? ['Particulars', `Current Period (₹)`, `Previous Period (₹)`, 'Notes / AS Ref']
      : ['Particulars', `Amount (₹)`, 'Notes / AS Ref'];

    const rows: (string | number)[][] = [
      [g.companyName],
      [`Statement of Profit and Loss — ${pl.periodEnded}`],
      ['(All amounts in Indian Rupees unless stated otherwise)'],
      [''],
      headers,
      hasPrev ? ['I.   Revenue from Operations', pl.revenueFromOperations, prev!.revenueFromOperations, 'AS-9']
              : ['I.   Revenue from Operations', pl.revenueFromOperations, 'AS-9'],
      hasPrev ? ['II.  Other Income', pl.otherIncome, prev!.otherIncome, '']
              : ['II.  Other Income', pl.otherIncome, ''],
      hasPrev ? ['III. Total Revenue (I + II)', totalRevenue(pl), totalRevenue(prev as any), '']
              : ['III. Total Revenue (I + II)', totalRevenue(pl), ''],
      [''],
      hasPrev ? ['IV.  Expenses:', '', '', ''] : ['IV.  Expenses:', '', ''],
      hasPrev ? ['     Cost of materials consumed', pl.expenses.costOfMaterialsConsumed, prev!.expenses.costOfMaterialsConsumed, '']
              : ['     Cost of materials consumed', pl.expenses.costOfMaterialsConsumed, ''],
      hasPrev ? ['     Purchases of stock-in-trade', pl.expenses.purchasesOfStockInTrade, prev!.expenses.purchasesOfStockInTrade, '']
              : ['     Purchases of stock-in-trade', pl.expenses.purchasesOfStockInTrade, ''],
      hasPrev ? ['     Changes in inventories of FG, WIP & stock-in-trade', pl.expenses.changesInInventories, prev!.expenses.changesInInventories, '']
              : ['     Changes in inventories of FG, WIP & stock-in-trade', pl.expenses.changesInInventories, ''],
      hasPrev ? ['     Employee benefit expense', pl.expenses.employeeBenefitExpense, prev!.expenses.employeeBenefitExpense, 'AS-15']
              : ['     Employee benefit expense', pl.expenses.employeeBenefitExpense, 'AS-15'],
      hasPrev ? ['     Finance costs', pl.expenses.financeCosts, prev!.expenses.financeCosts, '']
              : ['     Finance costs', pl.expenses.financeCosts, ''],
      hasPrev ? ['     Depreciation and amortization expense', pl.expenses.depreciationAndAmortization, prev!.expenses.depreciationAndAmortization, 'AS-6 / Sch II']
              : ['     Depreciation and amortization expense', pl.expenses.depreciationAndAmortization, 'AS-6 / Sch II'],
      hasPrev ? ['     Other expenses', pl.expenses.otherExpenses, prev!.expenses.otherExpenses, '']
              : ['     Other expenses', pl.expenses.otherExpenses, ''],
      hasPrev ? ['     Total Expenses (IV)', totalExpenses(pl), totalExpenses(prev as any), '']
              : ['     Total Expenses (IV)', totalExpenses(pl), ''],
      [''],
      hasPrev ? ['V.   Profit before exceptional items and tax (III - IV)', profitBeforeTax(pl) + pl.exceptionalItems, profitBeforeTax(prev as any) + (prev?.exceptionalItems || 0), '']
              : ['V.   Profit before exceptional items and tax (III - IV)', profitBeforeTax(pl) + pl.exceptionalItems, ''],
      hasPrev ? ['VI.  Exceptional items', pl.exceptionalItems, prev?.exceptionalItems || 0, '']
              : ['VI.  Exceptional items', pl.exceptionalItems, ''],
      hasPrev ? ['VII. Profit before tax (V - VI)', profitBeforeTax(pl), profitBeforeTax(prev as any), '']
              : ['VII. Profit before tax (V - VI)', profitBeforeTax(pl), ''],
      [''],
      hasPrev ? ['VIII. Tax expense:', '', '', 'AS-22'] : ['VIII. Tax expense:', '', 'AS-22'],
      hasPrev ? ['      (a) Current tax', pl.taxExpense.currentTax, prev!.taxExpense.currentTax, '']
              : ['      (a) Current tax', pl.taxExpense.currentTax, ''],
      hasPrev ? ['      (b) Deferred tax', pl.taxExpense.deferredTax, prev!.taxExpense.deferredTax, '']
              : ['      (b) Deferred tax', pl.taxExpense.deferredTax, ''],
      [''],
      hasPrev ? ['IX.  Profit/(Loss) for the period', profitAfterTax(pl), profitAfterTax(prev as any), '']
              : ['IX.  Profit/(Loss) for the period', profitAfterTax(pl), ''],
    ];

    if (pl.earningsPerShare) {
      rows.push(['']);
      rows.push(hasPrev ? ['X.   Earnings per equity share (AS-20):', '', '', ''] : ['X.   Earnings per equity share (AS-20):', '', '']);
      rows.push(hasPrev ? ['      (a) Basic (₹)', pl.earningsPerShare.basic, prev?.earningsPerShare?.basic || '', '']
                        : ['      (a) Basic (₹)', pl.earningsPerShare.basic, '']);
      rows.push(hasPrev ? ['      (b) Diluted (₹)', pl.earningsPerShare.diluted, prev?.earningsPerShare?.diluted || '', '']
                        : ['      (b) Diluted (₹)', pl.earningsPerShare.diluted, '']);
    }

    rows.push(['']);
    rows.push(['See accompanying notes to the financial statements']);
    if (report.approvedBy) rows.push([`As per our report of even date. Approved by: ${report.approvedBy.name} (${report.approvedBy.role})`]);

    const wsP = XLSX.utils.aoa_to_sheet(rows);
    wsP['!cols'] = [{ wch: 52 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsP, 'Profit & Loss (Sch III)');
  }

  // ── Schedule III: Balance Sheet ──
  if (g?.balanceSheet) {
    const bs = g.balanceSheet;
    const prev = bs.previous;
    const hasPrev = !!prev;
    const hdr = hasPrev
      ? ['Particulars', `${bs.asAt} (₹)`, `${prev?.asAt || 'Previous'} (₹)`, 'Notes']
      : ['Particulars', `${bs.asAt} (₹)`, 'Notes'];

    const rows: (string | number)[][] = [
      [g.companyName],
      [`Balance Sheet — ${bs.asAt}`],
      ['(All amounts in Indian Rupees unless stated otherwise)'],
      [''],
      hdr,
      [''],
      hasPrev ? ['EQUITY AND LIABILITIES', '', '', ''] : ['EQUITY AND LIABILITIES', '', ''],
      hasPrev ? ["1. Shareholders' Funds", '', '', ''] : ["1. Shareholders' Funds", '', ''],
      hasPrev ? ['   (a) Share Capital', bs.equity.shareCapital, prev!.equity.shareCapital, 'Note 1']
              : ['   (a) Share Capital', bs.equity.shareCapital, 'Note 1'],
      hasPrev ? ['   (b) Reserves and Surplus', bs.equity.reservesAndSurplus, prev!.equity.reservesAndSurplus, 'Note 2']
              : ['   (b) Reserves and Surplus', bs.equity.reservesAndSurplus, 'Note 2'],
      hasPrev ? ['   Sub-total — Shareholders\' Funds', totalEquity(bs), totalEquity(prev as any), '']
              : ['   Sub-total — Shareholders\' Funds', totalEquity(bs), ''],
      [''],
      hasPrev ? ['2. Non-Current Liabilities', '', '', ''] : ['2. Non-Current Liabilities', '', ''],
      hasPrev ? ['   (a) Long-term borrowings', bs.nonCurrentLiabilities.longTermBorrowings, prev!.nonCurrentLiabilities.longTermBorrowings, '']
              : ['   (a) Long-term borrowings', bs.nonCurrentLiabilities.longTermBorrowings, ''],
      hasPrev ? ['   (b) Deferred tax liabilities (Net)', bs.nonCurrentLiabilities.deferredTaxLiabilities, prev!.nonCurrentLiabilities.deferredTaxLiabilities, 'AS-22']
              : ['   (b) Deferred tax liabilities (Net)', bs.nonCurrentLiabilities.deferredTaxLiabilities, 'AS-22'],
      hasPrev ? ['   (c) Other long-term liabilities', bs.nonCurrentLiabilities.otherLongTermLiabilities, prev!.nonCurrentLiabilities.otherLongTermLiabilities, '']
              : ['   (c) Other long-term liabilities', bs.nonCurrentLiabilities.otherLongTermLiabilities, ''],
      hasPrev ? ['   (d) Long-term provisions', bs.nonCurrentLiabilities.longTermProvisions, prev!.nonCurrentLiabilities.longTermProvisions, '']
              : ['   (d) Long-term provisions', bs.nonCurrentLiabilities.longTermProvisions, ''],
      hasPrev ? ['   Sub-total', totalNonCurrentLiabilities(bs), totalNonCurrentLiabilities(prev as any), '']
              : ['   Sub-total', totalNonCurrentLiabilities(bs), ''],
      [''],
      hasPrev ? ['3. Current Liabilities', '', '', ''] : ['3. Current Liabilities', '', ''],
      hasPrev ? ['   (a) Short-term borrowings', bs.currentLiabilities.shortTermBorrowings, prev!.currentLiabilities.shortTermBorrowings, '']
              : ['   (a) Short-term borrowings', bs.currentLiabilities.shortTermBorrowings, ''],
      hasPrev ? ['   (b) Trade payables', '', '', 'Note 3']
              : ['   (b) Trade payables', '', 'Note 3'],
      hasPrev ? ['       — Micro & Small Enterprises', bs.currentLiabilities.tradePayablesMSME, prev!.currentLiabilities.tradePayablesMSME, 'MSMED Act']
              : ['       — Micro & Small Enterprises', bs.currentLiabilities.tradePayablesMSME, 'MSMED Act'],
      hasPrev ? ['       — Others', bs.currentLiabilities.tradePayablesOthers, prev!.currentLiabilities.tradePayablesOthers, '']
              : ['       — Others', bs.currentLiabilities.tradePayablesOthers, ''],
      hasPrev ? ['   (c) Other current liabilities', bs.currentLiabilities.otherCurrentLiabilities, prev!.currentLiabilities.otherCurrentLiabilities, '']
              : ['   (c) Other current liabilities', bs.currentLiabilities.otherCurrentLiabilities, ''],
      hasPrev ? ['   (d) Short-term provisions', bs.currentLiabilities.shortTermProvisions, prev!.currentLiabilities.shortTermProvisions, '']
              : ['   (d) Short-term provisions', bs.currentLiabilities.shortTermProvisions, ''],
      hasPrev ? ['   Sub-total', totalCurrentLiabilities(bs), totalCurrentLiabilities(prev as any), '']
              : ['   Sub-total', totalCurrentLiabilities(bs), ''],
      [''],
      hasPrev ? ['TOTAL — EQUITY AND LIABILITIES', totalEquity(bs) + totalNonCurrentLiabilities(bs) + totalCurrentLiabilities(bs), totalEquity(prev as any) + totalNonCurrentLiabilities(prev as any) + totalCurrentLiabilities(prev as any), '']
              : ['TOTAL — EQUITY AND LIABILITIES', totalEquity(bs) + totalNonCurrentLiabilities(bs) + totalCurrentLiabilities(bs), ''],
      [''],
      hasPrev ? ['ASSETS', '', '', ''] : ['ASSETS', '', ''],
      hasPrev ? ['1. Non-Current Assets', '', '', ''] : ['1. Non-Current Assets', '', ''],
      hasPrev ? ['   (a) Property, Plant and Equipment', bs.nonCurrentAssets.tangibleAssets, prev!.nonCurrentAssets.tangibleAssets, '']
              : ['   (a) Property, Plant and Equipment', bs.nonCurrentAssets.tangibleAssets, ''],
      hasPrev ? ['   (b) Intangible assets', bs.nonCurrentAssets.intangibleAssets, prev!.nonCurrentAssets.intangibleAssets, 'AS-26']
              : ['   (b) Intangible assets', bs.nonCurrentAssets.intangibleAssets, 'AS-26'],
      hasPrev ? ['   (c) Capital work-in-progress', bs.nonCurrentAssets.capitalWIP, prev!.nonCurrentAssets.capitalWIP, '']
              : ['   (c) Capital work-in-progress', bs.nonCurrentAssets.capitalWIP, ''],
      hasPrev ? ['   (d) Non-current investments', bs.nonCurrentAssets.nonCurrentInvestments, prev!.nonCurrentAssets.nonCurrentInvestments, '']
              : ['   (d) Non-current investments', bs.nonCurrentAssets.nonCurrentInvestments, ''],
      hasPrev ? ['   (e) Deferred tax assets (Net)', bs.nonCurrentAssets.deferredTaxAssets, prev!.nonCurrentAssets.deferredTaxAssets, 'AS-22']
              : ['   (e) Deferred tax assets (Net)', bs.nonCurrentAssets.deferredTaxAssets, 'AS-22'],
      hasPrev ? ['   (f) Long-term loans and advances', bs.nonCurrentAssets.longTermLoans, prev!.nonCurrentAssets.longTermLoans, '']
              : ['   (f) Long-term loans and advances', bs.nonCurrentAssets.longTermLoans, ''],
      hasPrev ? ['   (g) Other non-current assets', bs.nonCurrentAssets.otherNonCurrentAssets, prev!.nonCurrentAssets.otherNonCurrentAssets, '']
              : ['   (g) Other non-current assets', bs.nonCurrentAssets.otherNonCurrentAssets, ''],
      hasPrev ? ['   Sub-total', totalNonCurrentAssets(bs), totalNonCurrentAssets(prev as any), '']
              : ['   Sub-total', totalNonCurrentAssets(bs), ''],
      [''],
      hasPrev ? ['2. Current Assets', '', '', ''] : ['2. Current Assets', '', ''],
      hasPrev ? ['   (a) Current investments', bs.currentAssets.currentInvestments, prev!.currentAssets.currentInvestments, '']
              : ['   (a) Current investments', bs.currentAssets.currentInvestments, ''],
      hasPrev ? ['   (b) Inventories', bs.currentAssets.inventories, prev!.currentAssets.inventories, '']
              : ['   (b) Inventories', bs.currentAssets.inventories, ''],
      hasPrev ? ['   (c) Trade receivables', bs.currentAssets.tradeReceivables, prev!.currentAssets.tradeReceivables, '']
              : ['   (c) Trade receivables', bs.currentAssets.tradeReceivables, ''],
      hasPrev ? ['   (d) Cash and cash equivalents', bs.currentAssets.cashAndEquivalents, prev!.currentAssets.cashAndEquivalents, '']
              : ['   (d) Cash and cash equivalents', bs.currentAssets.cashAndEquivalents, ''],
      hasPrev ? ['   (e) Short-term loans and advances', bs.currentAssets.shortTermLoans, prev!.currentAssets.shortTermLoans, '']
              : ['   (e) Short-term loans and advances', bs.currentAssets.shortTermLoans, ''],
      hasPrev ? ['   (f) Other current assets', bs.currentAssets.otherCurrentAssets, prev!.currentAssets.otherCurrentAssets, '']
              : ['   (f) Other current assets', bs.currentAssets.otherCurrentAssets, ''],
      hasPrev ? ['   Sub-total', totalCurrentAssets(bs), totalCurrentAssets(prev as any), '']
              : ['   Sub-total', totalCurrentAssets(bs), ''],
      [''],
      hasPrev ? ['TOTAL ASSETS', totalNonCurrentAssets(bs) + totalCurrentAssets(bs), totalNonCurrentAssets(prev as any) + totalCurrentAssets(prev as any), '']
              : ['TOTAL ASSETS', totalNonCurrentAssets(bs) + totalCurrentAssets(bs), ''],
      [''],
      ['See accompanying notes to the financial statements'],
    ];

    const wsBS = XLSX.utils.aoa_to_sheet(rows);
    wsBS['!cols'] = [{ wch: 48 }, { wch: 22 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsBS, 'Balance Sheet (Sch III)');
  }

  // ── Cash Flow Statement (AS-3) ──
  if (g?.cashFlow) {
    const cf = g.cashFlow;
    const rows: (string | number)[][] = [
      [g.companyName],
      ['Cash Flow Statement for the year ended'],
      ['(Indirect Method per AS-3)'],
      [''],
      ['Particulars', 'Amount (₹)'],
      [''],
      ['A. CASH FLOW FROM OPERATING ACTIVITIES'],
    ];
    cf.operatingActivities.items.forEach(i => rows.push([`   ${i.label}`, i.amount]));
    rows.push(['   Net Cash from Operating Activities (A)', cf.operatingActivities.net]);
    rows.push(['']);
    rows.push(['B. CASH FLOW FROM INVESTING ACTIVITIES']);
    cf.investingActivities.items.forEach(i => rows.push([`   ${i.label}`, i.amount]));
    rows.push(['   Net Cash from Investing Activities (B)', cf.investingActivities.net]);
    rows.push(['']);
    rows.push(['C. CASH FLOW FROM FINANCING ACTIVITIES']);
    cf.financingActivities.items.forEach(i => rows.push([`   ${i.label}`, i.amount]));
    rows.push(['   Net Cash from Financing Activities (C)', cf.financingActivities.net]);
    rows.push(['']);
    rows.push(['Net increase/(decrease) in cash (A+B+C)', cf.operatingActivities.net + cf.investingActivities.net + cf.financingActivities.net]);
    rows.push(['Cash and cash equivalents — opening', cf.openingCash]);
    rows.push(['Cash and cash equivalents — closing', cf.closingCash]);

    const wsCF = XLSX.utils.aoa_to_sheet(rows);
    wsCF['!cols'] = [{ wch: 48 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsCF, 'Cash Flow (AS-3)');
  }

  // ── Key Metrics (generic) ──
  if (report.metrics && report.metrics.length > 0) {
    const metricsData: (string | number)[][] = [['Metric', 'Value (₹)', 'Change (%)', 'Trend', 'AS Reference / Notes']];
    report.metrics.forEach(m => {
      metricsData.push([m.label, m.value, m.change != null ? m.change : '', m.trend || '', m.subtext || '']);
    });
    const wsM = XLSX.utils.aoa_to_sheet(metricsData);
    wsM['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsM, 'Key Metrics');
  }

  // ── Sections (one sheet each) ──
  if (report.sections && report.sections.length > 0) {
    report.sections.forEach((sec, idx) => {
      const sheetName = sec.title.substring(0, 28) || `Section ${idx + 1}`;
      const secData: (string | number)[][] = [
        [sec.title],
        [sec.description || ''],
        [''],
        ['Particulars', 'Amount (₹)', 'Change (%)', 'Trend', 'Notes'],
      ];
      sec.metrics.forEach(m => secData.push([m.label, m.value, m.change != null ? m.change : '', m.trend || '', m.subtext || '']));
      if (sec.findings?.length) { secData.push(['']); secData.push(['Key Findings']); sec.findings.forEach((f, i) => secData.push([`${i + 1}.`, f])); }
      if (sec.risks?.length) { secData.push(['']); secData.push(['Identified Risks']); sec.risks.forEach((r, i) => secData.push([`${i + 1}.`, r])); }
      const ws = XLSX.utils.aoa_to_sheet(secData);
      ws['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  // ── Notes & Accounting Policies ──
  if (g?.significantAccountingPolicies || g?.notes || g?.auditorRemarks) {
    const notesData: (string | number)[][] = [
      [g.companyName],
      ['Notes to Financial Statements'],
      [''],
    ];
    if (g.significantAccountingPolicies) {
      notesData.push(['SIGNIFICANT ACCOUNTING POLICIES']);
      notesData.push(['']);
      g.significantAccountingPolicies.forEach((p, i) => notesData.push([`${i + 1}. ${p}`]));
      notesData.push(['']);
    }
    if (g.notes) {
      notesData.push(['NOTES TO ACCOUNTS']);
      notesData.push(['']);
      g.notes.forEach(n => notesData.push([n]));
      notesData.push(['']);
    }
    if (g.auditorRemarks) {
      notesData.push(['AUDITOR\'S REMARKS']);
      notesData.push(['']);
      g.auditorRemarks.forEach(r => notesData.push([r]));
    }
    const wsN = XLSX.utils.aoa_to_sheet(notesData);
    wsN['!cols'] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsN, 'Notes & Policies');
  }

  // ── Expense Breakdown (demo data fallback) ──
  if (isDemoDataLoaded()) {
    const expenses = getDemoExpenseBreakdown();
    if (expenses.length > 0) {
      const expData: (string | number)[][] = [['Category', 'Amount (₹)', 'Percentage']];
      expenses.forEach(e => expData.push([e.category, formatCurrency(e.amount), `${e.pct}%`]));
      const ws3 = XLSX.utils.aoa_to_sheet(expData);
      ws3['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Expense Breakdown');
    }
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `${sanitizeFilename(report.name)}.xlsx`);
}

// ============================================================================
// PDF EXPORT — Schedule III
// ============================================================================

export async function exportPDF(report: Report) {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  const g = report.gaap;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primary: [number, number, number] = [30, 64, 175];
  const dark: [number, number, number] = [15, 23, 42];
  const muted: [number, number, number] = [100, 116, 139];
  const green: [number, number, number] = [22, 163, 74];
  const red: [number, number, number] = [220, 38, 38];
  const sectionBg: [number, number, number] = [241, 245, 249];

  // ── Helper: check page break ──
  function ensureSpace(needed: number) {
    if (y > pageHeight - needed) { doc.addPage(); y = 20; }
  }

  // ── Header ──
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(g ? g.companyName : 'RAVEN Technologies Private Limited', 14, 15);

  if (g?.cin) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`CIN: ${g.cin}`, 14, 22);
  }
  if (g?.registeredOffice) {
    doc.setFontSize(7);
    doc.text(`Regd. Office: ${g.registeredOffice}`, 14, 28);
  }

  // Confidentiality + standard badge
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const badges = [
    g ? `${g.standard} — Division ${g.division}` : 'Indian GAAP',
    confLabel(report.confidentiality) || 'Internal',
  ].join('  |  ');
  doc.text(badges, pageWidth - 14, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Generated: ${fmtDate(report.date)}`, pageWidth - 14, 22, { align: 'right' });

  // Report title
  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...dark);
  doc.text(report.name, 14, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text([report.type, report.period, report.version, statusLabel(report.status)].filter(Boolean).join('  |  '), 14, y);

  if (report.author) {
    y += 5;
    doc.text(`Prepared by: ${report.author}${report.department ? ` — ${report.department}` : ''}`, 14, y);
  }

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // ── SaaS Monthly P&L (PDF — summary table) ──
  if (g?.saasPnl) {
    const sp = g.saasPnl;
    const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Monthly P&L Summary (SaaS)', 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text('Enterprise SaaS P&L — Monthly Actuals (All amounts in ₹)', 14, y);
    y += 6;

    // Revenue summary table
    const revHead = [['Month', 'Revenue (₹)', 'Customers', 'ARR (₹)', 'Growth %']];
    const revBody = sp.months.map((m, i) => [
      m, inr(sp.revenue[i]), String(sp.paidCustomers[i]), inr(sp.arr[i]),
      i === 0 ? '—' : `${(sp.revenueGrowthPct[i] * 100).toFixed(1)}%`,
    ]);
    revBody.push(['FY Total', inr(sumArr(sp.revenue)), '', '', '']);

    autoTable(doc, {
      startY: y,
      head: revHead,
      body: revBody,
      theme: 'grid',
      headStyles: { fillColor: primary, fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 16 }, 1: { halign: 'right', cellWidth: 32 }, 2: { halign: 'right', cellWidth: 18 }, 3: { halign: 'right', cellWidth: 32 }, 4: { halign: 'right', cellWidth: 18 } },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => { if (String(data.cell.raw) === 'FY Total') data.cell.styles.fontStyle = 'bold'; },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Expenses summary
    ensureSpace(60);
    const expHead = [['Month', 'Total Exp (₹)', 'EBITDA (₹)', 'EBITDA Margin', 'Burn Rate']];
    const expBody = sp.months.map((m, i) => [
      m, inr(sp.revenue[i] > 0 ? Math.round(sp.revenue[i] * sp.burnRateOnExpenses[i]) : 0),
      inr(sp.ebitda[i]),
      `${(sp.ebitdaMargin[i] * 100).toFixed(1)}%`,
      `${(sp.burnRateOnExpenses[i] * 100).toFixed(1)}%`,
    ]);
    expBody.push(['FY Total', inr(sumArr(sp.revenue) - sumArr(sp.ebitda)), inr(sumArr(sp.ebitda)), '', '']);

    autoTable(doc, {
      startY: y,
      head: expHead,
      body: expBody,
      theme: 'grid',
      headStyles: { fillColor: primary, fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 16 }, 1: { halign: 'right', cellWidth: 30 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 22 }, 4: { halign: 'right', cellWidth: 20 } },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (String(data.cell.raw) === 'FY Total') data.cell.styles.fontStyle = 'bold';
        // Color negative EBITDA red
        if (data.column.index === 2 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val.includes('-') || val.includes('(')) data.cell.styles.textColor = red;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Expense breakdown table
    ensureSpace(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('Expense Breakdown — FY Total', 14, y);
    y += 5;

    const e = sp.expenses;
    const expBreakdown = [
      ['Cloud Costs', sumArr(e.cloudCosts)],
      ['Certifications', sumArr(e.certifications)],
      ['Salary — Business', sumArr(e.salary.business)],
      ['Salary — Engineering', sumArr(e.salary.engineering)],
      ['Salary — Management', sumArr(e.salary.management)],
      ['Salary — Operations', sumArr(e.salary.operations)],
      ['Salary — Product', sumArr(e.salary.product)],
      ['Salary — R&D', sumArr(e.salary.researchAndDev)],
      ['Commission', sumArr(e.commission)],
      ['Rent', sumArr(e.rent)],
      ['Office Maintenance', sumArr(e.officeMaintenance)],
      ['Admin (PF)', sumArr(e.adminChargesPF)],
      ['Marketing', sumArr(e.marketingCost)],
      ['Software & Subscriptions', sumArr(e.softwareSubscriptions)],
      ['Travel & Conveyance', sumArr(e.travelConveyance)],
      ['Insurance', sumArr(e.insurance)],
      ['Professional Fees', sumArr(e.professionalFees)],
      ['Duties & Taxes', sumArr(e.dutiesAndTaxes)],
      ['Staff Welfare', sumArr(e.staffWelfare)],
      ['Training', sumArr(e.trainingCertification)],
      ['Employer PF', sumArr(e.employerPF)],
      ['Others', sumArr(e.others)],
    ];
    const totalExp = expBreakdown.reduce((s, r) => s + (r[1] as number), 0);

    autoTable(doc, {
      startY: y,
      head: [['Expense Category', 'FY Total (₹)', '% of Total']],
      body: [
        ...expBreakdown.map(([label, val]) => [label, inr(val as number), `${((val as number) / totalExp * 100).toFixed(1)}%`]),
        ['Total Expenses', inr(totalExp), '100.0%'],
      ],
      theme: 'striped',
      headStyles: { fillColor: primary, fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => { if (String(data.cell.raw) === 'Total Expenses') data.cell.styles.fontStyle = 'bold'; },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Schedule III: Statement of Profit and Loss ──
  if (g?.profitAndLoss) {
    const pl = g.profitAndLoss;
    const prev = pl.previous;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Statement of Profit and Loss', 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(`${pl.periodEnded} (All amounts in Indian Rupees)`, 14, y);
    y += 6;

    const plHead = prev
      ? [['Particulars', 'Current Period (₹)', 'Previous Period (₹)', 'Ref']]
      : [['Particulars', 'Amount (₹)', 'Ref']];

    const plBody: (string | number)[][] = [];
    const addRow = (label: string, cur: number, prevVal?: number, ref?: string) => {
      if (prev) plBody.push([label, inr(cur), prevVal != null ? inr(prevVal) : '', ref || '']);
      else plBody.push([label, inr(cur), ref || '']);
    };

    addRow('I.   Revenue from Operations', pl.revenueFromOperations, prev?.revenueFromOperations, 'AS-9');
    addRow('II.  Other Income', pl.otherIncome, prev?.otherIncome);
    addRow('III. Total Revenue (I + II)', totalRevenue(pl), prev ? totalRevenue(prev as any) : undefined);
    plBody.push(prev ? ['', '', '', ''] : ['', '', '']);
    plBody.push(prev ? ['IV.  Expenses:', '', '', ''] : ['IV.  Expenses:', '', '']);
    addRow('     Cost of materials consumed', pl.expenses.costOfMaterialsConsumed, prev?.expenses.costOfMaterialsConsumed);
    addRow('     Purchases of stock-in-trade', pl.expenses.purchasesOfStockInTrade, prev?.expenses.purchasesOfStockInTrade);
    addRow('     Changes in inventories', pl.expenses.changesInInventories, prev?.expenses.changesInInventories);
    addRow('     Employee benefit expense', pl.expenses.employeeBenefitExpense, prev?.expenses.employeeBenefitExpense, 'AS-15');
    addRow('     Finance costs', pl.expenses.financeCosts, prev?.expenses.financeCosts);
    addRow('     Depreciation & amortization', pl.expenses.depreciationAndAmortization, prev?.expenses.depreciationAndAmortization, 'AS-6');
    addRow('     Other expenses', pl.expenses.otherExpenses, prev?.expenses.otherExpenses);
    addRow('     Total Expenses (IV)', totalExpenses(pl), prev ? totalExpenses(prev as any) : undefined);
    plBody.push(prev ? ['', '', '', ''] : ['', '', '']);
    addRow('V.   PBT before exceptional items', profitBeforeTax(pl) + pl.exceptionalItems, prev ? profitBeforeTax(prev as any) + (prev?.exceptionalItems || 0) : undefined);
    addRow('VI.  Exceptional items', pl.exceptionalItems, prev?.exceptionalItems);
    addRow('VII. Profit before tax', profitBeforeTax(pl), prev ? profitBeforeTax(prev as any) : undefined);
    plBody.push(prev ? ['', '', '', ''] : ['', '', '']);
    plBody.push(prev ? ['VIII. Tax expense:', '', '', 'AS-22'] : ['VIII. Tax expense:', '', 'AS-22']);
    addRow('      (a) Current tax', pl.taxExpense.currentTax, prev?.taxExpense.currentTax);
    addRow('      (b) Deferred tax', pl.taxExpense.deferredTax, prev?.taxExpense.deferredTax);
    plBody.push(prev ? ['', '', '', ''] : ['', '', '']);
    addRow('IX.  Profit/(Loss) for the period', profitAfterTax(pl), prev ? profitAfterTax(prev as any) : undefined);

    if (pl.earningsPerShare) {
      plBody.push(prev ? ['', '', '', ''] : ['', '', '']);
      plBody.push(prev ? ['X.   Earnings per share (AS-20):', '', '', ''] : ['X.   Earnings per share (AS-20):', '', '']);
      if (prev) {
        plBody.push(['      (a) Basic (₹)', String(pl.earningsPerShare.basic), prev?.earningsPerShare ? String(prev.earningsPerShare.basic) : '', '']);
        plBody.push(['      (b) Diluted (₹)', String(pl.earningsPerShare.diluted), prev?.earningsPerShare ? String(prev.earningsPerShare.diluted) : '', '']);
      } else {
        plBody.push(['      (a) Basic (₹)', String(pl.earningsPerShare.basic), '']);
        plBody.push(['      (b) Diluted (₹)', String(pl.earningsPerShare.diluted), '']);
      }
    }

    autoTable(doc, {
      startY: y,
      head: plHead,
      body: plBody,
      theme: 'grid',
      headStyles: { fillColor: primary, fontSize: 8, cellPadding: 2.5 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: prev
        ? { 0: { cellWidth: 82 }, 1: { cellWidth: 35, halign: 'right' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 24, halign: 'center' } }
        : { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'right' }, 2: { cellWidth: 26, halign: 'center' } },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        // Bold totals and section headers
        const text = String(data.cell.raw || '');
        if (text.startsWith('III.') || text.startsWith('IX.') || text.includes('Total') || text.startsWith('VII.') || text.startsWith('V.')) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Schedule III: Balance Sheet ──
  if (g?.balanceSheet) {
    ensureSpace(80);
    const bs = g.balanceSheet;
    const prev = bs.previous;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Balance Sheet', 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(`${bs.asAt} (All amounts in Indian Rupees)`, 14, y);
    y += 6;

    const bsHead = prev
      ? [['Particulars', `${bs.asAt} (₹)`, `${prev.asAt || 'Prev'} (₹)`, 'Notes']]
      : [['Particulars', `Amount (₹)`, 'Notes']];

    const bsBody: (string | number)[][] = [];
    const bsAdd = (label: string, cur: number, prevVal?: number, ref?: string) => {
      if (prev) bsBody.push([label, inr(cur), prevVal != null ? inr(prevVal) : '', ref || '']);
      else bsBody.push([label, inr(cur), ref || '']);
    };

    const bsBlank = () => bsBody.push(prev ? ['', '', '', ''] : ['', '', '']);
    const bsHeader = (label: string) => bsBody.push(prev ? [label, '', '', ''] : [label, '', '']);

    bsHeader('EQUITY AND LIABILITIES');
    bsHeader("1. Shareholders' Funds");
    bsAdd('   (a) Share Capital', bs.equity.shareCapital, prev?.equity.shareCapital, 'Note 1');
    bsAdd('   (b) Reserves and Surplus', bs.equity.reservesAndSurplus, prev?.equity.reservesAndSurplus, 'Note 2');
    bsAdd("   Sub-total — Shareholders' Funds", totalEquity(bs), prev ? totalEquity(prev as any) : undefined);
    bsBlank();
    bsHeader('2. Non-Current Liabilities');
    bsAdd('   (a) Long-term borrowings', bs.nonCurrentLiabilities.longTermBorrowings, prev?.nonCurrentLiabilities.longTermBorrowings);
    bsAdd('   (b) Deferred tax liabilities', bs.nonCurrentLiabilities.deferredTaxLiabilities, prev?.nonCurrentLiabilities.deferredTaxLiabilities, 'AS-22');
    bsAdd('   (c) Other long-term liabilities', bs.nonCurrentLiabilities.otherLongTermLiabilities, prev?.nonCurrentLiabilities.otherLongTermLiabilities);
    bsAdd('   (d) Long-term provisions', bs.nonCurrentLiabilities.longTermProvisions, prev?.nonCurrentLiabilities.longTermProvisions);
    bsAdd('   Sub-total', totalNonCurrentLiabilities(bs), prev ? totalNonCurrentLiabilities(prev as any) : undefined);
    bsBlank();
    bsHeader('3. Current Liabilities');
    bsAdd('   (a) Short-term borrowings', bs.currentLiabilities.shortTermBorrowings, prev?.currentLiabilities.shortTermBorrowings);
    bsHeader('   (b) Trade payables');
    bsAdd('       — Micro & Small Enterprises', bs.currentLiabilities.tradePayablesMSME, prev?.currentLiabilities.tradePayablesMSME, 'MSMED');
    bsAdd('       — Others', bs.currentLiabilities.tradePayablesOthers, prev?.currentLiabilities.tradePayablesOthers);
    bsAdd('   (c) Other current liabilities', bs.currentLiabilities.otherCurrentLiabilities, prev?.currentLiabilities.otherCurrentLiabilities);
    bsAdd('   (d) Short-term provisions', bs.currentLiabilities.shortTermProvisions, prev?.currentLiabilities.shortTermProvisions);
    bsAdd('   Sub-total', totalCurrentLiabilities(bs), prev ? totalCurrentLiabilities(prev as any) : undefined);
    bsBlank();
    bsAdd('TOTAL — EQUITY AND LIABILITIES', totalEquity(bs) + totalNonCurrentLiabilities(bs) + totalCurrentLiabilities(bs), prev ? totalEquity(prev as any) + totalNonCurrentLiabilities(prev as any) + totalCurrentLiabilities(prev as any) : undefined);
    bsBlank();
    bsHeader('ASSETS');
    bsHeader('1. Non-Current Assets');
    bsAdd('   (a) Property, Plant and Equipment', bs.nonCurrentAssets.tangibleAssets, prev?.nonCurrentAssets.tangibleAssets);
    bsAdd('   (b) Intangible assets', bs.nonCurrentAssets.intangibleAssets, prev?.nonCurrentAssets.intangibleAssets, 'AS-26');
    bsAdd('   (c) Capital work-in-progress', bs.nonCurrentAssets.capitalWIP, prev?.nonCurrentAssets.capitalWIP);
    bsAdd('   (d) Non-current investments', bs.nonCurrentAssets.nonCurrentInvestments, prev?.nonCurrentAssets.nonCurrentInvestments);
    bsAdd('   (e) Deferred tax assets (Net)', bs.nonCurrentAssets.deferredTaxAssets, prev?.nonCurrentAssets.deferredTaxAssets, 'AS-22');
    bsAdd('   (f) Long-term loans & advances', bs.nonCurrentAssets.longTermLoans, prev?.nonCurrentAssets.longTermLoans);
    bsAdd('   (g) Other non-current assets', bs.nonCurrentAssets.otherNonCurrentAssets, prev?.nonCurrentAssets.otherNonCurrentAssets);
    bsAdd('   Sub-total', totalNonCurrentAssets(bs), prev ? totalNonCurrentAssets(prev as any) : undefined);
    bsBlank();
    bsHeader('2. Current Assets');
    bsAdd('   (a) Current investments', bs.currentAssets.currentInvestments, prev?.currentAssets.currentInvestments);
    bsAdd('   (b) Inventories', bs.currentAssets.inventories, prev?.currentAssets.inventories);
    bsAdd('   (c) Trade receivables', bs.currentAssets.tradeReceivables, prev?.currentAssets.tradeReceivables);
    bsAdd('   (d) Cash and cash equivalents', bs.currentAssets.cashAndEquivalents, prev?.currentAssets.cashAndEquivalents);
    bsAdd('   (e) Short-term loans & advances', bs.currentAssets.shortTermLoans, prev?.currentAssets.shortTermLoans);
    bsAdd('   (f) Other current assets', bs.currentAssets.otherCurrentAssets, prev?.currentAssets.otherCurrentAssets);
    bsAdd('   Sub-total', totalCurrentAssets(bs), prev ? totalCurrentAssets(prev as any) : undefined);
    bsBlank();
    bsAdd('TOTAL ASSETS', totalNonCurrentAssets(bs) + totalCurrentAssets(bs), prev ? totalNonCurrentAssets(prev as any) + totalCurrentAssets(prev as any) : undefined);

    autoTable(doc, {
      startY: y,
      head: bsHead,
      body: bsBody,
      theme: 'grid',
      headStyles: { fillColor: primary, fontSize: 8, cellPadding: 2.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: prev
        ? { 0: { cellWidth: 82 }, 1: { cellWidth: 35, halign: 'right' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 24, halign: 'center' } }
        : { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'right' }, 2: { cellWidth: 26, halign: 'center' } },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        const text = String(data.cell.raw || '');
        if (text.startsWith('EQUITY') || text.startsWith('ASSETS') || text.startsWith('TOTAL') || text.includes('Sub-total') || text.includes("Shareholders'")) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (text.startsWith('EQUITY') || text.startsWith('ASSETS')) {
          data.cell.styles.fillColor = sectionBg;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Cash Flow Statement ──
  if (g?.cashFlow) {
    ensureSpace(60);
    const cf = g.cashFlow;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Cash Flow Statement (AS-3 — Indirect Method)', 14, y);
    y += 6;

    const cfBody: string[][] = [];
    cfBody.push(['A. CASH FLOW FROM OPERATING ACTIVITIES', '']);
    cf.operatingActivities.items.forEach(i => cfBody.push([`   ${i.label}`, inr(i.amount)]));
    cfBody.push(['   Net Cash from Operating Activities (A)', inr(cf.operatingActivities.net)]);
    cfBody.push(['', '']);
    cfBody.push(['B. CASH FLOW FROM INVESTING ACTIVITIES', '']);
    cf.investingActivities.items.forEach(i => cfBody.push([`   ${i.label}`, inr(i.amount)]));
    cfBody.push(['   Net Cash from Investing Activities (B)', inr(cf.investingActivities.net)]);
    cfBody.push(['', '']);
    cfBody.push(['C. CASH FLOW FROM FINANCING ACTIVITIES', '']);
    cf.financingActivities.items.forEach(i => cfBody.push([`   ${i.label}`, inr(i.amount)]));
    cfBody.push(['   Net Cash from Financing Activities (C)', inr(cf.financingActivities.net)]);
    cfBody.push(['', '']);
    cfBody.push(['Net increase/(decrease) in cash (A+B+C)', inr(cf.operatingActivities.net + cf.investingActivities.net + cf.financingActivities.net)]);
    cfBody.push(['Opening cash and cash equivalents', inr(cf.openingCash)]);
    cfBody.push(['Closing cash and cash equivalents', inr(cf.closingCash)]);

    autoTable(doc, {
      startY: y,
      head: [['Particulars', 'Amount (₹)']],
      body: cfBody,
      theme: 'grid',
      headStyles: { fillColor: primary, fontSize: 8, cellPadding: 2.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 46, halign: 'right' } },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        const text = String(data.cell.raw || '');
        if (text.startsWith('A.') || text.startsWith('B.') || text.startsWith('C.') || text.startsWith('Net ') || text.startsWith('Opening') || text.startsWith('Closing')) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Generic metrics table (for non-GAAP reports) ──
  if (!g && report.metrics && report.metrics.length > 0) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Key Metrics', 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Change', 'Trend']],
      body: report.metrics.map(m => [
        m.label, fmtMetric(m),
        m.change != null ? `${m.change > 0 ? '+' : ''}${m.change}%` : '—',
        m.trend ? (m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '→') : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: primary, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Sections (for all reports) ──
  if (report.sections && report.sections.length > 0) {
    report.sections.forEach(sec => {
      ensureSpace(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.text(sec.title, 14, y);
      if (sec.description) {
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        const descLines = doc.splitTextToSize(sec.description, pageWidth - 28);
        doc.text(descLines, 14, y);
        y += descLines.length * 3.5 + 2;
      } else {
        y += 5;
      }

      if (sec.metrics.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Particulars', 'Amount (₹)', 'Change', 'Trend']],
          body: sec.metrics.map(m => [
            m.label, fmtMetric(m),
            m.change != null ? `${m.change > 0 ? '+' : ''}${m.change}%` : '—',
            m.trend ? (m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '→') : '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: primary, fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 2 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      if (sec.findings?.length) {
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...dark);
        doc.text('Key Findings', 14, y); y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        sec.findings.forEach(f => {
          if (y > pageHeight - 20) { doc.addPage(); y = 20; }
          const lines = doc.splitTextToSize(`• ${f}`, pageWidth - 32);
          doc.text(lines, 18, y);
          y += lines.length * 3 + 2;
        });
      }
      if (sec.risks?.length) {
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...red);
        doc.text('Risks', 14, y); y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        sec.risks.forEach(r => {
          if (y > pageHeight - 20) { doc.addPage(); y = 20; }
          const lines = doc.splitTextToSize(`⚠ ${r}`, pageWidth - 32);
          doc.text(lines, 18, y);
          y += lines.length * 3 + 2;
        });
      }
      y += 4;
    });
  }

  // ── Notes & Accounting Policies page ──
  if (g?.significantAccountingPolicies || g?.notes) {
    doc.addPage();
    y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Notes to Financial Statements', 14, y);
    y += 8;

    if (g.significantAccountingPolicies) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Significant Accounting Policies', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      g.significantAccountingPolicies.forEach((p, i) => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`${i + 1}. ${p}`, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 3.5 + 3;
      });
      y += 4;
    }

    if (g.notes) {
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text('Notes to Accounts', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      g.notes.forEach(n => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(n, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 3.5 + 3;
      });
    }

    if (g.auditorRemarks) {
      y += 6;
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text("Auditor's Remarks", 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      g.auditorRemarks.forEach(r => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(r, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 3.5 + 3;
      });
    }
  }

  // ── Approval signatures ──
  if (report.reviewedBy || report.approvedBy) {
    ensureSpace(30);
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    if (report.approvedBy) {
      doc.text(`For and on behalf of the Board`, 14, y);
      y += 8;
      doc.text(`${report.approvedBy.name}`, 14, y);
      y += 4;
      doc.setTextColor(...muted);
      doc.text(`${report.approvedBy.role}  |  Date: ${fmtDate(report.approvedBy.date)}`, 14, y);
      y += 6;
    }
    if (report.reviewedBy) {
      doc.setTextColor(...dark);
      doc.text(`${report.reviewedBy.name}`, 14, y);
      y += 4;
      doc.setTextColor(...muted);
      doc.text(`${report.reviewedBy.role}  |  Date: ${fmtDate(report.reviewedBy.date)}`, 14, y);
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    const footerText = [
      g?.companyName || 'RAVEN',
      report.name,
      g ? `${g.standard} — Schedule III Div ${g.division}` : '',
      confLabel(report.confidentiality) || 'Internal',
      `Page ${i} of ${pageCount}`,
    ].filter(Boolean).join('  |  ');
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`${sanitizeFilename(report.name)}.pdf`);
}

// ============================================================================
// PPTX EXPORT — Schedule III
// ============================================================================

export async function exportPPTX(report: Report) {
  const pptxgenModule = await import('pptxgenjs');
  const PptxGenJS = pptxgenModule.default;
  const pres = new PptxGenJS() as any;
  const g = report.gaap;

  pres.layout = 'LAYOUT_16x9';
  pres.author = report.author || 'RAVEN';
  pres.title = report.name;
  pres.subject = `${report.type} — ${report.period}`;

  const PRIMARY = '1E40AF';
  const DARK_BG = '0F172A';
  const WHITE = 'FFFFFF';
  const MUTED = '94A3B8';
  const ACCENT = '22D3EE';
  const GREEN = '22C55E';
  const RED = 'EF4444';
  const HEADER_BG = '1E293B';

  function addTopBar(slide: any) {
    slide.background = { color: DARK_BG };
    slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: PRIMARY } });
  }

  // ── Slide 1: Title ──
  const slide1 = pres.addSlide();
  addTopBar(slide1);
  slide1.addText(g ? g.companyName : 'RAVEN Technologies Pvt. Ltd.', { x: 0.6, y: 0.8, w: 8.8, h: 0.5, fontSize: 12, fontFace: 'Arial', color: ACCENT, bold: true, charSpacing: 4 });
  if (g?.cin) slide1.addText(`CIN: ${g.cin}`, { x: 0.6, y: 1.25, w: 8.8, h: 0.3, fontSize: 8, fontFace: 'Arial', color: MUTED });
  slide1.addText(report.name, { x: 0.6, y: 1.7, w: 8.8, h: 1.0, fontSize: 28, fontFace: 'Arial', color: WHITE, bold: true });
  slide1.addText(
    `${report.type} Report  |  ${report.period}  |  ${g ? `${g.standard} — Division ${g.division}` : 'Indian GAAP'}`,
    { x: 0.6, y: 2.9, w: 8.8, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MUTED }
  );

  const meta = [report.author, report.department, confLabel(report.confidentiality)].filter(Boolean).join('  |  ');
  if (meta) slide1.addText(meta, { x: 0.6, y: 3.4, w: 8.8, h: 0.3, fontSize: 9, fontFace: 'Arial', color: MUTED });
  slide1.addText(`Generated: ${fmtDate(report.date)}`, { x: 0.6, y: 4.6, w: 8.8, h: 0.3, fontSize: 9, fontFace: 'Arial', color: MUTED });

  // ── Slide 2: Executive Summary ──
  if (report.summary) {
    const slide2 = pres.addSlide();
    addTopBar(slide2);
    slide2.addText('Executive Summary', { x: 0.6, y: 0.3, w: 8.8, h: 0.5, fontSize: 20, fontFace: 'Arial', color: WHITE, bold: true });
    slide2.addText(report.summary, { x: 0.6, y: 1.0, w: 8.8, h: 3.5, fontSize: 11, fontFace: 'Arial', color: MUTED, valign: 'top', paraSpaceAfter: 6 });
    if (report.tags?.length) {
      slide2.addText(`Tags: ${report.tags.join(', ')}`, { x: 0.6, y: 4.8, w: 8.8, h: 0.3, fontSize: 8, fontFace: 'Arial', color: MUTED });
    }
  }

  // ── Slides: SaaS Monthly P&L ──
  if (g?.saasPnl) {
    const sp = g.saasPnl;
    const months = sp.months;
    const half1 = months.slice(0, 6);
    const half2 = months.slice(6);

    const inrShort = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`;
    const pct = (v: number) => `${v.toFixed(1)}%`;
    const cellOpts = (bg: string, bold = false, color = WHITE) => ({ fontSize: 6, fontFace: 'Arial', color, fill: { color: bg }, bold, align: 'right' as const });
    const labelOpts = (bg: string, bold = false) => ({ fontSize: 6, fontFace: 'Arial', color: WHITE, fill: { color: bg }, bold, align: 'left' as const });
    const hdrOpts = { fontSize: 6, fontFace: 'Arial', bold: true, color: WHITE, fill: { color: PRIMARY }, align: 'center' as const };

    // Helper to build a half-year slide (6 months per slide to fit)
    const buildSaaSSlide = (title: string, monthSlice: string[], startIdx: number) => {
      const sl = pres.addSlide();
      addTopBar(sl);
      sl.addText(title, { x: 0.3, y: 0.15, w: 9.4, h: 0.35, fontSize: 14, fontFace: 'Arial', color: WHITE, bold: true });

      const hRow = [
        { text: 'Particulars', options: { ...hdrOpts, align: 'left' as const } },
        ...monthSlice.map(m => ({ text: m, options: hdrOpts })),
      ];

      const rows: any[][] = [];
      let rIdx = 0;
      const addRow = (label: string, vals: number[], fmt: (v: number) => string, bold = false) => {
        const bg = rIdx % 2 === 0 ? HEADER_BG : DARK_BG;
        rIdx++;
        rows.push([
          { text: label, options: labelOpts(bg, bold) },
          ...vals.slice(startIdx, startIdx + 6).map(v => ({ text: fmt(v), options: cellOpts(bg, bold) })),
        ]);
      };
      const addSection = (label: string) => {
        rows.push([
          { text: label, options: { fontSize: 6, fontFace: 'Arial', color: ACCENT, fill: { color: DARK_BG }, bold: true, align: 'left' as const } },
          ...monthSlice.map(() => ({ text: '', options: { fill: { color: DARK_BG } } })),
        ]);
        rIdx++;
      };

      addSection('REVENUE');
      addRow('Paid Customers', sp.paidCustomers, v => String(v));
      addRow('ARPA', sp.arpa, inrShort);
      addRow('Revenue', sp.revenue, inrShort, true);
      addRow('Revenue Growth %', sp.revenueGrowthPct, pct);
      addRow('ARR', sp.arr, inrShort);

      addSection('EXPENSES');
      addRow('Cloud Costs', sp.expenses.cloudCosts, inrShort);
      addRow('Salary — Engineering', sp.expenses.salary.engineering, inrShort);
      addRow('Salary — Business', sp.expenses.salary.business, inrShort);
      addRow('Salary — Management', sp.expenses.salary.management, inrShort);
      addRow('Salary — Product', sp.expenses.salary.product, inrShort);
      addRow('Salary — R&D', sp.expenses.salary.researchAndDev, inrShort);
      addRow('Marketing', sp.expenses.marketingCost, inrShort);
      addRow('Software Subscriptions', sp.expenses.softwareSubscriptions, inrShort);
      addRow('Rent', sp.expenses.rent, inrShort);
      addRow('Professional Fees', sp.expenses.professionalFees, inrShort);
      addRow('Others', sp.expenses.others, inrShort);

      addSection('PROFITABILITY');
      addRow('EBITDA', sp.ebitda, inrShort, true);
      addRow('EBITDA Margin', sp.ebitdaMargin, pct, true);
      addRow('Cumulative Burn', sp.cumulativeBurn, inrShort);
      addRow('Burn Rate (Exp/Rev)', sp.burnRateOnExpenses, v => `${v.toFixed(2)}x`);
      if (sp.burnMultiple) addRow('Burn Multiple', sp.burnMultiple, v => `${v.toFixed(2)}x`);

      sl.addTable([hRow, ...rows], {
        x: 0.2, y: 0.55, w: 9.6,
        colW: [2.4, ...monthSlice.map(() => 1.2)],
        border: { type: 'solid', pt: 0.2, color: '334155' },
        rowH: 0.2,
      });
    };

    buildSaaSSlide(`SaaS P&L — ${half1[0]} to ${half1[half1.length - 1]}`, half1, 0);
    buildSaaSSlide(`SaaS P&L — ${half2[0]} to ${half2[half2.length - 1]}`, half2, 6);
  }

  // ── Slide: Schedule III P&L ──
  if (g?.profitAndLoss) {
    const pl = g.profitAndLoss;
    const prev = pl.previous;
    const plSlide = pres.addSlide();
    addTopBar(plSlide);
    plSlide.addText('Statement of Profit and Loss — Schedule III', { x: 0.6, y: 0.2, w: 8.8, h: 0.4, fontSize: 16, fontFace: 'Arial', color: WHITE, bold: true });
    plSlide.addText(pl.periodEnded, { x: 0.6, y: 0.6, w: 8.8, h: 0.3, fontSize: 8, fontFace: 'Arial', color: MUTED });

    const headerRow = prev
      ? [
          { text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'left' as const } },
          { text: 'Current (₹)', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } },
          { text: 'Previous (₹)', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } },
        ]
      : [
          { text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'left' as const } },
          { text: 'Amount (₹)', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } },
        ];

    const plRows: any[][] = [];
    const makeRow = (label: string, cur: number | string, prevVal?: number | string, bold?: boolean) => {
      const bg = plRows.length % 2 === 0 ? HEADER_BG : DARK_BG;
      const opts = { fontSize: 7, color: WHITE, fill: { color: bg }, bold: !!bold };
      if (prev) return [{ text: label, options: { ...opts, align: 'left' as const } }, { text: typeof cur === 'number' ? inr(cur) : cur, options: { ...opts, align: 'right' as const } }, { text: typeof prevVal === 'number' ? inr(prevVal) : (prevVal || ''), options: { ...opts, align: 'right' as const } }];
      return [{ text: label, options: { ...opts, align: 'left' as const } }, { text: typeof cur === 'number' ? inr(cur) : cur, options: { ...opts, align: 'right' as const } }];
    };

    plRows.push(makeRow('Revenue from Operations', pl.revenueFromOperations, prev?.revenueFromOperations));
    plRows.push(makeRow('Other Income', pl.otherIncome, prev?.otherIncome));
    plRows.push(makeRow('Total Revenue', totalRevenue(pl), prev ? totalRevenue(prev as any) : undefined, true));
    plRows.push(makeRow('Employee benefit expense', pl.expenses.employeeBenefitExpense, prev?.expenses.employeeBenefitExpense));
    plRows.push(makeRow('Finance costs', pl.expenses.financeCosts, prev?.expenses.financeCosts));
    plRows.push(makeRow('Depreciation & amortization', pl.expenses.depreciationAndAmortization, prev?.expenses.depreciationAndAmortization));
    plRows.push(makeRow('Other expenses', pl.expenses.otherExpenses, prev?.expenses.otherExpenses));
    plRows.push(makeRow('Total Expenses', totalExpenses(pl), prev ? totalExpenses(prev as any) : undefined, true));
    plRows.push(makeRow('Profit Before Tax', profitBeforeTax(pl), prev ? profitBeforeTax(prev as any) : undefined, true));
    plRows.push(makeRow('Tax (Current + Deferred)', totalTax(pl), prev ? totalTax(prev as any) : undefined));
    plRows.push(makeRow('Profit After Tax', profitAfterTax(pl), prev ? profitAfterTax(prev as any) : undefined, true));

    if (pl.earningsPerShare) {
      plRows.push(makeRow('EPS — Basic (₹)', String(pl.earningsPerShare.basic), prev?.earningsPerShare ? String(prev.earningsPerShare.basic) : ''));
      plRows.push(makeRow('EPS — Diluted (₹)', String(pl.earningsPerShare.diluted), prev?.earningsPerShare ? String(prev.earningsPerShare.diluted) : ''));
    }

    plSlide.addTable(
      [headerRow, ...plRows],
      { x: 0.4, y: 1.0, w: 9.2, colW: prev ? [5.2, 2, 2] : [6, 3.2], border: { type: 'solid', pt: 0.3, color: '334155' } }
    );
  }

  // ── Slide: Schedule III Balance Sheet ──
  if (g?.balanceSheet) {
    const bs = g.balanceSheet;
    const prev = bs.previous;

    // Equity & Liabilities slide
    const bsSlide1 = pres.addSlide();
    addTopBar(bsSlide1);
    bsSlide1.addText('Balance Sheet — Equity & Liabilities', { x: 0.6, y: 0.2, w: 8.8, h: 0.4, fontSize: 16, fontFace: 'Arial', color: WHITE, bold: true });
    bsSlide1.addText(bs.asAt, { x: 0.6, y: 0.6, w: 8.8, h: 0.3, fontSize: 8, fontFace: 'Arial', color: MUTED });

    const makeELRow = (label: string, cur: number, prevVal?: number, bold?: boolean): any[] => {
      const bg = HEADER_BG;
      const opts = { fontSize: 7, color: WHITE, fill: { color: bg }, bold: !!bold };
      if (prev) return [{ text: label, options: { ...opts, align: 'left' as const } }, { text: inr(cur), options: { ...opts, color: bold ? ACCENT : WHITE, align: 'right' as const } }, { text: prevVal != null ? inr(prevVal) : '', options: { ...opts, align: 'right' as const } }];
      return [{ text: label, options: { ...opts, align: 'left' as const } }, { text: inr(cur), options: { ...opts, color: bold ? ACCENT : WHITE, align: 'right' as const } }];
    };

    const hdr = prev
      ? [{ text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7 } },
         { text: `Current (₹)`, options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } },
         { text: `Previous (₹)`, options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } }]
      : [{ text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7 } },
         { text: `Amount (₹)`, options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } }];

    const elRows = [
      makeELRow('Share Capital', bs.equity.shareCapital, prev?.equity.shareCapital),
      makeELRow('Reserves & Surplus', bs.equity.reservesAndSurplus, prev?.equity.reservesAndSurplus),
      makeELRow("Shareholders' Funds", totalEquity(bs), prev ? totalEquity(prev as any) : undefined, true),
      makeELRow('Long-term Borrowings', bs.nonCurrentLiabilities.longTermBorrowings, prev?.nonCurrentLiabilities.longTermBorrowings),
      makeELRow('Long-term Provisions', bs.nonCurrentLiabilities.longTermProvisions, prev?.nonCurrentLiabilities.longTermProvisions),
      makeELRow('Non-Current Liabilities', totalNonCurrentLiabilities(bs), prev ? totalNonCurrentLiabilities(prev as any) : undefined, true),
      makeELRow('Trade Payables — MSME', bs.currentLiabilities.tradePayablesMSME, prev?.currentLiabilities.tradePayablesMSME),
      makeELRow('Trade Payables — Others', bs.currentLiabilities.tradePayablesOthers, prev?.currentLiabilities.tradePayablesOthers),
      makeELRow('Other Current Liabilities', bs.currentLiabilities.otherCurrentLiabilities, prev?.currentLiabilities.otherCurrentLiabilities),
      makeELRow('Current Liabilities', totalCurrentLiabilities(bs), prev ? totalCurrentLiabilities(prev as any) : undefined, true),
      makeELRow('TOTAL EQUITY & LIABILITIES', totalEquity(bs) + totalNonCurrentLiabilities(bs) + totalCurrentLiabilities(bs), prev ? totalEquity(prev as any) + totalNonCurrentLiabilities(prev as any) + totalCurrentLiabilities(prev as any) : undefined, true),
    ];

    bsSlide1.addTable([hdr, ...elRows], { x: 0.4, y: 1.0, w: 9.2, colW: prev ? [5.2, 2, 2] : [6, 3.2], border: { type: 'solid', pt: 0.3, color: '334155' } });

    // Assets slide
    const bsSlide2 = pres.addSlide();
    addTopBar(bsSlide2);
    bsSlide2.addText('Balance Sheet — Assets', { x: 0.6, y: 0.2, w: 8.8, h: 0.4, fontSize: 16, fontFace: 'Arial', color: WHITE, bold: true });
    bsSlide2.addText(bs.asAt, { x: 0.6, y: 0.6, w: 8.8, h: 0.3, fontSize: 8, fontFace: 'Arial', color: MUTED });

    const assetRows = [
      makeELRow('Property, Plant & Equipment', bs.nonCurrentAssets.tangibleAssets, prev?.nonCurrentAssets.tangibleAssets),
      makeELRow('Intangible Assets', bs.nonCurrentAssets.intangibleAssets, prev?.nonCurrentAssets.intangibleAssets),
      makeELRow('Capital Work-in-Progress', bs.nonCurrentAssets.capitalWIP, prev?.nonCurrentAssets.capitalWIP),
      makeELRow('Non-current Investments', bs.nonCurrentAssets.nonCurrentInvestments, prev?.nonCurrentAssets.nonCurrentInvestments),
      makeELRow('Deferred Tax Assets', bs.nonCurrentAssets.deferredTaxAssets, prev?.nonCurrentAssets.deferredTaxAssets),
      makeELRow('Non-Current Assets', totalNonCurrentAssets(bs), prev ? totalNonCurrentAssets(prev as any) : undefined, true),
      makeELRow('Trade Receivables', bs.currentAssets.tradeReceivables, prev?.currentAssets.tradeReceivables),
      makeELRow('Cash & Cash Equivalents', bs.currentAssets.cashAndEquivalents, prev?.currentAssets.cashAndEquivalents),
      makeELRow('Current Investments', bs.currentAssets.currentInvestments, prev?.currentAssets.currentInvestments),
      makeELRow('Other Current Assets', bs.currentAssets.otherCurrentAssets, prev?.currentAssets.otherCurrentAssets),
      makeELRow('Current Assets', totalCurrentAssets(bs), prev ? totalCurrentAssets(prev as any) : undefined, true),
      makeELRow('TOTAL ASSETS', totalNonCurrentAssets(bs) + totalCurrentAssets(bs), prev ? totalNonCurrentAssets(prev as any) + totalCurrentAssets(prev as any) : undefined, true),
    ];

    bsSlide2.addTable([hdr, ...assetRows], { x: 0.4, y: 1.0, w: 9.2, colW: prev ? [5.2, 2, 2] : [6, 3.2], border: { type: 'solid', pt: 0.3, color: '334155' } });
  }

  // ── Slide: Cash Flow ──
  if (g?.cashFlow) {
    const cf = g.cashFlow;
    const cfSlide = pres.addSlide();
    addTopBar(cfSlide);
    cfSlide.addText('Cash Flow Statement (AS-3)', { x: 0.6, y: 0.2, w: 8.8, h: 0.4, fontSize: 16, fontFace: 'Arial', color: WHITE, bold: true });

    const cfRows: any[][] = [];
    const cfRow = (label: string, amount: number, bold?: boolean): any[] => {
      const bg = cfRows.length % 2 === 0 ? HEADER_BG : DARK_BG;
      return [
        { text: label, options: { fontSize: 7, color: WHITE, fill: { color: bg }, bold: !!bold, align: 'left' as const } },
        { text: inr(amount), options: { fontSize: 7, color: bold ? ACCENT : WHITE, fill: { color: bg }, bold: !!bold, align: 'right' as const } },
      ];
    };
    cf.operatingActivities.items.forEach(i => cfRows.push(cfRow(i.label, i.amount)));
    cfRows.push(cfRow('Net Cash — Operating (A)', cf.operatingActivities.net, true));
    cf.investingActivities.items.forEach(i => cfRows.push(cfRow(i.label, i.amount)));
    cfRows.push(cfRow('Net Cash — Investing (B)', cf.investingActivities.net, true));
    cf.financingActivities.items.forEach(i => cfRows.push(cfRow(i.label, i.amount)));
    cfRows.push(cfRow('Net Cash — Financing (C)', cf.financingActivities.net, true));
    cfRows.push(cfRow('Opening Cash', cf.openingCash));
    cfRows.push(cfRow('Closing Cash', cf.closingCash, true));

    cfSlide.addTable(
      [[
        { text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7 } },
        { text: 'Amount (₹)', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 7, align: 'right' as const } },
      ], ...cfRows],
      { x: 0.4, y: 0.8, w: 9.2, colW: [6.5, 2.7], border: { type: 'solid', pt: 0.3, color: '334155' } }
    );
  }

  // ── Section slides (generic for all reports) ──
  if (report.sections && report.sections.length > 0) {
    report.sections.forEach(sec => {
      const secSlide = pres.addSlide();
      addTopBar(secSlide);
      secSlide.addText(sec.title, { x: 0.6, y: 0.2, w: 8.8, h: 0.5, fontSize: 18, fontFace: 'Arial', color: WHITE, bold: true });
      if (sec.description) secSlide.addText(sec.description, { x: 0.6, y: 0.7, w: 8.8, h: 0.3, fontSize: 9, fontFace: 'Arial', color: MUTED });

      const startY = sec.description ? 1.2 : 0.9;
      if (sec.metrics.length > 0) {
        secSlide.addTable(
          [[
            { text: 'Particulars', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 8 } },
            { text: 'Amount (₹)', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 8, align: 'right' as const } },
            { text: 'Change', options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 8, align: 'right' as const } },
          ],
          ...sec.metrics.map((m, i) => [
            { text: m.label, options: { fontSize: 8, color: WHITE, fill: { color: i % 2 === 0 ? HEADER_BG : DARK_BG } } },
            { text: fmtMetric(m), options: { fontSize: 8, color: ACCENT, fill: { color: i % 2 === 0 ? HEADER_BG : DARK_BG }, align: 'right' as const } },
            { text: m.change != null ? `${m.change > 0 ? '+' : ''}${m.change}%` : '—', options: { fontSize: 8, color: m.trend === 'up' ? GREEN : m.trend === 'down' ? RED : MUTED, fill: { color: i % 2 === 0 ? HEADER_BG : DARK_BG }, align: 'right' as const } },
          ])],
          { x: 0.4, y: startY, w: 9.2, colW: [5, 2.2, 2], border: { type: 'solid', pt: 0.3, color: '334155' } }
        );
      }

      const bulletY = startY + 0.3 * (sec.metrics.length + 1) + 0.3;
      const bullets: string[] = [];
      if (sec.findings?.length) { bullets.push('Key Findings:'); sec.findings.forEach(f => bullets.push(`  • ${f}`)); }
      if (sec.risks?.length) { if (bullets.length) bullets.push(''); bullets.push('Risks:'); sec.risks.forEach(r => bullets.push(`  ⚠ ${r}`)); }
      if (bullets.length > 0) {
        secSlide.addText(bullets.join('\n'), { x: 0.6, y: bulletY, w: 8.8, h: 5.2 - bulletY, fontSize: 8, fontFace: 'Arial', color: MUTED, valign: 'top' });
      }
    });
  }

  // ── Closing slide ──
  const slideEnd = pres.addSlide();
  addTopBar(slideEnd);
  slideEnd.addText('Thank You', { x: 0.6, y: 1.6, w: 8.8, h: 0.8, fontSize: 32, fontFace: 'Arial', color: WHITE, bold: true, align: 'center' });
  slideEnd.addText(g ? g.companyName : 'RAVEN Technologies Pvt. Ltd.', { x: 0.6, y: 2.6, w: 8.8, h: 0.4, fontSize: 12, fontFace: 'Arial', color: ACCENT, align: 'center' });
  if (report.approvedBy) {
    slideEnd.addText(`Approved by: ${report.approvedBy.name} (${report.approvedBy.role})`, { x: 0.6, y: 3.2, w: 8.8, h: 0.3, fontSize: 9, fontFace: 'Arial', color: MUTED, align: 'center' });
  }
  slideEnd.addText([report.name, report.period, g ? `${g.standard} — Div ${g.division}` : ''].filter(Boolean).join('  |  '), { x: 0.6, y: 4.2, w: 8.8, h: 0.3, fontSize: 9, fontFace: 'Arial', color: MUTED, align: 'center' });

  await pres.writeFile({ fileName: `${sanitizeFilename(report.name)}.pptx` });
}

// ============================================================================
// MAIN EXPORT DISPATCHER
// ============================================================================

export async function exportReportAs(report: Report, format: string): Promise<void> {
  const fmt = format.toLowerCase();

  switch (fmt) {
    case 'xlsx':
    case 'excel':
      return exportXLSX(report);
    case 'pdf':
      return exportPDF(report);
    case 'pptx':
    case 'slides':
    case 'presentation':
      return exportPPTX(report);
    case 'csv':
    default:
      return exportCSV(report);
  }
}
