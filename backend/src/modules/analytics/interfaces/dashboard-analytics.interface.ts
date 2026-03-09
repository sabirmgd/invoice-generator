export interface SummaryCards {
  totalRevenue: number;
  outstandingAmount: number;
  overdueCount: number;
  estimatesPending: number;
  totalExpenses: number;
}

export interface ExpensesByCategory {
  category: string;
  total: number;
  count: number;
}

export interface RevenueByMonth {
  month: string;
  label: string;
  revenue: number;
}

export interface InvoicesByStatus {
  status: string;
  count: number;
  amount: number;
}

export interface EstimateConversion {
  totalNonDraft: number;
  converted: number;
  conversionRate: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'invoice' | 'estimate';
  number: string;
  clientName: string;
  status: string;
  total: number;
  currency: string;
  date: string;
}

export interface TopClient {
  clientName: string;
  clientId: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface DashboardAnalytics {
  summary: SummaryCards;
  revenueByMonth: RevenueByMonth[];
  invoicesByStatus: InvoicesByStatus[];
  estimateConversion: EstimateConversion;
  recentActivity: RecentActivityItem[];
  topClients: TopClient[];
  expensesByCategory: ExpensesByCategory[];
}
