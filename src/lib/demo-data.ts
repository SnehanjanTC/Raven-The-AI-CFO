/**
 * Demo Data Management System for Raven
 *
 * This module manages realistic dummy data for an Indian SaaS startup.
 * Company Profile: "AcmeTech Solutions Pvt Ltd"
 * - Series A SaaS startup
 * - ₹8L MRR (Monthly Recurring Revenue)
 * - 15 employees across Mumbai (MH) and Bangalore (KA)
 * - 2 years in operation
 *
 * Data is stored in localStorage with 'raven_demo_' prefix for easy identification.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface DemoDataState {
  isLoaded: boolean;
  loadedAt: string | null;
  metrics: DemoMetric[];
  transactions: DemoTransaction[];
  invoices: DemoInvoice[];
  filings: DemoFiling[];
  deadlines: DemoDeadline[];
  team: DemoEmployee[];
  vendors: DemoVendor[];
}

export interface DemoMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  subtext: string;
  category: 'cash' | 'revenue' | 'expense' | 'compliance';
}

export interface DemoTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  subcategory: string;
  vendor?: string;
  invoiceNo?: string;
  tdsSection?: string;
  tdsAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  status: 'posted' | 'pending' | 'reconciled';
}

export interface DemoInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  client: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
}

export interface DemoFiling {
  id: string;
  agentId: string;
  type: string;
  period: string;
  dueDate: string;
  status: 'filed' | 'pending' | 'overdue' | 'upcoming';
  amount: number;
  filedDate?: string;
  ackNo?: string;
}

export interface DemoDeadline {
  id: string;
  agentId: string;
  title: string;
  dueDate: string;
  urgency: 'critical' | 'warning' | 'normal';
  description: string;
}

export interface DemoEmployee {
  id: string;
  name: string;
  role: string;
  salary: number;
  state: string;
  tdsMonthly: number;
  ptaxMonthly: number;
}

export interface DemoVendor {
  id: string;
  name: string;
  type: 'contractor' | 'service' | 'supplier';
  pan: string;
  gstin: string;
  tdsSection: string;
  totalPaid: number;
  tdsDeducted: number;
}

// ============================================================================
// DEMO DATA DEFINITIONS
// ============================================================================

const DEMO_METRICS: DemoMetric[] = [
  {
    id: 'cash-balance',
    label: 'Cash Balance',
    value: '₹3,24,50,000',
    change: '+8.2%',
    trend: 'up',
    subtext: 'vs. last month',
    category: 'cash'
  },
  {
    id: 'monthly-burn',
    label: 'Monthly Burn',
    value: '₹18,40,000',
    change: '-3.1%',
    trend: 'down',
    subtext: 'optimized',
    category: 'expense'
  },
  {
    id: 'runway',
    label: 'Runway',
    value: '17.6 months',
    change: '+1.2',
    trend: 'up',
    subtext: 'at current burn',
    category: 'cash'
  },
  {
    id: 'mrr',
    label: 'MRR',
    value: '₹8,12,000',
    change: '+6.4%',
    trend: 'up',
    subtext: 'monthly recurring',
    category: 'revenue'
  },
  {
    id: 'arr-projection',
    label: 'ARR Projection',
    value: '₹97,44,000',
    change: '+6.4%',
    trend: 'up',
    subtext: 'annualized',
    category: 'revenue'
  },
  {
    id: 'gross-margin',
    label: 'Gross Margin',
    value: '78.2%',
    change: '+0.8%',
    trend: 'up',
    subtext: 'healthy',
    category: 'revenue'
  },
  {
    id: 'tax-liability',
    label: 'Total Tax Liability',
    value: '₹32,80,000',
    change: '+5.2%',
    trend: 'stable',
    subtext: 'this quarter',
    category: 'compliance'
  },
  {
    id: 'compliance-score',
    label: 'Compliance Score',
    value: '87/100',
    change: '+3.0',
    trend: 'up',
    subtext: 'excellent',
    category: 'compliance'
  }
];

const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: 'txn-001',
    date: '2026-03-28',
    description: 'Salary Payment - March 2026',
    amount: 12500000,
    type: 'debit',
    category: 'Payroll',
    subcategory: 'Salary',
    tdsSection: '192',
    tdsAmount: 175000,
    status: 'posted'
  },
  {
    id: 'txn-002',
    date: '2026-03-27',
    description: 'AWS Cloud Services - March',
    amount: 420000,
    type: 'debit',
    category: 'Technology',
    subcategory: 'Cloud Infrastructure',
    gstRate: 18,
    gstAmount: 75600,
    status: 'posted'
  },
  {
    id: 'txn-003',
    date: '2026-03-26',
    description: 'Invoice #INV-2026-0342 - TechCorp India',
    amount: 2000000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0342',
    gstRate: 18,
    gstAmount: 360000,
    status: 'reconciled'
  },
  {
    id: 'txn-004',
    date: '2026-03-25',
    description: 'Payment to Pixel Studios - Design Services',
    amount: 280000,
    type: 'debit',
    category: 'Services',
    subcategory: 'Design',
    vendor: 'Pixel Studios',
    tdsSection: '194C',
    tdsAmount: 2800,
    status: 'posted'
  },
  {
    id: 'txn-005',
    date: '2026-03-24',
    description: 'Office Rent - Prime Spaces Mumbai',
    amount: 280000,
    type: 'debit',
    category: 'Facilities',
    subcategory: 'Rent',
    vendor: 'Prime Spaces',
    tdsSection: '194I',
    tdsAmount: 28000,
    status: 'posted'
  },
  {
    id: 'txn-006',
    date: '2026-03-23',
    description: 'Invoice #INV-2026-0341 - StartupHub',
    amount: 1200000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0341',
    gstRate: 18,
    gstAmount: 216000,
    status: 'posted'
  },
  {
    id: 'txn-007',
    date: '2026-03-22',
    description: 'Payment to CloudArch Consulting - Architecture',
    amount: 500000,
    type: 'debit',
    category: 'Services',
    subcategory: 'Consulting',
    vendor: 'CloudArch Consulting',
    tdsSection: '194J',
    tdsAmount: 50000,
    status: 'posted'
  },
  {
    id: 'txn-008',
    date: '2026-03-21',
    description: 'Invoice #INV-2026-0340 - DataFlow Systems',
    amount: 1500000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0340',
    gstRate: 18,
    gstAmount: 270000,
    status: 'reconciled'
  },
  {
    id: 'txn-009',
    date: '2026-03-20',
    description: 'Contractor Payment - DevOps Pro Services',
    amount: 350000,
    type: 'debit',
    category: 'Services',
    subcategory: 'Development',
    vendor: 'DevOps Pro Services',
    tdsSection: '194C',
    tdsAmount: 3500,
    status: 'posted'
  },
  {
    id: 'txn-010',
    date: '2026-03-19',
    description: 'Software Subscription - Atlassian Suite',
    amount: 45000,
    type: 'debit',
    category: 'Software',
    subcategory: 'SaaS Subscriptions',
    gstRate: 18,
    gstAmount: 8100,
    status: 'posted'
  },
  {
    id: 'txn-011',
    date: '2026-03-18',
    description: 'Invoice #INV-2026-0339 - CloudNine Solutions',
    amount: 900000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0339',
    gstRate: 18,
    gstAmount: 162000,
    status: 'pending'
  },
  {
    id: 'txn-012',
    date: '2026-03-17',
    description: 'Legal Services - LegalEase LLP',
    amount: 150000,
    type: 'debit',
    category: 'Services',
    subcategory: 'Legal',
    vendor: 'LegalEase LLP',
    tdsSection: '194J',
    tdsAmount: 15000,
    status: 'posted'
  },
  {
    id: 'txn-013',
    date: '2026-03-16',
    description: 'Invoice #INV-2026-0338 - DigitalFirst',
    amount: 750000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0338',
    gstRate: 18,
    gstAmount: 135000,
    status: 'reconciled'
  },
  {
    id: 'txn-014',
    date: '2026-03-15',
    description: 'Utilities and Connectivity',
    amount: 35000,
    type: 'debit',
    category: 'Facilities',
    subcategory: 'Utilities',
    status: 'posted'
  },
  {
    id: 'txn-015',
    date: '2026-03-14',
    description: 'Marketing Campaign - Marketing Monks',
    amount: 200000,
    type: 'debit',
    category: 'Marketing',
    subcategory: 'Campaigns',
    vendor: 'Marketing Monks',
    tdsSection: '194C',
    tdsAmount: 2000,
    status: 'posted'
  },
  {
    id: 'txn-016',
    date: '2026-03-13',
    description: 'Invoice #INV-2026-0337 - ScaleUp Pvt Ltd',
    amount: 1100000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0337',
    gstRate: 18,
    gstAmount: 198000,
    status: 'pending'
  },
  {
    id: 'txn-017',
    date: '2026-03-12',
    description: 'Office Equipment - Chairs and Desks',
    amount: 85000,
    type: 'debit',
    category: 'Facilities',
    subcategory: 'Equipment',
    status: 'posted'
  },
  {
    id: 'txn-018',
    date: '2026-03-11',
    description: 'Invoice #INV-2026-0336 - NexGen Analytics',
    amount: 1300000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0336',
    gstRate: 18,
    gstAmount: 234000,
    status: 'pending'
  },
  {
    id: 'txn-019',
    date: '2026-03-10',
    description: 'Travel and Accommodation - Client Meeting',
    amount: 28000,
    type: 'debit',
    category: 'Travel',
    subcategory: 'Business Travel',
    status: 'posted'
  },
  {
    id: 'txn-020',
    date: '2026-03-09',
    description: 'Invoice #INV-2026-0335 - ByteWorks',
    amount: 850000,
    type: 'credit',
    category: 'Revenue',
    subcategory: 'SaaS License',
    invoiceNo: 'INV-2026-0335',
    gstRate: 18,
    gstAmount: 153000,
    status: 'reconciled'
  }
];

const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: 'inv-001',
    invoiceNo: 'INV-2026-0335',
    date: '2026-03-09',
    client: 'ByteWorks',
    amount: 850000,
    gstRate: 18,
    gstAmount: 153000,
    totalAmount: 1003000,
    status: 'paid',
    dueDate: '2026-04-08'
  },
  {
    id: 'inv-002',
    invoiceNo: 'INV-2026-0336',
    date: '2026-03-11',
    client: 'NexGen Analytics',
    amount: 1300000,
    gstRate: 18,
    gstAmount: 234000,
    totalAmount: 1534000,
    status: 'pending',
    dueDate: '2026-04-10'
  },
  {
    id: 'inv-003',
    invoiceNo: 'INV-2026-0337',
    date: '2026-03-13',
    client: 'ScaleUp Pvt Ltd',
    amount: 1100000,
    gstRate: 18,
    gstAmount: 198000,
    totalAmount: 1298000,
    status: 'overdue',
    dueDate: '2026-04-12'
  },
  {
    id: 'inv-004',
    invoiceNo: 'INV-2026-0338',
    date: '2026-03-16',
    client: 'DigitalFirst',
    amount: 750000,
    gstRate: 18,
    gstAmount: 135000,
    totalAmount: 885000,
    status: 'paid',
    dueDate: '2026-04-15'
  },
  {
    id: 'inv-005',
    invoiceNo: 'INV-2026-0339',
    date: '2026-03-18',
    client: 'CloudNine Solutions',
    amount: 900000,
    gstRate: 18,
    gstAmount: 162000,
    totalAmount: 1062000,
    status: 'pending',
    dueDate: '2026-04-17'
  },
  {
    id: 'inv-006',
    invoiceNo: 'INV-2026-0340',
    date: '2026-03-21',
    client: 'DataFlow Systems',
    amount: 1500000,
    gstRate: 18,
    gstAmount: 270000,
    totalAmount: 1770000,
    status: 'paid',
    dueDate: '2026-04-20'
  },
  {
    id: 'inv-007',
    invoiceNo: 'INV-2026-0341',
    date: '2026-03-23',
    client: 'StartupHub',
    amount: 1200000,
    gstRate: 18,
    gstAmount: 216000,
    totalAmount: 1416000,
    status: 'paid',
    dueDate: '2026-04-22'
  },
  {
    id: 'inv-008',
    invoiceNo: 'INV-2026-0342',
    date: '2026-03-26',
    client: 'TechCorp India',
    amount: 2000000,
    gstRate: 18,
    gstAmount: 360000,
    totalAmount: 2360000,
    status: 'paid',
    dueDate: '2026-04-25'
  }
];

const DEMO_FILINGS: DemoFiling[] = [
  {
    id: 'filing-001',
    agentId: 'tds-agent',
    type: 'TDS - Form 26Q',
    period: 'Q1 FY2025-26',
    dueDate: '2026-04-07',
    status: 'filed',
    amount: 925000,
    filedDate: '2026-03-30',
    ackNo: 'ACK-26Q-Q1-2026-001'
  },
  {
    id: 'filing-002',
    agentId: 'tds-agent',
    type: 'TDS - Form 26Q',
    period: 'Q2 FY2025-26',
    dueDate: '2026-07-07',
    status: 'upcoming',
    amount: 940000
  },
  {
    id: 'filing-003',
    agentId: 'gst-agent',
    type: 'GSTR-1',
    period: 'December 2025',
    dueDate: '2026-01-11',
    status: 'filed',
    amount: 2156000,
    filedDate: '2026-01-10',
    ackNo: 'ACK-GSTR1-DEC-2025'
  },
  {
    id: 'filing-004',
    agentId: 'gst-agent',
    type: 'GSTR-3B',
    period: 'December 2025',
    dueDate: '2026-01-20',
    status: 'filed',
    amount: 450000,
    filedDate: '2026-01-18',
    ackNo: 'ACK-GSTR3B-DEC-2025'
  },
  {
    id: 'filing-005',
    agentId: 'gst-agent',
    type: 'GSTR-1',
    period: 'January 2026',
    dueDate: '2026-02-11',
    status: 'filed',
    amount: 2340000,
    filedDate: '2026-02-10',
    ackNo: 'ACK-GSTR1-JAN-2026'
  },
  {
    id: 'filing-006',
    agentId: 'gst-agent',
    type: 'GSTR-3B',
    period: 'January 2026',
    dueDate: '2026-02-20',
    status: 'filed',
    amount: 485000,
    filedDate: '2026-02-19',
    ackNo: 'ACK-GSTR3B-JAN-2026'
  },
  {
    id: 'filing-007',
    agentId: 'gst-agent',
    type: 'GSTR-1',
    period: 'February 2026',
    dueDate: '2026-03-11',
    status: 'filed',
    amount: 2275000,
    filedDate: '2026-03-10',
    ackNo: 'ACK-GSTR1-FEB-2026'
  },
  {
    id: 'filing-008',
    agentId: 'gst-agent',
    type: 'GSTR-3B',
    period: 'February 2026',
    dueDate: '2026-03-20',
    status: 'filed',
    amount: 468000,
    filedDate: '2026-03-19',
    ackNo: 'ACK-GSTR3B-FEB-2026'
  },
  {
    id: 'filing-009',
    agentId: 'gst-agent',
    type: 'GSTR-1',
    period: 'March 2026',
    dueDate: '2026-04-11',
    status: 'pending',
    amount: 2412000
  },
  {
    id: 'filing-010',
    agentId: 'gst-agent',
    type: 'GSTR-3B',
    period: 'March 2026',
    dueDate: '2026-04-20',
    status: 'pending',
    amount: 495000
  },
  {
    id: 'filing-011',
    agentId: 'ptax-agent',
    type: 'Professional Tax',
    period: 'Q4 FY2025-26 (Maharashtra)',
    dueDate: '2026-04-30',
    status: 'pending',
    amount: 8000
  },
  {
    id: 'filing-012',
    agentId: 'ptax-agent',
    type: 'Professional Tax',
    period: 'Q4 FY2025-26 (Karnataka)',
    dueDate: '2026-04-30',
    status: 'pending',
    amount: 6000
  }
];

const DEMO_DEADLINES: DemoDeadline[] = [
  {
    id: 'deadline-001',
    agentId: 'tds-agent',
    title: 'TDS Challan 281 - Q1 FY2025-26',
    dueDate: '2026-04-07',
    urgency: 'critical',
    description: 'Submit TDS challan for Q1 tax deposits. Deadline is fast approaching.'
  },
  {
    id: 'deadline-002',
    agentId: 'gst-agent',
    title: 'GSTR-3B March 2026',
    dueDate: '2026-04-20',
    urgency: 'warning',
    description: 'File GSTR-3B (monthly GST return) for March 2026'
  },
  {
    id: 'deadline-003',
    agentId: 'gst-agent',
    title: 'GSTR-1 March 2026',
    dueDate: '2026-04-11',
    urgency: 'warning',
    description: 'File GSTR-1 (invoice details) for March 2026'
  },
  {
    id: 'deadline-004',
    agentId: 'ptax-agent',
    title: 'Professional Tax Q4 FY2025-26 - Maharashtra',
    dueDate: '2026-04-30',
    urgency: 'normal',
    description: 'File Professional Tax for Q4 in Maharashtra'
  },
  {
    id: 'deadline-005',
    agentId: 'ptax-agent',
    title: 'Professional Tax Q4 FY2025-26 - Karnataka',
    dueDate: '2026-04-30',
    urgency: 'normal',
    description: 'File Professional Tax for Q4 in Karnataka'
  },
  {
    id: 'deadline-006',
    agentId: 'advance-tax-agent',
    title: 'Advance Tax Q1 FY2026-27',
    dueDate: '2026-06-15',
    urgency: 'normal',
    description: 'File advance tax for Q1 FY2026-27 if estimated tax exceeds ₹10,000'
  }
];

const DEMO_TEAM: DemoEmployee[] = [
  {
    id: 'emp-001',
    name: 'Rajesh Kumar',
    role: 'CTO & Co-Founder',
    salary: 250000,
    state: 'Maharashtra',
    tdsMonthly: 3250,
    ptaxMonthly: 200
  },
  {
    id: 'emp-002',
    name: 'Priya Sharma',
    role: 'VP Product',
    salary: 220000,
    state: 'Karnataka',
    tdsMonthly: 2860,
    ptaxMonthly: 160
  },
  {
    id: 'emp-003',
    name: 'Amit Patel',
    role: 'Senior Backend Engineer',
    salary: 180000,
    state: 'Maharashtra',
    tdsMonthly: 2340,
    ptaxMonthly: 150
  },
  {
    id: 'emp-004',
    name: 'Neha Gupta',
    role: 'Full Stack Engineer',
    salary: 160000,
    state: 'Maharashtra',
    tdsMonthly: 2080,
    ptaxMonthly: 130
  },
  {
    id: 'emp-005',
    name: 'Vikram Singh',
    role: 'DevOps Engineer',
    salary: 170000,
    state: 'Karnataka',
    tdsMonthly: 2210,
    ptaxMonthly: 140
  },
  {
    id: 'emp-006',
    name: 'Anjali Verma',
    role: 'Product Designer',
    salary: 140000,
    state: 'Maharashtra',
    tdsMonthly: 1820,
    ptaxMonthly: 100
  },
  {
    id: 'emp-007',
    name: 'Ravi Menon',
    role: 'Product Manager',
    salary: 150000,
    state: 'Karnataka',
    tdsMonthly: 1950,
    ptaxMonthly: 120
  },
  {
    id: 'emp-008',
    name: 'Divya Nair',
    role: 'Sales Manager',
    salary: 135000,
    state: 'Maharashtra',
    tdsMonthly: 1755,
    ptaxMonthly: 90
  },
  {
    id: 'emp-009',
    name: 'Sanjay Reddy',
    role: 'Marketing Lead',
    salary: 125000,
    state: 'Karnataka',
    tdsMonthly: 1625,
    ptaxMonthly: 85
  },
  {
    id: 'emp-010',
    name: 'Pooja Iyer',
    role: 'Operations & HR',
    salary: 100000,
    state: 'Maharashtra',
    tdsMonthly: 1300,
    ptaxMonthly: 60
  },
  {
    id: 'emp-011',
    name: 'Arjun Kumar',
    role: 'Junior Developer',
    salary: 80000,
    state: 'Maharashtra',
    tdsMonthly: 1040,
    ptaxMonthly: 50
  },
  {
    id: 'emp-012',
    name: 'Shreya Desai',
    role: 'Content Writer',
    salary: 70000,
    state: 'Karnataka',
    tdsMonthly: 910,
    ptaxMonthly: 40
  },
  {
    id: 'emp-013',
    name: 'Karan Kapoor',
    role: 'Business Analyst',
    salary: 90000,
    state: 'Maharashtra',
    tdsMonthly: 1170,
    ptaxMonthly: 55
  },
  {
    id: 'emp-014',
    name: 'Meera Sengupta',
    role: 'Finance & Compliance',
    salary: 130000,
    state: 'Maharashtra',
    tdsMonthly: 1690,
    ptaxMonthly: 85
  },
  {
    id: 'emp-015',
    name: 'Rohit Sinha',
    role: 'Associate Developer',
    salary: 95000,
    state: 'Karnataka',
    tdsMonthly: 1235,
    ptaxMonthly: 60
  }
];

const DEMO_VENDORS: DemoVendor[] = [
  {
    id: 'vendor-001',
    name: 'Pixel Studios',
    type: 'contractor',
    pan: 'ABCDE1234F',
    gstin: '27ABCDE1234F1Z5',
    tdsSection: '194C',
    totalPaid: 560000,
    tdsDeducted: 5600
  },
  {
    id: 'vendor-002',
    name: 'CloudArch Consulting',
    type: 'service',
    pan: 'BCDEF2345G',
    gstin: '27BCDEF2345G1Z5',
    tdsSection: '194J',
    totalPaid: 1000000,
    tdsDeducted: 100000
  },
  {
    id: 'vendor-003',
    name: 'DevOps Pro Services',
    type: 'contractor',
    pan: 'CDEFG3456H',
    gstin: '27CDEFG3456H1Z5',
    tdsSection: '194C',
    totalPaid: 700000,
    tdsDeducted: 7000
  },
  {
    id: 'vendor-004',
    name: 'LegalEase LLP',
    type: 'service',
    pan: 'DEFGH4567I',
    gstin: '27DEFGH4567I1Z5',
    tdsSection: '194J',
    totalPaid: 450000,
    tdsDeducted: 45000
  },
  {
    id: 'vendor-005',
    name: 'Prime Spaces',
    type: 'supplier',
    pan: 'EFGHI5678J',
    gstin: '27EFGHI5678J1Z5',
    tdsSection: '194I',
    totalPaid: 840000,
    tdsDeducted: 84000
  },
  {
    id: 'vendor-006',
    name: 'Marketing Monks',
    type: 'contractor',
    pan: 'FGHIJ6789K',
    gstin: '27FGHIJ6789K1Z5',
    tdsSection: '194C',
    totalPaid: 600000,
    tdsDeducted: 6000
  }
];

// ============================================================================
// DEMO DATA STATE & STORAGE
// ============================================================================

const STORAGE_KEY = 'raven_demo_data';
const STATE_KEY = 'raven_demo_state';
const LOADED_AT_KEY = 'raven_demo_loaded_at';

// Event listeners for reactivity
const listeners: Set<() => void> = new Set();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if demo data is currently loaded in localStorage
 */
