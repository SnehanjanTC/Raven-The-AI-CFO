export type {
  Metric, Agent, Report, ReportMetric, ReportSection, Scenario, ActivityLog,
  ScheduleIIIBalanceSheet, ScheduleIIIProfitAndLoss, CashFlowStatement, GaapData, SaaSMonthlyPnL,
} from '../../types';

/** Transaction type used by the Ledger domain */
export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'cleared' | 'pending' | 'flagged';
}

/** Integration type used by the Integrations domain */
export interface Integration {
  id: string;
  name: string;
  category: string;
  status: 'Connected' | 'Pending' | 'Error' | 'Disconnected';
  icon?: string;
}

/** Copilot chat message */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isValidated?: boolean;
  actions?: { label: string; icon: any; onClick: () => void }[];
}

/** Notification types */
export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'ai';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}
