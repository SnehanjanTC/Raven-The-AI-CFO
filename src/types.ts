export interface Metric {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  subtext?: string;
  icon?: any;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'syncing';
  lastActive: string;
  lastActiveType?: 'error' | 'success' | 'warning' | 'info';
  insight?: string;
  metrics?: any; // Can be further refined if metric structure is stable
  type: 'strategic' | 'analytical' | 'high-priority' | 'standard' | 'compliance';
  bg?: string;
  color?: string;
  icon?: any;
  icon_name?: string;
  isPriority?: boolean;
  created_at?: string;
  region?: string;
  complianceDetails?: {
    framework: string;
    sections: { label: string; value: string; status: 'compliant' | 'pending' | 'overdue' | 'na' }[];
    nextDeadline?: string;
    filingFrequency?: string;
    governingAct?: string;
  };
}

export interface ReportMetric {
  label: string;
  value: number;
  currency?: 'INR';
  format?: 'currency' | 'percentage' | 'count' | 'months';
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  subtext?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  metrics: ReportMetric[];
  findings?: string[];
  risks?: string[];
}

// ── Indian GAAP / Schedule III Structures ──────────────────────────

/** Schedule III Division I — Balance Sheet (as per Companies Act 2013 Section 129) */
export interface ScheduleIIIBalanceSheet {
  asAt: string;
  equity: {
    shareCapital: number;
    reservesAndSurplus: number;
    moneyReceivedAgainstWarrants?: number;
  };
  nonCurrentLiabilities: {
    longTermBorrowings: number;
    deferredTaxLiabilities: number;
    otherLongTermLiabilities: number;
    longTermProvisions: number;
  };
  currentLiabilities: {
    shortTermBorrowings: number;
    tradePayablesMSME: number;
    tradePayablesOthers: number;
    otherCurrentLiabilities: number;
    shortTermProvisions: number;
  };
  nonCurrentAssets: {
    tangibleAssets: number;
    intangibleAssets: number;
    capitalWIP: number;
    nonCurrentInvestments: number;
    deferredTaxAssets: number;
    longTermLoans: number;
    otherNonCurrentAssets: number;
  };
  currentAssets: {
    currentInvestments: number;
    inventories: number;
    tradeReceivables: number;
    cashAndEquivalents: number;
    shortTermLoans: number;
    otherCurrentAssets: number;
  };
  previous?: Omit<ScheduleIIIBalanceSheet, 'previous'>;
}

/** Schedule III Division I — Statement of Profit and Loss */
export interface ScheduleIIIProfitAndLoss {
  periodEnded: string;
  revenueFromOperations: number;
  otherIncome: number;
  expenses: {
    costOfMaterialsConsumed: number;
    purchasesOfStockInTrade: number;
    changesInInventories: number;
    employeeBenefitExpense: number;
    financeCosts: number;
    depreciationAndAmortization: number;
    otherExpenses: number;
  };
  exceptionalItems: number;
  taxExpense: { currentTax: number; deferredTax: number };
  earningsPerShare?: { basic: number; diluted: number };
  previous?: Omit<ScheduleIIIProfitAndLoss, 'periodEnded' | 'previous'>;
}

/** Enterprise SaaS P&L — monthly breakdown (as per sample) */
export interface SaaSMonthlyPnL {
  months: string[];                 // ['Apr','May','Jun',... 'Mar']
  paidCustomers: number[];          // per month
  arpa: number[];                   // avg revenue per account
  revenue: number[];                // monthly revenue
  revenueGrowthPct: number[];       // MoM growth %
  arr: number[];                    // annualized run rate
  expenses: {
    cloudCosts: number[];
    certifications: number[];
    salary: {
      business: number[];
      engineering: number[];
      management: number[];
      operations: number[];
      product: number[];
      researchAndDev: number[];
    };
    commission: number[];
    rent: number[];
    officeMaintenance: number[];
    adminChargesPF: number[];
    marketingCost: number[];
    softwareSubscriptions: number[];
    travelConveyance: number[];
    insurance: number[];
    professionalFees: number[];
    dutiesAndTaxes: number[];
    staffWelfare: number[];
    trainingCertification: number[];
    employerPF: number[];
    others: number[];
  };
  ebitda: number[];                 // revenue - total expenses
  cumulativeBurn: number[];
  burnRateOnExpenses: number[];     // total expenses / revenue
  ebitdaMargin: number[];           // ebitda / revenue
  burnMultiple?: number[];
}

/** Cash Flow Statement per AS-3 */
export interface CashFlowStatement {
  operatingActivities: { items: { label: string; amount: number }[]; net: number };
  investingActivities: { items: { label: string; amount: number }[]; net: number };
  financingActivities: { items: { label: string; amount: number }[]; net: number };
  openingCash: number;
  closingCash: number;
}

/** Indian GAAP compliance envelope attached to a Report */
export interface GaapData {
  standard: 'Indian GAAP' | 'Ind AS';
  division: 'I' | 'II' | 'III';
  cin?: string;
  companyName: string;
  registeredOffice?: string;
  balanceSheet?: ScheduleIIIBalanceSheet;
  profitAndLoss?: ScheduleIIIProfitAndLoss;
  cashFlow?: CashFlowStatement;
  saasPnl?: SaaSMonthlyPnL;
  notes?: string[];
  significantAccountingPolicies?: string[];
  auditorRemarks?: string[];
}

// ── Report Interface ───────────────────────────────────────────────

export interface Report {
  id: string;
  name: string;
  type: string;
  period: string;
  version: string;
  status: 'approved' | 'generated' | 'draft' | 'failed';
  date: string;
  icon: string;
  // Enterprise fields
  summary?: string;
  author?: string;
  department?: string;
  tags?: string[];
  metrics?: ReportMetric[];
  sections?: ReportSection[];
  schedule?: { frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'; nextScheduledDate?: string; lastGeneratedAt?: string };
  confidentiality?: 'public' | 'internal' | 'confidential' | 'restricted';
  createdAt?: string;
  updatedAt?: string;
  reviewedBy?: { name: string; role: string; date: string };
  approvedBy?: { name: string; role: string; date: string };
  // Indian GAAP / Schedule III structured data
  gaap?: GaapData;
}

export interface Scenario {
  id: string;
  title: string;
  probability: string;
  impact: string;
  status: 'active' | 'completed' | 'pending';
  description: string;
  last_updated: string;
}

export interface ActivityLog {
  id: string;
  agent_name: string;
  action: string;
  details?: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}