export function isDemoDataLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  const state = localStorage.getItem(STATE_KEY);
  return state === 'loaded';
}

/**
 * Load all demo data into localStorage
 */
export function loadDemoData(): DemoDataState {
  if (typeof window === 'undefined') {
    throw new Error('loadDemoData must be called in browser environment');
  }

  const now = new Date().toISOString();
  const state: DemoDataState = {
    isLoaded: true,
    loadedAt: now,
    metrics: DEMO_METRICS,
    transactions: DEMO_TRANSACTIONS,
    invoices: DEMO_INVOICES,
    filings: DEMO_FILINGS,
    deadlines: DEMO_DEADLINES,
    team: DEMO_TEAM,
    vendors: DEMO_VENDORS
  };

  // Store as JSON
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(STATE_KEY, 'loaded');
  localStorage.setItem(LOADED_AT_KEY, now);

  // Notify listeners
  notifyListeners();

  return state;
}

/**
 * Clear all demo data from localStorage
 */
export function clearDemoData(): void {
  if (typeof window === 'undefined') {
    throw new Error('clearDemoData must be called in browser environment');
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(LOADED_AT_KEY);

  // Notify listeners
  notifyListeners();
}

/**
 * Get current demo data state from localStorage
 */
function getDemoDataState(): DemoDataState | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as DemoDataState;
  } catch {
    return null;
  }
}

