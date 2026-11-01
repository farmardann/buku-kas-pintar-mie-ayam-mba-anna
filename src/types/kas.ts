export type TransactionType = 'INCOME' | 'EXPENSE';
export type SessionStatus = 'OPEN' | 'CLOSED';
export type AnalyticsPeriod = 'THIS_MONTH' | '7_DAYS' | '30_DAYS' | 'ALL';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface CreateCategoryInput {
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  category_name?: string;
  description: string | null;
  date: string; // ISO timestamptz
  created_at: string; // ISO timestamptz
}

export interface DailySession {
  id: string;
  date: string; // YYYY-MM-DD
  opening_balance: number;
  expected_closing_balance: number;
  actual_closing_balance: number | null;
  difference: number | null;
  status: SessionStatus;
  closed_at?: string | null;
  notes?: string | null;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category_id: string;
  description?: string | null;
  date?: string;
}

export interface UpdateTransactionInput {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  description?: string | null;
}

export interface OpenSessionInput {
  opening_balance: number;
  date?: string;
}

export interface CloseSessionInput {
  sessionId: string;
  expected_closing_balance: number;
  actual_closing_balance: number;
  notes?: string;
}

export interface DailyChartPoint {
  dateKey: string; // YYYY-MM-DD
  label: string;   // e.g. "01 Nov"
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  type: TransactionType;
  total: number;
  count: number;
  percentage: number;
}