// ============================================================================
// GETTER FUNCTIONS FOR SPECIFIC DATA SECTIONS
// ============================================================================

/**
 * Get demo metrics
 */
export function getDemoMetrics(): DemoMetric[] {
  const state = getDemoDataState();
  return state?.metrics ?? [];
}

/**
 * Get demo transactions
 */
export function getDemoTransactions(): DemoTransaction[] {
  const state = getDemoDataState();
  return state?.transactions ?? [];
}

/**
 * Get demo invoices
 */
export function getDemoInvoices(): DemoInvoice[] {
  const state = getDemoDataState();
  return state?.invoices ?? [];
}

/**
 * Get demo filings
 */
export function getDemoFilings(): DemoFiling[] {
  const state = getDemoDataState();
  return state?.filings ?? [];
}

/**
 * Get demo deadlines
 */
export function getDemoDeadlines(): DemoDeadline[] {
  const state = getDemoDataState();
  return state?.deadlines ?? [];
}

/**
 * Get demo team
 */
export function getDemoTeam(): DemoEmployee[] {
  const state = getDemoDataState();
  return state?.team ?? [];
}

/**
 * Get demo vendors
 */
export function getDemoVendors(): DemoVendor[] {
  const state = getDemoDataState();
  return state?.vendors ?? [];
}

// ============================================================================
// SUMMARY & ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get demo summary stats for dashboard use
 */
export function getDemoSummary() {
  const transactions = getDemoTransactions();
  const invoices = getDemoInvoices();
  const filings = getDemoFilings();
  const deadlines = getDemoDeadlines();

  // Calculate cash balance (from metrics)
  const metrics = getDemoMetrics();
  const cashBalanceMetric = metrics.find(m => m.id === 'cash-balance');
  const cashBalance = cashBalanceMetric
    ? parseInt(cashBalanceMetric.value.replace(/[₹,]/g, ''))
    : 32450000;

  // Calculate monthly burn
  const debitTransactions = transactions.filter(t => t.type === 'debit');
  const monthlyBurn = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Runway calculation
  const runway = Math.round(cashBalance / monthlyBurn * 10) / 10;

  // MRR from invoices
  const creditTransactions = transactions.filter(t => t.type === 'credit');
  const mrr = Math.round(creditTransactions.reduce((sum, t) => sum + t.amount, 0) / 3);

  // ARR projection
  const arrProjection = mrr * 12;

  // Gross margin
  const totalRevenue = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = debitTransactions.reduce((sum, t) => sum + t.amount, 0);
  const grossMargin = totalRevenue > 0 ? Math.round((totalRevenue - totalExpenses) / totalRevenue * 1000) / 10 : 0;

  // Tax liabilities
  const tdsLiability = transactions
    .filter(t => t.tdsAmount && t.tdsAmount > 0)
    .reduce((sum, t) => sum + (t.tdsAmount || 0), 0);

  const gstLiability = transactions
    .filter(t => t.gstAmount && t.gstAmount > 0)
    .reduce((sum, t) => sum + (t.gstAmount || 0), 0);

  const ptaxLiability = getDemoTeam().reduce((sum, emp) => sum + (emp.ptaxMonthly || 0), 0);

  const totalTdsLiability = tdsLiability;
  const totalGstLiability = gstLiability;
  const totalPtaxLiability = ptaxLiability;

  // Compliance metrics
  const overdueFilings = filings.filter(f => f.status === 'overdue').length;
  const upcomingDeadlines = deadlines.filter(d => d.urgency === 'critical' || d.urgency === 'warning').length;

  return {
    cashBalance,
    monthlyBurn,
    runway,
    mrr,
    arrProjection,
    grossMargin,
    totalTdsLiability,
    totalGstLiability,
    totalPtaxLiability,
    overdueFilings,
    upcomingDeadlines
  };
}

// ============================================================================
// EVENT SYSTEM FOR REACTIVITY
// ============================================================================

/**
 * Subscribe to demo data changes
 * Returns an unsubscribe function
 */
export function onDemoDataChange(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Notify all listeners of data changes
 */
function notifyListeners(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('Error in demo data listener:', error);
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get human-readable demo data info
 */
export function getDemoDataInfo() {
  const loadedAt = typeof window !== 'undefined' ? localStorage.getItem(LOADED_AT_KEY) : null;

  if (!loadedAt) {
    return {
      loaded: false,
      info: 'No demo data loaded'
    };
  }

  const state = getDemoDataState();
  if (!state) {
    return {
      loaded: false,
      info: 'Demo data corrupted'
    };
  }

  return {
    loaded: true,
    info: `Demo data loaded for "AcmeTech Solutions Pvt Ltd" at ${new Date(loadedAt).toLocaleString()}`,
    company: 'AcmeTech Solutions Pvt Ltd',
    employees: state.team.length,
    invoices: state.invoices.length,
    transactions: state.transactions.length,
    vendors: state.vendors.length,
    loadedAt
  };
}

/**
 * Format currency amount as INR string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format date as readable string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================================================
// DASHBOARD DATA ACCESSORS
// ============================================================================

/**
 * Get MRR trend data for charts (last 7 months)
 */
export function getDemoMrrTrend(): { month: string; mrr: number }[] {
  if (!isDemoDataLoaded()) return [];
  const mrr = getDemoSummary().mrr;
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const growth = [0.72, 0.78, 0.82, 0.88, 0.93, 1.0, 1.06];
  return months.map((m, i) => ({ month: m, mrr: Math.round(mrr * growth[i]) }));
}

/**
 * Get cash flow trend data for charts (last 8 weeks)
 */
export function getDemoCashFlow(): { week: string; inflow: number; outflow: number }[] {
  if (!isDemoDataLoaded()) return [];
  const txns = getDemoTransactions();
  const inTotal = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const outTotal = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const inflowWeights = [0.08, 0.12, 0.15, 0.10, 0.18, 0.09, 0.14, 0.14];
  const outflowWeights = [0.14, 0.11, 0.13, 0.16, 0.10, 0.12, 0.12, 0.12];
  return weeks.map((w, i) => ({
    week: w,
    inflow: Math.round(inTotal * inflowWeights[i]),
    outflow: Math.round(outTotal * outflowWeights[i]),
  }));
}

/**
 * Get expense breakdown by category
 */
export function getDemoExpenseBreakdown(): { category: string; amount: number; pct: number }[] {
  if (!isDemoDataLoaded()) return [];
  const txns = getDemoTransactions().filter(t => t.type === 'debit');
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const grouped: Record<string, number> = {};
  txns.forEach(t => {
    grouped[t.category] = (grouped[t.category] || 0) + t.amount;
  });
  return Object.entries(grouped)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: Math.round(amount / total * 1000) / 10,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get dashboard metrics formatted for display (INR)
 */
export function getDemoDashboardMetrics() {
  if (!isDemoDataLoaded()) return null;
  const s = getDemoSummary();
  return [
    { id: 'mrr', label: 'MRR', value: formatCurrency(s.mrr), change: '+12.4%', trend: 'up' as const },
    { id: 'runway', label: 'Runway', value: `${s.runway} mo`, change: s.runway > 12 ? 'Healthy' : 'Low', trend: s.runway > 12 ? 'up' as const : 'down' as const },
    { id: 'burn', label: 'Monthly Burn', value: formatCurrency(s.monthlyBurn), change: '-3.2%', trend: 'down' as const },
    { id: 'arr', label: 'ARR Projection', value: formatCurrency(s.arrProjection), change: '+18.6%', trend: 'up' as const },
  ];
}

/**
 * Get anomaly alerts from transaction analysis
 */
export function getDemoAnomalies(): { title: string; description: string; severity: 'warning' | 'critical' | 'info' }[] {
  if (!isDemoDataLoaded()) return [];
  const expenses = getDemoExpenseBreakdown();
  const alerts: { title: string; description: string; severity: 'warning' | 'critical' | 'info' }[] = [];

  const topExpense = expenses[0];
  if (topExpense && topExpense.pct > 25) {
    alerts.push({
      title: `High ${topExpense.category} Spend`,
      description: `${topExpense.category} accounts for ${topExpense.pct}% of total expenses (${formatCurrency(topExpense.amount)}). Review for optimisation.`,
      severity: 'warning',
    });
  }

  const summary = getDemoSummary();
  if (summary.overdueFilings > 0) {
    alerts.push({
      title: `${summary.overdueFilings} Overdue Filing(s)`,
      description: `You have ${summary.overdueFilings} compliance filings past their deadline. Late filing attracts penalties.`,
      severity: 'critical',
    });
  }

  if (summary.runway < 12) {
    alerts.push({
      title: 'Runway Below 12 Months',
      description: `Current runway is ${summary.runway} months. Consider fundraising or reducing burn.`,
      severity: 'warning',
    });
  }

  return alerts;
}

// ============================================================================
// AGENT DATA ACCESSORS
// ============================================================================

/**
 * Get dynamic agent metrics from demo data
 */
export function getDemoAgentMetrics() {
  if (!isDemoDataLoaded()) return null;
  const s = getDemoSummary();
  const filings = getDemoFilings();
  const deadlines = getDemoDeadlines();
  const team = getDemoTeam();

  return {
    cfo: {
      status: 'active' as const,
      metric: `${s.runway} mo runway`,
      lastActive: 'Runway optimised just now',
    },
    fpa: {
      status: 'active' as const,
      metric: formatCurrency(s.mrr) + ' MRR',
      lastActive: `ARR projection: ${formatCurrency(s.arrProjection)}`,
    },
    cashflow: {
      status: 'active' as const,
      metric: formatCurrency(s.monthlyBurn) + '/mo burn',
      lastActive: `Cash: ${formatCurrency(s.cashBalance)}`,
    },
    tds: {
      status: s.totalTdsLiability > 0 ? 'active' as const : 'inactive' as const,
      metric: formatCurrency(s.totalTdsLiability) + ' liability',
      lastActive: `${filings.filter(f => f.type.startsWith('TDS')).length} TDS filings`,
    },
    gst: {
      status: s.totalGstLiability > 0 ? 'active' as const : 'inactive' as const,
      metric: formatCurrency(s.totalGstLiability) + ' liability',
      lastActive: `${filings.filter(f => f.type.startsWith('GST')).length} GST filings`,
    },
    ptax: {
      status: 'active' as const,
      metric: formatCurrency(s.totalPtaxLiability) + '/mo',
      lastActive: `${team.length} employees across ${[...new Set(team.map(e => e.state))].length} states`,
    },
    pnl: {
      status: 'active' as const,
      metric: `${s.grossMargin}% margin`,
      lastActive: `Net: ${s.grossMargin > 0 ? 'Profitable' : 'Loss-making'}`,
    },
    compliance: {
      status: s.overdueFilings > 0 ? 'syncing' as const : 'active' as const,
      metric: `${s.overdueFilings} overdue`,
      lastActive: `${deadlines.filter(d => d.urgency === 'critical').length} critical deadlines`,
    },
  };
}

// ============================================================================
// COMPLIANCE DASHBOARD DATA
// ============================================================================

/**
 * Get compliance health scores computed from demo data
 */
export function getDemoComplianceHealth() {
  if (!isDemoDataLoaded()) return null;
  const filings = getDemoFilings();
  const deadlines = getDemoDeadlines();

  const tdsFilings = filings.filter(f => f.type.startsWith('TDS'));
  const gstFilings = filings.filter(f => f.type.startsWith('GST'));
  const ptFilings = filings.filter(f => f.type.includes('PT') || f.type.includes('Professional'));
  const gaapFilings = filings.filter(f => f.type.includes('ITR') || f.type.includes('Audit') || f.type.includes('ROC'));

  const scoreSection = (items: DemoFiling[]) => {
    if (items.length === 0) return 85;
    const filed = items.filter(f => f.status === 'filed').length;
    const overdue = items.filter(f => f.status === 'overdue').length;
    return Math.min(100, Math.max(0, Math.round((filed / items.length) * 100 - overdue * 15)));
  };

  return {
    tds: { score: scoreSection(tdsFilings), filings: tdsFilings.length, overdue: tdsFilings.filter(f => f.status === 'overdue').length },
    gst: { score: scoreSection(gstFilings), filings: gstFilings.length, overdue: gstFilings.filter(f => f.status === 'overdue').length },
    ptax: { score: scoreSection(ptFilings), filings: ptFilings.length, overdue: ptFilings.filter(f => f.status === 'overdue').length },
    gaap: { score: scoreSection(gaapFilings), filings: gaapFilings.length, overdue: gaapFilings.filter(f => f.status === 'overdue').length },
    overall: Math.round((scoreSection(tdsFilings) + scoreSection(gstFilings) + scoreSection(ptFilings) + scoreSection(gaapFilings)) / 4),
    totalOverdue: filings.filter(f => f.status === 'overdue').length,
    criticalDeadlines: deadlines.filter(d => d.urgency === 'critical').length,
  };
}

/**
 * Get compliance trend data (computed from filings)
 */
export function getDemoComplianceTrend(): { month: string; score: number }[] {
  if (!isDemoDataLoaded()) return [];
  const health = getDemoComplianceHealth();
  if (!health) return [];
  const base = health.overall;
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const offsets = [-8, -5, -7, -3, -1, 0, 2];
  return months.map((m, i) => ({ month: m, score: Math.min(100, Math.max(0, base + offsets[i])) }));
}

// ============================================================================
// REPORTS DATA
// ============================================================================

/**
 * Get report definitions from demo data
 */
export function getDemoReports(): import('@/types').Report[] {
  if (!isDemoDataLoaded()) return [];
  const s = getDemoSummary();
  const today = new Date().toISOString().split('T')[0];
  const iso = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
  const day = (n: number) => iso(n).split('T')[0];
  const vc = getDemoVendors().length;
  type M = import('@/types').ReportMetric;
  type S = import('@/types').ReportSection;
  type G = import('@/types').GaapData;

  const c = (label: string, value: number, extra?: Partial<M>): M => ({ label, value, currency: 'INR', format: 'currency', ...extra });
  const p = (label: string, value: number, extra?: Partial<M>): M => ({ label, value, format: 'percentage', ...extra });
  const n = (label: string, value: number, extra?: Partial<M>): M => ({ label, value, format: 'count', ...extra });
  const mo = (label: string, value: number, extra?: Partial<M>): M => ({ label, value, format: 'months', ...extra });

  // ── Indian GAAP / Schedule III structured data ──
  const CIN = 'U72200KA2023PTC170001';
  const COMPANY_NAME = 'RAVEN Technologies Private Limited';
  const REGD_OFFICE = 'HSR Layout, Bengaluru, Karnataka - 560102';

  // Derive Schedule III figures from demo summary
  const annualRev = s.mrr * 12;
  const annualExp = s.monthlyBurn * 12;
  const annualPBT = annualRev - annualExp;
  const annualTax = Math.round(annualPBT * 0.25);
  const annualPAT = annualPBT - annualTax;
  const prevAnnualRev = Math.round(annualRev * 0.78);
  const prevAnnualExp = Math.round(annualExp * 0.85);
  const prevPBT = prevAnnualRev - prevAnnualExp;
  const prevTax = Math.round(prevPBT * 0.25);

  // ── SaaS Monthly P&L (matching sample PNL format) ──
  type SP = import('@/types').SaaSMonthlyPnL;
  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  // Generate 12 months of increasing revenue (simulating growth from base MRR)
  const baseMRR = Math.round(s.mrr * 0.68); // start lower, grow to current
  const growthFactors = [1.0, 1.14, 1.24, 1.30, 1.41, 1.38, 1.51, 1.55, 1.85, 1.95, 2.06, 2.14];
  const monthlyRevArr = growthFactors.map(f => Math.round(baseMRR * f));
  const monthlyGrowth = monthlyRevArr.map((v, i) => i === 0 ? 0 : +((v - monthlyRevArr[i - 1]) / monthlyRevArr[i - 1]).toFixed(4));
  const monthlyARR = monthlyRevArr.map(v => v * 12);
  const monthlyCustomers = growthFactors.map(f => Math.round(18 * f));
  const monthlyARPA = monthlyRevArr.map((v, i) => monthlyCustomers[i] > 0 ? Math.round(v / monthlyCustomers[i]) : 0);

  // Expenses — allocate proportionally, modeled on sample structure
  const mkExpArr = (basePct: number, variance = 0.08) => monthlyRevArr.map((_, i) => {
    const base = Math.round(s.monthlyBurn * basePct * (0.85 + i * 0.025));
    const jitter = Math.round(base * (Math.sin(i * 1.7) * variance));
    return Math.max(0, base + jitter);
  });
  const salBiz = mkExpArr(0.10);
  const salEng = mkExpArr(0.175, 0.05);
  const salMgmt = mkExpArr(0.14, 0.02);
  const salOps = mkExpArr(0.09, 0.04);
  const salProd = mkExpArr(0.08, 0.06);
  const salRD = mkExpArr(0.05, 0.04);
  const cloud = mkExpArr(0.06, 0.12);
  const cert = mkExpArr(0.015, 0.2);
  const commission = mkExpArr(0.01, 0.15);
  const rent = monthlyRevArr.map((_, i) => Math.round(s.monthlyBurn * 0.037 * (i < 4 ? 1.0 : 1.09)));
  const officeMaint = mkExpArr(0.005, 0.1);
  const adminPF = mkExpArr(0.001, 0.05);
  const marketing = monthlyRevArr.map((_, i) => i === 0 ? Math.round(s.monthlyBurn * 0.18) : (i === 1 ? Math.round(s.monthlyBurn * 0.02) : 0));
  const swSub = mkExpArr(0.018, 0.15);
  const travel = mkExpArr(0.012, 0.25);
  const insurance = mkExpArr(0.005, 0.3);
  const profFees = mkExpArr(0.025, 0.2);
  const dutiesTax = monthlyRevArr.map((_, i) => [0, 3, 10, 11].includes(i) ? Math.round(s.monthlyBurn * 0.003) : 0);
  const staffWelfare = mkExpArr(0.002, 0.3);
  const training = monthlyRevArr.map((_, i) => i === 9 ? Math.round(s.monthlyBurn * 0.003) : 0);
  const emplPF = mkExpArr(0.009, 0.04);
  const others = mkExpArr(0.004, 0.2);

  const totalExpArr = monthlyRevArr.map((_, i) => {
    return cloud[i] + cert[i] + salBiz[i] + salEng[i] + salMgmt[i] + salOps[i] + salProd[i] + salRD[i]
      + commission[i] + rent[i] + officeMaint[i] + adminPF[i] + marketing[i] + swSub[i] + travel[i]
      + insurance[i] + profFees[i] + dutiesTax[i] + staffWelfare[i] + training[i] + emplPF[i] + others[i];
  });

  const ebitdaArr = monthlyRevArr.map((rev, i) => rev - totalExpArr[i]);
  const cumBurn: number[] = [];
  ebitdaArr.forEach((e, i) => cumBurn.push(i === 0 ? e : cumBurn[i - 1] + e));
  const burnRateArr = totalExpArr.map((exp, i) => monthlyRevArr[i] > 0 ? +(exp / monthlyRevArr[i]).toFixed(4) : 0);
  const ebitdaMarginArr = ebitdaArr.map((e, i) => monthlyRevArr[i] > 0 ? +(e / monthlyRevArr[i]).toFixed(4) : 0);
  const burnMultipleArr = monthlyRevArr.map((_, i) => {
    if (i === 0) return 0;
    const revenueChange = monthlyRevArr[i] - monthlyRevArr[i - 1];
    return revenueChange > 0 ? +(-ebitdaArr[i] / revenueChange).toFixed(2) : 0;
  });

  const saasPnlData: SP = {
    months: monthNames,
    paidCustomers: monthlyCustomers,
    arpa: monthlyARPA,
    revenue: monthlyRevArr,
    revenueGrowthPct: monthlyGrowth,
    arr: monthlyARR,
    expenses: {
      cloudCosts: cloud, certifications: cert,
      salary: { business: salBiz, engineering: salEng, management: salMgmt, operations: salOps, product: salProd, researchAndDev: salRD },
      commission, rent, officeMaintenance: officeMaint, adminChargesPF: adminPF, marketingCost: marketing,
      softwareSubscriptions: swSub, travelConveyance: travel, insurance, professionalFees: profFees,
      dutiesAndTaxes: dutiesTax, staffWelfare, trainingCertification: training, employerPF: emplPF, others,
    },
    ebitda: ebitdaArr, cumulativeBurn: cumBurn, burnRateOnExpenses: burnRateArr, ebitdaMargin: ebitdaMarginArr, burnMultiple: burnMultipleArr,
  };

  // Schedule III P&L structure
  const gaapPLFull: G = {
    standard: 'Indian GAAP', division: 'I', cin: CIN, companyName: COMPANY_NAME, registeredOffice: REGD_OFFICE,
    profitAndLoss: {
      periodEnded: 'For the year ended March 31, 2026',
      revenueFromOperations: annualRev,
      otherIncome: Math.round(annualRev * 0.028),
      expenses: {
        costOfMaterialsConsumed: 0,
        purchasesOfStockInTrade: Math.round(annualExp * 0.05),
        changesInInventories: 0,
        employeeBenefitExpense: Math.round(annualExp * 0.50),
        financeCosts: Math.round(annualExp * 0.03),
        depreciationAndAmortization: Math.round(annualExp * 0.08),
        otherExpenses: Math.round(annualExp * 0.34),
      },
      exceptionalItems: 0,
      taxExpense: { currentTax: annualTax, deferredTax: Math.round(annualTax * -0.04) },
      earningsPerShare: { basic: Math.round(annualPAT / 100000) / 100, diluted: Math.round(annualPAT / 105000) / 100 },
      previous: {
        revenueFromOperations: prevAnnualRev,
        otherIncome: Math.round(prevAnnualRev * 0.02),
        expenses: {
          costOfMaterialsConsumed: 0,
          purchasesOfStockInTrade: Math.round(prevAnnualExp * 0.06),
          changesInInventories: 0,
          employeeBenefitExpense: Math.round(prevAnnualExp * 0.52),
          financeCosts: Math.round(prevAnnualExp * 0.04),
          depreciationAndAmortization: Math.round(prevAnnualExp * 0.07),
          otherExpenses: Math.round(prevAnnualExp * 0.31),
        },
        exceptionalItems: 0,
        taxExpense: { currentTax: prevTax, deferredTax: Math.round(prevTax * -0.03) },
        earningsPerShare: { basic: Math.round((prevPBT - prevTax) / 100000) / 100, diluted: Math.round((prevPBT - prevTax) / 105000) / 100 },
      },
    },
    significantAccountingPolicies: [
      'Basis of Preparation: Financial statements prepared under historical cost convention on accrual basis in accordance with Indian GAAP and Companies Act 2013.',
      'Revenue Recognition (AS-9): SaaS subscription revenue recognised proportionately over the contract period. Professional services recognised on time-and-material basis upon delivery.',
      'Fixed Assets & Depreciation (AS-6 / AS-10): Tangible assets at cost less accumulated depreciation. WDV method as per Schedule II useful lives.',
      'Intangible Assets (AS-26): Software development costs capitalised when technical feasibility established. Amortised over 3-5 years SLM.',
      'Employee Benefits (AS-15): Gratuity liability actuarially valued. Leave encashment provided on accrual basis. PF per Employees PF Act.',
      'Taxation (AS-22): Current tax per Income Tax Act 1961. Deferred tax on timing differences at substantively enacted rates.',
      'Provisions & Contingencies (AS-29): Provisions when present obligation from past event and reliable estimate possible.',
      'Foreign Currency (AS-11): Transactions at exchange rate on transaction date. Monetary items at closing rate. Exchange differences to P&L.',
    ],
    notes: [
      'Note 1: Share Capital — Authorised: 10,00,000 equity shares of ₹10 each. Issued & Paid-up: 1,00,000 equity shares of ₹10 each fully paid.',
      'Note 2: Reserves & Surplus — Securities Premium ₹2,50,00,000 from Series A funding. Retained Earnings carried forward.',
      'Note 3: Trade Payables — MSME disclosure per MSMED Act 2006. No amount due beyond 45 days to MSME vendors.',
      'Note 4: Related Party Transactions (AS-18) — Key management personnel remuneration disclosed. No loans to directors.',
      'Note 5: Contingent Liabilities (AS-29) — Income tax assessment pending for AY 2024-25. Estimated exposure ₹2,50,000.',
      'Note 6: Segment Reporting (AS-17) — Single operating segment: Financial Technology Software Services.',
      'Note 7: Earnings Per Share (AS-20) — Computed on weighted average number of shares. ESOP dilution considered for diluted EPS.',
    ],
    auditorRemarks: [
      'Basis for Opinion: Audit conducted per Standards on Auditing (SAs) under Section 143(10) of the Companies Act 2013.',
      'Key Audit Matter: Revenue recognition for multi-element arrangements — assessed management policy for allocation of SaaS and services components.',
      'Emphasis of Matter: Company has accumulated losses. Going concern assumption based on Series A funding and projected cash flows — considered appropriate.',
    ],
  };

  // Schedule III Balance Sheet
  const gaapBS: G = {
    standard: 'Indian GAAP', division: 'I', cin: CIN, companyName: COMPANY_NAME, registeredOffice: REGD_OFFICE,
    balanceSheet: {
      asAt: 'As at March 31, 2026',
      equity: {
        shareCapital: 1000000,
        reservesAndSurplus: Math.round(s.cashBalance * 0.6 + annualPAT),
        moneyReceivedAgainstWarrants: 0,
      },
      nonCurrentLiabilities: {
        longTermBorrowings: Math.round(annualExp * 0.15),
        deferredTaxLiabilities: 0,
        otherLongTermLiabilities: Math.round(annualExp * 0.02),
        longTermProvisions: Math.round(annualExp * 0.04),
      },
      currentLiabilities: {
        shortTermBorrowings: 0,
        tradePayablesMSME: Math.round(s.monthlyBurn * 0.08),
        tradePayablesOthers: Math.round(s.monthlyBurn * 0.32),
        otherCurrentLiabilities: Math.round(s.totalGstLiability + s.totalTdsLiability + s.totalPtaxLiability),
        shortTermProvisions: Math.round(annualTax * 0.25),
      },
      nonCurrentAssets: {
        tangibleAssets: Math.round(annualExp * 0.12),
        intangibleAssets: Math.round(annualExp * 0.08),
        capitalWIP: Math.round(annualExp * 0.02),
        nonCurrentInvestments: Math.round(s.cashBalance * 0.2),
        deferredTaxAssets: Math.round(annualTax * 0.04),
        longTermLoans: Math.round(annualExp * 0.01),
        otherNonCurrentAssets: Math.round(annualExp * 0.005),
      },
      currentAssets: {
        currentInvestments: Math.round(s.cashBalance * 0.15),
        inventories: 0,
        tradeReceivables: Math.round(s.mrr * 1.8),
        cashAndEquivalents: s.cashBalance,
        shortTermLoans: Math.round(annualExp * 0.01),
        otherCurrentAssets: Math.round(s.mrr * 0.3),
      },
      previous: {
        asAt: 'As at March 31, 2025',
        equity: {
          shareCapital: 1000000,
          reservesAndSurplus: Math.round(s.cashBalance * 0.45),
        },
        nonCurrentLiabilities: {
          longTermBorrowings: Math.round(prevAnnualExp * 0.18),
          deferredTaxLiabilities: 0,
          otherLongTermLiabilities: Math.round(prevAnnualExp * 0.025),
          longTermProvisions: Math.round(prevAnnualExp * 0.035),
        },
        currentLiabilities: {
          shortTermBorrowings: 0,
          tradePayablesMSME: Math.round(s.monthlyBurn * 0.06),
          tradePayablesOthers: Math.round(s.monthlyBurn * 0.28),
          otherCurrentLiabilities: Math.round((s.totalGstLiability + s.totalTdsLiability) * 0.85),
          shortTermProvisions: Math.round(prevTax * 0.25),
        },
        nonCurrentAssets: {
          tangibleAssets: Math.round(prevAnnualExp * 0.14),
          intangibleAssets: Math.round(prevAnnualExp * 0.06),
          capitalWIP: Math.round(prevAnnualExp * 0.03),
          nonCurrentInvestments: Math.round(s.cashBalance * 0.15),
          deferredTaxAssets: Math.round(prevTax * 0.03),
          longTermLoans: Math.round(prevAnnualExp * 0.012),
          otherNonCurrentAssets: Math.round(prevAnnualExp * 0.004),
        },
        currentAssets: {
          currentInvestments: Math.round(s.cashBalance * 0.1),
          inventories: 0,
          tradeReceivables: Math.round(s.mrr * 0.78 * 1.8),
          cashAndEquivalents: Math.round(s.cashBalance * 0.72),
          shortTermLoans: Math.round(prevAnnualExp * 0.01),
          otherCurrentAssets: Math.round(s.mrr * 0.78 * 0.25),
        },
      },
    },
    significantAccountingPolicies: gaapPLFull.significantAccountingPolicies,
    notes: gaapPLFull.notes,
  };

  // Cash Flow Statement per AS-3
  const gaapCF: G = {
    standard: 'Indian GAAP', division: 'I', cin: CIN, companyName: COMPANY_NAME, registeredOffice: REGD_OFFICE,
    cashFlow: {
      operatingActivities: {
        items: [
          { label: 'Profit before tax', amount: annualPBT },
          { label: 'Depreciation & amortization', amount: Math.round(annualExp * 0.08) },
          { label: 'Finance costs', amount: Math.round(annualExp * 0.03) },
          { label: 'Interest income', amount: -Math.round(annualRev * 0.015) },
          { label: 'Working capital changes — Trade receivables', amount: -Math.round(s.mrr * 0.3) },
          { label: 'Working capital changes — Trade payables', amount: Math.round(s.monthlyBurn * 0.12) },
          { label: 'Working capital changes — Other', amount: Math.round(s.monthlyBurn * 0.05) },
          { label: 'Income tax paid', amount: -Math.round(annualTax * 0.9) },
        ],
        net: Math.round(annualPBT + annualExp * 0.08 + annualExp * 0.03 - annualRev * 0.015 - s.mrr * 0.3 + s.monthlyBurn * 0.17 - annualTax * 0.9),
      },
      investingActivities: {
        items: [
          { label: 'Purchase of PPE & intangibles', amount: -Math.round(annualExp * 0.06) },
          { label: 'Investments made', amount: -Math.round(s.cashBalance * 0.1) },
          { label: 'Interest received', amount: Math.round(annualRev * 0.015) },
        ],
        net: Math.round(-annualExp * 0.06 - s.cashBalance * 0.1 + annualRev * 0.015),
      },
      financingActivities: {
        items: [
          { label: 'Proceeds from long-term borrowings', amount: Math.round(annualExp * 0.08) },
          { label: 'Repayment of borrowings', amount: -Math.round(annualExp * 0.05) },
          { label: 'Finance costs paid', amount: -Math.round(annualExp * 0.03) },
        ],
        net: 0,
      },
      openingCash: Math.round(s.cashBalance * 0.72),
      closingCash: s.cashBalance,
    },
    significantAccountingPolicies: gaapPLFull.significantAccountingPolicies,
  };

  return [
    // ── P&L Reports ─────────────────────────────────────────────────
    {
      id: 'rpt-1', name: 'Statement of Profit and Loss — Monthly', type: 'P&L', period: 'March 2026', version: 'v1.2', status: 'approved' as const, date: today, icon: 'FileText',
      summary: `Monthly P&L per Schedule III (Division I) for March 2026 showing Revenue from Operations of ${formatCurrency(s.mrr)} with ${s.grossMargin}% gross margin. Total expenses at ${formatCurrency(s.monthlyBurn)} including Employee Benefit Expense, Finance Costs, and Depreciation. Profit before tax of ${formatCurrency(s.mrr - s.monthlyBurn)}. Prepared in accordance with AS-9 (Revenue Recognition) and AS-5 (Net Profit or Loss).`,
      author: 'Priya Sharma, CA', department: 'Finance', tags: ['schedule-iii', 'monthly', 'audited', 'board-ready'],
      confidentiality: 'confidential', createdAt: iso(0), updatedAt: iso(0),
      schedule: { frequency: 'monthly', lastGeneratedAt: iso(0), nextScheduledDate: '2026-05-02' },
      reviewedBy: { name: 'Rajesh Kumar', role: 'Finance Manager', date: iso(0) },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(0) },
      metrics: [
        c('Total Revenue', s.mrr, { change: 24, trend: 'up', subtext: 'MRR across all segments' }),
        c('Cost of Goods Sold', Math.round(s.mrr * 0.22), { subtext: 'Cloud + infrastructure' }),
        c('Gross Profit', Math.round(s.mrr * 0.78)),
        p('Gross Margin', s.grossMargin, { change: 0.8, trend: 'up' }),
        c('Operating Expenses', s.monthlyBurn, { change: -3.1, trend: 'down', subtext: 'Payroll, Cloud, Facilities' }),
        c('Operating Income', s.mrr - s.monthlyBurn),
        c('Tax Provision', Math.round((s.mrr - s.monthlyBurn) * 0.25), { subtext: 'At 25% corporate rate' }),
        c('Net Income', Math.round((s.mrr - s.monthlyBurn) * 0.75)),
      ],
      sections: [
        { id: 'rev', title: 'Revenue Breakdown', description: 'Diversified revenue across SaaS, services, and implementation', metrics: [
          c('SaaS Subscriptions', Math.round(s.mrr * 0.66), { subtext: '65.8% of total' }),
          c('Professional Services', Math.round(s.mrr * 0.25), { subtext: '24.7% of total' }),
          c('Implementation & Training', Math.round(s.mrr * 0.09), { subtext: '9.6% of total' }),
        ], findings: ['SaaS revenue grew 28% MoM driven by 12 new enterprise customers', 'Professional services revenue stabilized after Q1 dip', 'Implementation fees show strong Q2 project pipeline'] },
        { id: 'exp', title: 'Expense Analysis', description: 'Detailed breakdown across operational categories', metrics: [
          c('Payroll & Benefits', Math.round(s.monthlyBurn * 0.50), { subtext: '50% of opex' }),
          c('Cloud Infrastructure', Math.round(s.monthlyBurn * 0.23), { subtext: 'AWS, GCP, CDN' }),
          c('Facilities & Admin', Math.round(s.monthlyBurn * 0.15), { subtext: 'Office rent, utilities' }),
          c('Sales & Marketing', Math.round(s.monthlyBurn * 0.12)),
        ], findings: ['Cloud costs optimized 8% through reserved instances', '2 new senior engineering hires added in March'], risks: ['Payroll growth tracking at 22% YoY — ensure revenue scales proportionally'] },
      ],
      gaap: {
        ...gaapPLFull,
        saasPnl: saasPnlData,
        profitAndLoss: {
          ...gaapPLFull.profitAndLoss!,
          periodEnded: 'For the month ended March 31, 2026',
          revenueFromOperations: s.mrr,
          otherIncome: Math.round(s.mrr * 0.028),
          expenses: {
            costOfMaterialsConsumed: 0,
            purchasesOfStockInTrade: Math.round(s.monthlyBurn * 0.05),
            changesInInventories: 0,
            employeeBenefitExpense: Math.round(s.monthlyBurn * 0.50),
            financeCosts: Math.round(s.monthlyBurn * 0.03),
            depreciationAndAmortization: Math.round(s.monthlyBurn * 0.08),
            otherExpenses: Math.round(s.monthlyBurn * 0.34),
          },
          exceptionalItems: 0,
          taxExpense: { currentTax: Math.round((s.mrr - s.monthlyBurn) * 0.25), deferredTax: 0 },
          previous: {
            revenueFromOperations: Math.round(s.mrr * 0.95),
            otherIncome: Math.round(s.mrr * 0.95 * 0.02),
            expenses: {
              costOfMaterialsConsumed: 0, purchasesOfStockInTrade: Math.round(s.monthlyBurn * 0.92 * 0.06),
              changesInInventories: 0, employeeBenefitExpense: Math.round(s.monthlyBurn * 0.92 * 0.52),
              financeCosts: Math.round(s.monthlyBurn * 0.92 * 0.04), depreciationAndAmortization: Math.round(s.monthlyBurn * 0.92 * 0.07),
              otherExpenses: Math.round(s.monthlyBurn * 0.92 * 0.31),
            },
            exceptionalItems: 0,
            taxExpense: { currentTax: Math.round((s.mrr * 0.95 - s.monthlyBurn * 0.92) * 0.25), deferredTax: 0 },
          },
        },
      },
    },
    {
      id: 'rpt-2', name: 'Monthly P&L Statement', type: 'P&L', period: 'February 2026', version: 'v1.0', status: 'approved' as const, date: day(30), icon: 'FileText',
      summary: `February P&L showing revenue of ${formatCurrency(Math.round(s.mrr * 0.95))} with steady margins. Expenses controlled at ${formatCurrency(Math.round(s.monthlyBurn * 0.92))}.`,
      author: 'Priya Sharma', department: 'Finance', tags: ['monthly', 'audited'],
      confidentiality: 'confidential', createdAt: iso(30), updatedAt: iso(29),
      schedule: { frequency: 'monthly' },
      reviewedBy: { name: 'Rajesh Kumar', role: 'Finance Manager', date: iso(29) },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(29) },
      metrics: [
        c('Total Revenue', Math.round(s.mrr * 0.95), { change: 18, trend: 'up' }),
        c('Operating Expenses', Math.round(s.monthlyBurn * 0.92), { change: -1.5, trend: 'down' }),
        c('Net Income', Math.round((s.mrr * 0.95 - s.monthlyBurn * 0.92) * 0.75)),
        p('Gross Margin', s.grossMargin + 1.2),
      ],
      sections: [
        { id: 'rev', title: 'Revenue Breakdown', metrics: [c('SaaS', Math.round(s.mrr * 0.95 * 0.66)), c('Services', Math.round(s.mrr * 0.95 * 0.34))], findings: ['14 renewals closed in February', 'Seasonal services dip expected'] },
      ],
    },
    {
      id: 'rpt-3', name: 'Quarterly P&L — Q4 FY2025-26', type: 'P&L', period: 'Q4 FY2025-26', version: 'v1.0', status: 'approved' as const, date: day(5), icon: 'FileText',
      summary: `Q4 consolidated P&L showing quarterly revenue of ${formatCurrency(s.mrr * 3)} with aggregate gross margin of ${s.grossMargin}%. Quarter marked by strong enterprise sales and controlled burn rate.`,
      author: 'Priya Sharma', department: 'Finance', tags: ['quarterly', 'audited', 'board-ready'],
      confidentiality: 'confidential', createdAt: iso(5), updatedAt: iso(4),
      schedule: { frequency: 'quarterly' },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(4) },
      metrics: [c('Quarterly Revenue', s.mrr * 3, { change: 22, trend: 'up' }), c('Quarterly Expenses', s.monthlyBurn * 3), c('Net Income', Math.round((s.mrr - s.monthlyBurn) * 3 * 0.75)), p('Gross Margin', s.grossMargin)],
      sections: [
        { id: 'qoq', title: 'Quarter-over-Quarter', metrics: [c('Q3 Revenue', Math.round(s.mrr * 2.7)), c('Q4 Revenue', s.mrr * 3)], findings: ['11% QoQ revenue growth', 'Expense ratio improved from 62% to 58%'] },
      ],
    },
    {
      id: 'rpt-4', name: 'Statement of Profit and Loss — FY2025-26', type: 'P&L', period: 'FY2025-26', version: 'v2.1', status: 'generated' as const, date: day(2), icon: 'FileText',
      summary: `Annual Statement of Profit and Loss per Schedule III (Division I) of Companies Act 2013. Revenue from Operations: ${formatCurrency(annualRev)}. Total Expenses: ${formatCurrency(annualExp)}. Profit Before Tax: ${formatCurrency(annualPBT)}. Tax Expense (Current + Deferred): ${formatCurrency(annualTax)}. Profit After Tax: ${formatCurrency(annualPAT)}. EPS (Basic): ₹${gaapPLFull.profitAndLoss!.earningsPerShare!.basic}. Prepared per AS-5 (Net Profit or Loss), AS-9 (Revenue Recognition), AS-15 (Employee Benefits).`,
      author: 'Priya Sharma, CA', department: 'Finance', tags: ['schedule-iii', 'annual', 'indian-gaap', 'audited'], confidentiality: 'confidential', createdAt: iso(2),
      metrics: [
        c('Revenue from Operations', annualRev, { change: 28, trend: 'up' }),
        c('Other Income', Math.round(annualRev * 0.028)),
        c('Employee Benefit Expense', Math.round(annualExp * 0.50), { subtext: 'AS-15' }),
        c('Depreciation & Amortization', Math.round(annualExp * 0.08), { subtext: 'AS-6' }),
        c('Finance Costs', Math.round(annualExp * 0.03)),
        c('Other Expenses', Math.round(annualExp * 0.34)),
        c('Profit Before Tax', annualPBT),
        c('Tax Expense', annualTax, { subtext: 'Current + Deferred per AS-22' }),
        c('Profit After Tax', annualPAT, { change: 42, trend: 'up' }),
      ],
      sections: [
        { id: 'rev', title: 'Revenue from Operations (AS-9)', description: 'Revenue recognised per AS-9 on accrual basis', metrics: [
          c('SaaS Subscription Revenue', Math.round(annualRev * 0.66), { subtext: 'Recognised over contract period' }),
          c('Professional Services', Math.round(annualRev * 0.25), { subtext: 'On completion / milestones' }),
          c('Implementation & Training', Math.round(annualRev * 0.09)),
        ], findings: ['Revenue recognition policy compliant with AS-9', '100% of subscription revenue deferred appropriately'] },
        { id: 'exp', title: 'Expenses per Schedule III', metrics: [
          c('Cost of Materials Consumed', 0, { subtext: 'N/A — software services company' }),
          c('Employee Benefit Expense (AS-15)', Math.round(annualExp * 0.50), { subtext: 'Salaries, PF, Gratuity' }),
          c('Finance Costs', Math.round(annualExp * 0.03), { subtext: 'Interest on borrowings' }),
          c('Depreciation & Amortization (AS-6)', Math.round(annualExp * 0.08)),
          c('Other Expenses', Math.round(annualExp * 0.34), { subtext: 'Cloud, Rent, Marketing, Legal' }),
        ], findings: ['Employee costs include Gratuity provision as per AS-15 actuarial valuation', 'Depreciation per WDV method on Schedule II useful lives'] },
        { id: 'tax', title: 'Tax Expense (AS-22)', metrics: [
          c('Current Tax', annualTax, { subtext: 'Per Income Tax Act, 1961' }),
          c('Deferred Tax', Math.round(annualTax * -0.04), { subtext: 'Timing differences' }),
          c('Total Tax Expense', annualTax + Math.round(annualTax * -0.04)),
        ] },
      ],
      gaap: { ...gaapPLFull, saasPnl: saasPnlData },
    },
    {
      id: 'rpt-5', name: 'Departmental P&L Breakdown', type: 'P&L', period: 'March 2026', version: 'v1.0', status: 'generated' as const, date: day(1), icon: 'Table',
      summary: 'Cost allocation across engineering, sales, operations, and admin departments for March 2026.',
      author: 'Rajesh Kumar', department: 'Finance', tags: ['departmental', 'cost-center'], confidentiality: 'internal', createdAt: iso(1),
      metrics: [c('Engineering', Math.round(s.monthlyBurn * 0.45)), c('Sales & Marketing', Math.round(s.monthlyBurn * 0.25)), c('Operations', Math.round(s.monthlyBurn * 0.20)), c('Admin & G&A', Math.round(s.monthlyBurn * 0.10))],
      sections: [
        { id: 'eng', title: 'Engineering', metrics: [c('Payroll', Math.round(s.monthlyBurn * 0.32)), c('Cloud', Math.round(s.monthlyBurn * 0.10)), c('Tooling', Math.round(s.monthlyBurn * 0.03))], findings: ['2 new senior hires onboarded', 'AWS reserved instance savings: 12%'] },
      ],
    },

    // ── Balance Sheet & Cash Flow (Schedule III) ────────────────────
    {
      id: 'rpt-bs', name: 'Balance Sheet — Schedule III', type: 'Balance Sheet', period: 'FY2025-26', version: 'v1.0', status: 'approved' as const, date: day(1), icon: 'Table',
      summary: `Balance Sheet as at March 31, 2026 prepared per Schedule III Division I of Companies Act 2013. Total Equity: ${formatCurrency(gaapBS.balanceSheet!.equity.shareCapital + gaapBS.balanceSheet!.equity.reservesAndSurplus)}. Total Assets equal Total Equity & Liabilities. Trade Payables MSME disclosure per MSMED Act 2006. Deferred Tax Asset recognised per AS-22.`,
      author: 'Priya Sharma, CA', department: 'Finance', tags: ['schedule-iii', 'annual', 'indian-gaap', 'statutory'],
      confidentiality: 'confidential', createdAt: iso(1), updatedAt: iso(0),
      reviewedBy: { name: 'Rajesh Kumar', role: 'Finance Manager', date: iso(1) },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(0) },
      metrics: [
        c('Share Capital', gaapBS.balanceSheet!.equity.shareCapital),
        c('Reserves & Surplus', gaapBS.balanceSheet!.equity.reservesAndSurplus, { change: 38, trend: 'up' }),
        c('Non-Current Assets', gaapBS.balanceSheet!.nonCurrentAssets.tangibleAssets + gaapBS.balanceSheet!.nonCurrentAssets.intangibleAssets + gaapBS.balanceSheet!.nonCurrentAssets.capitalWIP + gaapBS.balanceSheet!.nonCurrentAssets.nonCurrentInvestments + gaapBS.balanceSheet!.nonCurrentAssets.deferredTaxAssets + gaapBS.balanceSheet!.nonCurrentAssets.longTermLoans + gaapBS.balanceSheet!.nonCurrentAssets.otherNonCurrentAssets),
        c('Current Assets', gaapBS.balanceSheet!.currentAssets.tradeReceivables + gaapBS.balanceSheet!.currentAssets.cashAndEquivalents + gaapBS.balanceSheet!.currentAssets.currentInvestments + gaapBS.balanceSheet!.currentAssets.otherCurrentAssets),
        c('Cash & Equivalents', s.cashBalance),
        c('Trade Receivables', Math.round(s.mrr * 1.8)),
        c('Trade Payables (MSME)', gaapBS.balanceSheet!.currentLiabilities.tradePayablesMSME, { subtext: 'MSMED Act disclosure' }),
        c('Trade Payables (Others)', gaapBS.balanceSheet!.currentLiabilities.tradePayablesOthers),
      ],
      sections: [
        { id: 'eq', title: 'Equity & Shareholders\' Funds', description: 'As per Schedule III — Part I', metrics: [
          c('Share Capital', gaapBS.balanceSheet!.equity.shareCapital, { subtext: '1,00,000 shares @ ₹10 each' }),
          c('Reserves & Surplus', gaapBS.balanceSheet!.equity.reservesAndSurplus, { subtext: 'Securities Premium + Retained Earnings' }),
        ], findings: ['Authorised capital: ₹1,00,00,000', 'No shares issued during the year'] },
        { id: 'ncl', title: 'Non-Current Liabilities', metrics: [
          c('Long-term Borrowings', gaapBS.balanceSheet!.nonCurrentLiabilities.longTermBorrowings),
          c('Deferred Tax Liabilities', gaapBS.balanceSheet!.nonCurrentLiabilities.deferredTaxLiabilities),
          c('Long-term Provisions', gaapBS.balanceSheet!.nonCurrentLiabilities.longTermProvisions, { subtext: 'Gratuity & leave encashment' }),
        ] },
        { id: 'cl', title: 'Current Liabilities', description: 'Trade Payables bifurcated per MSMED Act 2006', metrics: [
          c('Trade Payables — MSME', gaapBS.balanceSheet!.currentLiabilities.tradePayablesMSME),
          c('Trade Payables — Others', gaapBS.balanceSheet!.currentLiabilities.tradePayablesOthers),
          c('Other Current Liabilities', gaapBS.balanceSheet!.currentLiabilities.otherCurrentLiabilities, { subtext: 'GST + TDS + PTax payable' }),
          c('Short-term Provisions', gaapBS.balanceSheet!.currentLiabilities.shortTermProvisions, { subtext: 'Tax provision' }),
        ], findings: ['No amount due to MSME vendors beyond 45 days', 'Statutory dues (GST, TDS, PF) deposited within due dates'] },
        { id: 'nca', title: 'Non-Current Assets', metrics: [
          c('Property, Plant & Equipment', gaapBS.balanceSheet!.nonCurrentAssets.tangibleAssets, { subtext: 'Net of depreciation' }),
          c('Intangible Assets', gaapBS.balanceSheet!.nonCurrentAssets.intangibleAssets, { subtext: 'Software development costs' }),
          c('Capital Work-in-Progress', gaapBS.balanceSheet!.nonCurrentAssets.capitalWIP),
          c('Non-current Investments', gaapBS.balanceSheet!.nonCurrentAssets.nonCurrentInvestments),
          c('Deferred Tax Assets (AS-22)', gaapBS.balanceSheet!.nonCurrentAssets.deferredTaxAssets),
        ] },
        { id: 'ca', title: 'Current Assets', metrics: [
          c('Trade Receivables', gaapBS.balanceSheet!.currentAssets.tradeReceivables),
          c('Cash & Cash Equivalents', gaapBS.balanceSheet!.currentAssets.cashAndEquivalents),
          c('Current Investments', gaapBS.balanceSheet!.currentAssets.currentInvestments, { subtext: 'FD & liquid funds' }),
          c('Other Current Assets', gaapBS.balanceSheet!.currentAssets.otherCurrentAssets, { subtext: 'Prepaid, advances' }),
        ], findings: ['Trade receivables aging: 85% within 30 days', 'Cash includes ₹15L in current account, balance in FDs'] },
      ],
      gaap: gaapBS,
    },
    {
      id: 'rpt-cf', name: 'Cash Flow Statement — AS-3', type: 'Cash Flow', period: 'FY2025-26', version: 'v1.0', status: 'approved' as const, date: day(1), icon: 'FileText',
      summary: `Cash Flow Statement per AS-3 (Indirect Method). Net cash from operating activities: ${formatCurrency(gaapCF.cashFlow!.operatingActivities.net)}. Net cash used in investing: ${formatCurrency(gaapCF.cashFlow!.investingActivities.net)}. Opening cash: ${formatCurrency(gaapCF.cashFlow!.openingCash)}, Closing cash: ${formatCurrency(gaapCF.cashFlow!.closingCash)}.`,
      author: 'Priya Sharma, CA', department: 'Finance', tags: ['schedule-iii', 'annual', 'indian-gaap', 'AS-3'],
      confidentiality: 'confidential', createdAt: iso(1), updatedAt: iso(0),
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(0) },
      metrics: [
        c('Operating Activities (Net)', gaapCF.cashFlow!.operatingActivities.net, { trend: 'up', change: 35 }),
        c('Investing Activities (Net)', gaapCF.cashFlow!.investingActivities.net),
        c('Financing Activities (Net)', gaapCF.cashFlow!.financingActivities.net),
        c('Opening Cash', gaapCF.cashFlow!.openingCash),
        c('Closing Cash', gaapCF.cashFlow!.closingCash),
      ],
      sections: [
        { id: 'op', title: 'A. Cash Flow from Operating Activities', description: 'Indirect method per AS-3', metrics: gaapCF.cashFlow!.operatingActivities.items.map(i => c(i.label, i.amount)), findings: ['Strong operating cash flow driven by revenue growth', 'Working capital well-managed — DSO at 38 days'] },
        { id: 'inv', title: 'B. Cash Flow from Investing Activities', metrics: gaapCF.cashFlow!.investingActivities.items.map(i => c(i.label, i.amount)), findings: ['Investment in product development capitalised per AS-26', 'FD placements for short-term returns'] },
        { id: 'fin', title: 'C. Cash Flow from Financing Activities', metrics: gaapCF.cashFlow!.financingActivities.items.map(i => c(i.label, i.amount)) },
      ],
      gaap: gaapCF,
    },

    // ── Tax Reports ─────────────────────────────────────────────────
    {
      id: 'rpt-6', name: 'GST Summary — GSTR-3B Filing', type: 'Tax', period: 'March 2026', version: 'v1.0', status: 'generated' as const, date: today, icon: 'Table',
      summary: `GSTR-3B summary for March 2026 showing ${formatCurrency(s.totalGstLiability)} output GST with ${formatCurrency(Math.round(s.totalGstLiability * 0.6))} input credit. Net payable: ${formatCurrency(Math.round(s.totalGstLiability * 0.4))}. All invoices reconciled.`,
      author: 'Vikram Patel', department: 'Compliance', tags: ['gst', 'monthly-filing', 'reconciled'],
      confidentiality: 'confidential', createdAt: iso(0), updatedAt: iso(0),
      schedule: { frequency: 'monthly', nextScheduledDate: '2026-05-01' },
      reviewedBy: { name: 'Meera Singh', role: 'Tax Consultant', date: iso(0) },
      metrics: [
        c('Output GST @ 18%', s.totalGstLiability, { subtext: 'On taxable supplies' }),
        c('Input Tax Credit', Math.round(s.totalGstLiability * 0.6), { subtext: 'Eligible ITC' }),
        c('Net GST Payable', Math.round(s.totalGstLiability * 0.4), { change: 5.2, trend: 'stable' }),
        p('Compliance Score', 98, { subtext: 'Invoice & e-way validity' }),
      ],
      sections: [
        { id: 'supply', title: 'Supply-wise Analysis', metrics: [c('Interstate Supplies', Math.round(s.mrr * 0.66), { subtext: '18% IGST' }), c('Intrastate Supplies', Math.round(s.mrr * 0.25), { subtext: '9% CGST + 9% SGST' }), c('Exempt Supplies', Math.round(s.mrr * 0.09))], findings: ['Interstate supplies +32% on customer expansion', 'Export of services: nil GST'] },
        { id: 'itc', title: 'ITC Analysis', metrics: [c('Eligible ITC', Math.round(s.totalGstLiability * 0.6)), c('ITC Carried Forward', Math.round(s.totalGstLiability * 0.05))], findings: ['100% e-invoice reconciliation', 'No blocked credits'] },
      ],
    },
    {
      id: 'rpt-7', name: 'GST Summary — GSTR-3B', type: 'Tax', period: 'February 2026', version: 'v1.0', status: 'approved' as const, date: day(28), icon: 'Table',
      summary: 'February GSTR-3B filed and reconciled. Net payable cleared before deadline.',
      author: 'Vikram Patel', department: 'Compliance', tags: ['gst', 'filed'], confidentiality: 'confidential', createdAt: iso(28),
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(27) },
      metrics: [c('Output GST', Math.round(s.totalGstLiability * 0.94)), c('Input Credit', Math.round(s.totalGstLiability * 0.55)), c('Net Payable', Math.round(s.totalGstLiability * 0.39))],
    },
    {
      id: 'rpt-8', name: 'TDS Quarterly Return — 26Q', type: 'Tax', period: 'Q4 FY2025-26', version: 'v0.9', status: 'draft' as const, date: day(3), icon: 'FileSpreadsheet',
      summary: `Q4 TDS return covering ${vc} deductees with total TDS of ${formatCurrency(s.totalTdsLiability)}. Pending verification of 3 vendor PANs before filing.`,
      author: 'Vikram Patel', department: 'Compliance', tags: ['tds', 'quarterly', 'pending-review'], confidentiality: 'confidential', createdAt: iso(3),
      metrics: [c('Total TDS Deducted', s.totalTdsLiability), n('Deductees', vc), c('Average TDS per Vendor', Math.round(s.totalTdsLiability / (vc || 1)))],
      sections: [
        { id: 'sec', title: 'Section-wise Breakdown', metrics: [c('Sec 194C — Contractors', Math.round(s.totalTdsLiability * 0.45)), c('Sec 194J — Professionals', Math.round(s.totalTdsLiability * 0.30)), c('Sec 194H — Commission', Math.round(s.totalTdsLiability * 0.15)), c('Others', Math.round(s.totalTdsLiability * 0.10))], findings: ['3 vendors missing PAN — higher rate applied', 'All challans deposited within due date'] , risks: ['PAN verification pending for 3 vendors — may need correction statement'] },
      ],
    },
    {
      id: 'rpt-9', name: 'TDS Quarterly Return — 26Q', type: 'Tax', period: 'Q3 FY2025-26', version: 'v1.0', status: 'approved' as const, date: day(90), icon: 'FileSpreadsheet',
      summary: 'Q3 TDS return filed and accepted by TRACES.', author: 'Vikram Patel', department: 'Compliance', tags: ['tds', 'filed'], confidentiality: 'confidential', createdAt: iso(90),
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(88) },
      metrics: [c('Total TDS', Math.round(s.totalTdsLiability * 0.9)), n('Deductees', vc)],
    },
    {
      id: 'rpt-10', name: 'GST Annual Return — GSTR-9', type: 'Tax', period: 'FY2024-25', version: 'v1.0', status: 'approved' as const, date: day(60), icon: 'Table',
      summary: 'Annual GST return for FY2024-25 reconciled against books of accounts and monthly filings.',
      author: 'Meera Singh', department: 'Compliance', tags: ['gst', 'annual', 'audited'], confidentiality: 'confidential', createdAt: iso(60),
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(58) },
      metrics: [c('Annual Output GST', s.totalGstLiability * 12), c('Annual ITC Used', Math.round(s.totalGstLiability * 0.6 * 12)), c('Net Annual Payable', Math.round(s.totalGstLiability * 0.4 * 12))],
    },
    {
      id: 'rpt-11', name: 'Professional Tax Summary', type: 'Tax', period: 'March 2026', version: 'v1.0', status: 'generated' as const, date: day(4), icon: 'FileSpreadsheet',
      summary: `Professional tax liability for ${getDemoTeam().length} employees across Karnataka and Maharashtra.`,
      author: 'Vikram Patel', department: 'HR & Compliance', tags: ['ptax', 'payroll'], confidentiality: 'internal', createdAt: iso(4),
      metrics: [c('Total P-Tax', s.totalPtaxLiability), n('Employees Liable', getDemoTeam().length)],
    },
    {
      id: 'rpt-12', name: 'Advance Tax Computation', type: 'Tax', period: 'Q4 FY2025-26', version: 'v1.1', status: 'generated' as const, date: day(7), icon: 'FileText',
      summary: 'Fourth installment advance tax computation based on projected annual income.',
      author: 'Meera Singh', department: 'Finance', tags: ['advance-tax', 'quarterly'], confidentiality: 'confidential', createdAt: iso(7),
      metrics: [c('Estimated Tax Liability', Math.round((s.mrr - s.monthlyBurn) * 12 * 0.25)), c('Q4 Installment (15%)', Math.round((s.mrr - s.monthlyBurn) * 12 * 0.25 * 0.15))],
    },

    // ── Forecast Reports ────────────────────────────────────────────
    {
      id: 'rpt-13', name: 'Cash Flow Forecast — 6 Month Outlook', type: 'Forecast', period: 'Apr–Sep 2026', version: 'v1.0', status: 'approved' as const, date: today, icon: 'FileText',
      summary: `Six-month cash flow projection through Sep 2026. Opening balance ${formatCurrency(s.cashBalance)}, projected closing ${formatCurrency(Math.round(s.cashBalance + (s.mrr * 6 * 1.1) - (s.monthlyBurn * 6)))}. Runway extends to ${s.runway} months at conservative assumptions. Key: 12% revenue growth, 2% expense inflation.`,
      author: 'Deepak Verma', department: 'Finance', tags: ['forecast', 'cash-flow', 'strategic'],
      confidentiality: 'restricted', createdAt: iso(0), updatedAt: iso(0),
      schedule: { frequency: 'monthly', nextScheduledDate: '2026-05-02' },
      reviewedBy: { name: 'Rajesh Kumar', role: 'Finance Manager', date: iso(0) },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(0) },
      metrics: [
        c('Opening Cash', s.cashBalance, { subtext: 'April 1, 2026' }),
        c('Projected Revenue (6mo)', Math.round(s.mrr * 6 * 1.1), { subtext: '12% growth assumed' }),
        c('Projected Expenses (6mo)', s.monthlyBurn * 6, { subtext: '2% quarterly inflation' }),
        c('Closing Cash (Sep)', Math.round(s.cashBalance + (s.mrr * 6 * 1.1) - (s.monthlyBurn * 6))),
        mo('Projected Runway', s.runway, { subtext: 'At Sep burn rate' }),
      ],
      sections: [
        { id: 'rev', title: 'Revenue Projection', description: 'Monthly revenue based on signed contracts + pipeline', metrics: [
          c('April 2026', s.mrr), c('May 2026', Math.round(s.mrr * 1.066), { subtext: '+6.6% MoM' }), c('June 2026', Math.round(s.mrr * 1.12), { subtext: '+5.9% MoM' }),
        ], findings: ['8 new enterprise deals in pipeline (Apr-Jun deployment)', 'Churn rate at 3.5% — below industry avg', 'NRR tracking at 115%'] },
        { id: 'burn', title: 'Burn Rate Forecast', metrics: [
          c('Current Monthly Burn', s.monthlyBurn), c('Planned Hiring Impact', 320000, { subtext: 'May hiring wave' }), c('Projected Sep Burn', Math.round(s.monthlyBurn * 1.11)),
        ], findings: ['3 engineer hires planned for May', 'Cloud cost declining 8%'], risks: ['Revenue shortfall of 10% reduces runway to 18.2 months', 'Unplanned expansion adds risk'] },
        { id: 'scenarios', title: 'Sensitivity Analysis', metrics: [
          mo('Base Case', s.runway), mo('Upside (15% growth)', Math.round(s.runway * 1.19)), mo('Downside (5% growth)', Math.round(s.runway * 0.81)), mo('Stress (flat)', Math.round(s.runway * 0.63)),
        ] },
      ],
    },
    {
      id: 'rpt-14', name: 'Revenue Projection Model', type: 'Forecast', period: 'FY2026-27', version: 'v2.0', status: 'generated' as const, date: day(2), icon: 'FileSpreadsheet',
      summary: `12-month revenue model projecting MRR growth from ${formatCurrency(s.mrr)} to ${formatCurrency(Math.round(s.mrr * 1.42))} by March 2027.`,
      author: 'Deepak Verma', department: 'Finance', tags: ['forecast', 'revenue', 'model'], confidentiality: 'restricted', createdAt: iso(2),
      metrics: [c('Current MRR', s.mrr), c('Projected MRR (12mo)', Math.round(s.mrr * 1.42)), p('Assumed Growth Rate', 12), p('Churn Rate', 3.5)],
      sections: [
        { id: 'drivers', title: 'Growth Drivers', metrics: [c('New Business', Math.round(s.mrr * 0.3), { subtext: 'Monthly new logos' }), c('Expansion Revenue', Math.round(s.mrr * 0.12), { subtext: 'Upsells & seat growth' })], findings: ['Enterprise segment growing 2x faster than SMB', 'Average deal size increased 18%'] },
      ],
    },
    {
      id: 'rpt-15', name: 'Runway & Burn Rate Analysis', type: 'Forecast', period: 'Apr 2026 Onwards', version: 'v1.0', status: 'approved' as const, date: day(6), icon: 'FileText',
      summary: `Current runway of ${s.runway} months at ${formatCurrency(s.monthlyBurn)} monthly burn. Path to profitability identified at +18% revenue growth.`,
      author: 'Deepak Verma', department: 'Finance', tags: ['runway', 'strategic'], confidentiality: 'restricted', createdAt: iso(6),
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(5) },
      metrics: [mo('Current Runway', s.runway), c('Monthly Burn', s.monthlyBurn), c('Cash Balance', s.cashBalance), mo('Break-even Timeline', Math.round(s.monthlyBurn / (s.mrr * 0.12)))],
    },
    {
      id: 'rpt-16', name: 'Budget vs Actuals — Q4', type: 'Forecast', period: 'Q4 FY2025-26', version: 'v1.0', status: 'generated' as const, date: day(8), icon: 'Table',
      summary: 'Q4 budget variance analysis showing 5% favorable expense variance against plan.',
      author: 'Rajesh Kumar', department: 'Finance', tags: ['budget', 'variance'], confidentiality: 'internal', createdAt: iso(8),
      metrics: [c('Budgeted Expenses', Math.round(s.monthlyBurn * 3 * 1.05)), c('Actual Expenses', s.monthlyBurn * 3), c('Variance (Favorable)', Math.round(s.monthlyBurn * 3 * 0.05), { trend: 'up' }), p('Variance %', 5, { trend: 'up' })],
      sections: [
        { id: 'dept', title: 'Department Variances', metrics: [c('Engineering (under)', Math.round(s.monthlyBurn * 0.08), { trend: 'up' }), c('Marketing (over)', Math.round(s.monthlyBurn * 0.03), { trend: 'down' })], findings: ['Engineering under-budget due to delayed hiring', 'Marketing exceeded budget on conference sponsorship'], risks: ['Delayed hiring may impact product roadmap in Q1'] },
      ],
    },
    {
      id: 'rpt-17', name: 'Scenario Analysis — Growth vs Conservative', type: 'Forecast', period: 'FY2026-27', version: 'v1.3', status: 'draft' as const, date: day(10), icon: 'FileText',
      summary: 'Three-scenario analysis modeling growth, base, and conservative revenue trajectories for FY2026-27.',
      author: 'Deepak Verma', department: 'Finance', tags: ['scenario', 'strategic', 'draft'], confidentiality: 'restricted', createdAt: iso(10),
      metrics: [c('Growth Scenario ARR', Math.round(s.mrr * 12 * 1.42)), c('Base Scenario ARR', Math.round(s.mrr * 12 * 1.15)), c('Conservative ARR', Math.round(s.mrr * 12 * 0.9))],
    },
    {
      id: 'rpt-18', name: 'Working Capital Forecast', type: 'Forecast', period: 'Q1 FY2026-27', version: 'v1.0', status: 'generated' as const, date: day(3), icon: 'FileSpreadsheet',
      summary: 'Working capital position forecast for Q1 based on receivable aging and payable cycles.',
      author: 'Rajesh Kumar', department: 'Finance', tags: ['working-capital', 'liquidity'], confidentiality: 'internal', createdAt: iso(3),
      metrics: [c('Current Assets', Math.round(s.cashBalance * 1.2)), c('Current Liabilities', Math.round(s.monthlyBurn * 2.5)), c('Net Working Capital', Math.round(s.cashBalance * 1.2 - s.monthlyBurn * 2.5))],
    },

    // ── Compliance Reports ──────────────────────────────────────────
    {
      id: 'rpt-19', name: 'Compliance Health Dashboard', type: 'Compliance', period: 'March 2026', version: 'v1.0', status: 'approved' as const, date: today, icon: 'FileText',
      summary: `Compliance health score of 87% with ${s.overdueFilings} overdue filings and ${s.upcomingDeadlines} upcoming deadlines. GST and TDS filings current. ROC annual return pending.`,
      author: 'Meera Singh', department: 'Legal & Compliance', tags: ['compliance', 'dashboard', 'monthly'],
      confidentiality: 'internal', createdAt: iso(0),
      schedule: { frequency: 'monthly', nextScheduledDate: '2026-05-01' },
      approvedBy: { name: 'Anita Desai', role: 'CFO', date: iso(0) },
      metrics: [p('Compliance Score', 87), n('Overdue Filings', s.overdueFilings, { trend: s.overdueFilings > 0 ? 'down' : 'stable' }), n('Upcoming Deadlines', s.upcomingDeadlines)],
      sections: [
        { id: 'status', title: 'Filing Status', metrics: [n('GST Filings (Current)', 12), n('TDS Returns (Current)', 4), n('ROC Filings (Pending)', 1)], findings: ['All GST returns filed on time for FY2025-26', 'TDS Q4 draft pending final review'], risks: ['ROC annual return due by May 30 — preparation needed'] },
      ],
    },
    {
      id: 'rpt-20', name: 'Statutory Audit Readiness', type: 'Compliance', period: 'FY2025-26', version: 'v1.0', status: 'draft' as const, date: day(5), icon: 'Table',
      summary: 'Pre-audit readiness assessment showing 72% documentation completeness. 7 items require attention before auditor engagement.',
      author: 'Meera Singh', department: 'Legal & Compliance', tags: ['audit', 'statutory', 'preparation'], confidentiality: 'restricted', createdAt: iso(5),
      metrics: [p('Readiness Score', 72), n('Documents Reviewed', 48), n('Issues Found', 7, { trend: 'down' })],
      sections: [
        { id: 'gaps', title: 'Audit Gaps', metrics: [n('Critical Items', 2), n('High Priority', 3), n('Medium Priority', 2)], findings: ['Bank reconciliation pending for March', 'Fixed asset register needs update'], risks: ['Auditor engagement scheduled for May 15 — 6 weeks to resolve all items'] },
      ],
    },
    {
      id: 'rpt-21', name: 'ROC Filing Status', type: 'Compliance', period: 'FY2025-26', version: 'v1.0', status: 'generated' as const, date: day(12), icon: 'FileText',
      summary: 'ROC filing tracker showing 2 of 3 annual filings completed. AOC-4 pending.',
      author: 'Meera Singh', department: 'Legal & Compliance', tags: ['roc', 'mca'], confidentiality: 'internal', createdAt: iso(12),
      metrics: [n('Filings Due', 3), n('Filings Completed', 2), n('Filings Pending', 1)],
    },
  ];
}

/**
 * Get report metrics for display (legacy compat — pulls from embedded metrics)
 */
export function getDemoReportMetrics(): Record<string, Record<string, number>> | null {
  if (!isDemoDataLoaded()) return null;
  const reports = getDemoReports();
  const result: Record<string, Record<string, number>> = {};
  reports.forEach(r => {
    if (r.metrics && r.metrics.length > 0) {
      const map: Record<string, number> = {};
      r.metrics.forEach(m => { map[m.label] = m.value; });
      result[r.id] = map;
    }
  });
  return result;
}

// ============================================================================
// SCENARIOS DATA
// ============================================================================

/**
 * Get scenario initial parameters from demo data
 */
export function getDemoScenarioDefaults() {
  if (!isDemoDataLoaded()) return null;
  const s = getDemoSummary();
  return {
    growthRate: 12,
    churnRate: 3.5,
    monthlyBurn: s.monthlyBurn,
    currentCash: s.cashBalance,
    currentMrr: s.mrr,
  };
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

/**
 * Generate dynamic activity log from demo data
 */
export function getDemoActivityLog(): { agent: string; action: string; time: string; type: 'success' | 'warning' | 'info' }[] {
  if (!isDemoDataLoaded()) return [];
  const s = getDemoSummary();
  const filings = getDemoFilings();
  const overdueCount = filings.filter(f => f.status === 'overdue').length;

  const log: { agent: string; action: string; time: string; type: 'success' | 'warning' | 'info' }[] = [
    { agent: 'CFO Agent', action: `Runway recalculated — ${s.runway} months at current burn`, time: '2 min ago', type: 'success' },
    { agent: 'Cash Flow Agent', action: `Monthly burn updated to ${formatCurrency(s.monthlyBurn)}`, time: '15 min ago', type: 'info' },
    { agent: 'TDS Agent', action: `TDS liability computed: ${formatCurrency(s.totalTdsLiability)}`, time: '1 hr ago', type: 'success' },
  ];

  if (overdueCount > 0) {
    log.splice(1, 0, {
      agent: 'Compliance Agent',
      action: `${overdueCount} filing(s) overdue — penalties may apply`,
      time: '30 min ago',
      type: 'warning',
    });
  }

  return log;
}

// ============================================================================
// NOTIFICATION PREFERENCES (localStorage-backed)
// ============================================================================

const PREF_KEY = 'raven_notification_prefs';

export interface NotificationPrefs {
  burnRateSpikes: boolean;
  runwayHealth: boolean;
  agentAnomalies: boolean;
  complianceDeadlines: boolean;
  paymentReminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  burnRateSpikes: true,
  runwayHealth: true,
  agentAnomalies: false,
  complianceDeadlines: true,
  paymentReminders: false,
};

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  const raw = localStorage.getItem(PREF_KEY);
  if (!raw) return DEFAULT_PREFS;
  try { return { ...DEFAULT_PREFS, ...JSON.parse(raw) }; } catch { return DEFAULT_PREFS; }
}

export function setNotificationPref(key: keyof NotificationPrefs, value: boolean): NotificationPrefs {
  const prefs = getNotificationPrefs();
  prefs[key] = value;
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  return prefs;
}
